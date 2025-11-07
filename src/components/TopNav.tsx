'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function TopNav() {
  const pathname = usePathname()

  // Hide on login page
  if (pathname === '/login') return null

  return (
    <header className="sticky top-0 z-20 border-b bg-blue-700 topbar">
      <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between text-white">
        <Link href="/" className="font-semibold text-white hover:opacity-90">
          AI Meeting App
        </Link>
        <nav className="flex items-center gap-1 text-sm">
          <Link href="/dashboard" className="px-3 py-2 rounded-md text-white hover:bg-blue-600">
            ToDo
          </Link>
          <Link href="/meetings/new" className="px-3 py-2 rounded-md text-white hover:bg-blue-600">
            会議の要約
          </Link>
          <Link href="/meetings" className="px-3 py-2 rounded-md text-white hover:bg-blue-600">
            会議一覧
          </Link>
          <Link
            href="/search"
            className="inline-flex items-center rounded-md border border-transparent px-3 py-2 bg-blue-600 text-white hover:bg-blue-500"
          >
            検索
          </Link>
        </nav>
      </div>
    </header>
  )
}

