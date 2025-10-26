'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

// 検索ヒットの最低限の型（API から返る任意のフィールドを許容）
type Hit = { id: string; type: 'meeting' | 'decision' | 'todo' } & Record<string, unknown>;

export default function GlobalSearchPage() {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  // まずは URL から初期値を読み込み
  const [q, setQ] = useState(sp.get('q') ?? '');
  const [inDecisions, setInDecisions] = useState(sp.get('d') === '1');
  const [inTodos, setInTodos] = useState(sp.get('t') === '1');

  // 表示用状態
  const [hits, setHits] = useState<Hit[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  // マウント済みフラグ（レンダー中の setState/Router 更新を防ぐ）
  useEffect(() => setMounted(true), []);

  // クエリ文字列をまとめて生成
  const queryString = useMemo(() => {
    const p = new URLSearchParams();
    if (q.trim()) p.set('q', q.trim());
    if (inDecisions) p.set('d', '1');
    if (inTodos) p.set('t', '1');
    return p.toString();
  }, [q, inDecisions, inTodos]);

  // URL を同期（← レンダー中ではなく useEffect 内で）
  useEffect(() => {
    if (!mounted) return;
    const url = queryString ? `${pathname}?${queryString}` : pathname;
    router.replace(url);
  }, [mounted, pathname, queryString, router]);

  // 検索実行（← こちらも useEffect 内で）
  const controllerRef = useRef<AbortController | null>(null);
  useEffect(() => {
    if (!mounted) return;

    setLoading(true);
    setError(null);

    // 連打対策：前回のリクエストを中断
    controllerRef.current?.abort();
    const ac = new AbortController();
    controllerRef.current = ac;

    const run = async () => {
      try {
        const res = await fetch(`/api/search?${queryString}`, { signal: ac.signal });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data: unknown = await res.json();

        const arr = Array.isArray((data as any)?.hits) ? ((data as any).hits as unknown[]) : [];
        const normalized: Hit[] = arr
          .filter((x): x is Hit => typeof x === 'object' && x !== null && 'id' in (x as any) && 'type' in (x as any))
          .map((x) => x as Hit);

        setHits(normalized);
      } catch (e: unknown) {
        if ((e as any)?.name === 'AbortError') return;
        setHits([]);
        setError((e as Error).message);
      } finally {
        setLoading(false);
      }
    };

    run();
    return () => ac.abort();
  }, [mounted, queryString]);

  // フォーム送信は状態更新だけ（useEffect が自動で走る）
  const onSubmit = (e: React.FormEvent) => e.preventDefault();

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">全体検索</h1>

      <form onSubmit={onSubmit} className="flex flex-wrap items-center gap-2 mb-4">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="キーワード"
          className="flex-1 min-w-[220px] px-3 py-2 border rounded-md bg-white text-gray-900"
        />

        <label className="flex items-center gap-1 text-sm">
          <input
            type="checkbox"
            checked={inDecisions}
            onChange={(e) => setInDecisions(e.target.checked)}
          />
          決定事項から
        </label>

        <label className="flex items-center gap-1 text-sm">
          <input
            type="checkbox"
            checked={inTodos}
            onChange={(e) => setInTodos(e.target.checked)}
          />
          ToDoから
        </label>

        <button type="submit" className="px-3 py-2 rounded-md bg-indigo-600 text-white">
          検索
        </button>
      </form>

      {loading && <p className="text-sm text-gray-500">検索中…</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}

      <ul className="space-y-3">
        {hits.map((h) => (
          <li key={`${h.type}-${h.id}`} className="border rounded-md p-3 bg-white text-gray-900">
            <div className="text-xs text-gray-500 mb-1">{h.type}</div>
            <div className="font-medium">
              {String(
                (h as any).title ??
                  (h as any).content ??
                  (h as any).task ??
                  (h as any).meeting_title ??
                  '',
              )}
            </div>
          </li>
        ))}
        {!loading && !error && hits.length === 0 && (
          <li className="text-sm text-gray-500">該当なし</li>
        )}
      </ul>
    </div>
  );
}
