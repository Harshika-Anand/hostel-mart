// FILE 1: src/app/api/admin/rentals/[id]/route.ts
// FIXED: Correct payout calculation
// ============================================
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()

    const rental = await prisma.rentalTransaction.findUnique({
      where: { id }
    })

    if (!rental) {
      return NextResponse.json({ error: 'Rental not found' }, { status: 404 })
    }

    // ✅ APPROVE PAYMENT & ACTIVATE
    if (body.paymentStatus === 'PAID' && body.status === 'ACTIVE') {
      // Calculate what seller will earn (80% of rent, excluding security deposit)
      const totalRent = rental.rentPerDay * rental.daysRented
      const platformCut = rental.platformFee * rental.daysRented // 20%
      const sellerEarning = totalRent - platformCut // 80%
      
      console.log('💰 Activating rental:', {
        totalRent,
        platformCut,
        sellerEarning,
        securityDeposit: rental.securityDeposit,
        note: 'Security deposit will be returned to customer, not included in seller payout'
      })
      
      const updated = await prisma.rentalTransaction.update({
        where: { id },
        data: {
          paymentStatus: 'PAID',
          status: 'ACTIVE',
          // Seller gets 80% of rent only (NOT security deposit)
          amountOwedToSeller: sellerEarning
        }
      })
      
      return NextResponse.json(updated)
    }

    // ✅ MARK AS RETURNED
    if (body.status === 'RETURNED') {
      const updated = await prisma.$transaction(async (tx) => {
        const updatedRental = await tx.rentalTransaction.update({
          where: { id },
          data: {
            status: 'RETURNED',
            returnedAt: new Date()
            // amountOwedToSeller stays as calculated during activation (80% of rent)
          }
        })

        // Free up inventory
        await tx.itemListing.update({
          where: { id: rental.listingId },
          data: { currentlyRented: { decrement: 1 } }
        })

        return updatedRental
      })

      console.log('📦 Item returned. Seller payout ready:', {
        amountOwedToSeller: updated.amountOwedToSeller,
        securityDepositReturnedToCustomer: rental.securityDeposit
      })

      return NextResponse.json(updated)
    }

    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })

  } catch (error) {
    console.error('Error updating rental:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
