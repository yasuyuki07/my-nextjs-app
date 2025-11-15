'use client';

import React, { useMemo, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

type DbStatus = 'open' | 'in_progress' | 'done';

type MeetingInfo = {
  title: string | null;
  meeting_date: string | null;
} | null;

type AssigneeInfo = {
  full_name: string | null;
  username: string | null;
} | null;

export type AdminTodo = {
  id: string;
  task: string;
  status: DbStatus;
  due_date: string | null;
  meeting: MeetingInfo;
  assignee: AssigneeInfo;
  assigneeId: string | null;
};

type StatusFilter = DbStatus | 'all';
type SortOrder = 'asc' | 'desc';
type AssigneeFilter = 'all' | '__unassigned__' | string;

type DueSignal = 'green' | 'yellow' | 'red' | 'gray';

const STATUS_OPTIONS: { value: DbStatus; label: string }[] = [
  { value: 'open', label: '未着手' },
  { value: 'in_progress', label: '作業中' },
  { value: 'done', label: '完了' },
];

const DUE_SIGNAL_META: Record<
  DueSignal,
  { label: string; dot: string; text: string; chip: string; card: string }
> = {
  green: {
    label: '緑信号',
    dot: 'bg-emerald-400',
    text: 'text-emerald-700',
    chip: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    card: 'border-emerald-300',
  },
  yellow: {
    label: '黄色信号',
    dot: 'bg-amber-400',
    text: 'text-amber-700',
    chip: 'border-amber-200 bg-amber-50 text-amber-800',
    card: 'border-amber-300',
  },
  red: {
    label: '赤色信号',
    dot: 'bg-rose-500',
    text: 'text-rose-700',
    chip: 'border-rose-200 bg-rose-50 text-rose-700',
    card: 'border-rose-400',
  },
  gray: {
    label: '期日未設定',
    dot: 'bg-gray-400',
    text: 'text-gray-500',
    chip: 'border-gray-200 bg-gray-50 text-gray-600',
    card: 'border-gray-200',
  },
};

const classifyDueSignal = (iso: string | null): DueSignal => {
  if (!iso) return 'gray';
  const due = new Date(iso);
  if (Number.isNaN(due.getTime())) return 'gray';

  const today = new Date();
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const dueDay = new Date(due.getFullYear(), due.getMonth(), due.getDate());

  if (dueDay.getTime() < startOfToday.getTime()) return 'red';

  const diffDays = Math.floor((dueDay.getTime() - startOfToday.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays <= 2) return 'yellow';

  return 'green';
};

const formatDate = (iso: string | null): string => {
  if (!iso) return '-';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}/${mm}/${dd}`;
};

const resolveAssigneeName = (todo: AdminTodo): string => {
  if (!todo.assigneeId) return '担当なし';
  return todo.assignee?.full_name || todo.assignee?.username || `ID: ${todo.assigneeId}`;
};

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
  return 'open';
};

type Props = {
  initialTodos: AdminTodo[];
};

export default function AllTodosClient({ initialTodos }: Props) {
  const [todos, setTodos] = useState<AdminTodo[]>(initialTodos);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [assigneeFilter, setAssigneeFilter] = useState<AssigneeFilter>('all');
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const assigneeOptions = useMemo(() => {
    const map = new Map<string, string>();
    todos.forEach((t) => {
      if (!t.assigneeId) return;
      const label = resolveAssigneeName(t);
      if (!map.has(t.assigneeId)) map.set(t.assigneeId, label);
    });
    return Array.from(map.entries()).map(([value, label]) => ({ value, label }));
  }, [todos]);

  const hasUnassigned = useMemo(() => todos.some((t) => !t.assigneeId), [todos]);

  const view = useMemo(() => {
    const statusFiltered =
      statusFilter === 'all' ? todos : todos.filter((t) => t.status === statusFilter);

    const assigneeFiltered = statusFiltered.filter((t) => {
      if (assigneeFilter === 'all') return true;
      if (assigneeFilter === '__unassigned__') return !t.assigneeId;
      return t.assigneeId === assigneeFilter;
    });

    const sorted = [...assigneeFiltered].sort((a, b) => {
      const aTime = a.due_date ? new Date(a.due_date).getTime() : Infinity;
      const bTime = b.due_date ? new Date(b.due_date).getTime() : Infinity;
      return sortOrder === 'asc' ? aTime - bTime : bTime - aTime;
    });
    return sorted;
  }, [todos, statusFilter, assigneeFilter, sortOrder]);

  const handleStatusChange = async (id: string, nextRaw: string) => {
    const next = toDbStatus(nextRaw);
    setSavingId(id);
    setError(null);

    const previous = todos.find((t) => t.id === id)?.status ?? 'open';
    setTodos((prev) => prev.map((t) => (t.id === id ? { ...t, status: next } : t)));

    const { error: upErr } = await supabase.from('todos').update({ status: next }).eq('id', id);
    setSavingId(null);

    if (upErr) {
      setTodos((prev) => prev.map((t) => (t.id === id ? { ...t, status: previous } : t)));
      setError(upErr.message);
      alert(`ステータス更新に失敗しました: ${upErr.message}`);
    }
  };

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-400">ステータス</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(toDbStatus(e.target.value) as StatusFilter)}
            className="status-select px-3 py-2 border rounded-md bg-white text-gray-900
                       focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all" className="text-black">
              すべて
            </option>
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
                     focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          期限で並び替え: {sortOrder === 'asc' ? '昇順' : '降順'}
        </button>

        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-400">担当</span>
          <select
            value={assigneeFilter}
            onChange={(e) => setAssigneeFilter(e.target.value as AssigneeFilter)}
            className="status-select px-3 py-2 border rounded-md bg-white text-gray-900
                       focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all" className="text-black">
              すべて
            </option>
            {hasUnassigned && (
              <option value="__unassigned__" className="text-black">
                担当なし
              </option>
            )}
            {assigneeOptions.map((opt) => (
              <option key={opt.value} value={opt.value} className="text-black">
                {opt.label}
              </option>
            ))}
          </select>
        </div>

      </div>

      {error && <p className="text-sm text-red-600 mb-3">{error}</p>}

      {view.length === 0 ? (
        <p className="text-sm text-gray-500">表示できる ToDo はありません。</p>
      ) : (
        <ul className="space-y-4">
          {view.map((t) => {
            const signal = classifyDueSignal(t.due_date);
            const signalMeta = DUE_SIGNAL_META[signal];
            const isDone = t.status === 'done';
            const assigneeName = resolveAssigneeName(t);

            return (
              <li
                key={t.id}
                className={`rounded-md p-4 transition-colors ${
                  isDone ? 'bg-emerald-50/80 shadow-inner' : `border bg-black/5 ${signalMeta.card}`
                }`}
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className={`leading-6 ${isDone ? 'line-through text-gray-500' : ''}`}>{t.task}</p>
                    <p className="text-sm text-gray-400 mt-1">
                      会議: {t.meeting?.title ?? '-'} ／ 期限: {formatDate(t.due_date)} ／ 担当: {assigneeName}
                    </p>
                  </div>

                  <div className="flex flex-col gap-3 sm:items-end">
                    <div className={`inline-flex items-center gap-2 text-xs font-semibold ${signalMeta.text}`}>
                      {!isDone && <span className={`h-2.5 w-2.5 rounded-full ${signalMeta.dot}`} />}
                      {!isDone && (
                        <span className={`px-2 py-0.5 rounded-full border ${signalMeta.chip}`}>
                          {signalMeta.label}
                        </span>
                      )}
                      {isDone && (
                        <span className="px-2 py-0.5 rounded-full bg-white text-emerald-700">完了済み</span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs text-gray-400">ステータス</span>
                      <select
                        value={t.status}
                        onChange={(e) => handleStatusChange(t.id, e.target.value)}
                        disabled={savingId === t.id}
                        className="status-select px-2 py-1 border rounded-md bg-white text-gray-900
                                   focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        {STATUS_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value} className="text-black">
                            {opt.label}
                          </option>
            ))}
          </select>
        </div>
      </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
