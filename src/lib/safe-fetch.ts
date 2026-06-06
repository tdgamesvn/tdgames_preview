/**
 * Fetch helpers that never let a non-OK response or unexpected body shape
 * crash a client component (e.g. calling `.filter`/`.map` on an error object).
 */

/** Fetch JSON, returning `null` on any network/HTTP/parse failure. */
export async function fetchJsonSafe<T>(
  url: string,
  init?: RequestInit
): Promise<T | null> {
  try {
    const res = await fetch(url, init)
    if (!res.ok) return null
    return (await res.json()) as T
  } catch {
    return null
  }
}

/**
 * Fetch a JSON array, guaranteeing an array is returned. If the response is
 * not OK or not an array (e.g. `{ error: "..." }`), returns `[]`.
 */
export async function fetchJsonArray<T>(
  url: string,
  init?: RequestInit
): Promise<T[]> {
  const data = await fetchJsonSafe<unknown>(url, init)
  return Array.isArray(data) ? (data as T[]) : []
}
