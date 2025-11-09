import LoginClient from "./LoginClient"

// Server Component
export default async function LoginPage({ searchParams }) {
  const sp = await searchParams
  const ok = typeof sp?.ok === "string" ? sp.ok : undefined
  return <LoginClient ok={ok} />
}


