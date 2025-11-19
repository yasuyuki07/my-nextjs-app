// src/app/todos/page.tsx
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { getServiceRoleSupabase } from '@/utils/supabase/service-role'
import AllTodosClient, { AdminTodo } from './AllTodosClient'

type DbStatus = 'open' | 'in_progress' | 'done'

type RawTodo = {
  id: string
  task: string
  status: DbStatus
  due_date: string | null
  assignee_id: string | null
  meetings: { id: string; title: string | null; meeting_date: string | null } | null
}

type Profile = { id: string; full_name: string | null; username: string | null }

export const dynamic = 'force-dynamic'

export default async function AllTodosPage() {
  const supabase = await createClient()
  const adminSupabase = getServiceRoleSupabase()
  const serviceRoleAvailable = Boolean(adminSupabase)
  const client = adminSupabase ?? supabase

  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user?.id) redirect('/login')

  const { data, error } = await client
    .from('todos')
    .select('id, task, status, due_date, assignee_id, meetings(id, title, meeting_date)')
    .order('due_date', { ascending: true })
    .returns<RawTodo[]>()

  if (error) throw new Error(error.message)
  const rows = data ?? []

  const assigneeIds = Array.from(new Set(rows.map(r => r.assignee_id).filter((v): v is string => !!v)))
  const profilesById = new Map<string, Profile>()
  if (assigneeIds.length > 0) {
    const { data: profiles } = await client
      .from('profiles')
      .select('id, full_name, username')
      .in('id', assigneeIds)
      .returns<Profile[]>()
    for (const p of profiles ?? []) profilesById.set(p.id, p)
  }

  const adminTodos: AdminTodo[] = rows.map((r) => ({
    id: r.id,
    task: r.task,
    status: r.status,
    due_date: r.due_date,
    meeting: r.meetings
      ? { title: r.meetings.title ?? null, meeting_date: r.meetings.meeting_date ?? null }
      : null,
    assignee: r.assignee_id ? profilesById.get(r.assignee_id) ?? null : null,
    assigneeId: r.assignee_id,
  }))

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">全体のToDo（管理者）</h1>
        <Link href="/" className="text-sm text-blue-600 hover:underline">スタートへ戻る</Link>
      </div>

      {!serviceRoleAvailable && (
        <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-md p-3">
          SUPABASE_SERVICE_ROLE_KEY is not configured, so only rows allowed by RLS are shown.
          Add the service role key to the server environment to enable the full company-wide list.
        </p>
      )}

      <AllTodosClient initialTodos={adminTodos} />
    </div>
  )
}
