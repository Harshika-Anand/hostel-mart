// File: src/app/api/listings/route.ts
// Complete fixed version with proper TypeScript typing

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ListingStatus } from '@prisma/client'

// GET - Fetch listings with optional status filter
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    // Allow both authenticated users and admins
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')

    // Type-safe status filter
    const whereClause = status && status !== 'all' 
      ? { status: status as ListingStatus } 
      : {}

    // For customers, only show LIVE listings
    // For admins, show based on status filter
    const finalWhereClause = session.user.role === 'ADMIN' 
      ? whereClause 
      : { status: 'LIVE' as ListingStatus, isAvailable: true }

    const listings = await prisma.itemListing.findMany({
      where: finalWhereClause,
      include: {
        seller: {
          select: {
            id: true,
            name: true,
            email: true,
            roomNumber: true,
            phone: true
          }
        },
        category: {
          select: {
            id: true,
            name: true
          }
        },
        rentalTransactions: {
          where: {
            status: 'ACTIVE'
          },
          select: {
            id: true,
            startDate: true,
            endDate: true,
            daysRented: true
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
    return NextResponse.json(
      { error: 'Failed to fetch listings' },
      { status: 500 }
    )
  }
}

// POST - Create new listing (authenticated users only)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user can list items
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { canListItems: true, emailVerified: true, name: true, roomNumber: true, phone: true }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    if (!user.emailVerified) {
      return NextResponse.json(
        { error: 'Please verify your email before listing items' },
        { status: 403 }
      )
    }

    if (!user.canListItems) {
      return NextResponse.json(
        { error: 'You are not allowed to list items' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const {
      itemName,
      description,
      categoryId,
      images,
      rentPerDay,
      securityDeposit,
      quantity
    } = body

    // Validate required fields
    if (!itemName || !description || !categoryId || !rentPerDay) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Calculate platform fee (20%) and final rent
    const platformFee = Math.round(rentPerDay * 0.20 * 100) / 100
    const finalRent = rentPerDay + platformFee

    // Create listing
    const listing = await prisma.itemListing.create({
      data: {
        sellerId: session.user.id,
        itemName,
        description,
        categoryId,
        images: images || [],
        rentPerDay: parseFloat(rentPerDay),
        platformFee,
        finalRent,
        securityDeposit: securityDeposit ? parseFloat(securityDeposit) : null,
        quantity: quantity || 1,
        sellerName: user.name,
        sellerRoom: user.roomNumber || 'N/A',
        sellerPhone: user.phone || 'N/A',
        status: 'PENDING' as ListingStatus
      },
      include: {
        category: true,
        seller: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    })

    return NextResponse.json(listing, { status: 201 })
  } catch (error) {
    console.error('Error creating listing:', error)
    return NextResponse.json(
      { error: 'Failed to create listing' },
      { status: 500 }
    )
  }
}