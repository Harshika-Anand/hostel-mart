// File: src/app/api/orders/route.ts
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// Helper function to generate order number
async function generateOrderNumber(): Promise<string> {
  const today = new Date()
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '') // YYYYMMDD
  
  // Find the latest order number for today
  const latestOrder = await prisma.order.findFirst({
    where: {
      orderNumber: {
        startsWith: `ORD-${dateStr}`
      }
    },
    orderBy: {
      createdAt: 'desc'
    }
  })

  let sequence = 1
  if (latestOrder) {
    const lastSequence = parseInt(latestOrder.orderNumber.split('-').pop() || '0')
    sequence = lastSequence + 1
  }

  return `ORD-${dateStr}-${sequence.toString().padStart(3, '0')}`
}

// GET - Fetch orders (Customer: own orders, Admin: all orders)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    
    let whereClause: any = {}
    
    // If customer, only show their orders
    if (session.user.role === 'CUSTOMER') {
      whereClause.userId = session.user.id
    }
    
    // Admin can filter by status and payment method
    if (session.user.role === 'ADMIN') {
      const status = searchParams.get('status')
      const paymentMethod = searchParams.get('paymentMethod')
      
      if (status && status !== 'all') {
        whereClause.status = status
      }
      if (paymentMethod && paymentMethod !== 'all') {
        whereClause.paymentMethod = paymentMethod
      }
    }

    const orders = await prisma.order.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            name: true,
            email: true,
            phone: true,
            roomNumber: true
          }
        },
        orderItems: {
          include: {
            product: {
              include: {
                category: true
              }
            }
          }
        },
        payment: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json(orders)
  } catch (error) {
    console.error('Error fetching orders:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST - Create new order (Customer only)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'CUSTOMER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { items, paymentMethod, deliveryMethod, roomNumber, paymentPin, subtotal, deliveryFee, totalAmount } = body

    // Validation
    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'No items in order' }, { status: 400 })
    }

    if (!paymentMethod || !['UPI', 'COD'].includes(paymentMethod)) {
      return NextResponse.json({ error: 'Invalid payment method' }, { status: 400 })
    }

    if (!deliveryMethod || !['PICKUP', 'DELIVERY'].includes(deliveryMethod)) {
      return NextResponse.json({ error: 'Invalid delivery method' }, { status: 400 })
    }

    if (deliveryMethod === 'DELIVERY' && !roomNumber) {
      return NextResponse.json({ error: 'Room number required for delivery' }, { status: 400 })
    }

    if (paymentMethod === 'UPI' && !paymentPin) {
      return NextResponse.json({ error: 'Payment PIN required for UPI payments' }, { status: 400 })
    }

    // Get user details
    const user = await prisma.user.findUnique({
      where: { id: session.user.id }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Verify products and calculate totals
    let calculatedSubtotal = 0
    const orderItemsData = []

    for (const item of items) {
      const product = await prisma.product.findUnique({
        where: { id: item.productId }
      })

      if (!product || !product.isAvailable || product.stockQuantity < item.quantity) {
        return NextResponse.json(
          { error: `Product ${item.name || product?.name || 'unknown'} is not available in requested quantity` },
          { status: 400 }
        )
      }

      const itemSubtotal = product.price * item.quantity
      calculatedSubtotal += itemSubtotal

      orderItemsData.push({
        productId: product.id,
        productName: product.name,
        price: product.price,
        quantity: item.quantity,
        subtotal: itemSubtotal
      })
    }

    // Verify totals
    if (Math.abs(calculatedSubtotal - subtotal) > 0.01) {
      return NextResponse.json({ error: 'Price mismatch detected' }, { status: 400 })
    }

    const expectedDeliveryFee = deliveryMethod === 'DELIVERY' ? 10 : 0
    if (deliveryFee !== expectedDeliveryFee) {
      return NextResponse.json({ error: 'Delivery fee mismatch' }, { status: 400 })
    }

    if (Math.abs((subtotal + deliveryFee) - totalAmount) > 0.01) {
      return NextResponse.json({ error: 'Total amount mismatch' }, { status: 400 })
    }

    // Generate order number
    const orderNumber = await generateOrderNumber()

    // Create order with transaction
    const order = await prisma.$transaction(async (tx) => {
      // Create the order
      const newOrder = await tx.order.create({
        data: {
          orderNumber,
          userId: user.id,
          customerName: user.name,
          customerEmail: user.email,
          status: 'PENDING',
          paymentMethod: paymentMethod as 'UPI' | 'COD',
          paymentStatus: paymentMethod === 'UPI' ? 'PENDING' : 'COMPLETED',
          paymentPin: paymentMethod === 'UPI' ? paymentPin : null,
          deliveryMethod: deliveryMethod as 'PICKUP' | 'DELIVERY',
          roomNumber: deliveryMethod === 'DELIVERY' ? roomNumber : (user.roomNumber || null),
          subtotal,
          deliveryFee,
          totalAmount,
          orderItems: {
            create: orderItemsData
          }
        },
        include: {
          orderItems: {
            include: {
              product: {
                include: {
                  category: true
                }
              }
            }
          }
        }
      })

      // Update product stock quantities
      for (const item of items) {
        await tx.product.update({
          where: { id: item.productId },
          data: {
            stockQuantity: {
              decrement: item.quantity
            }
          }
        })
      }

      // Create legacy payment record for backwards compatibility (optional)
      if (paymentMethod === 'UPI') {
        await tx.payment.create({
          data: {
            orderId: newOrder.id,
            amount: totalAmount,
            paymentMethod: 'UPI',
            status: 'PENDING'
          }
        })
      }

      return newOrder
    })

    return NextResponse.json(order, { status: 201 })
  } catch (error) {
    console.error('Error creating order:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}