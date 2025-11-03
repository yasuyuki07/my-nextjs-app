import type { NextRequest } from 'next/server'
import { updateSession } from '@/utils/supabase/middleware'

export const config = {
  // 静的アセットなどを除外
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}

export function middleware(req: NextRequest) {
  // 既存の updateSession をそのまま利用
  return updateSession(req as any)
}