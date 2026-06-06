'use client'

import { useEffect, useRef, useState } from 'react'
import { Download } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface SpinePlayerProps {
  skeletonUrl: string
  atlasUrl: string
  /** Optional — spine-player's built-in controls let the user switch these at runtime. */
  animations?: string[]
  skins?: string[]
  spineVersion: string
  assetName: string
  onDownload: () => void
}

const CDN_BASE = 'https://unpkg.com/@esotericsoftware/spine-player'

function getCdnUrl(version: string) {
  return `${CDN_BASE}@${version}/dist/iife/spine-player.js`
}

function getCssCdnUrl(version: string) {
  return `${CDN_BASE}@${version}/dist/iife/spine-player.css`
}

export function SpinePlayer({
  skeletonUrl,
  atlasUrl,
  animations,
  skins,
  spineVersion,
  assetName,
  onDownload,
}: SpinePlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (!containerRef.current) return
    let cancelled = false

    async function loadAndInit() {
      const cssId = `spine-css-${spineVersion}`
      if (!document.getElementById(cssId)) {
        const link = document.createElement('link')
        link.id = cssId
        link.rel = 'stylesheet'
        link.href = getCssCdnUrl(spineVersion)
        document.head.appendChild(link)
      }

      const scriptId = `spine-js-${spineVersion}`
      await new Promise<void>((resolve, reject) => {
        if (document.getElementById(scriptId)) { resolve(); return }
        const script = document.createElement('script')
        script.id = scriptId
        script.src = getCdnUrl(spineVersion)
        script.onload = () => resolve()
        script.onerror = () => reject(new Error(`Failed to load Spine player v${spineVersion}`))
        document.body.appendChild(script)
      })

      if (cancelled || !containerRef.current) return

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const SpinePlayerClass = (window as any).spine?.SpinePlayer
      if (!SpinePlayerClass) {
        setError('Spine player failed to initialize')
        return
      }

      try {
        new SpinePlayerClass(containerRef.current, {
          jsonUrl: skeletonUrl,
          atlasUrl,
          // Omit when unknown → player auto-selects the first animation/skin;
          // its built-in controls (showControls) let the user switch.
          animation: animations?.[0] || undefined,
          skin: skins?.[0] || undefined,
          showControls: true,
          backgroundColor: '#1a1a2e',
          premultipliedAlpha: true,
        })
        if (!cancelled) setLoaded(true)
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Spine player error')
      }
    }

    loadAndInit().catch((e) => {
      if (!cancelled) setError(e.message)
    })

    return () => { cancelled = true }
  }, [skeletonUrl, atlasUrl, animations, skins, spineVersion])

  return (
    <div className="flex flex-col gap-4">
      {error ? (
        <div className="bg-gray-900 rounded-xl p-8 text-center text-red-400">
          <p className="font-medium">Spine Player Error</p>
          <p className="text-sm mt-1">{error}</p>
        </div>
      ) : (
        <div
          ref={containerRef}
          className="w-full rounded-xl overflow-hidden bg-[#1a1a2e]"
          style={{ height: '500px' }}
        >
          {!loaded && (
            <div className="flex items-center justify-center h-full text-gray-400 text-sm">
              Loading Spine v{spineVersion}…
            </div>
          )}
        </div>
      )}
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-500">
          Spine v{spineVersion}
          {animations && animations.length > 0 && ` · ${animations.length} animations`}
          {skins && skins.length > 0 && ` · ${skins.length} skins`}
        </div>
        <Button onClick={onDownload} variant="outline" size="sm" className="gap-2">
          <Download size={14} />
          Download {assetName}
        </Button>
      </div>
    </div>
  )
}
