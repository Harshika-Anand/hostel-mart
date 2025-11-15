// src/app/api/admin/rentals/route.ts
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// Helper function to calculate daily accumulation
async function calculateDailyAccumulation() {
  const activeRentals = await prisma.rentalTransaction.findMany({
    where: {
      status: 'ACTIVE',
      paymentStatus: 'PAID'
    }
  })

  for (const rental of activeRentals) {
    const now = new Date()
    const startDate = new Date(rental.startDate)
    const lastCalculated = new Date(rental.lastCalculated)
    
    // Calculate days since last calculation
    const daysSinceLastCalc = Math.floor((now.getTime() - lastCalculated.getTime()) / (1000 * 60 * 60 * 24))
    
    if (daysSinceLastCalc > 0) {
      // Calculate total days rented
      const totalDays = Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
      
      // Update rental with new calculation
      await prisma.rentalTransaction.update({
        where: { id: rental.id },
        data: {
          daysRented: totalDays,
          amountOwedToSeller: rental.sellerEarning * totalDays,
          lastCalculated: now
        }
      })
    }
  }
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Calculate daily accumulation before fetching
    await calculateDailyAccumulation()

    // Fetch all rentals
    const rentals = await prisma.rentalTransaction.findMany({
      include: {
        listing: {
          include: {
            category: true
          }
        }
      },
      orderBy: {
        rentedAt: 'desc'
      }
    })

    // Calculate payout summary by seller
    const sellerPayouts = await prisma.rentalTransaction.groupBy({
      by: ['sellerId', 'sellerName', 'sellerEmail', 'sellerRoom'],
      where: {
        OR: [
          { status: 'ACTIVE' },
          { 
            status: 'RETURNED',
            paymentStatus: { not: 'SETTLED' }
          }
        ]
      },
      _sum: {
        amountOwedToSeller: true,
        sellerPaidOut: true
      },
      _count: {
        id: true
      }
    })

    const payoutSummary = sellerPayouts.map(seller => ({
      sellerId: seller.sellerId,
      sellerName: seller.sellerName,
      sellerEmail: seller.sellerEmail,
      sellerRoom: seller.sellerRoom,
      activeRentals: seller._count.id,
      totalEarned: seller._sum.amountOwedToSeller || 0,
      totalPaid: seller._sum.sellerPaidOut || 0,
      totalOwed: (seller._sum.amountOwedToSeller || 0) - (seller._sum.sellerPaidOut || 0)
    }))

    return NextResponse.json({
      rentals,
      payoutSummary
    })
  } catch (error) {
    console.error('Error fetching rentals:', error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}