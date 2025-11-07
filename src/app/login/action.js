'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'

// ログイン
export async function login(formData) {
  const supabase = await createClient()

  const email = String(formData.get('email') || '')
  const password = String(formData.get('password') || '')

  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) {
    // エラーをクエリに載せて /login に戻す
    redirect(`/login?error=${encodeURIComponent(error.message)}`)
  }

  // 画面キャッシュを無効化（任意）
  revalidatePath('/', 'layout')
  // ここを本アプリの遷移先に
  redirect('/')
}

// サインアップ
export async function signup(formData) {
  const supabase = await createClient()

  const email = String(formData.get('email') || '')
  const password = String(formData.get('password') || '')

  const { error } = await supabase.auth.signUp({ email, password })
  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`)
  }

  // メール確認を使う設定のときは即ログインしないので案内だけ返す
  redirect('/login?ok=check-email')
}

// ログアウト（任意：ヘッダーなどから呼ぶ）
export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}
