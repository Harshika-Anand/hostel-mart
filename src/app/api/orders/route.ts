import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// POST - Create new order
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const items = JSON.parse(formData.get('items') as string)
    const paymentMethod = formData.get('paymentMethod') as string
    const totalAmount = parseFloat(formData.get('totalAmount') as string)
    const paymentProof = formData.get('paymentProof') as File | null

    // Validation
    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Invalid items' }, { status: 400 })
    }

    if (!['upi', 'cod'].includes(paymentMethod)) {
      return NextResponse.json({ error: 'Invalid payment method' }, { status: 400 })
    }

    if (paymentMethod === 'upi' && !paymentProof) {
      return NextResponse.json({ error: 'Payment proof required for UPI payment' }, { status: 400 })
    }

    // Verify stock availability
    for (const item of items) {
      const product = await prisma.product.findUnique({
        where: { id: item.productId }
      })

      if (!product) {
        return NextResponse.json(
          { error: `Product ${item.name} not found` },
          { status: 400 }
        )
      }

      if (!product.isAvailable) {
        return NextResponse.json(
          { error: `Product ${item.name} is not available` },
          { status: 400 }
        )
      }

      if (product.stockQuantity < item.quantity) {
        return NextResponse.json(
          { error: `Insufficient stock for ${item.name}. Only ${product.stockQuantity} left.` },
          { status: 400 }
        )
      }
    }

    // Handle file upload for UPI payment proof
    let paymentProofUrl = null
    if (paymentMethod === 'upi' && paymentProof) {
      // For now, we'll store the filename. In production, you'd upload to cloud storage
      paymentProofUrl = `uploads/${Date.now()}_${paymentProof.name}`
      
      // In a real app, you would save the file:
      // const bytes = await paymentProof.arrayBuffer()
      // const buffer = Buffer.from(bytes)
      // await fs.writeFile(`public/${paymentProofUrl}`, buffer)
    }

    // Create order in database
    const order = await prisma.order.create({
      data: {
        userId: session.user.id,
        totalAmount,
        paymentMethod: paymentMethod.toUpperCase() as any,
        status: paymentMethod === 'upi' ? 'PENDING' : 'PENDING',
        orderItems: {
          create: items.map((item: any) => ({
            productId: item.productId,
            quantity: item.quantity,
            priceAtTime: item.price
          }))
        },
        payment: paymentMethod === 'upi' ? {
          create: {
            amount: totalAmount,
            paymentMethod: 'UPI',
            paymentProof: paymentProofUrl,
            status: 'PENDING'
          }
        } : paymentMethod === 'cod' ? {
          create: {
            amount: totalAmount,
            paymentMethod: 'COD',
            status: 'PENDING'
          }
        } : undefined
      },
      include: {
        orderItems: {
          include: {
            product: true
          }
        },
        payment: true
      }
    })

    // For UPI orders, stock is reserved but not deducted until admin confirms payment
    // For COD orders, stock is reserved until admin confirms order
    if (paymentMethod === 'cod') {
      // Reserve stock for COD orders
      for (const item of items) {
        await prisma.product.update({
          where: { id: item.productId },
          data: {
            stockQuantity: {
              decrement: item.quantity
            }
          }
        })
      }
    }

    return NextResponse.json({
      id: order.id,
      status: order.status,
      totalAmount: order.totalAmount,
      paymentMethod: order.paymentMethod
    }, { status: 201 })

  } catch (error) {
    console.error('Error creating order:', error)
    return NextResponse.json(
      { error: 'Failed to create order' },
      { status: 500 }
    )
  }
}

// GET - Fetch user's orders
export async function GET() {
    try {
      const session = await getServerSession(authOptions)
  
      if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
  
      const orders = await prisma.order.findMany({
        where: {
          userId: session.user.id
        },
        orderBy: {
          createdAt: 'desc'
        },
        include: {
          orderItems: {
            include: {
              product: true
            }
          },
          payment: true
        }
      })
  
      return NextResponse.json(orders, { status: 200 })
    } catch (error) {
      console.error('Error fetching orders:', error)
      return NextResponse.json(
        { error: 'Failed to fetch orders' },
        { status: 500 }
      )
    }
  }
  