'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import React, { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

export default function TopNav() {
  const pathname = usePathname()
  const [userLabel, setUserLabel] = useState<string | null>(null)
  const hide = pathname === '/login' || pathname === '/signup'

  useEffect(() => {
    if (hide) return
    let mounted = true
    const run = async () => {
      try {
        const { data } = await supabase.auth.getUser()
        const user = data.user
        if (!mounted) return
        if (user?.id) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, username')
            .eq('id', user.id)
            .single()
          const label = (profile?.full_name || profile?.username || user.email || '').trim()
          setUserLabel(label || 'ログイン中')
        } else {
          setUserLabel(null)
        }
      } catch {
        // ignore
      }
    }
    run()
    return () => {
      mounted = false
    }
  }, [hide])

  // Hide on login/signup pages (after calling hooks to keep order stable)
  if (hide) return null

  return (
    <header className="sticky top-0 z-20 border-b bg-blue-700 topbar">
      <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between text-white">
        <Link href="/" className="font-semibold text-white hover:opacity-90">
          AI Meeting App
        </Link>
        <div className="flex items-center gap-3">
          <nav className="flex items-center gap-1 text-sm">
            <Link href="/dashboard" className="px-3 py-2 rounded-md text-white hover:bg-blue-600">
              ToDo
            </Link>
            <Link href="/todos" className="px-3 py-2 rounded-md text-white hover:bg-blue-600">
              全体ToDo
            </Link>
            <Link href="/meetings/new" className="px-3 py-2 rounded-md text-white hover:bg-blue-600">
              会議の要約
            </Link>
            <Link href="/meetings" className="px-3 py-2 rounded-md text-white hover:bg-blue-600">
              会議一覧
            </Link>
            <Link href="/search" className="px-3 py-2 rounded-md text-white hover:bg-blue-600">
              検索
            </Link>
          </nav>
          {userLabel && (
            <div className="flex items-center gap-2 text-sm">
              <span className="px-2 py-1 rounded bg-blue-600/60 text-white">{userLabel}</span>
              <button
                type="button"
                onClick={async () => {
                  try {
                    await supabase.auth.signOut()
                  } finally {
                    window.location.href = '/login'
                  }
                }}
                className="px-3 py-1.5 rounded-md border border-white/20 hover:bg-blue-600 text-white"
              >
                ログアウト
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
