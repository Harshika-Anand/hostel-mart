// src/app/api/rentals/my/route.ts
// ============================================
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'CUSTOMER') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const rentals = await prisma.rentalTransaction.findMany({
      where: { renterId: session.user.id },
      orderBy: { rentedAt: 'desc' }
    })

    return NextResponse.json(rentals)
  } catch (error) {
    console.error('Error fetching rentals:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}