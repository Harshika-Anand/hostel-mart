// File: src/app/api/admin/orders/[id]/route.ts
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

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
        // Removed payment include - not in schema
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

// PATCH - Update order status, notes, delivery, etc.
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

    // Only allow updates to fields that exist in the schema
    const allowedUpdates = [
      'status', 
      'paymentStatus', 
      'adminNotes', 
      'deliveryMethod', 
      'roomNumber',
      'paymentMethod',
      'paymentPin'
    ]
    const isValidOperation = Object.keys(updates).every(key => allowedUpdates.includes(key))

    if (!isValidOperation) {
      return NextResponse.json({ error: 'Invalid updates' }, { status: 400 })
    }

    const currentOrder = await prisma.order.findUnique({
      where: { id }
    })

    if (!currentOrder) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    const orderUpdates: any = {}

    // Handle status updates - only use schema-defined statuses
    if (updates.status) {
      const validStatuses = ['PENDING', 'CONFIRMED', 'OUT_FOR_DELIVERY', 'COMPLETED', 'CANCELLED']
      if (!validStatuses.includes(updates.status)) {
        return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
      }
    
      orderUpdates.status = updates.status
    
      // If order is being completed, set completedAt
      if (updates.status === 'COMPLETED') {
        orderUpdates.completedAt = new Date()
      }
    }

    // Handle payment status updates
    if (updates.paymentStatus) {
      const validPaymentStatuses = ['PENDING', 'VERIFIED', 'COMPLETED']
      if (!validPaymentStatuses.includes(updates.paymentStatus)) {
        return NextResponse.json({ error: 'Invalid payment status' }, { status: 400 })
      }
      orderUpdates.paymentStatus = updates.paymentStatus
    }

    // Handle other allowed updates
    if (updates.adminNotes !== undefined) orderUpdates.adminNotes = updates.adminNotes
    if (updates.deliveryMethod) orderUpdates.deliveryMethod = updates.deliveryMethod
    if (updates.roomNumber) orderUpdates.roomNumber = updates.roomNumber
    if (updates.paymentMethod) orderUpdates.paymentMethod = updates.paymentMethod
    if (updates.paymentPin) orderUpdates.paymentPin = updates.paymentPin

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
        // Removed payment include - not in schema
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

// DELETE - Delete order and items
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

    // Restore stock and delete order
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

      // Delete order items first (due to foreign key constraints)
      await tx.orderItem.deleteMany({ where: { orderId: id } })
      
      // Delete the order
      await tx.order.delete({ where: { id } })
    })

    return NextResponse.json({ message: 'Order deleted successfully' })
  } catch (error) {
    console.error('Error deleting order:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}