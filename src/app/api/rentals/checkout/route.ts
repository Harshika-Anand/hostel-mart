// src/app/api/rentals/checkout/route.ts
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
    const { 
      listingId,
      rentalDays,
      paymentPin,
      startDate 
    } = body

    // Validation
    if (!listingId || !rentalDays || !paymentPin || !startDate) {
      return NextResponse.json({ 
        error: 'Missing required fields' 
      }, { status: 400 })
    }

    if (rentalDays < 1) {
      return NextResponse.json({ 
        error: 'Rental period must be at least 1 day' 
      }, { status: 400 })
    }

    // Get listing details
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
        },
        category: true
      }
    })

    if (!listing) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 })
    }

    if (listing.status !== 'LIVE') {
      return NextResponse.json({ error: 'Listing is not available' }, { status: 400 })
    }

    // Check availability
    const availableQuantity = listing.quantity - listing.currentlyRented
    if (availableQuantity <= 0) {
      return NextResponse.json({ 
        error: 'Item is currently unavailable for rent' 
      }, { status: 400 })
    }

    // Get renter details
    const renter = await prisma.user.findUnique({
      where: { id: session.user.id }
    })

    if (!renter) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Calculate costs
    const rentPerDay = listing.finalRent
    const totalRent = rentPerDay * rentalDays
    const securityDeposit = listing.securityDeposit || 0
    const totalAmount = totalRent + securityDeposit

    const platformFeePerDay = listing.platformFee
    const sellerEarningPerDay = listing.rentPerDay

    // Create rental transaction
    const rental = await prisma.$transaction(async (tx) => {
      // Create the rental transaction
      const newRental = await tx.rentalTransaction.create({
        data: {
          listingId: listing.id,
          itemName: listing.itemName,
          
          // Renter info
          renterId: renter.id,
          renterName: renter.name,
          renterEmail: renter.email,
          renterPhone: renter.phone || null,
          renterRoom: renter.roomNumber || null,
          
          // Seller info
          sellerId: listing.seller.id,
          sellerName: listing.seller.name,
          sellerEmail: listing.seller.email,
          sellerPhone: listing.seller.phone || '',
          sellerRoom: listing.seller.roomNumber || '',
          
          // Financial
          rentPerDay: rentPerDay,
          platformFee: platformFeePerDay,
          sellerEarning: sellerEarningPerDay,
          securityDeposit: securityDeposit,
          
          // Rental period
          startDate: new Date(startDate),
          daysRented: 0, // Will be calculated daily
          
          // Payment
          totalPaid: totalAmount,
          dailyRate: rentPerDay,
          amountOwedToSeller: 0, // Will be calculated daily
          
          status: 'PENDING',
          paymentStatus: 'PENDING',
          paymentMethod: 'UPI',
          paymentPin: paymentPin
        }
      })

      // Update listing - mark one unit as rented
      await tx.itemListing.update({
        where: { id: listing.id },
        data: {
          currentlyRented: {
            increment: 1
          }
        }
      })

      return newRental
    })

    return NextResponse.json({
      message: 'Rental request submitted',
      rental,
      totalAmount,
      breakdown: {
        rentPerDay,
        rentalDays,
        totalRent,
        securityDeposit,
        totalAmount
      }
    }, { status: 201 })

  } catch (error) {
    console.error('Error processing rental:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}