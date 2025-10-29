export const dynamic = 'force-dynamic'

// src/app/api/search/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

type Hit =
  | { type: 'meeting'; id: string; title: string | null; meeting_date: string | null }
  | { type: 'decision'; id: string; content: string; meeting_title: string | null }
  | { type: 'todo'; id: string; task: string; status: string; meeting_title: string | null };

function toBool(v: string | null) {
  return v === '1' || v === 'true';
}

async function runSearch(params: { q: string; inDecisions: boolean; inTodos: boolean }) {
  const { q, inDecisions, inTodos } = params;
  const supabase = createClient();
  const hits: Hit[] = [];

  // キーワード未入力なら空で返す
  const keyword = q?.trim();
  if (!keyword) return { hits };

  // --- meetings: title を検索 ---
  {
    const { data, error } = await supabase
      .from('meetings')
      .select('id, title, meeting_date')
      .ilike('title', `%${keyword}%`)
      .order('meeting_date', { ascending: false })
      .limit(10);
    if (!error && data) {
      hits.push(
        ...data.map((m) => ({
          type: 'meeting' as const,
          id: m.id as string,
          title: (m as any).title ?? null,
          meeting_date: (m as any).meeting_date ?? null,
        })),
      );
    }
  }

  // --- decisions: content を検索（チェック時のみ） ---
  if (inDecisions) {
    const { data, error } = await supabase
      .from('decisions')
      .select('id, content, meetings(title)')
      .ilike('content', `%${keyword}%`)
      .limit(20);
    if (!error && data) {
      hits.push(
        ...data.map((d) => ({
          type: 'decision' as const,
          id: d.id as string,
          content: (d as any).content as string,
          meeting_title: ((d as any).meetings?.title as string) ?? null,
        })),
      );
    }
  }

  // --- todos: task を検索（チェック時のみ） ---
  if (inTodos) {
    const { data, error } = await supabase
      .from('todos')
      .select('id, task, status, meetings(title)')
      .ilike('task', `%${keyword}%`)
      .limit(20);
    if (!error && data) {
      hits.push(
        ...data.map((t) => ({
          type: 'todo' as const,
          id: t.id as string,
          task: (t as any).task as string,
          status: (t as any).status as string,
          meeting_title: ((t as any).meetings?.title as string) ?? null,
        })),
      );
    }
  }

  return { hits };
}

// --------- HTTP handlers ---------

export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = url.searchParams.get('q') ?? '';
  const inDecisions = toBool(url.searchParams.get('d'));
  const inTodos = toBool(url.searchParams.get('t'));

  const result = await runSearch({ q, inDecisions, inTodos });
  return NextResponse.json(result, { status: 200 });
}

export async function POST(req: Request) {
  // 互換用：POST ボディでも受け付ける
  const body = (await req.json().catch(() => ({}))) as {
    q?: string;
    d?: string | boolean;
    t?: string | boolean;
  };
  const q = body.q ?? '';
  const inDecisions = typeof body.d === 'boolean' ? body.d : toBool(String(body.d ?? ''));
  const inTodos = typeof body.t === 'boolean' ? body.t : toBool(String(body.t ?? ''));

  const result = await runSearch({ q, inDecisions, inTodos });
  return NextResponse.json(result, { status: 200 });
}
