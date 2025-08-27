// File: src/app/api/admin/orders/route.ts
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const paymentMethod = searchParams.get('paymentMethod')

    const whereClause: any = {}
    
    // Only filter by schema-defined statuses
    if (status && status !== 'all') {
      const validStatuses = ['PENDING', 'CONFIRMED', 'OUT_FOR_DELIVERY', 'COMPLETED', 'CANCELLED']
      if (validStatuses.includes(status)) {
        whereClause.status = status
      }
    }
    
    if (paymentMethod && paymentMethod !== 'all') {
      const validPaymentMethods = ['UPI', 'COD']
      if (validPaymentMethods.includes(paymentMethod)) {
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
        }
        // Removed payment include - not in schema
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json(orders)
  } catch (error) {
    console.error('Error fetching admin orders:', error)
    return NextResponse.json(
      { error: 'Failed to fetch orders' },
      { status: 500 }
    )
  }
}