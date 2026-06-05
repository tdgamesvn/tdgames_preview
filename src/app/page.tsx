// Middleware handles role-based redirect (/ → /dashboard or /portal).
// This page renders only if middleware passes through (shouldn't normally happen).
export const dynamic = 'force-dynamic'

export default function RootPage() {
  return null
}
