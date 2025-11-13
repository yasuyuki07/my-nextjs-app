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
type TodoDraft = { task: string; dueInput: string };

type DueSignal = 'green' | 'yellow' | 'red' | 'gray';

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

const toDateInputValue = (iso: string | null): string => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const makeDraftFromTodo = (todo: TodoRow): TodoDraft => ({
  task: todo.task,
  dueInput: toDateInputValue(todo.due_date),
});

const buildDraftMap = (rows: TodoRow[]): Record<string, TodoDraft> => {
  const next: Record<string, TodoDraft> = {};
  rows.forEach((row) => {
    next[row.id] = makeDraftFromTodo(row);
  });
  return next;
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
  const [drafts, setDrafts] = useState<Record<string, TodoDraft>>({});
  const [editingAll, setEditingAll] = useState(false);

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
        // 未ログインはログイン画面へ遷移
        window.location.href = '/login';
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

  const handleEnterEditMode = () => {
    setDrafts(buildDraftMap(todos));
    setEditingAll(true);
  };

  const handleExitEditMode = () => {
    setDrafts({});
    setEditingAll(false);
  };

  const handleDraftChange = (todo: TodoRow, field: keyof TodoDraft, value: string) => {
    setDrafts((prev) => {
      if (!editingAll) return prev;
      const original = makeDraftFromTodo(todo);
      const existing = prev[todo.id] ?? original;
      const nextDraft = { ...existing, [field]: value };
      if (nextDraft.task === original.task && nextDraft.dueInput === original.dueInput) {
        const clone = { ...prev };
        delete clone[todo.id];
        return clone;
      }
      return { ...prev, [todo.id]: nextDraft };
    });
  };

  const handleTodoSave = async (todo: TodoRow) => {
    if (!editingAll) return;
    const draft = drafts[todo.id] ?? makeDraftFromTodo(todo);
    const snapshot = makeDraftFromTodo(todo);
    const trimmedTask = draft.task.trim();
    if (!trimmedTask) {
      alert('ToDo内容を入力してください');
      return;
    }
    if (trimmedTask === snapshot.task && draft.dueInput === snapshot.dueInput) {
      return;
    }

    setSavingId(todo.id);
    setError(null);

    const nextDue = draft.dueInput ? draft.dueInput : null;
    const updatedTodo: TodoRow = { ...todo, task: trimmedTask, due_date: nextDue };
    const { error: upErr } = await supabase
      .from('todos')
      .update({ task: trimmedTask, due_date: nextDue })
      .eq('id', todo.id);

    setSavingId(null);

    if (upErr) {
      setError(upErr.message);
      alert(`保存に失敗しました: ${upErr.message}`);
      return;
    }

    setTodos((prev) => prev.map((t) => (t.id === todo.id ? updatedTodo : t)));
    setDrafts((prev) => ({
      ...prev,
      [todo.id]: makeDraftFromTodo(updatedTodo),
    }));
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
                       focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                     focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          期限で並び替え: {sortOrder === 'asc' ? '昇順' : '降順'}
        </button>

        <button
          type="button"
          onClick={editingAll ? handleExitEditMode : handleEnterEditMode}
          className={`px-3 py-2 text-sm rounded-md border focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
            editingAll
              ? 'bg-blue-600 text-white border-blue-600 hover:bg-blue-500'
              : 'bg-white text-gray-900 hover:bg-gray-50'
          }`}
        >
          {editingAll ? '編集モードを終了' : '編集'}
        </button>
      </div>

      {loading && <p className="text-sm text-gray-400">読み込み中…</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}

      {!loading && view.length === 0 && (
        <p className="text-sm text-gray-400">表示できるToDoがありません。</p>
      )}

      <ul className="space-y-5 list-none pl-0">
        {view.map((t) => {
          const signal = classifyDueSignal(t.due_date);
          const signalMeta = DUE_SIGNAL_META[signal];
          const isDone = t.status === 'done';
          const cardClass = isDone
            ? 'rounded-md p-4 transition-colors bg-emerald-50/80 shadow-inner'
            : `border rounded-md p-4 transition-colors bg-black/5 ${signalMeta.card}`;
          const snapshotDraft = makeDraftFromTodo(t);
          const draft = drafts[t.id] ?? snapshotDraft;
          const isEditing = editingAll;
          const isDirty =
            isEditing && (draft.task !== snapshotDraft.task || draft.dueInput !== snapshotDraft.dueInput);
          const isSaving = savingId === t.id;
          const canSave = isEditing && Boolean(draft.task.trim()) && isDirty && !isSaving;
          const taskInputId = `task-${t.id}`;
          const dueInputId = `due-${t.id}`;
          return (
            <li key={t.id} className={cardClass}>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                {isEditing ? (
                  <div className="flex-1 space-y-3">
                    <div>
                      <label htmlFor={taskInputId} className="text-xs font-medium text-gray-400">
                        ToDo内容
                      </label>
                      <textarea
                        id={taskInputId}
                        value={draft.task}
                        rows={3}
                        disabled={isSaving}
                        onChange={(e) => handleDraftChange(t, 'task', e.target.value)}
                        className={`mt-1 w-full rounded-md border bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          isDone ? 'line-through text-gray-500 bg-gray-100' : 'border-gray-300'
                        }`}
                      />
                    </div>
                    <p className="text-sm text-gray-400">会議: {t.meeting?.title ?? '-'}</p>
                    <div>
                      <label htmlFor={dueInputId} className="text-xs font-medium text-gray-400">
                        期限
                      </label>
                      <input
                        id={dueInputId}
                        type="date"
                        value={draft.dueInput}
                        disabled={isSaving}
                        onChange={(e) => handleDraftChange(t, 'dueInput', e.target.value)}
                        className="mt-1 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <p className="mt-1 text-xs text-gray-400">表示形式: {formatDate(t.due_date)}</p>
                    </div>
                  </div>
                ) : (
                  <div>
                    <p className={`leading-6 ${isDone ? 'line-through text-gray-500' : ''}`}>{t.task}</p>
                    <p className="text-sm text-gray-400 mt-1">
                      会議: {t.meeting?.title ?? '-'} ／ 期限: {formatDate(t.due_date)}
                    </p>
                  </div>
                )}

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

                  {isEditing && (
                    <button
                      type="button"
                      onClick={() => handleTodoSave(t)}
                      disabled={!canSave}
                      className="px-3 py-1.5 text-sm rounded-md border bg-blue-600 text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      保存
                    </button>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
