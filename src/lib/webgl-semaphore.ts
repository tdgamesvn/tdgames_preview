/**
 * Global semaphore to cap concurrent Spine/WebGL context creation.
 *
 * Browsers limit WebGL contexts per page:
 *   Chrome  ~16 | Firefox ~8 | Mobile Safari ~4-8
 *
 * When many SpineAvatarPreview cards are visible simultaneously the limit is
 * exceeded → browser silently kills older contexts → white canvases.
 *
 * This semaphore serialises creation so at most MAX_CONCURRENT contexts are
 * initialised at any moment. Already-running players are NOT counted against
 * the limit once they are fully alive; the limit applies only while a new
 * SpinePlayer constructor is being called (the expensive GPU-allocation step).
 *
 * Usage:
 *   await acquireWebGLSlot()   // before new SpinePlayer(...)
 *   // ... player created ...
 *   releaseWebGLSlot()         // in disposePlayer() or on error
 */

const MAX_CONCURRENT = 6

let active = 0
const queue: Array<() => void> = []

/**
 * Resolves when a WebGL context slot is available.
 * Increments the active counter; caller MUST call releaseWebGLSlot() later.
 */
export function acquireWebGLSlot(): Promise<void> {
  return new Promise<void>(resolve => {
    if (active < MAX_CONCURRENT) {
      active++
      resolve()
    } else {
      // Queue the resolver; it fires (and increments active) when a slot frees up.
      queue.push(() => {
        active++
        resolve()
      })
    }
  })
}

/**
 * Releases a previously acquired slot.
 * If there are queued waiters the slot is handed directly to the next one.
 * Must be called exactly once per successful acquireWebGLSlot().
 */
export function releaseWebGLSlot(): void {
  const next = queue.shift()
  if (next) {
    // Hand the slot to the next waiter — active count stays the same.
    next()
  } else {
    active--
  }
}
