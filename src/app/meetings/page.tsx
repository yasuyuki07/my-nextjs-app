// src/app/meetings/page.tsx
import Link from 'next/link';
import { createClient } from '@/utils/supabase/server';

type MeetingRow = {
  id: string;               // F-10でinsert時に返していた PK
  title: string;
  meeting_date: string;     // timestamptz
  summary?: string[] | null;
};

const PAGE_SIZE = 10;

// クエリ文字列のユーティリティ
function qs(base: string, params: Record<string, string | number | undefined>) {
  const u = new URL(base, 'http://dummy');
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== '') u.searchParams.set(k, String(v));
  });
  return u.pathname + (u.search ? u.search : '');
}

function formatDate(iso?: string | null) {
  if (!iso) return '-';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso!;
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;
}

export default async function MeetingsPage({
  // ★ Next.js 15: searchParams は Promise を await する
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page ?? 1));
  const sort = (sp.sort === 'title' ? 'title' : 'meeting_date') as 'meeting_date' | 'title';
  const order = sp.order === 'asc' ? 'asc' : 'desc';
  const q = (sp.q as string) ?? '';

  const supabase = createClient();

  // 件数取得 + ページング
  // countを返しつつデータも取得
  let query = supabase
    .from('meetings')
    .select('id, title, meeting_date', { count: 'exact' });

  // タイトル簡易検索
  if (q) query = query.ilike('title', `%${q}%`);

  // 並び順
  query = query.order(sort, { ascending: order === 'asc' });

  // ページング
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;
  query = query.range(from, to);

  const { data, count, error } = await query;

  if (error) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <h1 className="text-3xl font-bold mb-4">会議履歴一覧</h1>
        <p className="text-red-600">読み込みエラー: {error.message}</p>
      </div>
    );
  }

  const rows = (data ?? []) as MeetingRow[];
  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold">会議履歴一覧</h1>

      {/* 検索フォーム（GET） */}
      <form className="flex flex-wrap items-center gap-3">
        <input
          type="text"
          name="q"
          defaultValue={q}
          placeholder="会議名で検索"
          className="px-3 py-2 border rounded-md bg-white text-gray-900"
        />
        <select
          name="sort"
          defaultValue={sort}
          className="px-3 py-2 border rounded-md bg-white text-gray-900"
        >
          <option value="meeting_date">開催日</option>
          <option value="title">会議名</option>
        </select>
        <select
          name="order"
          defaultValue={order}
          className="px-3 py-2 border rounded-md bg-white text-gray-900"
        >
          <option value="desc">新しい順</option>
          <option value="asc">古い順</option>
        </select>
        <button className="px-4 py-2 rounded-md bg-indigo-600 text-white hover:bg-indigo-700">
          検索
        </button>
      </form>

      {/* リスト */}
      {rows.length === 0 ? (
        <p className="text-sm text-gray-400">データがありません。</p>
      ) : (
        <ul className="space-y-3">
          {rows.map((m) => (
            <li key={m.id} className="border rounded-md p-4 bg-black/5">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <p className="font-medium">{m.title}</p>
                  <p className="text-sm text-gray-400">開催日: {formatDate(m.meeting_date)}</p>
                </div>
                {/* F-14 で詳細ページを実装予定。先にリンクだけ用意しておく */}
                <Link
                  href={`/meetings/${m.id}`}
                  className="inline-flex items-center px-3 py-1 rounded-md border bg-white hover:bg-gray-50"
                >
                  詳細を見る
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* ページネーション */}
      <div className="flex items-center justify-between border-t pt-4">
        <Link
          aria-disabled={page <= 1}
          className={`px-3 py-2 rounded-md border ${page <= 1 ? 'pointer-events-none opacity-40' : 'bg-white hover:bg-gray-50'}`}
          href={qs('/meetings', { q, sort, order, page: Math.max(1, page - 1) })}
        >
          ← 前へ
        </Link>

        <p className="text-sm text-gray-500">
          {total} 件中 {from + 1}–{Math.min(to + 1, total)} を表示（{page}/{totalPages}）
        </p>

        <Link
          aria-disabled={page >= totalPages}
          className={`px-3 py-2 rounded-md border ${page >= totalPages ? 'pointer-events-none opacity-40' : 'bg-white hover:bg-gray-50'}`}
          href={qs('/meetings', { q, sort, order, page: Math.min(totalPages, page + 1) })}
        >
          次へ →
        </Link>
      </div>
    </div>
  );
}
