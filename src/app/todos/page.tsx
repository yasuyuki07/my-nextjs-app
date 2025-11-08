// src/app/todos/page.tsx
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'

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

const formatDate = (iso: string | null) => {
  if (!iso) return '-'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}/${mm}/${dd}`
}

const statusLabel = (s: DbStatus) => (s === 'done' ? '完了' : s === 'in_progress' ? '進行中' : '未着手')

export default async function AllTodosPage() {
  const supabase = await createClient()

  // 認証チェック
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user?.id) redirect('/login')

  // 全体の ToDo を取得（会議タイトルを付与）
  const { data, error } = await supabase
    .from('todos')
    .select('id, task, status, due_date, assignee_id, meetings(id, title, meeting_date)')
    .order('due_date', { ascending: true })
    .returns<RawTodo[]>()

  if (error) throw new Error(error.message)
  const rows = data ?? []

  // 担当者プロフィールをまとめて取得
  const assigneeIds = Array.from(new Set(rows.map(r => r.assignee_id).filter((v): v is string => !!v)))
  const profilesById = new Map<string, Profile>()
  if (assigneeIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, username')
      .in('id', assigneeIds)
      .returns<Profile[]>()
    for (const p of profiles ?? []) profilesById.set(p.id, p)
  }

  return (
    <div className="max-w-5xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">全体のToDo</h1>
        <Link href="/" className="text-sm text-blue-600 hover:underline">スタートへ戻る</Link>
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-gray-500">表示できる ToDo はありません。</p>
      ) : (
        <ul className="space-y-3">
          {rows.map((r) => {
            const assignee = r.assignee_id ? profilesById.get(r.assignee_id) ?? null : null
            const meeting = r.meetings
            return (
              <li key={r.id} className="border rounded-md p-4 bg-white">
                <div className="flex flex-col gap-2">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="font-medium break-words">{r.task}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        会議: {meeting?.title ?? '-'} ／ 期限: {formatDate(r.due_date)} ／ 担当: {assignee?.full_name || assignee?.username || '-'}
                      </p>
                    </div>
                    <span className="text-xs px-2 py-1 rounded-md border bg-white text-gray-900">{statusLabel(r.status)}</span>
                  </div>
                  {meeting?.id && (
                    <div>
                      <Link href={`/meetings/${meeting.id}`} className="text-xs text-blue-600 hover:underline">会議の詳細を見る</Link>
                    </div>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

