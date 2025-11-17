// src/app/api/admin/rentals/[id]/route.ts
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { Prisma } from "@prisma/client"

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await context.params
    const body = await request.json()
    const { status, paymentStatus } = body

    const rental = await prisma.rentalTransaction.findUnique({
      where: { id }
    })

    if (!rental) {
      return NextResponse.json({ error: 'Rental not found' }, { status: 404 })
    }

    // Use Prisma's generated type for the update data
    const updateData: Prisma.RentalTransactionUpdateInput = {}

    // Handle status updates
    if (status) {
      updateData.status = status
      
      if (status === 'RETURNED') {
        updateData.returnedAt = new Date()
        
        // Release the listing quantity
        await prisma.itemListing.update({
          where: { id: rental.listingId },
          data: {
            currentlyRented: {
              decrement: 1
            }
          }
        })
      }
    }

    // Handle payment status updates
    if (paymentStatus) {
      updateData.paymentStatus = paymentStatus
    }

    const updatedRental = await prisma.rentalTransaction.update({
      where: { id },
      data: updateData
    })

    return NextResponse.json(updatedRental)
  } catch (error) {
    console.error('Error updating rental:', error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}