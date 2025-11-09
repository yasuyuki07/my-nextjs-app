"use client";

import React, { useState, useActionState } from "react";
import { loginAction } from "./action";
import Link from "next/link";

type Props = { ok?: string };

export default function LoginClient({ ok }: Props) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [state, formAction] = useActionState(loginAction as any, { error: undefined } as any);

  return (
    <form action={formAction} className="max-w-md mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-bold">ログイン</h1>

      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      {ok === "check-email" && (
        <p className="text-sm text-blue-700">登録メールをご確認ください。続けてサインインしてください。</p>
      )}

      <label htmlFor="email">Email:</label>
      <input
        id="email"
        name="email"
        type="email"
        required
        className="border px-3 py-2 w-full"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />

      <label htmlFor="password">Password:</label>
      <div className="relative">
        <input
          id="password"
          name="password"
          type={showPassword ? 'text' : 'password'}
          required
          className="border px-3 py-2 w-full pr-20"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button
          type="button"
          onClick={() => setShowPassword((v) => !v)}
          aria-pressed={showPassword}
          aria-label={showPassword ? 'パスワードを非表示' : 'パスワードを表示'}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-blue-700 hover:text-blue-900 px-2 py-1 rounded"
        >
          {showPassword ? '非表示' : '表示'}
        </button>
      </div>

      <div className="flex gap-2 pt-2">
        <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded" type="submit">
          ログイン
        </button>
        <Link href="/signup" className="px-4 py-2 rounded text-blue-700 hover:underline">
          新規登録ページへ
        </Link>
      </div>
    </form>
  );
}
