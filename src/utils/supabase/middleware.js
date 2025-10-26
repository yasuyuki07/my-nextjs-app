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
          // request 側へは options を使えないので未使用扱いに（lint 回避）
          cookiesToSet.forEach(({ name, value, options: _options }) => {
            request.cookies.set(name, value)
          })

          // response を作り直して Set-Cookie を付与
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) => {
            supabaseResponse.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  // リフレッシュ（必要なときだけ実行されます）
  await supabase.auth.getUser()

  return supabaseResponse
}
