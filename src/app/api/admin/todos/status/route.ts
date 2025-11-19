import { NextResponse } from 'next/server'

import { createClient } from '@/utils/supabase/server'
import { getServiceRoleSupabase } from '@/utils/supabase/service-role'

type DbStatus = 'open' | 'in_progress' | 'done'

const normalizeStatus = (raw: string): DbStatus | null => {
  const key = raw.trim().toLowerCase()
  if (key === 'in_progress' || key === 'in-progress' || key === 'inprogress' || key === 'doing') {
    return 'in_progress'
  }
  if (key === 'done') return 'done'
  if (key === 'open') return 'open'
  return null
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user?.id) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  const payload = (await req.json().catch(() => ({}))) as Partial<{ id: string; status: string }>
  const id = typeof payload.id === 'string' ? payload.id.trim() : ''
  const status = typeof payload.status === 'string' ? normalizeStatus(payload.status) : null

  if (!id || !status) {
    return NextResponse.json({ error: 'Invalid todo id or status value' }, { status: 400 })
  }

  const adminClient = getServiceRoleSupabase()
  if (!adminClient) {
    return NextResponse.json(
      { error: 'SUPABASE_SERVICE_ROLE_KEY is not configured on the server.' },
      { status: 500 }
    )
  }

  const { error } = await adminClient.from('todos').update({ status }).eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
