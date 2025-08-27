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
        },
        payment: true
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

// PATCH - Update order status or payment status
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

    // Validate the update data
    const allowedUpdates = ['status', 'paymentStatus', 'adminNotes', 'deliveryMethod', 'roomNumber']
    const isValidOperation = Object.keys(updates).every(key => allowedUpdates.includes(key))

    if (!isValidOperation) {
      return NextResponse.json({ error: 'Invalid updates' }, { status: 400 })
    }

    // Handle status transitions
    if (updates.status) {
      const validStatuses = ['PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY', 'DELIVERED', 'COMPLETED', 'CANCELLED']
      if (!validStatuses.includes(updates.status)) {
        return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
      }

      // If order is being completed, set completedAt
      if (updates.status === 'COMPLETED' || updates.status === 'DELIVERED') {
        updates.completedAt = new Date()
      }
    }

    // Handle payment status updates
    if (updates.paymentStatus) {
      const validPaymentStatuses = ['PENDING', 'VERIFIED', 'FAILED', 'COMPLETED']
      if (!validPaymentStatuses.includes(updates.paymentStatus)) {
        return NextResponse.json({ error: 'Invalid payment status' }, { status: 400 })
      }

      // If payment is verified for UPI orders, update order status too
      if (updates.paymentStatus === 'VERIFIED') {
        const order = await prisma.order.findUnique({ where: { id } })
        if (order?.paymentMethod === 'UPI' && order.status === 'PENDING') {
          updates.status = 'CONFIRMED'
        }
      }
    }

    const updatedOrder = await prisma.order.update({
      where: { id },
      data: updates,
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