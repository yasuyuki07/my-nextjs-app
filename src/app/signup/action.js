'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'

export async function signup(formData) {
  const supabase = await createClient()

  const email = String(formData.get('email') || '')
  const password = String(formData.get('password') || '')

  const { error } = await supabase.auth.signUp({ email, password })
  if (error) {
    redirect(`/signup?error=${encodeURIComponent(error.message)}`)
  }

  // メール確認を促す
  redirect('/login?ok=check-email')
}

