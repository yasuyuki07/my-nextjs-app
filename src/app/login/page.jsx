// そのままでもOK。エラー表示を足すと便利
import { login, signup } from './action'

export default function LoginPage({ searchParams }) {
  return (
    <form className="max-w-sm mx-auto p-8 space-y-3">
      <h1 className="text-2xl font-bold">サインイン</h1>

      {searchParams?.error && (
        <p className="text-sm text-red-600">{searchParams.error}</p>
      )}
      {searchParams?.ok === 'check-email' && (
        <p className="text-sm text-emerald-700">
          登録メールを確認してください。その後サインインしてください。
        </p>
      )}

      <label htmlFor="email">Email:</label>
      <input id="email" name="email" type="email" required className="w-full border px-3 py-2 rounded" />
      <label htmlFor="password">Password:</label>
      <input id="password" name="password" type="password" required className="w-full border px-3 py-2 rounded" />

      <div className="flex gap-2 pt-2">
        <button formAction={login} className="flex-1 py-2 rounded bg-indigo-600 text-white">Log in</button>
        <button formAction={signup} className="flex-1 py-2 rounded border">Sign up</button>
      </div>
    </form>
  )
}
