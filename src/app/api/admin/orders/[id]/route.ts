// File: src/app/api/admin/orders/[id]/route.ts
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

import { OrderStatus, PaymentStatus, DeliveryMethod } from "@prisma/client"

// Define proper types for order updates
interface OrderUpdateData {
  status?: OrderStatus
  paymentStatus?: PaymentStatus
  adminNotes?: string
  deliveryMethod?: DeliveryMethod
  roomNumber?: string
  confirmedAt?: Date
  readyAt?: Date
  completedAt?: Date
}

// GET - Fetch specific order details for admin
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await context.params

    const order = await prisma.order.findUnique({
      where: { id },
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

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    return NextResponse.json(order)
  } catch (error) {
    console.error('Error fetching order:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PATCH - Update order status, payment status, notes, etc.
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await context.params
    const updates = await request.json()

    console.log('Updating order:', id, 'with:', updates)

    // Get current order
    const currentOrder = await prisma.order.findUnique({
      where: { id }
    })

    if (!currentOrder) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    const orderUpdates: OrderUpdateData = {}

    // Handle order status updates
    if (updates.status) {
      const validStatuses = Object.values(OrderStatus)
      if (!validStatuses.includes(updates.status as OrderStatus)) {
        return NextResponse.json({ error: 'Invalid order status' }, { status: 400 })
      }

      orderUpdates.status = updates.status as OrderStatus

      // Set appropriate timestamps
      if (updates.status === OrderStatus.CONFIRMED && !currentOrder.confirmedAt) {
        orderUpdates.confirmedAt = new Date()
      }
      if (updates.status === OrderStatus.READY && !currentOrder.readyAt) {
        orderUpdates.readyAt = new Date()
      }
      if (updates.status === OrderStatus.COMPLETED) {
        orderUpdates.completedAt = new Date()
      }
    }

    // Handle payment status updates
    if (updates.paymentStatus) {
      const validPaymentStatuses = Object.values(PaymentStatus)
      if (!validPaymentStatuses.includes(updates.paymentStatus as PaymentStatus)) {
        return NextResponse.json({ error: 'Invalid payment status' }, { status: 400 })
      }

      orderUpdates.paymentStatus = updates.paymentStatus as PaymentStatus

      // Auto-confirm order when payment is completed for pending orders
      if (updates.paymentStatus === PaymentStatus.COMPLETED && currentOrder.status === OrderStatus.PENDING) {
        orderUpdates.status = OrderStatus.CONFIRMED
        orderUpdates.confirmedAt = new Date()
      }
    }

    // Handle other updates
    if (updates.adminNotes !== undefined) orderUpdates.adminNotes = updates.adminNotes
    if (updates.deliveryMethod) orderUpdates.deliveryMethod = updates.deliveryMethod
    if (updates.roomNumber) orderUpdates.roomNumber = updates.roomNumber

    const result = await prisma.order.update({
      where: { id },
      data: orderUpdates,
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

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error updating order:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE - Cancel order
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await context.params

    const existingOrder = await prisma.order.findUnique({
      where: { id },
      include: {
        orderItems: {
          include: {
            product: true
          }
        }
      }
    })

    if (!existingOrder) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    // Can't cancel completed orders
    if (existingOrder.status === OrderStatus.COMPLETED) {
      return NextResponse.json({ error: 'Cannot cancel completed orders' }, { status: 400 })
    }

    // Cancel order and restore stock
    await prisma.$transaction(async (tx) => {
      // Restore product stock
      for (const item of existingOrder.orderItems) {
        await tx.product.update({
          where: { id: item.productId },
          data: {
            stockQuantity: {
              increment: item.quantity
            }
          }
        })
      }

      // Cancel the order
      await tx.order.update({
        where: { id },
        data: {
          status: OrderStatus.CANCELLED,
          completedAt: new Date(),
          adminNotes: existingOrder.adminNotes 
            ? `${existingOrder.adminNotes}\n\nCancelled by admin on ${new Date().toLocaleString()}`
            : `Cancelled by admin on ${new Date().toLocaleString()}`
        }
      })
    })

    return NextResponse.json({ message: 'Order cancelled successfully' })
  } catch (error) {
    console.error('Error cancelling order:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}