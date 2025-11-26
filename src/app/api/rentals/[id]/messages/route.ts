// src/app/api/rentals/[id]/messages/route.ts
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// GET - Fetch messages for a rental
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Await params before accessing properties
    const { id: rentalId } = await params

    // Verify user is part of this rental
    const rental = await prisma.rentalTransaction.findUnique({
      where: { id: rentalId },
      select: {
        renterId: true,
        sellerId: true
      }
    })

    if (!rental) {
      return NextResponse.json({ error: 'Rental not found' }, { status: 404 })
    }

    // Check if user is either renter or seller
    if (rental.renterId !== session.user.id && rental.sellerId !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Fetch messages
    const messages = await prisma.rentalMessage.findMany({
      where: { rentalId },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            role: true
          }
        }
      },
      orderBy: {
        createdAt: 'asc'
      }
    })

    return NextResponse.json(messages)
  } catch (error) {
    console.error('Error fetching rental messages:', error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}

// POST - Send a message
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Await params before accessing properties
    const { id: rentalId } = await params
    const body = await request.json()
    const { message } = body

    if (!message || !message.trim()) {
      return NextResponse.json({ 
        error: 'Message cannot be empty' 
      }, { status: 400 })
    }

    // Verify user is part of this rental
    const rental = await prisma.rentalTransaction.findUnique({
      where: { id: rentalId },
      select: {
        renterId: true,
        sellerId: true,
        status: true
      }
    })

    if (!rental) {
      return NextResponse.json({ error: 'Rental not found' }, { status: 404 })
    }

    // Check if user is either renter or seller
    if (rental.renterId !== session.user.id && rental.sellerId !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Only allow messages for active rentals
    if (rental.status !== 'ACTIVE') {
      return NextResponse.json({ 
        error: 'Can only message during active rentals' 
      }, { status: 400 })
    }

    // Create message
    const newMessage = await prisma.rentalMessage.create({
      data: {
        rentalId,
        senderId: session.user.id,
        message: message.trim()
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            role: true
          }
        }
      }
    })

    return NextResponse.json(newMessage, { status: 201 })
  } catch (error) {
    console.error('Error sending message:', error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}