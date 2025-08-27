// File: src/app/api/admin/stats/route.ts
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const [
      todayOrders,
      todayRevenue,
      pendingOrders,
      totalProducts,
      totalCustomers,
      recentOrders
    ] = await Promise.all([
      prisma.order.count({
        where: { createdAt: { gte: today, lt: tomorrow } }
      }),

      // Use NEW schema status - COMPLETED only
      prisma.order.aggregate({
        where: {
          createdAt: { gte: today, lt: tomorrow },
          status: 'COMPLETED' // NEW schema status
        },
        _sum: { totalAmount: true }
      }),

      // Use NEW schema status - PENDING only
      prisma.order.count({
        where: { status: 'PENDING' } // NEW schema status
      }),

      prisma.product.count({ where: { isAvailable: true } }),

      prisma.user.count({ where: { role: 'CUSTOMER' } }),

      prisma.order.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { name: true, email: true } },
          orderItems: {
            include: { product: { select: { name: true } } }
          }
        }
      })
    ])

    const [weeklyRevenue, monthlyRevenue, lowStockProducts] = await Promise.all([
      // Use NEW schema status - COMPLETED only
      prisma.order.aggregate({
        where: {
          createdAt: { gte: new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000) },
          status: 'COMPLETED' // NEW schema status
        },
        _sum: { totalAmount: true }
      }),

      // Use NEW schema status - COMPLETED only
      prisma.order.aggregate({
        where: {
          createdAt: { gte: new Date(today.getFullYear(), today.getMonth(), 1) },
          status: 'COMPLETED' // NEW schema status
        },
        _sum: { totalAmount: true }
      }),

      prisma.product.findMany({
        where: { stockQuantity: { lt: 5 }, isAvailable: true },
        select: {
          id: true,
          name: true,
          stockQuantity: true,
          category: { select: { name: true } }
        }
      })
    ])

    // Additional stats for better insights
    const [readyOrders, cashPendingOrders, upiPendingOrders] = await Promise.all([
      prisma.order.count({
        where: { status: 'READY' } // NEW schema status
      }),

      prisma.order.count({
        where: { 
          paymentMethod: 'CASH',
          paymentStatus: 'PENDING'
        }
      }),

      prisma.order.count({
        where: { 
          paymentMethod: 'UPI',
          paymentStatus: 'PENDING'
        }
      })
    ])

    const stats = {
      todayOrders,
      todayRevenue: todayRevenue._sum.totalAmount ?? 0,
      pendingOrders,
      readyOrders, // NEW - orders ready for pickup/delivery
      totalProducts,
      totalCustomers,
      weeklyRevenue: weeklyRevenue._sum.totalAmount ?? 0,
      monthlyRevenue: monthlyRevenue._sum.totalAmount ?? 0,
      
      // Payment pending breakdown
      cashPendingOrders, // NEW - cash payments pending
      upiPendingOrders,  // NEW - UPI payments pending
      
      recentOrders: recentOrders.map(order => ({
        id: order.id,
        orderNumber: order.orderNumber || `#${order.id.slice(-8)}`,
        customerName: order.customerName || order.user?.name || "Unknown",
        totalAmount: order.totalAmount,
        status: order.status,
        createdAt: order.createdAt,
        itemCount: order.orderItems.length,
        paymentMethod: order.paymentMethod,
        paymentStatus: order.paymentStatus
      })),
      
      lowStockProducts: lowStockProducts.map(product => ({
        id: product.id,
        name: product.name,
        stockQuantity: product.stockQuantity,
        categoryName: product.category.name
      }))
    }

    return NextResponse.json(stats)
  } catch (error) {
    console.error('Error fetching admin stats:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}