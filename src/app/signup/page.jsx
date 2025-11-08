import { signup } from './action'
import Link from 'next/link'

export default async function SignupPage({ searchParams }) {
  const sp = await searchParams
  const error = typeof sp?.error === 'string' ? sp.error : undefined

  return (
    <form className="max-w-md mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-bold">新規登録</h1>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <label htmlFor="email">Email:</label>
      <input id="email" name="email" type="email" required className="border px-3 py-2 w-full"/>

      <label htmlFor="password">Password:</label>
      <input id="password" name="password" type="password" required className="border px-3 py-2 w-full"/>

      <div className="flex gap-2 pt-2">
        <button formAction={signup} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded">
          登録する
        </button>
        <Link href="/login" className="px-4 py-2 rounded text-blue-700 hover:underline">
          ログインへ戻る
        </Link>
      </div>
    </form>
  )
}

