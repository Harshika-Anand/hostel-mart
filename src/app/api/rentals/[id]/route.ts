// src/app/api/rentals/[id]/route.ts
// ============================================
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

    const rental = await prisma.rentalTransaction.findUnique({
      where: { id },
      include: {
        listing: {
          include: {
            category: true
          }
        }
      }
    })

    if (!rental) {
      return NextResponse.json({ error: 'Rental not found' }, { status: 404 })
    }

    // Check access
    const hasAccess = 
      session.user.id === rental.renterId ||
      session.user.id === rental.sellerId ||
      session.user.role === 'ADMIN'

    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    return NextResponse.json(rental)
  } catch (error) {
    console.error('Error fetching rental:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

