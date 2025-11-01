// src/utils/supabase/server.ts
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies() // ← Promise を解決

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,             // 必須 env は non-null 断定
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, // anon key
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options })
          } catch {
            // Server Component など set 不可の場面では無視
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: '', ...options })
          } catch {
            // 同上
          }
        },
      },
    }
  )
}
