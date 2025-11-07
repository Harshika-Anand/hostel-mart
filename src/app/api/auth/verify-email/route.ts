import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json()

    if (!token) {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 })
    }

    // Find verification record
    const verification = await prisma.emailVerification.findUnique({
      where: { token }
    })

    if (!verification) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 400 })
    }

    if (verification.isUsed) {
      return NextResponse.json({ error: 'Token already used' }, { status: 400 })
    }

    if (new Date() > verification.expiresAt) {
      return NextResponse.json({ error: 'Token expired' }, { status: 400 })
    }

    // Mark email as verified
    await prisma.user.update({
      where: { id: verification.userId },
      data: { emailVerified: true }
    })

    // Mark token as used
    await prisma.emailVerification.update({
      where: { id: verification.id },
      data: { isUsed: true }
    })

    return NextResponse.json({ message: 'Email verified successfully' })
  } catch (error) {
    console.error('Error verifying email:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}