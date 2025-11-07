import { NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// Simple email sending (you can use nodemailer, resend, etc.)
async function sendVerificationEmail(email: string, token: string) {
  // For now, just log it - you'll implement actual email later
  console.log(`
    ═══════════════════════════════════
    VERIFICATION EMAIL
    To: ${email}
    Token: ${token}
    Link: ${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/verify-email?token=${token}
    ═══════════════════════════════════
  `)
  
  // TODO: Implement actual email sending
}



export async function POST() {
  try {
    const session = await getServerSession(authOptions)
    console.log('Session:', JSON.stringify(session, null, 2))
    
    if (!session) {
      console.log('NO SESSION - Returning 401')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    console.log('Session exists, user ID:', session.user.id)
    
    const user = await prisma.user.findUnique({
      where: { id: session.user.id }
    })
    
    console.log('User found:', user ? 'YES' : 'NO')
    console.log('User details:', JSON.stringify(user, null, 2))

    console.log('Send verification - User:', user) // DEBUG

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    if (user.emailVerified) {
      return NextResponse.json({ 
        message: 'Email already verified',
        alreadyVerified: true 
      })
    }

    // Generate 6-digit token
    const token = Math.floor(100000 + Math.random() * 900000).toString()
    
    // Set expiry to 24 hours
    const expiresAt = new Date()
    expiresAt.setHours(expiresAt.getHours() + 24)

    console.log('Generating token:', token) // DEBUG

    // Store verification token
    await prisma.emailVerification.create({
      data: {
        userId: user.id,
        email: user.email,
        token,
        expiresAt
      }
    })

    console.log('Token stored in database') // DEBUG

    // Send email
    await sendVerificationEmail(user.email, token)

    console.log('Email sent successfully') // DEBUG

    return NextResponse.json({ 
      message: 'Verification email sent',
      email: user.email 
    })
  } catch (error) {
    console.error('Error sending verification:', error)
    
    // Return detailed error info
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}