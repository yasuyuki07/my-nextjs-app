// src/app/search/page.tsx
import { Suspense } from 'react';
import SearchClient from './SearchClient';

export const dynamic = 'force-dynamic';

export default function Page() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-gray-500">検索UIを読み込み中…</div>}>
      <SearchClient />
    </Suspense>
  );
}
