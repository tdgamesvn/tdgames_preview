import { headers } from 'next/headers'

/**
 * Returns true if the current request comes from an IP listed in
 * SHARE_INTERNAL_ALLOWED_IPS (comma-separated, e.g. "203.0.113.1,10.0.0.0").
 *
 * Behind Cloudflare the real client IP is in the CF-Connecting-IP header.
 * Falls back to the first entry of X-Forwarded-For for other proxies.
 *
 * Returns false when the env var is not configured (block-by-default).
 */
export function isInternalNetworkRequest(): boolean {
  const allowedRaw = process.env.SHARE_INTERNAL_ALLOWED_IPS
  if (!allowedRaw?.trim()) return false

  const allowed = allowedRaw.split(',').map(s => s.trim()).filter(Boolean)
  if (allowed.length === 0) return false

  const h = headers()
  const ip =
    h.get('CF-Connecting-IP') ??
    h.get('X-Forwarded-For')?.split(',')[0]?.trim() ??
    ''

  return allowed.includes(ip)
}
