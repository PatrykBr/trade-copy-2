'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase-client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CheckCircle, XCircle, Loader2 } from 'lucide-react'
import Link from 'next/link'

export default function VerifyPage() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('')
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const handleEmailVerification = async () => {
      try {
        const token_hash = searchParams.get('token_hash')
        const type = searchParams.get('type')

        if (type === 'email' && token_hash) {
          const { error } = await supabase.auth.verifyOtp({
            token_hash,
            type: 'email'
          })

          if (error) {
            setStatus('error')
            setMessage(error.message)
          } else {
            setStatus('success')
            setMessage('Your email has been verified successfully!')
            
            // Redirect to dashboard after 3 seconds
            setTimeout(() => {
              router.push('/dashboard')
            }, 3000)
          }
        } else {
          setStatus('error')
          setMessage('Invalid verification link')
        }
      } catch (error) {
        setStatus('error')
        setMessage('An unexpected error occurred')
      }
    }

    handleEmailVerification()
  }, [searchParams, router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-gray-900">
            Email Verification
          </CardTitle>
          <CardDescription>
            Verifying your email address...
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          {status === 'loading' && (
            <div className="space-y-4">
              <Loader2 className="h-12 w-12 animate-spin mx-auto text-blue-600" />
              <p className="text-gray-600">Verifying your email...</p>
            </div>
          )}

          {status === 'success' && (
            <div className="space-y-4">
              <CheckCircle className="h-12 w-12 mx-auto text-green-600" />
              <div>
                <h3 className="text-lg font-medium text-green-900 mb-2">
                  Verification Successful!
                </h3>
                <p className="text-green-700 mb-4">{message}</p>
                <p className="text-sm text-gray-600">
                  Redirecting to dashboard in 3 seconds...
                </p>
              </div>
              <Link href="/dashboard">
                <Button className="w-full">
                  Go to Dashboard
                </Button>
              </Link>
            </div>
          )}

          {status === 'error' && (
            <div className="space-y-4">
              <XCircle className="h-12 w-12 mx-auto text-red-600" />
              <div>
                <h3 className="text-lg font-medium text-red-900 mb-2">
                  Verification Failed
                </h3>
                <p className="text-red-700 mb-4">{message}</p>
              </div>
              <div className="space-y-2">
                <Link href="/auth/login">
                  <Button variant="outline" className="w-full">
                    Back to Login
                  </Button>
                </Link>
                <Link href="/auth/register">
                  <Button className="w-full">
                    Create New Account
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

