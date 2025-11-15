// src/app/api/search/route.ts
import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type Hit =
  | { type: 'meeting'; id: string; title: string | null; meeting_date: string | null }
  | { type: 'decision'; id: string; content: string; meeting_title: string | null; meeting_id: string }
  | { type: 'todo'; id: string; task: string; status: string; meeting_title: string | null; meeting_id: string }

async function runSearch(q: string) {
  const supabase = await createClient() // ★ ここを await に
  const hits: Hit[] = []

  const keyword = q?.trim()
  if (!keyword) return { hits }

  // --- meetings: title を検索 ---
  {
    const { data, error } = await supabase
      .from('meetings')
      .select('id, title, meeting_date')
      .ilike('title', `%${keyword}%`)
      .order('meeting_date', { ascending: false })
      .limit(10)

    if (!error && data) {
      hits.push(
        ...data.map((m) => ({
          type: 'meeting' as const,
          id: m.id as string,
          title: (m as any).title ?? null,
          meeting_date: (m as any).meeting_date ?? null,
        })),
      )
    }
  }

  // --- decisions: content を検索 ---
  {
    const { data, error } = await supabase
      .from('decisions')
      .select('id, content, meeting_id, meetings(title)')
      .ilike('content', `%${keyword}%`)
      .limit(20)

    if (!error && data) {
      hits.push(
        ...data.map((d) => ({
          type: 'decision' as const,
          id: d.id as string,
          content: (d as any).content as string,
          meeting_title: ((d as any).meetings?.title as string) ?? null,
          meeting_id: (d as any).meeting_id as string,
        })),
      )
    }
  }

  // --- todos: task を検索 ---
  {
    const { data, error } = await supabase
      .from('todos')
      .select('id, task, status, meeting_id, meetings(title)')
      .ilike('task', `%${keyword}%`)
      .limit(20)

    if (!error && data) {
      hits.push(
        ...data.map((t) => ({
          type: 'todo' as const,
          id: t.id as string,
          task: (t as any).task as string,
          status: (t as any).status as string,
          meeting_title: ((t as any).meetings?.title as string) ?? null,
          meeting_id: (t as any).meeting_id as string,
        })),
      )
    }
  }

  return { hits }
}

// --------- HTTP handlers ---------

export async function GET(req: Request) {
  const url = new URL(req.url)
  const q = url.searchParams.get('q') ?? ''

  const result = await runSearch(q)
  return NextResponse.json(result, { status: 200 })
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as {
    q?: string
  }
  const q = body.q ?? ''

  const result = await runSearch(q)
  return NextResponse.json(result, { status: 200 })
}
