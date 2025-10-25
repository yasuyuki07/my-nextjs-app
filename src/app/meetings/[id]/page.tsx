// src/app/meetings/[id]/page.tsx
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/server'

// 型
type Meeting = {
  id: string
  title: string
  meeting_date: string | null
  summary: string[] | null
  transcript: string | null
}

type Decision = { id: string; content: string }
type TodoRow = {
  id: string
  task: string
  status: 'open' | 'in_progress' | 'done' | string
  due_date: string | null
  assignee_id: string | null
}
type Profile = { id: string; full_name: string | null; username: string | null }

// Next.js 15 の Dynamic APIs 対応：params は await する
export default async function MeetingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = createClient()

  // 1) 会議本体
  const { data: meeting, error: mErr } = await supabase
    .from('meetings')
    .select('id, title, meeting_date, summary, transcript')
    .eq('id', id)
    .single<Meeting>()

  if (mErr) {
    // RLS で読めない or 存在しない 等の場合
    notFound()
  }
  if (!meeting) {
    notFound()
  }

  // 2) 決定事項
  const { data: decisions = [] } = await supabase
    .from('decisions')
    .select('id, content')
    .eq('meeting_id', id)
    .order('created_at', { ascending: true })
    .returns<Decision[]>()

  // 3) ToDo（まずは assignee_id だけ）
  const { data: todosRaw = [] } = await supabase
    .from('todos')
    .select('id, task, status, due_date, assignee_id')
    .eq('meeting_id', id)
    .order('due_date', { ascending: true })
    .returns<TodoRow[]>()

  // 4) 担当者プロフィールをまとめて取得して、map
  const assigneeIds = Array.from(
    new Set(todosRaw.map((t) => t.assignee_id).filter(Boolean)) // null を除外
  ) as string[]

  let profilesById = new Map<string, Profile>()
  if (assigneeIds.length > 0) {
    const { data: profiles = [] } = await supabase
      .from('profiles')
      .select('id, full_name, username')
      .in('id', assigneeIds)
      .returns<Profile[]>()

    profilesById = new Map(profiles.map((p) => [p.id, p]))
  }

  const todos = todosRaw.map((t) => ({
    ...t,
    assignee: t.assignee_id ? profilesById.get(t.assignee_id) ?? null : null,
  }))

  // 補助
  const formatDate = (iso: string | null) => {
    if (!iso) return '-'
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return iso
    const yyyy = d.getFullYear()
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    return `${yyyy}/${mm}/${dd}`
  }
  const jpStatus = (s: string) =>
    s === 'done' ? '完了' : s === 'in_progress' ? '進行中' : '未着手'

  return (
    <div className="max-w-3xl mx-auto p-6">
      <div className="mb-6">
        <Link href="/meetings" className="text-indigo-600 hover:underline">
          ← 会議一覧 / 作成へ戻る
        </Link>
      </div>

      <h1 className="text-2xl font-bold">{meeting.title}</h1>
      <p className="text-sm text-gray-500 mt-1">
        開催日: {formatDate(meeting.meeting_date)}
      </p>

      {/* 要約 */}
      <section className="mt-8">
        <h2 className="text-lg font-semibold mb-2">要約</h2>
        {Array.isArray(meeting.summary) && meeting.summary.length > 0 ? (
          <ul className="list-disc pl-5 space-y-1">
            {meeting.summary.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-500 text-sm">（登録なし）</p>
        )}
      </section>

      {/* 決定事項 */}
      <section className="mt-6">
        <h2 className="text-lg font-semibold mb-2">決定事項</h2>
        {decisions.length > 0 ? (
          <ul className="list-disc pl-5 space-y-1">
            {decisions.map((d) => (
              <li key={d.id}>{d.content}</li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-500 text-sm">（登録なし）</p>
        )}
      </section>

      {/* ToDo */}
      <section className="mt-6">
        <h2 className="text-lg font-semibold mb-2">ToDo</h2>
        {todos.length > 0 ? (
          <ul className="space-y-3">
            {todos.map((t) => (
              <li key={t.id} className="border rounded-md p-3 bg-white">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div>
                    <p className="font-medium">{t.task}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      期限: {formatDate(t.due_date)} ／ ステータス: {jpStatus(t.status)}
                    </p>
                  </div>
                  <div className="text-sm text-gray-700">
                    担当:{' '}
                    {t.assignee
                      ? t.assignee.full_name || `@${t.assignee.username}`
                      : '（未設定）'}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-500 text-sm">（登録なし）</p>
        )}
      </section>

      {/* 文字起こし（必要なら） */}
      {meeting.transcript && (
        <section className="mt-8">
          <h2 className="text-lg font-semibold mb-2">文字起こし（全文）</h2>
          <pre className="whitespace-pre-wrap p-3 bg-gray-50 border rounded">
            {meeting.transcript}
          </pre>
        </section>
      )}
    </div>
  )
}
