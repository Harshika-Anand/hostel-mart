// File: src/app/api/orders/[id]/route.ts
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// GET - Fetch specific order details
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await context.params

    const whereClause: any = { id }
    
    // If customer, only allow access to their own orders
    if (session.user.role === 'CUSTOMER') {
      whereClause.userId = session.user.id
    }

    const order = await prisma.order.findUnique({
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
      }
    })

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    // Double-check access for customers
    if (session.user.role === 'CUSTOMER' && order.userId !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
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

// PATCH - Update order (Admin only)
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

    // Validate the update data - only allow schema-defined fields
    const allowedUpdates = ['status', 'paymentStatus', 'adminNotes', 'deliveryMethod', 'roomNumber']
    const isValidOperation = Object.keys(updates).every(key => allowedUpdates.includes(key))

    if (!isValidOperation) {
      return NextResponse.json({ error: 'Invalid updates' }, { status: 400 })
    }

    // Get current order
    const currentOrder = await prisma.order.findUnique({
      where: { id }
    })

    if (!currentOrder) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    // Prepare the update object
    const updateData: any = {}

    // Handle order status transitions - use NEW schema statuses
    if (updates.status) {
      const validStatuses = ['PENDING', 'CONFIRMED', 'READY', 'COMPLETED', 'CANCELLED']
      if (!validStatuses.includes(updates.status)) {
        return NextResponse.json({ error: 'Invalid order status' }, { status: 400 })
      }

      updateData.status = updates.status

      // Set appropriate timestamps
      if (updates.status === 'CONFIRMED' && !currentOrder.confirmedAt) {
        updateData.confirmedAt = new Date()
      }
      if (updates.status === 'READY' && !currentOrder.readyAt) {
        updateData.readyAt = new Date()
      }
      if (updates.status === 'COMPLETED') {
        updateData.completedAt = new Date()
      }
    }

    // Handle payment status updates - use NEW schema statuses
    if (updates.paymentStatus) {
      const validPaymentStatuses = ['PENDING', 'COMPLETED']
      if (!validPaymentStatuses.includes(updates.paymentStatus)) {
        return NextResponse.json({ error: 'Invalid payment status' }, { status: 400 })
      }

      updateData.paymentStatus = updates.paymentStatus

      // Auto-confirm order when payment is completed for pending orders
      if (updates.paymentStatus === 'COMPLETED' && currentOrder.status === 'PENDING') {
        updateData.status = 'CONFIRMED'
        updateData.confirmedAt = new Date()
      }
    }

    // Handle other updates
    if (updates.adminNotes !== undefined) updateData.adminNotes = updates.adminNotes
    if (updates.deliveryMethod) updateData.deliveryMethod = updates.deliveryMethod
    if (updates.roomNumber) updateData.roomNumber = updates.roomNumber

    const updatedOrder = await prisma.order.update({
      where: { id },
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

// DELETE - Cancel order (Customer: own orders, Admin: any order)
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await context.params

    // Get the order first to check permissions and status
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        orderItems: {
          include: {
            product: true
          }
        }
      }
    })

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    // Check permissions
    if (session.user.role === 'CUSTOMER' && order.userId !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Check if order can be cancelled - use NEW schema statuses
    const nonCancellableStatuses = ['COMPLETED', 'CANCELLED']
    if (nonCancellableStatuses.includes(order.status)) {
      return NextResponse.json({ 
        error: `Cannot cancel order with status ${order.status}` 
      }, { status: 400 })
    }

    // Cancel the order and restore stock
    const cancelledOrder = await prisma.$transaction(async (tx) => {
      // Update order status
      const updatedOrder = await tx.order.update({
        where: { id },
        data: {
          status: 'CANCELLED',
          completedAt: new Date(),
          adminNotes: session.user.role === 'CUSTOMER' 
            ? (order.adminNotes ? `${order.adminNotes}\n\nCancelled by customer on ${new Date().toLocaleString()}` : `Cancelled by customer on ${new Date().toLocaleString()}`)
            : order.adminNotes || undefined
        }
      })

      // Restore product stock
      for (const item of order.orderItems) {
        await tx.product.update({
          where: { id: item.productId },
          data: {
            stockQuantity: {
              increment: item.quantity
            }
          }
        })
      }

      return updatedOrder
    })

    return NextResponse.json({ 
      message: 'Order cancelled successfully',
      order: cancelledOrder 
    })
  } catch (error) {
    console.error('Error cancelling order:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}