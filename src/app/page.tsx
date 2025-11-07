import Link from "next/link";

export default function Home() {
  return (
    <div className="mx-auto max-w-4xl p-8">
      <h1 className="text-3xl font-bold mb-6 text-gray-900">何から始めますか？</h1>

      <div className="start-grid">
        <Link href="/dashboard" className="btn-primary btn-lg">自分のToDoを確認</Link>
        <Link href="/meetings/new" className="btn-primary btn-lg">新しい会議を要約</Link>
        <Link href="/meetings" className="btn-primary btn-lg">会議一覧へ</Link>
        <Link href="/search" className="btn-primary btn-lg">検索</Link>
      </div>
    </div>
  );
}
