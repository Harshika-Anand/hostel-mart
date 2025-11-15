// src/app/api/listings/my-with-rentals/route.ts
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's listings
    const listings = await prisma.itemListing.findMany({
      where: {
        sellerId: session.user.id
      },
      include: {
        category: true,
        rentalTransactions: {
          where: {
            OR: [
              { status: 'ACTIVE' },
              { status: 'PENDING' }
            ]
          }
        }
      },
      orderBy: {
        submittedAt: 'desc'
      }
    })

    // Calculate rental info for each listing
    const listingsWithRentalInfo = listings.map(listing => {
      const activeRentals = listing.rentalTransactions.filter(r => 
        r.status === 'ACTIVE' || r.status === 'PENDING'
      )
      
      const totalEarnings = activeRentals.reduce((sum, rental) => 
        sum + rental.amountOwedToSeller, 0
      )
      
      const pendingPayout = activeRentals.reduce((sum, rental) => 
        sum + (rental.amountOwedToSeller - rental.sellerPaidOut), 0
      )

      return {
        ...listing,
        rentalInfo: {
          activeRentals: activeRentals.length,
          totalEarnings,
          pendingPayout
        },
        // Remove rentalTransactions from response to keep it clean
        rentalTransactions: undefined
      }
    })

    return NextResponse.json(listingsWithRentalInfo)
  } catch (error) {
    console.error('Error fetching listings with rentals:', error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}