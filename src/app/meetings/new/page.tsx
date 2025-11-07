'use client';

import React, { ChangeEvent, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';

// ← ここはファイルの先頭（コンポーネントの外）です
if (typeof window !== 'undefined') {
  (window as any).supabase = supabase;
  console.log('window.supabase を公開しました（module-scope）');
}


// ===== 型 =====
type Todo = {
  assignee: string;        // 表示名（full_name or username）
  assignee_id?: string;    // profiles.id（UUID）
  due_date: string;
  task: string;
};
type ParsedResult = { summary: string[]; decisions: string[]; todos: Todo[] };
type Profile = { id: string; full_name: string | null; username: string | null };

// ===== DifyのanswerからJSON抽出 =====
function tryParseAnswerToJSON(answer: unknown): { parsed: ParsedResult | null; raw: string } {
  const text = typeof answer === 'string' ? answer.trim() : '';
  if (!text) return { parsed: null, raw: '' };

  const tryParse = (s: string) => {
    try {
      const obj = JSON.parse(s);
      if (obj && Array.isArray(obj.summary) && Array.isArray(obj.decisions) && Array.isArray(obj.todos)) {
        return obj as ParsedResult;
      }
    } catch {}
    return null;
  };

  const direct = tryParse(text);
  if (direct) return { parsed: direct, raw: text };

  const fenceJson =
    text.match(/```json\s*([\s\S]*?)```/i)?.[1] ??
    text.match(/```\s*([\s\S]*?)```/i)?.[1];
  if (fenceJson) {
    const parsed = tryParse(fenceJson.trim());
    if (parsed) return { parsed, raw: text };
  }

  const brace = text.match(/\{[\s\S]*\}$/);
  if (brace) {
    const parsed = tryParse(brace[0]);
    if (parsed) return { parsed, raw: text };
  }

  return { parsed: null, raw: text };
}

// ===== 担当者サジェスト（インラインUI） =====
function AssigneeSuggest({
  value,
  onChange,
  profiles,
  placeholder = '担当者を入力（名前 or ユーザー名）',
}: {
  value: string;
  onChange: (displayName: string, id?: string) => void;
  profiles: Profile[];
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value);

  const norm = (s: string) => s.normalize('NFKC').toLowerCase();
  const filtered = profiles.filter((p) => {
    const name = (p.full_name || p.username || '').trim();
    return norm(name).includes(norm(query));
  });

  return (
    <div className="relative">
      <input
        type="text"
        className="px-3 py-2 border rounded-md bg-white text-gray-900 w-full"
        value={query}
        placeholder={placeholder}
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          const v = e.target.value;
          setQuery(v);
          setOpen(true);
          // 文字入力中は displayName だけ更新（idは未確定）
          onChange(v);
        }}
        onBlur={() => {
          // 少し遅らせてクリックを拾えるように
          setTimeout(() => setOpen(false), 120);
        }}
      />
      {open && filtered.length > 0 && (
        <ul className="absolute z-10 mt-1 w-full bg-white border rounded-md shadow max-h-56 overflow-auto">
          {filtered.slice(0, 8).map((p) => {
            const display = p.full_name || p.username || '(no name)';
            return (
              <li
                key={p.id}
                className="px-3 py-2 hover:bg-blue-50 cursor-pointer"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onChange(display, p.id);
                  setQuery(display);
                  setOpen(false);
                }}
              >
                {display}
                {p.username && p.full_name && (
                  <span className="ml-2 text-xs text-gray-500">@{p.username}</span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export default function NewMeetingPage() {
  const router = useRouter();
  // ===== 入力欄 =====
  const [title, setTitle] = useState('');
  // 開催日は 年・月・日を分割入力（時間なし）
  const [year, setYear] = useState(''); // YYYY
  const [month, setMonth] = useState(''); // MM
  const [day, setDay] = useState(''); // DD
  const yRef = useRef<HTMLInputElement | null>(null);
  const mRef = useRef<HTMLInputElement | null>(null);
  const dRef = useRef<HTMLInputElement | null>(null);
  const meetingDate = useMemo(() => {
    if (year.length === 4 && month.length === 2 && day.length === 2) {
      return `${year}-${month}-${day}`;
    }
    return '';
  }, [year, month, day]);
  const [transcript, setTranscript] = useState('');
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  // ===== 通信系 =====
  const [isLoading, setIsLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [difyStatus, setDifyStatus] = useState<'unknown' | 'ready' | 'missing'>('unknown');
  const [difyStatusError, setDifyStatusError] = useState<string | null>(null);

  // ===== 結果表示 =====
  const [resultText, setResultText] = useState('');
  const [parsed, setParsed] = useState<ParsedResult | null>(null);

  // ===== F-09: profiles =====
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [profilesLoading, setProfilesLoading] = useState(false);
  const [profilesError, setProfilesError] = useState<string | null>(null);

  // .txtアップロード
  const handleFileUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.target;
    const file = input.files?.[0];
    if (!file) return;

    setFileError(null);
    setUploadedFileName(null);

    if (file.type && file.type !== 'text/plain') {
      setFileError('テキストファイル（.txt）を選択してください。');
      input.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const textContent = reader.result;
      if (typeof textContent === 'string') {
        setTranscript((prev) => (prev ? `${prev}\n${textContent}` : textContent));
        setUploadedFileName(file.name);
        setFileError(null);
        input.value = '';
      } else {
        setFileError('ファイルの読み込みに失敗しました。');
      }
    };
    reader.onerror = () => {
      setFileError('ファイルの読み込みに失敗しました。');
      input.value = '';
    };
    reader.readAsText(file, 'utf-8');
  };

  // 送信→Dify→結果パース
  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitError(null);
    setResultText('');
    setParsed(null);
    setIsLoading(true);

    try {
      if (difyStatus === 'missing') {
        throw new Error('サーバー側にDify APIキーが設定されていないため解析を実行できません。');
      }

      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, meetingDate, transcript, conversationId }),
      });

      const data = await res.json();

      if (!res.ok) {
        setSubmitError(typeof data === 'object' ? JSON.stringify(data, null, 2) : String(data));
        return;
      }

      if (data?.conversation_id && typeof data.conversation_id === 'string') {
        setConversationId(data.conversation_id);
      }

      const { parsed: p, raw } = tryParseAnswerToJSON(data?.answer);
      if (p) {
        setParsed({
          ...p,
          todos: p.todos.map((t) => ({
            assignee: t.assignee ?? '',
            due_date: t.due_date ?? '',
            task: t.task ?? '',
            assignee_id: (t as any).assignee_id, // あれば引き継ぎ
          })),
        });
        setResultText('');
      } else {
        const text =
          typeof data?.answer === 'string'
            ? data.answer
            : JSON.stringify(data, null, 2);
        setResultText(text || raw);
      }
    } catch (err) {
      console.error(err);
      const message = err instanceof Error ? err.message : 'クライアント側の通信エラーが発生しました。';
      setSubmitError(message);
    } finally {
      setIsLoading(false);
    }
  };

  // ===== 編集ハンドラ =====
  const updateSummary = (idx: number, value: string) => {
    if (!parsed) return;
    const next = { ...parsed, summary: [...parsed.summary] };
    next.summary[idx] = value;
    setParsed(next);
  };
  const addSummary = () => parsed && setParsed({ ...parsed, summary: [...parsed.summary, ''] });
  const removeSummary = (idx: number) => parsed && setParsed({ ...parsed, summary: parsed.summary.filter((_, i) => i !== idx) });

  const updateDecision = (idx: number, value: string) => {
    if (!parsed) return;
    const next = { ...parsed, decisions: [...parsed.decisions] };
    next.decisions[idx] = value;
    setParsed(next);
  };
  const addDecision = () => parsed && setParsed({ ...parsed, decisions: [...parsed.decisions, ''] });
  const removeDecision = (idx: number) => parsed && setParsed({ ...parsed, decisions: parsed.decisions.filter((_, i) => i !== idx) });

  const updateTodoText = (idx: number, field: 'due_date' | 'task', value: string) => {
    if (!parsed) return;
    const todos = parsed.todos.map((t, i) => (i === idx ? { ...t, [field]: value } : t));
    setParsed({ ...parsed, todos });
  };

  // ★ 担当者サジェスト選択時
  const updateTodoAssignee = (idx: number, displayName: string, id?: string) => {
    if (!parsed) return;
    const todos = parsed.todos.map((t, i) =>
      i === idx ? { ...t, assignee: displayName, assignee_id: id } : t
    );
    setParsed({ ...parsed, todos });
  };

  // ===== DB保存（meetings → decisions → todos） =====
  const saveToDatabase = async () => {
    if (!parsed) throw new Error('保存対象のデータがありません');

    // 認証チェック
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) {
      throw new Error('ログインが必要です。先にサインインしてください。');
    }

    // 1) meetings を作成
    const iso = new Date(`${meetingDate}T00:00:00`).toISOString(); // 日付のみをISOへ
    const { data: insertedMeeting, error: meetErr } = await supabase
      .from('meetings')
      .insert({
        title,
        meeting_date: iso,
        transcript,              // 文字起こし全文を保存（不要なら削除可）
        summary: parsed.summary, // JSON配列で保存
        created_by: userId,      // RLSのため必須
      })
      .select('id')
      .single();

    if (meetErr) throw meetErr;
    const meetingId = insertedMeeting.id as string;

    // 2) decisions をバルクINSERT（空ならスキップ）
    const decisionRows =
      parsed.decisions
        .map((content) => content?.trim())
        .filter(Boolean)
        .map((content) => ({ meeting_id: meetingId, content }));

    if (decisionRows.length > 0) {
      const { error: decErr } = await supabase.from('decisions').insert(decisionRows);
      if (decErr) throw decErr;
    }

    // 3) todos をバルクINSERT（空ならスキップ）
    const toNull = (v?: string) => (v && v.trim().length > 0 ? v : null);
    const todoRows =
      parsed.todos
        .map((t) => ({
          meeting_id: meetingId,
          assignee_id: toNull(t.assignee_id),        // 未選択はnull
          task: (t.task || '').trim(),
          due_date: toNull(t.due_date) as string | null, // '' は null に
          status: 'open',
        }))
        .filter((row) => row.task.length > 0);

    if (todoRows.length > 0) {
      const { error: todoErr } = await supabase.from('todos').insert(todoRows);
      if (todoErr) throw todoErr;
    }

    return meetingId;
  };

  // 確定 → DB保存に変更（F-10）
  const handleConfirm = async () => {
    if (!parsed) return;
    try {
      setIsSaving(true);
      const meetingId = await saveToDatabase();
      alert('保存に成功しました！');
      console.log('保存済み meeting_id:', meetingId);
      // 必要に応じて画面遷移:
      router.push(`/meetings/${meetingId}`);
    } catch (e: any) {
      console.error(e);
      alert(`保存に失敗しました: ${e?.message || e}`);
    } finally {
      setIsSaving(false);
    }
  };

// ✅ NewMeetingPage() の中（状態定義のあと※どこでもOK）に追加
useEffect(() => {
  // コンソールから使えるように一時的に公開
  (window as any).supabase = supabase;
  console.log('window.supabase を公開しました');

  // ページ離脱やホットリロード時に掃除
  return () => {
    try {
      delete (window as any).supabase;
    } catch {
      (window as any).supabase = undefined;
    }
  };
}, []);


  useEffect(() => {
    let cancelled = false;
    const checkDifyStatus = async () => {
      try {
        setDifyStatusError(null);
        const res = await fetch('/api/analyze');
        if (!res.ok) {
          throw new Error(`status ${res.status}`);
        }
        const data = await res.json();
        if (cancelled) return;
        setDifyStatus(data?.hasKey ? 'ready' : 'missing');
      } catch (err) {
        console.error('Failed to check Dify status', err);
        if (!cancelled) {
          setDifyStatusError('Dify連携の状態確認に失敗しました。時間をおいて再度お試しください。');
        }
      }
    };

    checkDifyStatus();
    return () => {
      cancelled = true;
    };
  }, []);



  // ===== profiles 取得 =====
  useEffect(() => {
    let mounted = true;
    const fetchProfiles = async () => {
      setProfilesLoading(true);
      setProfilesError(null);
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, full_name, username')
          .order('full_name', { ascending: true });
        if (error) throw error;
        if (!mounted) return;
        setProfiles(data || []);
      } catch (e: any) {
        console.error(e);
        if (mounted) setProfilesError(e?.message || '担当者リストの取得に失敗しました。');
      } finally {
        if (mounted) setProfilesLoading(false);
      }
    };
    fetchProfiles();
    return () => { mounted = false; };
  }, []);

  const isDifyMissing = difyStatus === 'missing';
  const isCheckingDify = difyStatus === 'unknown' && !difyStatusError;

  return (
    <div className="max-w-2xl mx-auto p-8">
      <h1 className="text-2xl font-bold mb-6">新しい議事録の解析</h1>

      {isCheckingDify && (
        <div className="mb-4 rounded-md border border-blue-200 bg-blue-50 p-4 text-sm text-blue-700">
          Dify APIキーの設定状況を確認しています…
        </div>
      )}

      {isDifyMissing && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <p>サーバー側にDify APIキーが設定されていないため、解析を実行できません。</p>
          <p className="mt-2">
            Vercelのプロジェクト設定で <code>DIFY_API_KEY</code>（または <code>NEXT_PUBLIC_DIFY_API_KEY</code>）を
            環境変数として設定し、再デプロイしてください。
          </p>
        </div>
      )}

      {difyStatusError && (
        <div className="mb-4 rounded-md border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-700">
          {difyStatusError}
        </div>
      )}

      {/* 解析フォーム */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* 会議名 */}
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-200 sm:text-gray-700">
            会議名
          </label>
          <input
            type="text"
            id="title"
            name="title"
            className="mt-1 block w-full px-3 py-2 border rounded-md bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            placeholder=""
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </div>

        {/* 開催日時 */}
        <div>
          <label htmlFor="meeting_date" className="block text-sm font-medium text-gray-200 sm:text-gray-700">
            開催日時
          </label>
          <input
            type="hidden"
            id="meeting_date"
            name="meeting_date"
            value={meetingDate}
          />
          <div className="mt-1 flex items-center gap-2">
            <input
              ref={yRef}
              inputMode="numeric"
              pattern="[0-9]{4}"
              placeholder="YYYY"
              className="w-28 px-3 py-2 border rounded-md bg-white text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              value={year}
              onChange={(e) => {
                const v = e.target.value.replace(/[^0-9]/g, '').slice(0, 4);
                setYear(v);
                if (v.length === 4) mRef.current?.focus();
              }}
              required
            />
            <span>年</span>
            <input
              ref={mRef}
              inputMode="numeric"
              pattern="[0-9]{2}"
              placeholder="MM"
              className="w-20 px-3 py-2 border rounded-md bg-white text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              value={month}
              onChange={(e) => {
                const v = e.target.value.replace(/[^0-9]/g, '').slice(0, 2);
                setMonth(v);
                if (v.length === 2) dRef.current?.focus();
              }}
              required
            />
            <span>月</span>
            <input
              ref={dRef}
              inputMode="numeric"
              pattern="[0-9]{2}"
              placeholder="DD"
              className="w-20 px-3 py-2 border rounded-md bg-white text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              value={day}
              onChange={(e) => {
                const v = e.target.value.replace(/[^0-9]/g, '').slice(0, 2);
                setDay(v);
              }}
              required
            />
            <span>日</span>
          </div>
        </div>

        {/* 文字起こし */}
        <div>
          <label htmlFor="transcript" className="block text-sm font-medium text-gray-200 sm:text-gray-700">
            文字起こしテキスト
          </label>
          <div className="mt-1 flex flex-col gap-2">
            <input
              type="file"
              id="transcript_file"
              name="transcript_file"
              accept=".txt,text/plain"
              onChange={handleFileUpload}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
            {uploadedFileName && <p className="text-xs text-gray-500">アップロード済み: {uploadedFileName}</p>}
            {fileError && <p className="text-xs text-red-600">{fileError}</p>}
          </div>
          <textarea
            id="transcript"
            name="transcript"
            rows={10}
            className="mt-2 block w-full px-3 py-2 border rounded-md bg-white !text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            style={{ color: '#111827' }}
            placeholder="会議名"
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
            required
          />
        </div>

        {submitError && <div className="text-sm text-red-600 whitespace-pre-wrap">{submitError}</div>}

        <div>
          <button
            type="submit"
            disabled={isLoading || isDifyMissing}
            className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md text-sm font-medium text-white ${
              isLoading || isDifyMissing ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
            } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500`}
          >
            {isLoading ? '解析中…' : '解析を実行する'}
          </button>
        </div>
      </form>

      {/* ====== 解析結果（編集UI） ====== */}
      {parsed && (
        <div className="mt-8 space-y-8">
          {/* 要約 */}
          <section>
            <h2 className="text-lg font-semibold mb-3">要約（summary）</h2>
            <div className="space-y-2">
              {parsed.summary.map((s, i) => (
                <div key={`summary-${i}`} className="flex gap-2">
                  <input
                    type="text"
                    className="flex-1 w-full px-3 py-2 border rounded-md bg-white text-gray-900"
                    value={s}
                    onChange={(e) => updateSummary(i, e.target.value)}
                    placeholder={`要約 ${i + 1}`}
                  />
                  <button className="px-3 py-2 text-sm bg-gray-200 rounded-md" onClick={() => removeSummary(i)} type="button">
                    削除
                  </button>
                </div>
              ))}
              <button className="mt-2 px-3 py-2 text-sm bg-blue-50 text-blue-700 rounded-md" type="button" onClick={addSummary}>
                要約を追加
              </button>
            </div>
          </section>

          {/* 決定事項 */}
          <section>
            <h2 className="text-lg font-semibold mb-3">決定事項（decisions）</h2>
            <div className="space-y-2">
              {parsed.decisions.map((d, i) => (
                <div key={`decision-${i}`} className="flex gap-2">
                  <input
                    type="text"
                    className="flex-1 w-full px-3 py-2 border rounded-md bg-white text-gray-900"
                    value={d}
                    onChange={(e) => updateDecision(i, e.target.value)}
                    placeholder={`決定事項 ${i + 1}`}
                  />
                  <button className="px-3 py-2 text-sm bg-gray-200 rounded-md" onClick={() => removeDecision(i)} type="button">
                    削除
                  </button>
                </div>
              ))}
              <button className="mt-2 px-3 py-2 text-sm bg-blue-50 text-blue-700 rounded-md" type="button" onClick={addDecision}>
                決定事項を追加
              </button>
            </div>
          </section>

          {/* ToDo */}
          <section>
            <h2 className="text-lg font-semibold mb-3">ToDo（担当／期限／内容）</h2>

            {profilesLoading && <p className="text-sm text-gray-500">担当者リストを読み込み中…</p>}
            {profilesError && <p className="text-sm text-red-600">{profilesError}</p>}

            <div className="space-y-3">
              {parsed.todos.map((t, i) => (
                <div key={`todo-${i}`} className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {/* ★ 担当者（サジェスト） */}
                  <AssigneeSuggest
                    value={t.assignee || ''}
                    profiles={profiles}
                    onChange={(display, id) => updateTodoAssignee(i, display, id)}
                  />

                  {/* 期限 */}
                  <input
                    type="date"
                    className="px-3 py-2 border rounded-md bg-white text-gray-900"
                    value={t.due_date}
                    onChange={(e) => updateTodoText(i, 'due_date', e.target.value)}
                  />

                  {/* タスク内容 */}
                  <div className="sm:col-span-3 flex gap-2">
                    <textarea
                      rows={2}
                      className="flex-1 w-full px-3 py-2 border rounded-md bg-white text-gray-900"
                      placeholder="会議名"
                      value={t.task}
                      onChange={(e) => updateTodoText(i, 'task', e.target.value)}
                    ></textarea>
                    <button
                      className="px-3 py-2 text-sm bg-gray-200 rounded-md"
                      onClick={() => {
                        if (!parsed) return;
                        setParsed({ ...parsed, todos: parsed.todos.filter((_, idx) => idx !== i) });
                      }}
                      type="button"
                    >
                      削除
                    </button>
                  </div>
                </div>
              ))}
              <button
                className="mt-1 px-3 py-2 text-sm bg-blue-50 text-blue-700 rounded-md"
                type="button"
                onClick={() => parsed && setParsed({
                  ...parsed,
                  todos: [...parsed.todos, { assignee: '', assignee_id: '', due_date: '', task: '' }],
                })}
              >
                ToDoを追加
              </button>
            </div>
          </section>

          <div className="pt-2">
            <button
              type="button"
              onClick={handleConfirm}
              disabled={isSaving}
              className={`w-full py-2 px-4 rounded-md text-white ${isSaving ? 'bg-blue-400' : 'bg-blue-600 hover:bg-blue-700'}`}
            >
              {isSaving ? '保存中…' : '確定してDBに保存する'}
            </button>
          </div>
        </div>
      )}

      {/* ====== パースできなかった場合の暫定表示（生） ====== */}
      {!parsed && resultText && (
        <div className="mt-6">
          <h2 className="text-lg font-semibold mb-2">解析結果（暫定表示）</h2>
          <pre className="whitespace-pre-wrap text-sm p-4 bg-gray-50 border rounded">{resultText}</pre>
          {conversationId && <p className="text-xs text-gray-500 mt-2">conversation_id: {conversationId}</p>}
        </div>
      )}
    </div>
  );
}







