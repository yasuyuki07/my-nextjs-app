'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

// ===== Types =====
type DbStatus = 'open' | 'in_progress' | 'done';

type TodoRow = {
  id: string;
  task: string;
  status: DbStatus;
  due_date: string | null;
  meeting: {
    title: string | null;
    meeting_date: string | null;
  } | null;
};

// Supabase から返る “生” の行（status は string として受ける）
type RawTodoRow = Omit<TodoRow, 'status'> & { status: string };

type StatusFilter = DbStatus | 'all';
type SortOrder = 'asc' | 'desc';

// ===== Helpers =====
const formatDate = (iso: string | null): string => {
  if (!iso) return '-';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}/${mm}/${dd}`;
};

// 受け取った文字列を DB 用の許可値に正規化
const toDbStatus = (s: string): DbStatus => {
  const key = String(s).toLowerCase();
  if (
    key === 'in_progress' ||
    key === 'in-progress' ||
    key === 'inprogress' ||
    key === 'doing' ||
    key === '進行中'
  )
    return 'in_progress';
  if (key === 'done' || key === '完了') return 'done';
  return 'open'; // 既定
};

const STATUS_OPTIONS: { value: DbStatus; label: string }[] = [
  { value: 'open',        label: '未着手' },
  { value: 'in_progress', label: '進行中' },
  { value: 'done',        label: '完了' },
];

export default function DashboardPage() {
  // UI states
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // data
  const [todos, setTodos] = useState<TodoRow[]>([]);

  // controls
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

  // ===== Fetch my todos (assigned to current user) =====
  useEffect(() => {
    let mounted = true;
    const run = async () => {
      setLoading(true);
      setError(null);

      // 1) ensure login
      const { data: userData, error: userErr } = await supabase.auth.getUser();
      if (userErr) {
        setError(userErr.message);
        setLoading(false);
        return;
      }
      const userId = userData.user?.id;
      if (!userId) {
        setError('ログインが必要です。/login からサインインしてください。');
        setLoading(false);
        return;
      }

      // 2) query
      const { data, error: qErr } = await supabase
        .from('todos')
        .select('id, task, status, due_date, meeting:meetings(title, meeting_date)')
        .eq('assignee_id', userId)
        .order('due_date', { ascending: true })
        .returns<RawTodoRow[]>();

      if (!mounted) return;

      if (qErr) {
        setError(qErr.message);
      } else {
        // “doing” など過去値も in_progress に正規化してから state へ
        const normalized: TodoRow[] =
          (data ?? []).map((r) => ({ ...r, status: toDbStatus(r.status) }));
        setTodos(normalized);
      }
      setLoading(false);
    };

    run();
    return () => {
      mounted = false;
    };
  }, []);

  // ===== Derived list (filter + sort) =====
  const view = useMemo(() => {
    const filtered =
      statusFilter === 'all' ? todos : todos.filter((t) => t.status === statusFilter);

    const sorted = [...filtered].sort((a, b) => {
      const aTime = a.due_date ? new Date(a.due_date).getTime() : Infinity;
      const bTime = b.due_date ? new Date(b.due_date).getTime() : Infinity;
      return sortOrder === 'asc' ? aTime - bTime : bTime - aTime;
    });
    return sorted;
  }, [todos, statusFilter, sortOrder]);

  // ===== Update status (optimistic) =====
  const handleStatusChange = async (id: string, nextRaw: string) => {
    const next = toDbStatus(nextRaw);
    setSavingId(id);
    setError(null);

    // 現在値を保持（失敗時ロールバック用）
    const current = todos.find((t) => t.id === id)?.status ?? 'open';

    // optimistic
    setTodos((prev) => prev.map((t) => (t.id === id ? { ...t, status: next } : t)));

    const { error: upErr } = await supabase.from('todos').update({ status: next }).eq('id', id);
    setSavingId(null);

    if (upErr) {
      // rollback
      setTodos((prev) => prev.map((t) => (t.id === id ? { ...t, status: current } : t)));
      setError(upErr.message);
      alert(`保存に失敗しました: ${upErr.message}`);
    }
  };

  // ===== Render =====
  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">マイダッシュボード</h1>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-400">ステータス</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(toDbStatus(e.target.value) as StatusFilter)}
            className="status-select px-3 py-2 border rounded-md bg-white text-gray-900
                       focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="all" className="text-black">すべて</option>
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value} className="text-black">
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          onClick={() => setSortOrder((s) => (s === 'asc' ? 'desc' : 'asc'))}
          className="px-3 py-2 text-sm rounded-md border
                     bg-white text-gray-900 hover:bg-gray-50
                     focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        >
          期限で並び替え: {sortOrder === 'asc' ? '昇順' : '降順'}
        </button>
      </div>

      {loading && <p className="text-sm text-gray-400">読み込み中…</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}

      {!loading && view.length === 0 && (
        <p className="text-sm text-gray-400">表示できるToDoがありません。</p>
      )}

      <ul className="space-y-5 list-none pl-0">
        {view.map((t) => (
          <li key={t.id} className="border rounded-md p-4 bg-black/5">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="leading-6">{t.task}</p>
                <p className="text-sm text-gray-400 mt-1">
                  会議: {t.meeting?.title ?? '-'} ／ 期限: {formatDate(t.due_date)}
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs text-gray-400">ステータス</span>
                <select
                  value={t.status}
                  onChange={(e) => handleStatusChange(t.id, e.target.value)}
                  disabled={savingId === t.id}
                  className="status-select px-2 py-1 border rounded-md bg-white text-gray-900
                             focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  {STATUS_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value} className="text-black">
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

