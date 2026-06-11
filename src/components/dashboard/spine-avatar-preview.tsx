'use client'

import { useEffect, useRef, useImperativeHandle, forwardRef } from 'react'
import { acquireWebGLSlot, releaseWebGLSlot } from '@/lib/webgl-semaphore'

export interface SpineAvatarPreviewHandle {
  setAnimation: (name: string) => void
}

export interface SpineLoadedData {
  animations: string[]
  skins: string[]
}

interface SpineAvatarPreviewProps {
  jsonUrl: string
  atlasUrl: string
  animationName: string
  skinName?: string
  scale?: number
  offsetX?: number
  offsetY?: number
  /** When true, the player auto-fits each animation's bounds to the box, and
   *  scale/offset are applied as a CSS transform on top (manual zoom/move). */
  autoFit?: boolean
  /** Canvas clear color (hex, 8-digit allows alpha). Default transparent. */
  backgroundColor?: string
  spineVersion: string
  /** Called when the Spine player fails. Optional message describes the error. */
  onError?: (message?: string) => void
  /** Called once the skeleton is loaded, exposing its animations + skins. */
  onLoaded?: (data: SpineLoadedData) => void
}

const CDN_BASE = 'https://unpkg.com/@esotericsoftware/spine-player'

function getScriptUrl(version: string) {
  return `${CDN_BASE}@${version}/dist/iife/spine-player.js`
}

/**
 * Module-level promise cache: ensures concurrent Spine players all await the
 * SAME load promise instead of each assuming "script element present = loaded".
 * Without this, cards 2+ skip the await and hit window.spine = undefined.
 */
const spineScriptPromises: Partial<Record<string, Promise<void>>> = {}

function ensureSpineScript(version: string): Promise<void> {
  const scriptId = `spine-js-${version}`
  if (spineScriptPromises[scriptId]) return spineScriptPromises[scriptId]!

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if ((window as any).spine?.SpinePlayer) {
    spineScriptPromises[scriptId] = Promise.resolve()
    return spineScriptPromises[scriptId]!
  }

  const existing = document.getElementById(scriptId)
  if (existing) {
    // Script tag in DOM but not yet loaded — attach to its events.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((window as any).spine?.SpinePlayer) {
      spineScriptPromises[scriptId] = Promise.resolve()
      return spineScriptPromises[scriptId]!
    }
    spineScriptPromises[scriptId] = new Promise<void>((resolve, reject) => {
      const onLoad = () => resolve()
      const onError = () => {
        delete spineScriptPromises[scriptId]
        reject(new Error(`Failed to load Spine v${version}`))
      }
      existing.addEventListener('load', onLoad, { once: true })
      existing.addEventListener('error', onError, { once: true })
    })
    return spineScriptPromises[scriptId]!
  }

  spineScriptPromises[scriptId] = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script')
    script.id = scriptId
    script.src = getScriptUrl(version)
    script.onload = () => resolve()
    script.onerror = () => {
      delete spineScriptPromises[scriptId]
      reject(new Error(`Failed to load Spine v${version}`))
    }
    document.body.appendChild(script)
  })
  return spineScriptPromises[scriptId]!
}

export const SpineAvatarPreview = forwardRef<SpineAvatarPreviewHandle, SpineAvatarPreviewProps>(
  function SpineAvatarPreview(
    {
      jsonUrl,
      atlasUrl,
      animationName,
      skinName,
      scale = 1,
      offsetX = 0,
      offsetY = 0,
      autoFit = false,
      backgroundColor = '#00000000',
      spineVersion,
      onError,
      onLoaded,
    }: SpineAvatarPreviewProps,
    ref
  ) {
    const containerRef = useRef<HTMLDivElement>(null)
    const initInProgressRef = useRef(false)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const playerInstanceRef = useRef<any>(null)
    const disposeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const slotAcquiredRef = useRef(false)
    const onErrorRef = useRef(onError)
    const onLoadedRef = useRef(onLoaded)
    const scaleRef = useRef(scale)
    const offsetXRef = useRef(offsetX)
    const offsetYRef = useRef(offsetY)
    onErrorRef.current = onError
    onLoadedRef.current = onLoaded
    scaleRef.current = scale
    offsetXRef.current = offsetX
    offsetYRef.current = offsetY

    useImperativeHandle(ref, () => ({
      setAnimation: (name: string) => {
        try {
          playerInstanceRef.current?.animationState?.setAnimation(0, name, true)
        } catch {
          /* non-fatal */
        }
      },
    }))

    useEffect(() => {
      const container = containerRef.current
      if (!container) return

      let cancelled = false

      // ─── Dispose helper ──────────────────────────────────────────────────────
      function disposePlayer() {
        if (disposeTimerRef.current) {
          clearTimeout(disposeTimerRef.current)
          disposeTimerRef.current = null
        }
        initInProgressRef.current = false
        // Release slot only if still held — this covers the case where the
        // card scrolls off BEFORE success fires (init was cut short).
        // In the normal path the slot is already released inside success().
        if (slotAcquiredRef.current) {
          releaseWebGLSlot()
          slotAcquiredRef.current = false
        }
        if (playerInstanceRef.current) {
          try { playerInstanceRef.current.dispose?.() } catch { /* ignore */ }
          playerInstanceRef.current = null
        }
        // Clear the DOM so the next init gets a clean container
        if (containerRef.current) {
          containerRef.current.innerHTML = ''
        }
      }

      // ─── IntersectionObserver: init on enter, dispose on exit ────────────────
      // rootMargin: pre-load cards 150 px before they reach the fold so users
      // see the animation already running, not a blank → spinning load.
      // threshold 0 = fire as soon as any pixel enters/exits.
      const observer = new IntersectionObserver(
        (entries) => {
          const entry = entries[0]

          if (entry.isIntersecting) {
            // Cancel any scheduled dispose (user scrolled back quickly)
            if (disposeTimerRef.current) {
              clearTimeout(disposeTimerRef.current)
              disposeTimerRef.current = null
            }
            // Only spin up if no player is running and no init in progress
            if (!playerInstanceRef.current && !initInProgressRef.current && !cancelled) {
              init()
            }
          } else {
            // Dispose after 1.5 s — avoids destroying/recreating when the user
            // merely scrolls past briefly. Keeps count well below GL limit.
            if ((playerInstanceRef.current || initInProgressRef.current) && !disposeTimerRef.current) {
              disposeTimerRef.current = setTimeout(() => {
                disposeTimerRef.current = null
                if (!cancelled) disposePlayer()
              }, 1500)
            }
          }
        },
        { threshold: 0, rootMargin: '150px 0px' }
      )
      observer.observe(container)

      // ─── Init ────────────────────────────────────────────────────────────────
      async function init() {
        if (cancelled || playerInstanceRef.current || initInProgressRef.current) return
        initInProgressRef.current = true

        let errorFired = false
        function onWindowError(event: ErrorEvent) {
          if (errorFired || cancelled) return
          const msg = event.message || event.error?.message || ''
          const src = event.filename || ''
          if (src.includes('spine-player') || msg.includes('Region not found') || msg.includes('spine')) {
            errorFired = true
            event.preventDefault()
            onErrorRef.current?.(msg)
          }
        }
        window.addEventListener('error', onWindowError)

        try {
          await ensureSpineScript(spineVersion)

          if (cancelled || !containerRef.current) {
            window.removeEventListener('error', onWindowError)
            initInProgressRef.current = false
            return
          }

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const SpinePlayerClass = (window as any).spine?.SpinePlayer
          if (!SpinePlayerClass) {
            onErrorRef.current?.('Spine runtime failed to load')
            initInProgressRef.current = false
            return
          }

          // ── Throttle concurrent WebGL context creation ───────────────────
          // acquireWebGLSlot() blocks here until a slot is free.
          // While waiting the card may scroll out → disposePlayer() sets
          // initInProgressRef to false, so we re-check after the await.
          await acquireWebGLSlot()
          slotAcquiredRef.current = true

          if (cancelled || !containerRef.current || !initInProgressRef.current) {
            // Card was disposed or unmounted while we were queued.
            releaseWebGLSlot()
            slotAcquiredRef.current = false
            window.removeEventListener('error', onWindowError)
            return
          }

          const viewport = autoFit
            ? { padLeft: '6%', padRight: '6%', padTop: '6%', padBottom: '6%' }
            : {
                x: -100 * scaleRef.current + offsetXRef.current,
                y: -100 * scaleRef.current + offsetYRef.current,
                width: 200 * scaleRef.current,
                height: 200 * scaleRef.current,
                padLeft: '0%',
                padRight: '0%',
                padTop: '0%',
                padBottom: '0%',
              }

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const player = new SpinePlayerClass(containerRef.current, {
            jsonUrl,
            atlasUrl,
            animation: animationName || undefined,
            skin: skinName || undefined,
            showControls: false,
            backgroundColor,
            premultipliedAlpha: true,
            defaultMix: 0.2,
            viewport,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            success: (p: any) => {
              initInProgressRef.current = false
              // Release slot in ALL cases — player is either running (normal) or
              // being immediately discarded (cancelled).  Either way the init
              // phase is over and the next queued card should start.
              if (slotAcquiredRef.current) {
                releaseWebGLSlot()
                slotAcquiredRef.current = false
              }
              if (cancelled) {
                try { p?.dispose?.() } catch { /* ignore */ }
                return
              }
              playerInstanceRef.current = p
              window.removeEventListener('error', onWindowError)
              try {
                const data = p?.skeleton?.data
                if (data) {
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  const animations: string[] = (data.animations ?? []).map((a: any) => a.name).filter(Boolean)
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  const skins: string[] = (data.skins ?? []).map((s: any) => s.name).filter(Boolean)
                  onLoadedRef.current?.({ animations, skins })
                }
              } catch {
                /* non-fatal */
              }
            },
            error: (_p: unknown, msg: string) => {
              initInProgressRef.current = false
              if (slotAcquiredRef.current) {
                releaseWebGLSlot()
                slotAcquiredRef.current = false
              }
              if (!cancelled && !errorFired) {
                errorFired = true
                onErrorRef.current?.(msg || 'Spine player error')
              }
            },
          })

          // Fallback: store player ref if success hasn't fired yet
          if (!playerInstanceRef.current) playerInstanceRef.current = player

        } catch (err) {
          initInProgressRef.current = false
          if (slotAcquiredRef.current) {
            releaseWebGLSlot()
            slotAcquiredRef.current = false
          }
          if (!cancelled && !errorFired) {
            errorFired = true
            onErrorRef.current?.(err instanceof Error ? err.message : 'Spine init failed')
          }
        }

        setTimeout(() => window.removeEventListener('error', onWindowError), 10000)
      }

      return () => {
        cancelled = true
        observer.disconnect()
        disposePlayer()
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [jsonUrl, atlasUrl, animationName, skinName, autoFit, backgroundColor, spineVersion])

    return (
      <div className="w-full h-full" style={{ background: 'transparent' }}>
        <div ref={containerRef} className="w-full h-full" />
      </div>
    )
  }
)

SpineAvatarPreview.displayName = 'SpineAvatarPreview'
