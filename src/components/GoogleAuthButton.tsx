'use client'

import { useCallback, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

type Props = {
  nextPath?: string
  text?: string
  className?: string
}

const baseButtonClass =
  'w-full flex items-center justify-center gap-2 rounded-md border border-blue-600 bg-blue-600 px-4 py-2 text-sm font-medium text-white !text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-white disabled:opacity-60 disabled:cursor-not-allowed'

export default function GoogleAuthButton({
  nextPath = '/',
  text = 'Googleでログイン',
  className,
}: Props) {
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleGoogleSignIn = useCallback(async () => {
    if (pending) return
    setError(null)
    setPending(true)
    try {
      const origin = window.location.origin
      const sanitizedNext = nextPath.startsWith('/') ? nextPath : '/'
      const redirectTo = `${origin}/auth/callback?next=${encodeURIComponent(sanitizedNext)}`

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
        },
      })

      if (error) {
        setError(error.message)
        setPending(false)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Googleログインで問題が発生しました')
      setPending(false)
    }
  }, [nextPath, pending])

  const classes = [baseButtonClass, className].filter(Boolean).join(' ')

  return (
    <div className="space-y-2">
      <button type="button" onClick={handleGoogleSignIn} disabled={pending} className={classes}>
        <GoogleIcon />
        <span className="text-white !text-white" style={{ color: '#fff' }}>
          {pending ? 'Googleにリダイレクト中…' : text}
        </span>
      </button>
      {error && (
        <p className="text-sm text-red-600" role="alert" aria-live="polite">
          {error}
        </p>
      )}
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
      <path
        fill="#EA4335"
        d="M5.266 14.383l-.83 3.099-3.037.064A11.955 11.955 0 010 12c0-1.99.478-3.864 1.323-5.512l2.706.497 1.187 2.693A7.143 7.143 0 003.57 12c0 .78.133 1.528.37 2.383z"
      />
      <path
        fill="#34A853"
        d="M23.79 9.758A12.002 12.002 0 0124 12c0 3.645-1.582 6.932-4.137 9.209l-3.343-.171-.473-2.997a7.163 7.163 0 003.082-3.663h-6.431v-4.62h11.092z"
      />
      <path
        fill="#4A90E2"
        d="M7.164 4.89l-2.748-2.1A11.996 11.996 0 0112 0c2.744 0 5.26.977 7.223 2.779L16.617 5.73A7.114 7.114 0 0012 4.857a7.129 7.129 0 00-4.836 2.007z"
      />
      <path
        fill="#FBBC05"
        d="M4.46 18.813A11.997 11.997 0 0112 24c2.904 0 5.555-1.04 7.61-2.79l-3.537-2.892A7.08 7.08 0 0112 19.143a7.131 7.131 0 01-6.734-4.76l-.806 4.43z"
      />
    </svg>
  )
}
