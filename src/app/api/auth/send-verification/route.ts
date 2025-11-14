// src/app/api/auth/send-verification/route.ts
import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { sendVerificationEmail } from "@/lib/email"

export async function POST() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const user = await prisma.user.findUnique({
      where: { id: session.user.id }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    if (user.emailVerified) {
      return NextResponse.json({ 
        message: 'Email already verified',
        alreadyVerified: true 
      })
    }

    // Generate secure token (UUID v4)
    const token = crypto.randomUUID()
    
    // Set expiry to 24 hours
    const expiresAt = new Date()
    expiresAt.setHours(expiresAt.getHours() + 24)

    // Store verification token
    await prisma.emailVerification.create({
      data: {
        userId: user.id,
        email: user.email,
        token,
        expiresAt
      }
    })

    // Send email using Resend
    const emailResult = await sendVerificationEmail(user.email, token)

    if (!emailResult.success) {
      throw new Error('Failed to send email')
    }

    return NextResponse.json({ 
      message: 'Verification email sent',
      email: user.email 
    })
  } catch (error) {
    console.error('Error sending verification:', error)
    
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}