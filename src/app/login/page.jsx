import LoginClient from "./LoginClient"

// Server Component
export default async function LoginPage({ searchParams }) {
  const sp = await searchParams
  const ok = typeof sp?.ok === "string" ? sp.ok : undefined
  const error = typeof sp?.error === "string" ? sp.error : undefined
  const next = typeof sp?.next === "string" && sp.next.startsWith("/") ? sp.next : undefined
  return <LoginClient ok={ok} initialError={error} nextPath={next} />
}


