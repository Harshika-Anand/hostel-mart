// File: src/app/api/orders/route.ts
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { PaymentMethod, DeliveryMethod, OrderStatus, PaymentStatus } from "@prisma/client"

// Define proper type for where clause
interface OrderWhereClause {
  userId?: string
  status?: OrderStatus
  paymentMethod?: PaymentMethod
}

// Define proper type for order update data
interface OrderUpdateData {
  status?: OrderStatus
  paymentStatus?: PaymentStatus
  adminNotes?: string
  confirmedAt?: Date
  readyAt?: Date
  completedAt?: Date
}

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
  if (latestOrder && latestOrder.orderNumber) {
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
    
    const whereClause: OrderWhereClause = {}
    
    // If customer, only show their orders
    if (session.user.role === 'CUSTOMER') {
      whereClause.userId = session.user.id
    }
    
    // Admin can filter by status and payment method
    if (session.user.role === 'ADMIN') {
      const status = searchParams.get('status')
      const paymentMethod = searchParams.get('paymentMethod')
      
      // Use schema enum values
      if (status && status !== 'all') {
        const validStatuses = Object.values(OrderStatus)
        if (validStatuses.includes(status as OrderStatus)) {
          whereClause.status = status as OrderStatus
        }
      }
      
      // Use schema payment methods
      if (paymentMethod && paymentMethod !== 'all') {
        const validPaymentMethods = Object.values(PaymentMethod)
        if (validPaymentMethods.includes(paymentMethod as PaymentMethod)) {
          whereClause.paymentMethod = paymentMethod as PaymentMethod
        }
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
        }
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
    const { 
      items, 
      paymentMethod, 
      deliveryMethod, 
      roomNumber, 
      paymentPin, 
      subtotal, 
      deliveryFee, 
      totalAmount,
      customerName,
      customerEmail 
    } = body

    // Validation
    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'No items in order' }, { status: 400 })
    }

    // Validate payment method - should be UPI or CASH
    if (!paymentMethod || !['UPI', 'CASH'].includes(paymentMethod)) {
      return NextResponse.json({ 
        error: 'Invalid payment method. Use UPI or CASH.' 
      }, { status: 400 })
    }

    // Validate delivery method - should be PICKUP or DELIVERY
    if (!deliveryMethod || !['PICKUP', 'DELIVERY'].includes(deliveryMethod)) {
      return NextResponse.json({ 
        error: 'Invalid delivery method. Use PICKUP or DELIVERY.' 
      }, { status: 400 })
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
    const orderItemsData: Array<{
      productId: string
      productName: string
      price: number
      quantity: number
      subtotal: number
    }> = []

    for (const item of items) {
      const product = await prisma.product.findUnique({
        where: { id: item.productId }
      })

      if (!product || !product.isAvailable || product.stockQuantity < item.quantity) {
        return NextResponse.json(
          { error: `Product ${item.productName || product?.name || 'unknown'} is not available in requested quantity` },
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

    const expectedDeliveryFee = deliveryMethod === 'DELIVERY' ? 20 : 0
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
      // Create the order using proper Prisma enums
      const newOrder = await tx.order.create({
        data: {
          orderNumber,
          userId: user.id,
          customerName: customerName || user.name,
          customerEmail: customerEmail || user.email,
          status: OrderStatus.PENDING,
          paymentMethod: paymentMethod as PaymentMethod,
          paymentStatus: PaymentStatus.PENDING,
          paymentPin: paymentMethod === 'UPI' ? paymentPin : null,
          deliveryMethod: deliveryMethod as DeliveryMethod,
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

      return newOrder
    })

    return NextResponse.json(order, { status: 201 })
  } catch (error) {
    console.error('Error creating order:', error)
    
    // Log the full error details for debugging
    if (error instanceof Error) {
      console.error('Error message:', error.message)
      console.error('Error stack:', error.stack)
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PATCH - Update order status (Admin only)
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { orderId, status, paymentStatus, adminNotes } = body

    if (!orderId) {
      return NextResponse.json({ error: 'Order ID is required' }, { status: 400 })
    }

    // Validate status if provided
    if (status && !Object.values(OrderStatus).includes(status)) {
      return NextResponse.json({ 
        error: `Invalid status. Use one of: ${Object.values(OrderStatus).join(', ')}` 
      }, { status: 400 })
    }

    // Validate payment status if provided
    if (paymentStatus && !Object.values(PaymentStatus).includes(paymentStatus)) {
      return NextResponse.json({ 
        error: `Invalid payment status. Use one of: ${Object.values(PaymentStatus).join(', ')}` 
      }, { status: 400 })
    }

    const updateData: OrderUpdateData = {}
    
    if (status) {
      updateData.status = status as OrderStatus
      
      // Set timestamps based on status
      if (status === OrderStatus.CONFIRMED) {
        updateData.confirmedAt = new Date()
      } else if (status === OrderStatus.READY) {
        updateData.readyAt = new Date()
      } else if (status === OrderStatus.COMPLETED) {
        updateData.completedAt = new Date()
      }
    }

    if (paymentStatus) {
      updateData.paymentStatus = paymentStatus as PaymentStatus
    }

    if (adminNotes !== undefined) {
      updateData.adminNotes = adminNotes
    }

    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: updateData,
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
        }
      }
    })

    return NextResponse.json(updatedOrder)
  } catch (error) {
    console.error('Error updating order:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}