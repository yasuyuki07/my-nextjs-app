// src/app/meetings/page.tsx
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'

type MeetingRow = {
  id: string
  title: string | null
  meeting_date: string | null
}

export const dynamic = 'force-dynamic'

export default async function MeetingsPage() {
  // ★ ここを await に
  const supabase = await createClient()

  // 必要なら認証チェック（未ログインは 404/リダイレクトにする）
  const { data: auth } = await supabase.auth.getUser()
  if (!auth.user?.id) {
    // notFound() でも redirect('/login') でもOK
    notFound()
  }

  // 一覧取得
  const { data, error } = await supabase
    .from('meetings')
    .select('id, title, meeting_date')
    .order('meeting_date', { ascending: false })
    .limit(50)
    .returns<MeetingRow[]>()

  if (error) {
    // ざっくり落とす
    throw new Error(error.message)
  }

  const list = data ?? []

  return (
    <div className="max-w-3xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">会議一覧</h1>
        <Link href="/meetings/new" className="text-sm text-indigo-600 hover:underline">
          新規作成
        </Link>
      </div>

      {list.length === 0 ? (
        <p className="text-sm text-gray-500">会議はまだありません。</p>
      ) : (
        <ul className="divide-y">
          {list.map(m => (
            <li key={m.id} className="py-3">
              <Link href={`/meetings/${m.id}`} className="hover:underline">
                {m.title ?? '(無題)'}
              </Link>
              <div className="text-xs text-gray-500">
                {m.meeting_date ? new Date(m.meeting_date).toLocaleString() : '-'}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
