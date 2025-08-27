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

    const allowedUpdates = [
      'status', 
      'paymentStatus', 
      'adminNotes', 
      'deliveryMethod', 
      'roomNumber',
      'estimatedDeliveryTime',
      'paymentMethod',
      'transactionId'
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

    if (updates.status) {
        const validStatuses = ['PENDING', 'CONFIRMED', 'OUT_FOR_DELIVERY', 'COMPLETED', 'CANCELLED']
        if (!validStatuses.includes(updates.status)) {
          return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
        }
      
        orderUpdates.status = updates.status
      
        // If order is being completed, set completedAt
        if (updates.status === 'COMPLETED' || updates.status === 'OUT_FOR_DELIVERY') {
          orderUpdates.completedAt = new Date()
        }
      }
      

    if (updates.adminNotes !== undefined) orderUpdates.adminNotes = updates.adminNotes
    if (updates.deliveryMethod) orderUpdates.deliveryMethod = updates.deliveryMethod
    if (updates.roomNumber) orderUpdates.roomNumber = updates.roomNumber
    if (updates.estimatedDeliveryTime) orderUpdates.estimatedDeliveryTime = new Date(updates.estimatedDeliveryTime)
    if (updates.paymentMethod) orderUpdates.paymentMethod = updates.paymentMethod
    if (updates.paymentStatus) orderUpdates.paymentStatus = updates.paymentStatus
    if (updates.transactionId) orderUpdates.paymentPin = updates.transactionId // reuse paymentPin field

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
      where: { id }
    })

    if (!existingOrder) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    await prisma.$transaction(async (tx) => {
      await tx.orderItem.deleteMany({ where: { orderId: id } })
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
