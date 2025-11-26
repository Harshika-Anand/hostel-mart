// src/app/api/listings/my/route.ts
// ============================================
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

    // Fetch seller's listings - simple, no complex calculations
    const listings = await prisma.itemListing.findMany({
      where: {
        sellerId: session.user.id
      },
      include: {
        category: true
      },
      orderBy: {
        createdAt: 'desc'
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