// File: src/app/api/admin/orders/route.ts
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

import { OrderStatus, PaymentMethod } from "@prisma/client"

// Define proper type for where clause
interface OrderWhereClause {
  status?: OrderStatus
  paymentMethod?: PaymentMethod
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const paymentMethod = searchParams.get('paymentMethod')

    const whereClause: OrderWhereClause = {}
    
    // Use NEW schema statuses for filtering
    if (status && status !== 'all') {
      const validStatuses = Object.values(OrderStatus)
      if (validStatuses.includes(status as OrderStatus)) {
        whereClause.status = status as OrderStatus
      }
    }
    
    // Use NEW payment methods for filtering
    if (paymentMethod && paymentMethod !== 'all') {
      const validPaymentMethods = Object.values(PaymentMethod)
      if (validPaymentMethods.includes(paymentMethod as PaymentMethod)) {
        whereClause.paymentMethod = paymentMethod as PaymentMethod
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
    console.error('Error fetching admin orders:', error)
    return NextResponse.json(
      { error: 'Failed to fetch orders' },
      { status: 500 }
    )
  }
}