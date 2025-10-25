// src/app/meetings/[id]/page.tsx
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'

// ===== Types =====
type Profile = { id: string; full_name: string | null; username: string | null }

type MeetingCore = {
  id: string
  title: string | null
  meeting_date: string | null
  transcript: string | null
  summary: string[] | null
}

type DecisionRow = { content: string | null }

type DbStatus = 'open' | 'in_progress' | 'done'
type TodoRaw = {
  id: string
  task: string
  status: DbStatus
  due_date: string | null
  assignee_id: string | null
}
type TodoView = TodoRaw & { assignee: Profile | null }

// ===== Helpers =====
const formatDate = (iso: string | null) => {
  if (!iso) return '-'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  const hh = String(d.getHours()).padStart(2, '0')
  const mi = String(d.getMinutes()).padStart(2, '0')
  return `${yyyy}/${mm}/${dd} ${hh}:${mi}`
}

const statusLabel = (s: DbStatus) =>
  s === 'done' ? '完了' : s === 'in_progress' ? '進行中' : '未着手'

// ===== Page =====
export default async function MeetingDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const supabase = createClient()

  // 1) 認証（RLS のため必要）
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user?.id) {
    notFound()
  }

  // 2) 会議本体
  const { data: meeting, error: mErr } = await supabase
    .from('meetings')
    .select('id, title, meeting_date, transcript, summary')
    .eq('id', params.id)
    .single<MeetingCore>()

  if (mErr || !meeting) {
    notFound()
  }

  // 3) 決定事項
  const { data: decisionsData } = await supabase
    .from('decisions')
    .select('content')
    .eq('meeting_id', meeting.id)
    .order('id', { ascending: true })
    .returns<DecisionRow[]>()

  const decisions = decisionsData ?? []

  // 4) ToDo（素の行）
  const { data: todosRawData } = await supabase
    .from('todos')
    .select('id, task, status, due_date, assignee_id')
    .eq('meeting_id', meeting.id)
    .order('due_date', { ascending: true })
    .returns<TodoRaw[]>()

  // ★ ここがポイント：null を空配列へフォールバック
  const todosRaw: TodoRaw[] = todosRawData ?? []

  // 5) 担当者プロフィールをまとめて取得してマージ
  const assigneeIds = Array.from(
    new Set(
      (todosRaw ?? [])
        .map((t) => t.assignee_id)
        .filter((v): v is string => !!v) // null を除外し型を絞る
    )
  )

  let profilesById = new Map<string, Profile>()
  if (assigneeIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, username')
      .in('id', assigneeIds)
      .returns<Profile[]>()

    for (const p of profiles ?? []) {
      profilesById.set(p.id, p)
    }
  }

  const todos: TodoView[] = todosRaw.map((t) => ({
    ...t,
    assignee: t.assignee_id ? profilesById.get(t.assignee_id) ?? null : null,
  }))

  // 6) 表示
  return (
    <div className="max-w-3xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">会議詳細</h1>
        <Link href="/meetings" className="text-sm text-indigo-600 hover:underline">
          一覧へ戻る
        </Link>
      </div>

      <section className="mb-6">
        <h2 className="text-xl font-semibold">{meeting.title ?? '(無題)'}</h2>
        <p className="text-sm text-gray-500 mt-1">開催日時: {formatDate(meeting.meeting_date)}</p>
      </section>

      {Array.isArray(meeting.summary) && meeting.summary.length > 0 && (
        <section className="mb-6">
          <h3 className="font-semibold mb-2">要約</h3>
          <ul className="list-disc pl-5 space-y-1">
            {meeting.summary.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
        </section>
      )}

      {decisions.length > 0 && (
        <section className="mb-6">
          <h3 className="font-semibold mb-2">決定事項</h3>
          <ul className="list-disc pl-5 space-y-1">
            {decisions.map((d, i) => (
              <li key={i}>{d.content}</li>
            ))}
          </ul>
        </section>
      )}

      <section className="mb-6">
        <h3 className="font-semibold mb-2">ToDo</h3>
        {todos.length === 0 ? (
          <p className="text-sm text-gray-500">登録された ToDo はありません。</p>
        ) : (
          <ul className="space-y-3">
            {todos.map((t) => (
              <li key={t.id} className="border rounded-md p-3 bg-white">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-medium">{t.task}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      期限: {t.due_date ? formatDate(t.due_date) : '-'} ／ 担当:{' '}
                      {t.assignee?.full_name || t.assignee?.username || '-'}
                    </p>
                  </div>
                  <span className="text-xs px-2 py-1 rounded-md border bg-white text-gray-900">
                    {statusLabel(t.status)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {meeting.transcript && (
        <details className="mt-8">
          <summary className="cursor-pointer text-sm text-gray-600">文字起こし（全文）を表示</summary>
          <pre className="mt-2 p-3 bg-gray-50 border rounded whitespace-pre-wrap text-sm">
            {meeting.transcript}
          </pre>
        </details>
      )}
    </div>
  )
}
