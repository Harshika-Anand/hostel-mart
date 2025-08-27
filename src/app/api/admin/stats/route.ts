import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { OrderStatus } from "@prisma/client"

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

      prisma.order.aggregate({
        where: {
          createdAt: { gte: today, lt: tomorrow },
          status: { in: [OrderStatus.COMPLETED, OrderStatus.DELIVERED] }
        },
        _sum: { totalAmount: true }
      }),

      prisma.order.count({
        where: { status: OrderStatus.PENDING }
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
      prisma.order.aggregate({
        where: {
          createdAt: { gte: new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000) },
          status: { in: [OrderStatus.COMPLETED, OrderStatus.DELIVERED] }
        },
        _sum: { totalAmount: true }
      }),

      prisma.order.aggregate({
        where: {
          createdAt: { gte: new Date(today.getFullYear(), today.getMonth(), 1) },
          status: { in: [OrderStatus.COMPLETED, OrderStatus.DELIVERED] }
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

    const stats = {
      todayOrders,
      todayRevenue: todayRevenue._sum.totalAmount ?? 0,
      pendingOrders,
      totalProducts,
      totalCustomers,
      weeklyRevenue: weeklyRevenue._sum.totalAmount ?? 0,
      monthlyRevenue: monthlyRevenue._sum.totalAmount ?? 0,
      recentOrders: recentOrders.map(order => ({
        id: order.id,
        orderNumber: order.orderNumber,
        customerName: order.customerName || order.user?.name || "Unknown",
        totalAmount: order.totalAmount,
        status: order.status,
        createdAt: order.createdAt,
        itemCount: order.orderItems.length
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
