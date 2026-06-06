import { redirect } from 'next/navigation'

// Middleware handles role-based redirect (/ → /dashboard or /portal). This page
// is only reached if middleware passes through; redirect to /login as a safe
// fallback so the root is never a blank screen.
export const dynamic = 'force-dynamic'

export default function RootPage() {
  redirect('/login')
}
