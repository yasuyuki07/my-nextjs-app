// src/utils/supabase/middleware.js
import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'

export async function updateSession(request) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          // ① 未使用なので options -> _options に変更（eslint ルールに適合）
          cookiesToSet.forEach(({ name, value, options: _options }) => {
            request.cookies.set(name, value)
          })

          // 以降はレスポンス側に確定セット
          supabaseResponse = NextResponse.next({ request })

          // ② こちらの options は実際に使うのでそのまま
          cookiesToSet.forEach(({ name, value, options }) => {
            supabaseResponse.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  // refresh auth token
  await supabase.auth.getUser()

  return supabaseResponse
}
