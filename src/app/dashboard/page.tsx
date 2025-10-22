'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

// DBのstatus値 ↔ 表示名
const STATUS_LABEL: Record<string, string> = {
  open: '未着手',
  in_progress: '進行中',
  done: '完了',
};

type StatusKey = keyof typeof STATUS_LABEL | 'all';

type TodoRow = {
  id: string;
  task: string;
  status: string;              // 'open' | 'in_progress' | 'done'
  due_date: string | null;     // 'YYYY-MM-DD' or null
  meeting_id: string | null;
  // リレーション。外部キーが貼られていれば取得できます（無ければ null になります）
  meetings?: {
    title: string | null;
    meeting_date: string | null; // ISO文字列
  } | null;
};

export default function DashboardPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);

  // 絞り込み・並び替え状態
  const [statusFilter, setStatusFilter] = useState<StatusKey>('all');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // データ
  const [todos, setTodos] = useState<TodoRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // 1) ログインユーザー取得
  useEffect(() => {
    let mounted = true;
    const run = async () => {
      setLoadingUser(true);
      const { data } = await supabase.auth.getUser();
      if (!mounted) return;
      const id = data.user?.id ?? null;
      setUserId(id);
      setLoadingUser(false);

      if (!id) {
        // 未ログインならログイン画面へ
        router.push('/login');
      }
    };
    run();
    return () => { mounted = false; };
  }, [router]);

  // 2) ToDo取得
  const fetchTodos = async () => {
    if (!userId) return;
    setLoading(true);
    setLoadError(null);
    try {
      // ベースクエリ
      let query = supabase
        .from('todos')
        .select(`
          id, task, status, due_date, meeting_id,
          meetings ( title, meeting_date )
        `)
        .eq('assignee_id', userId);

      // ステータス絞り込み
      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      // 並び順：期限（nullは先頭に）
      query = query.order('due_date', { ascending: sortOrder === 'asc', nullsFirst: true });

      const { data, error } = await query;
      if (error) throw error;

      setTodos((data ?? []) as unknown as TodoRow[]);
    } catch (e: any) {
      console.error(e);
      setLoadError(e?.message || '読み込みに失敗しました');
    } finally {
      setLoading(false);
    }
  };

  // 絞り込み・並び替え・ログインIDが変わったら再読込
  useEffect(() => {
    if (userId) fetchTodos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, statusFilter, sortOrder]);

  // 表示用：件数
  const countText = useMemo(() => {
    const total = todos.length;
    const label =
      statusFilter === 'all' ? 'すべて' : STATUS_LABEL[statusFilter] ?? statusFilter;
    return `${label}: ${total}件`;
  }, [todos.length, statusFilter]);

  // 日付の見た目
  const fmtDate = (d: string | null) => {
    if (!d) return '—';
    // due_date は DATE型想定なのでそのまま表示
    return d;
  };

  return (
    <div className="mx-auto max-w-4xl p-6">
      <h1 className="text-2xl font-bold mb-4">マイダッシュボード</h1>

      {/* フィルタ＆ソート */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-end sm:justify-between mb-4">
        <div className="flex gap-2">
          <div>
            <label className="block text-sm text-gray-600 mb-1">ステータス</label>
            <select
              className="px-3 py-2 border rounded-md bg-white text-gray-900"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusKey)}
            >
              <option value="all">すべて</option>
              <option value="open">{STATUS_LABEL.open}</option>
              <option value="in_progress">{STATUS_LABEL.in_progress}</option>
              <option value="done">{STATUS_LABEL.done}</option>
            </select>
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">期限の並び</label>
            <select
              className="px-3 py-2 border rounded-md bg-white text-gray-900"
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as 'asc' | 'desc')}
            >
              <option value="asc">昇順（近い順）</option>
              <option value="desc">降順（遠い順）</option>
            </select>
          </div>
        </div>

        <div className="text-sm text-gray-500">{countText}</div>
      </div>

      {/* 本体 */}
      {loadingUser || loading ? (
        <p className="text-sm text-gray-500">読み込み中…</p>
      ) : loadError ? (
        <p className="text-sm text-red-600">{loadError}</p>
      ) : todos.length === 0 ? (
        <div className="rounded-md border p-6 text-center text-gray-500">
          表示できるToDoがありません。
        </div>
      ) : (
        <ul className="space-y-3">
          {todos.map((t) => {
            const meetingTitle = t.meetings?.title ?? '（会議名なし）';
            const meetingDate = t.meetings?.meeting_date
              ? new Date(t.meetings.meeting_date).toLocaleString()
              : '';

            return (
              <li key={t.id} className="border rounded-md bg-white p-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-sm">
                    <div className="font-semibold">{t.task || '(無題のタスク)'}</div>
                    <div className="text-gray-500">
                      会議：{meetingTitle}
                      {meetingDate && <span className="ml-2">{meetingDate}</span>}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span
                      className={`text-xs rounded-full px-2 py-1 border
                        ${t.status === 'done' ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                        : t.status === 'in_progress' ? 'bg-amber-50 border-amber-200 text-amber-700'
                        : 'bg-gray-50 border-gray-200 text-gray-700'}`}
                      title="ステータス"
                    >
                      {STATUS_LABEL[t.status] ?? t.status}
                    </span>
                    <span className="text-sm text-gray-600" title="期限">
                      期限：{fmtDate(t.due_date)}
                    </span>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {/* 末尾：手動リロード */}
      <div className="mt-6">
        <button
          onClick={fetchTodos}
          className="px-4 py-2 rounded-md bg-indigo-600 text-white hover:bg-indigo-700"
        >
          最新の情報を再取得
        </button>
      </div>
    </div>
  );
}
