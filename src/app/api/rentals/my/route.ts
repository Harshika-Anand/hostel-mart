// src/app/api/rentals/my/route.ts
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// Helper to calculate daily accumulation for a rental
async function updateRentalDays(rentalId: string) {
  const rental = await prisma.rentalTransaction.findUnique({
    where: { id: rentalId }
  })

  if (!rental || rental.status !== 'ACTIVE') return

  const now = new Date()
  const startDate = new Date(rental.startDate)
  const daysSinceStart = Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))

  if (daysSinceStart !== rental.daysRented) {
    await prisma.rentalTransaction.update({
      where: { id: rentalId },
      data: {
        daysRented: daysSinceStart,
        amountOwedToSeller: rental.sellerEarning * daysSinceStart,
        lastCalculated: now
      }
    })
  }
}

// GET - Fetch user's rentals (items they're renting)
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'CUSTOMER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get all rentals where this user is the renter
    const rentals = await prisma.rentalTransaction.findMany({
      where: {
        renterId: session.user.id
      },
      orderBy: {
        rentedAt: 'desc'
      }
    })

    // Update days rented for active rentals
    for (const rental of rentals) {
      if (rental.status === 'ACTIVE') {
        await updateRentalDays(rental.id)
      }
    }

    // Fetch updated data
    const updatedRentals = await prisma.rentalTransaction.findMany({
      where: {
        renterId: session.user.id
      },
      orderBy: {
        rentedAt: 'desc'
      }
    })

    return NextResponse.json(updatedRentals)
  } catch (error) {
    console.error('Error fetching user rentals:', error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}