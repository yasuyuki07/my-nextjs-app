'use client';

import { usePathname } from 'next/navigation';
import React, { useEffect, useState } from 'react';

type HelpItem = { title: string; description: string };
type HelpSection = { heading: string; items: HelpItem[] };

const HELP_CONTENT = {
  '1.0': [
    {
      heading: 'アクセスと個人設定',
      items: [
        {
          title: 'ホーム（/）',
          description:
            '「最近のタスク」「会議」「検索」の各ボタンから移動できます。朝はここでマイタスク→会議→検索の順に確認すると迷いません。',
        },
        {
          title: 'ログイン（/login）',
          description:
            'メールアドレスとパスワードを入力し、「表示」ボタンで文字を確認できます。エラーが出た場合は内容を落ち着いて見直し、必要ならサインアップへ進んでください。',
        },
        {
          title: 'サインアップ（/signup）',
          description:
            'メールとパスワードを登録します。送信後は届いた確認メール内のリンクを押して本登録を完了させてください。',
        },
        {
          title: 'アカウント設定（/account）',
          description:
            '顔写真、氏名、ユーザー名、WebサイトURLを編集できます。「更新」を押したら完了メッセージが出るまで画面を閉じず、右下のサインアウトで安全にログアウトしましょう。',
        },
        {
          title: '全体検索（/search）',
          description:
            'キーワードを入れると会議・決定事項・ToDoをまとめて調べられます。結果をクリックすると該当の会議詳細へ移動します。',
        },
        {
          title: 'エラー画面',
          description:
            'まれに「Sorry, something went wrong」と表示されることがあります。ブラウザの戻るボタン、またはホームへ戻って再度アクセスしてください。',
        },
      ],
    },
    {
      heading: 'タスク・会議関連',
      items: [
        {
          title: 'マイダッシュボード（/dashboard）',
          description:
            '自分のToDoを期限順に確認し、色付きの丸で緊急度を把握できます。「編集」ボタンで一括編集モードになり、内容や期日を直して各カードの「保存」を押します。',
        },
        {
          title: '全社ToDo（/todos）',
          description:
            'すべてのToDoが一覧で表示されます。ステータス・期限ソート・担当者フィルターで絞り込み、遅れそうな作業を早めにフォローできます。',
        },
        {
          title: '会議一覧（/meetings）',
          description:
            '直近50件の会議タイトルと日時を確認できます。右上の「新規作成」リンクからAI解析付きの議事録作成画面へ移動します。',
        },
        {
          title: '会議詳細（/meetings/[id]）',
          description:
            '会議タイトル・日時・要約・決定事項・紐付いたToDoを確認できます。担当者名と期限がまとまっているので進捗チェックに便利です。',
        },
        {
          title: '新規会議作成（/meetings/new）',
          description:
            '会議名・開催日・テキスト議事録を入力し、「解析を実行」でAIに要約とToDo案を作ってもらいます。見直し後「確認してDBへ保存」を押すとmeetings/decisions/todosに登録されます。',
        },
      ],
    },
  ],
} as const satisfies Record<string, HelpSection[]>;

type HelpVersion = keyof typeof HELP_CONTENT;
const DEFAULT_VERSION: HelpVersion = '1.0';

export default function HelpModal() {
  const pathname = usePathname();
  const hide = pathname === '/login' || pathname === '/signup';
  const versionKeys = Object.keys(HELP_CONTENT) as HelpVersion[];
  const fallbackVersion =
    (versionKeys.includes(DEFAULT_VERSION) ? DEFAULT_VERSION : versionKeys[0]) ?? DEFAULT_VERSION;
  const [open, setOpen] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState<HelpVersion>(fallbackVersion);
  const sections = HELP_CONTENT[selectedVersion] ?? HELP_CONTENT[fallbackVersion];

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  if (hide) return null;

  return (
    <>
      <button
        type="button"
        className="fixed bottom-5 right-5 z-30 rounded-full bg-blue-600 px-5 py-2 text-sm font-semibold text-white shadow-lg transition hover:bg-blue-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500"
        onClick={() => setOpen(true)}
      >
        ヘルプ v{selectedVersion}
      </button>

      {open && (
        <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50"
            aria-hidden="true"
            onClick={() => setOpen(false)}
          />
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="help-modal-title"
            className="relative z-50 max-h-[85vh] w-full max-w-3xl overflow-auto rounded-2xl bg-white p-6 text-gray-900 shadow-2xl"
          >
            <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">
                  アプリの使い方
                </p>
                <h2 id="help-modal-title" className="mt-1 text-2xl font-bold">
                  ヘルプガイド
                </h2>
                <p className="text-sm text-gray-500">
                  各ページの役割と操作の流れをまとめました。画面回りが分かりづらいときにお役立てください。
                </p>
              </div>

              <div className="flex flex-col items-end gap-3 text-right">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-md border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-600 transition hover:bg-gray-50 hover:text-gray-900"
                >
                  閉じる
                </button>
              </div>
            </div>

            <div className="space-y-6 text-sm leading-6">
              {sections.map((section) => (
                <section key={section.heading} className="space-y-2">
                  <h3 className="text-base font-semibold text-gray-800">{section.heading}</h3>
                  <ul className="space-y-3">
                    {section.items.map((item) => (
                      <li key={item.title} className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                        <p className="font-semibold text-gray-900">{item.title}</p>
                        <p className="mt-1 text-gray-700">{item.description}</p>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
              <section className="rounded-lg border border-blue-100 bg-blue-50 p-4 text-blue-900">
                <h3 className="text-base font-semibold">困ったときは</h3>
                <p className="mt-1">
                  画面が動かないときは一度ブラウザを更新し、必要ならログアウト→ログインをやり直してください。
                  それでも解決しない場合は、画面右下のヘルプボタンからこの案内を見返し、社内管理者へご相談ください。
                </p>
              </section>
              <div className="flex items-center justify-end gap-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
                <label htmlFor="help-version" className="text-xs text-gray-500">
                  バージョン
                </label>
                <select
                  id="help-version"
                  value={selectedVersion}
                  onChange={(e) => {
                    const next = e.target.value as HelpVersion;
                    if (HELP_CONTENT[next]) setSelectedVersion(next);
                  }}
                  className="rounded-md border border-gray-200 bg-white px-2 py-1 text-xs font-medium text-gray-700"
                >
                  {versionKeys.map((key) => (
                    <option key={key} value={key}>
                      v{key}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
