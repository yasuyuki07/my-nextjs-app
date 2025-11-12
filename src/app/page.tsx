import Link from "next/link";

export default function Home() {
  return (
    <div className="mx-auto max-w-4xl p-8">
      <h1 className="text-3xl font-bold mb-6 text-gray-900">何から始めますか？</h1>

      {/* ▼ タスク */}
      <section className="mb-8">
        <h2 className="mb-3 text-sm font-semibold text-gray-700">▼ タスク</h2>
        <div className="start-grid">
          <Link href="/dashboard" className="btn-primary btn-lg">自分のタスク</Link>
          <Link href="/todos" className="btn-primary btn-lg">全体タスク（管理者）</Link>
        </div>
      </section>

      {/* ▼ 会議 */}
      <section className="mb-8">
        <h2 className="mb-3 text-sm font-semibold text-gray-700">▼ 会議</h2>
        <div className="start-grid">
          <Link href="/meetings" className="btn-primary btn-lg">会議一覧を見る</Link>
          <Link href="/meetings/new" className="btn-primary btn-lg">新しい会議を作成</Link>
        </div>
      </section>

      {/* ▼ 検索 */}
      <section>
        <h2 className="mb-3 text-sm font-semibold text-gray-700">▼ 検索</h2>
        <div className="grid gap-4">
          <Link href="/search" className="btn-primary btn-lg">タスク・会議を検索</Link>
        </div>
      </section>
    </div>
  );
}
