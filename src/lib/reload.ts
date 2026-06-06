/**
 * Force a full document reload. Extracted into its own module so it can be
 * mocked in tests (jsdom makes `window.location.reload` non-configurable).
 */
export function hardReload(): void {
  if (typeof window !== 'undefined') {
    window.location.reload()
  }
}
