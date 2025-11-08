import { login } from './action'
import Link from 'next/link'

// Server Component なので async にして OK
export default async function LoginPage({ searchParams }) {
  // ★ ここがポイント：await してから使う
  const sp = await searchParams
  const error =
    typeof sp?.error === 'string' ? sp.error : undefined
  const ok =
    typeof sp?.ok === 'string' ? sp.ok : undefined

  return (
    <form className="max-w-md mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-bold">サインイン</h1>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {ok === 'check-email' && (
        <p className="text-sm text-blue-700">
          登録メールを確認してください。その後サインインしてください。
        </p>
      )}

      <label htmlFor="email">Email:</label>
      <input id="email" name="email" type="email" required className="border px-3 py-2 w-full"/>

      <label htmlFor="password">Password:</label>
      <input id="password" name="password" type="password" required className="border px-3 py-2 w-full"/>

      <div className="flex gap-2 pt-2">
        <button formAction={login} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded">
          ログイン
        </button>
        <Link href="/signup" className="px-4 py-2 rounded text-blue-700 hover:underline">
          新規登録ページへ
        </Link>
      </div>
    </form>
  )
}
