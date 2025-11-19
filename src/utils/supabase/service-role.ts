import 'server-only'

import { createClient, type SupabaseClient } from '@supabase/supabase-js'

let singleton: SupabaseClient | null | undefined

function missingEnvWarning(name: string) {
  if (process.env.NODE_ENV !== 'production') {
    console.warn(`[supabase] ${name} is not configured on the server. Falling back to anon client.`)
  }
}

export function getServiceRoleSupabase(): SupabaseClient | null {
  if (singleton !== undefined) return singleton

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceRoleKey) {
    missingEnvWarning(!url ? 'NEXT_PUBLIC_SUPABASE_URL' : 'SUPABASE_SERVICE_ROLE_KEY')
    singleton = null
    return singleton
  }

  singleton = createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })

  return singleton
}
