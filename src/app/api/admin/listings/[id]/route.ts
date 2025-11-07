import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// PATCH - Approve/Reject listing
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
    const { status, rejectionReason } = body

    // Validate status
    const validStatuses = ['PENDING', 'APPROVED', 'REJECTED', 'LIVE', 'RENTED', 'INACTIVE']
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ 
        error: 'Invalid status' 
      }, { status: 400 })
    }

    const updateData: any = {
      status,
      reviewedAt: new Date()
    }

    // If approving, set as LIVE
    if (status === 'APPROVED') {
      updateData.status = 'LIVE'
      updateData.listedAt = new Date()
    }

    // If rejecting, require reason
    if (status === 'REJECTED') {
      if (!rejectionReason) {
        return NextResponse.json({ 
          error: 'Rejection reason is required' 
        }, { status: 400 })
      }
      updateData.rejectionReason = rejectionReason
    }

    const listing = await prisma.itemListing.update({
      where: { id },
      data: updateData,
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

    return NextResponse.json(listing)
  } catch (error) {
    console.error('Error updating listing:', error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}

// DELETE - Delete listing
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await context.params

    await prisma.itemListing.delete({
      where: { id }
    })

    return NextResponse.json({ message: 'Listing deleted successfully' })
  } catch (error) {
    console.error('Error deleting listing:', error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}