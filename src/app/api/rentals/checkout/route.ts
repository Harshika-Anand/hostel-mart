// src/app/api/rentals/checkout/route.ts
// ============================================
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'CUSTOMER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { listingId, rentalDays, paymentPin, startDate } = body

    if (!listingId || !rentalDays || !paymentPin || !startDate) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const listing = await prisma.itemListing.findUnique({
      where: { id: listingId },
      include: {
        seller: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            roomNumber: true
          }
        }
      }
    })

    if (!listing || listing.status !== 'LIVE') {
      return NextResponse.json({ error: 'Listing not available' }, { status: 400 })
    }

    const availableQuantity = listing.quantity - listing.currentlyRented
    if (availableQuantity <= 0) {
      return NextResponse.json({ error: 'Item unavailable' }, { status: 400 })
    }

    const renter = await prisma.user.findUnique({
      where: { id: session.user.id }
    })

    if (!renter) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const securityDeposit = listing.securityDeposit || 0
    const totalRent = listing.finalRent * rentalDays
    const totalAmount = totalRent + securityDeposit

    const rental = await prisma.$transaction(async (tx) => {
      const newRental = await tx.rentalTransaction.create({
        data: {
          listingId: listing.id,
          itemName: listing.itemName,
          
          renterId: renter.id,
          renterName: renter.name || '',
          renterEmail: renter.email,
          renterPhone: renter.phone || null,
          renterRoom: renter.roomNumber || null,
          
          sellerId: listing.seller.id,
          sellerName: listing.seller.name || '',
          sellerEmail: listing.seller.email,
          sellerPhone: listing.seller.phone || '',
          sellerRoom: listing.seller.roomNumber || '',
          
          rentPerDay: listing.finalRent,
          platformFee: listing.platformFee,
          sellerEarning: listing.rentPerDay,
          securityDeposit: securityDeposit,
          
          startDate: new Date(startDate),
          daysRented: rentalDays,
          
          totalPaid: totalAmount,
          dailyRate: listing.finalRent,
          amountOwedToSeller: 0,
          sellerPaidOut: 0,
          
          status: 'PENDING',
          paymentStatus: 'PENDING',
          paymentMethod: 'UPI',
          paymentPin: paymentPin
        }
      })

      await tx.itemListing.update({
        where: { id: listing.id },
        data: { currentlyRented: { increment: 1 } }
      })

      return newRental
    })

    return NextResponse.json({
      message: 'Rental request submitted',
      rental,
      totalAmount
    }, { status: 201 })

  } catch (error) {
    console.error('Error processing rental:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}