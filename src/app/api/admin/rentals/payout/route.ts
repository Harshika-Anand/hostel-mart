import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { sellerId, amount } = await request.json()

    if (!sellerId || !amount) {
      return NextResponse.json({ 
        error: 'Seller ID and amount are required' 
      }, { status: 400 })
    }

    // Get all rentals for this seller that have pending payouts
    const rentalsToSettle = await prisma.rentalTransaction.findMany({
      where: {
        sellerId,
        OR: [
          { status: 'ACTIVE' },
          { 
            status: 'RETURNED',
            paymentStatus: { not: 'SETTLED' }
          }
        ]
      }
    })

    let remainingAmount = amount

    // Update each rental's paidOut amount
    for (const rental of rentalsToSettle) {
      const owedAmount = rental.amountOwedToSeller - rental.sellerPaidOut
      
      if (owedAmount <= 0) continue

      const payoutAmount = Math.min(owedAmount, remainingAmount)
      
      await prisma.rentalTransaction.update({
        where: { id: rental.id },
        data: {
          sellerPaidOut: {
            increment: payoutAmount
          },
          paymentStatus: (rental.amountOwedToSeller - rental.sellerPaidOut - payoutAmount) <= 0.01 
            ? 'SETTLED' 
            : rental.paymentStatus
        }
      })

      remainingAmount -= payoutAmount

      if (remainingAmount <= 0) break
    }

    return NextResponse.json({ 
      message: 'Payout processed successfully',
      amountPaid: amount - remainingAmount
    })
  } catch (error) {
    console.error('Error processing payout:', error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}