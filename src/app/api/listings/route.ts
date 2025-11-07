import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// POST - Submit new rental listing
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'CUSTOMER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user profile is complete and verified
    const user = await prisma.user.findUnique({
      where: { id: session.user.id }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    if (!user.phone || !user.roomNumber) {
      return NextResponse.json({ 
        error: 'Please complete your profile first' 
      }, { status: 400 })
    }

    if (!user.emailVerified) {
      return NextResponse.json({ 
        error: 'Please verify your email first' 
      }, { status: 400 })
    }

    const body = await request.json()
    const { 
      itemName, 
      description, 
      categoryId, 
      rentPerDay, 
      securityDeposit,
      quantity 
    } = body

    // Validation
    if (!itemName || !description || !categoryId || !rentPerDay) {
      return NextResponse.json({ 
        error: 'Item name, description, category, and rent per day are required' 
      }, { status: 400 })
    }

    const parsedRentPerDay = parseFloat(rentPerDay)
    const parsedSecurityDeposit = securityDeposit ? parseFloat(securityDeposit) : 0
    const parsedQuantity = quantity ? parseInt(quantity) : 1

    if (isNaN(parsedRentPerDay) || parsedRentPerDay <= 0) {
      return NextResponse.json({ 
        error: 'Invalid rent amount' 
      }, { status: 400 })
    }

    // Calculate platform fee (20%) and final rent
    const platformFee = parsedRentPerDay * 0.20
    const finalRent = parsedRentPerDay + platformFee

    // Create listing
    const listing = await prisma.itemListing.create({
      data: {
        sellerId: user.id,
        itemName,
        description,
        categoryId,
        images: [], // We'll handle image upload later
        listingType: 'RENT',
        rentPerDay: parsedRentPerDay,
        platformFee,
        finalRent,
        securityDeposit: parsedSecurityDeposit,
        quantity: parsedQuantity,
        status: 'PENDING',
        sellerName: user.name,
        sellerRoom: user.roomNumber,
        sellerPhone: user.phone
      },
      include: {
        category: true,
        seller: {
          select: {
            name: true,
            email: true
          }
        }
      }
    })

    return NextResponse.json(listing, { status: 201 })
  } catch (error) {
    console.error('Error creating listing:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}

// GET - Fetch listings (we'll use this later for displaying in shop)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')

    const listings = await prisma.itemListing.findMany({
      where: {
        ...(status && status !== 'all' ? { status } : {})
      },
      include: {
        category: true,
        seller: {
          select: {
            name: true,
            email: true
          }
        }
      },
      orderBy: {
        submittedAt: 'desc'
      }
    })

    return NextResponse.json(listings)
  } catch (error) {
    console.error('Error fetching listings:', error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}