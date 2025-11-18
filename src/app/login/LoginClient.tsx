"use client";

import React, { useState, useActionState } from "react";
import { loginAction } from "./action";
import Link from "next/link";
import GoogleAuthButton from "@/components/GoogleAuthButton";

type Props = { ok?: string; initialError?: string; nextPath?: string };

export default function LoginClient({ ok, initialError, nextPath = '/' }: Props) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [state, formAction] = useActionState(loginAction as any, { error: undefined } as any);
  const message = state?.error || initialError;
  const sanitizedNext = nextPath.startsWith('/') ? nextPath : '/';

  return (
    <form action={formAction} className="max-w-md mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-bold">ログイン</h1>

      {message && <p className="text-sm text-red-600">{message}</p>}
      {ok === "check-email" && (
        <p className="text-sm text-blue-700">登録メールをご確認ください。そこからサインインを完了できます。</p>
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
          aria-label={showPassword ? 'パスワードを表示' : 'パスワードを非表示'}
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

      <div className="pt-4 border-t border-gray-200 space-y-3">
        <GoogleAuthButton nextPath={sanitizedNext} text="Googleでログイン / 新規登録" />
        <p className="text-xs text-gray-500 text-center">Googleアカウントで新規登録・ログインできます</p>
      </div>
    </form>
  );
}
