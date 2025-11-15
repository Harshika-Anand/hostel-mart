// src/app/api/listings/[id]/route.ts
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await context.params

    console.log('Fetching listing with ID:', id) // Debug log

    const listing = await prisma.itemListing.findUnique({
      where: { id },
      include: {
        category: true,
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

    console.log('Found listing:', listing ? 'YES' : 'NO') // Debug log

    if (!listing) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 })
    }

    if (listing.status !== 'LIVE') {
      return NextResponse.json({ 
        error: 'This listing is not currently available' 
      }, { status: 400 })
    }

    const availableQuantity = listing.quantity - (listing.currentlyRented || 0)
    if (availableQuantity <= 0) {
      return NextResponse.json({ 
        error: 'This item is currently not available for rent' 
      }, { status: 400 })
    }

    return NextResponse.json(listing)
  } catch (error) {
    console.error('Error fetching listing:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}