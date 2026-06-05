// This page is never rendered directly — middleware redirects / to /dashboard or /portal.
// If somehow reached, redirect to login as a safety fallback.
import { redirect } from 'next/navigation'

export default function RootPage() {
  redirect('/login')
}
