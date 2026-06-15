import { headers } from 'next/headers'

/**
 * Returns true if the current request comes from an IP in the allowed list.
 *
 * Priority:
 *  1. projectAllowedIps  — value stored in Prv_projects.share_allowed_ips (set via dashboard UI)
 *  2. SHARE_INTERNAL_ALLOWED_IPS env var — fallback for projects with no IPs configured yet
 *
 * Behind Cloudflare the real client IP is in the CF-Connecting-IP header.
 * Falls back to the first entry of X-Forwarded-For for other proxies.
 *
 * Returns false when no allowed IPs are configured anywhere (block-by-default).
 */
export function isInternalNetworkRequest(projectAllowedIps?: string | null): boolean {
  // Use project-level IPs first, fall back to env var
  const source = projectAllowedIps?.trim()
    ? projectAllowedIps
    : process.env.SHARE_INTERNAL_ALLOWED_IPS

  if (!source?.trim()) return false

  const allowed = source.split(',').map(s => s.trim()).filter(Boolean)
  if (allowed.length === 0) return false

  const h = headers()
  const ip =
    h.get('CF-Connecting-IP') ??
    h.get('X-Forwarded-For')?.split(',')[0]?.trim() ??
    ''

  return allowed.includes(ip)
}
