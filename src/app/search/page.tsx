// src/app/search/page.tsx
import { Suspense } from 'react';
import SearchClient from './SearchClient';
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  return (
    <Suspense fallback={<div className="p-6 text-sm text-gray-500">検索UIを読み込み中…</div>}>
      <SearchClient />
    </Suspense>
  );
}
