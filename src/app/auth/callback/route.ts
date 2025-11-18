import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const error = url.searchParams.get('error_description') || url.searchParams.get('error')
  const next = url.searchParams.get('next')

  const nextPath = next && next.startsWith('/') ? next : '/'

  if (code) {
    const supabase = await createClient()
    await supabase.auth.exchangeCodeForSession(code)
  }

  const target = error
    ? `/login?error=${encodeURIComponent(error)}`
    : nextPath

  return NextResponse.redirect(new URL(target, url.origin))
}
