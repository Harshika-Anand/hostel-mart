// ============================================
// FILE 3: src/app/api/admin/rentals/route.ts
// FIXED: Returns correct payout summary
// ============================================
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

    const rentals = await prisma.rentalTransaction.findMany({
      orderBy: { rentedAt: 'desc' }
    })

    // Calculate payout summary for RETURNED rentals
    const returnedRentals = rentals.filter(r => r.status === 'RETURNED')
    
    const payoutMap = new Map<string, {
      sellerId: string
      sellerName: string
      sellerEmail: string
      sellerRoom: string
      totalOwed: number
      pendingRentals: number
    }>()

    for (const rental of returnedRentals) {
      // Calculate seller's earning (80% of rent, NOT including security deposit)
      const totalRent = rental.rentPerDay * rental.daysRented
      const platformCut = rental.platformFee * rental.daysRented
      const sellerEarning = totalRent - platformCut
      
      const amountToPay = sellerEarning - rental.sellerPaidOut
      
      if (amountToPay > 0.01) { // Only include if there's money to pay
        const existing = payoutMap.get(rental.sellerId)
        
        if (existing) {
          existing.totalOwed += amountToPay
          existing.pendingRentals += 1
        } else {
          payoutMap.set(rental.sellerId, {
            sellerId: rental.sellerId,
            sellerName: rental.sellerName,
            sellerEmail: rental.sellerEmail,
            sellerRoom: rental.sellerRoom,
            totalOwed: amountToPay,
            pendingRentals: 1
          })
        }
      }
    }

    const payoutSummary = Array.from(payoutMap.values())

    return NextResponse.json({ rentals, payoutSummary })
  } catch (error) {
    console.error('Error fetching rentals:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

