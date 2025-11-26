'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'

export default function SellRentPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [checking, setChecking] = useState(true)
  const [profileStatus, setProfileStatus] = useState<'complete' | 'needs-profile' | 'needs-verification'>('complete')

  useEffect(() => {
    if (status === 'loading') return
    
    if (!session) {
      router.push('/auth/signin')
      return
    }

    checkProfileStatus()
  }, [session, status, router])

  const checkProfileStatus = async () => {
    try {
      const response = await fetch('/api/profile')
      const profile = await response.json()

      // Check if profile is complete
      if (!profile.phone || !profile.roomNumber) {
        setProfileStatus('needs-profile')
        setChecking(false)
        // Redirect in useEffect, not during render
        router.push('/profile/complete')
        return
      }

      // Check if email is verified
     /* if (!profile.emailVerified) {
        setProfileStatus('needs-verification')
        setChecking(false)
        return
      }*/

      // All good - redirect to listing form
      setProfileStatus('complete')
      router.push('/sell-rent/new')
    } catch (error) {
      console.error('Error checking profile:', error)
      setChecking(false)
    }
  }

  const handleResendVerification = async () => {
    try {
      const response = await fetch('/api/auth/send-verification', { method: 'POST' })
      const data = await response.json()
      
      if (response.ok) {
        alert('Verification email sent! Check your inbox.')
      } else {
        alert(data.error || 'Failed to send verification email')
      }
    } catch (error) {
      console.error('Error sending verification:', error)
      alert('Failed to send verification email')
    }
  }

  if (status === 'loading' || checking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    )
  }

  if (!session) {
    return null // Will redirect in useEffect
  }

  if (profileStatus === 'needs-profile') {
    return null // Will redirect in useEffect
  }

 /* if (profileStatus === 'needs-verification') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white p-8 rounded-lg shadow max-w-md w-full text-center">
          <div className="text-6xl mb-4">📧</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Verify Your Email</h2>
          <p className="text-gray-600 mb-6">
            Please verify your email address before listing items.
          </p>
          <button
            onClick={handleResendVerification}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 font-medium"
          >
            Resend Verification Email
          </button>
        </div>
      </div>
    )
  }
*/
  return null // Will redirect to /sell-rent/new in useEffect
}