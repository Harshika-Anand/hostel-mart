// ============================================
// FILE 2: src/app/api/admin/rentals/payout/route.ts
// FIXED: Shows correct payout amounts
// ============================================
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get all returned rentals where seller hasn't been fully paid
    const pendingPayouts = await prisma.rentalTransaction.findMany({
      where: {
        status: 'RETURNED',
        // Only show rentals where seller still needs payment
        OR: [
          { amountOwedToSeller: { gt: 0 } },
          {
            AND: [
              { amountOwedToSeller: { lte: 0 } },
              { sellerPaidOut: { lt: prisma.rentalTransaction.fields.amountOwedToSeller } }
            ]
          }
        ]
      },
      include: {
        listing: {
          select: {
            itemName: true
          }
        },
        seller: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            roomNumber: true
          }
        },
        renter: {
          select: {
            name: true,
            email: true
          }
        }
      },
      orderBy: {
        returnedAt: 'asc'
      }
    })

    // Calculate correct breakdown for each payout
    const payoutsWithCalculations = pendingPayouts
      .map(rental => {
        const totalRent = rental.rentPerDay * rental.daysRented
        const platformCut = rental.platformFee * rental.daysRented
        const sellerEarning = totalRent - platformCut // 80% of rent
        
        const remainingOwed = sellerEarning - rental.sellerPaidOut
        
        return {
          ...rental,
          calculations: {
            totalCustomerPaid: rental.totalPaid, // Rent + Security
            rentPortion: totalRent,
            securityDeposit: rental.securityDeposit || 0,
            platformFee: platformCut, // 20%
            sellerEarning: sellerEarning, // 80%
            alreadyPaidToSeller: rental.sellerPaidOut,
            remainingOwed: Math.max(0, remainingOwed)
          }
        }
      })
      .filter(p => p.calculations.remainingOwed > 0) // Only show if money is owed

    return NextResponse.json(payoutsWithCalculations)

  } catch (error) {
    console.error('Error fetching payouts:', error)
    return NextResponse.json({ error: 'Failed to fetch payouts' }, { status: 500 })
  }
}

// Mark payout as completed
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { transactionId, amountPaid, paymentMethod, notes } = await request.json()

    if (!transactionId || !amountPaid) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const rental = await prisma.rentalTransaction.findUnique({
      where: { id: transactionId }
    })

    if (!rental) {
      return NextResponse.json({ error: 'Rental not found' }, { status: 404 })
    }

    // Calculate total seller earning (80% of rent only, NOT security deposit)
    const totalRent = rental.rentPerDay * rental.daysRented
    const platformCut = rental.platformFee * rental.daysRented
    const totalSellerEarning = totalRent - platformCut
    const remainingOwed = totalSellerEarning - rental.sellerPaidOut

    if (amountPaid > remainingOwed + 0.01) { // Small buffer for floating point
      return NextResponse.json({ 
        error: `Cannot pay more than owed. Remaining: ₹${remainingOwed.toFixed(2)}`,
        details: {
          totalSellerEarning: totalSellerEarning.toFixed(2),
          alreadyPaid: rental.sellerPaidOut.toFixed(2),
          remainingOwed: remainingOwed.toFixed(2)
        }
      }, { status: 400 })
    }

    // Update the rental transaction
    const newPaidAmount = rental.sellerPaidOut + amountPaid
    const newRemainingOwed = totalSellerEarning - newPaidAmount
    
    const updatedRental = await prisma.rentalTransaction.update({
      where: { id: transactionId },
      data: {
        sellerPaidOut: newPaidAmount,
        amountOwedToSeller: Math.max(0, newRemainingOwed),
        paymentStatus: newRemainingOwed <= 0.01 ? 'SETTLED' : 'PAID',
        adminNotes: notes 
          ? `${rental.adminNotes || ''}\n[${new Date().toLocaleString('en-IN')}] Paid ₹${amountPaid} via ${paymentMethod}. ${notes}`.trim()
          : rental.adminNotes
      }
    })

    console.log('💸 Payout recorded:', {
      seller: rental.sellerName,
      amountPaid,
      newTotal: newPaidAmount,
      remaining: newRemainingOwed,
      status: updatedRental.paymentStatus
    })

    return NextResponse.json({ 
      message: 'Payout recorded successfully',
      rental: updatedRental,
      summary: {
        paidNow: amountPaid,
        totalPaid: newPaidAmount,
        remaining: Math.max(0, newRemainingOwed),
        isFullyPaid: newRemainingOwed <= 0.01
      }
    })

  } catch (error) {
    console.error('Error recording payout:', error)
    return NextResponse.json({ error: 'Failed to record payout' }, { status: 500 })
  }
}
