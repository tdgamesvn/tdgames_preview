'use client'

import Link from 'next/link'
import { useState } from 'react'
import type { PrvProject } from '@/lib/types/database'

interface PortalProjectCardProps {
  project: PrvProject
  coverUrl?: string
  characterCount: number
}

export function PortalProjectCard({ project, coverUrl, characterCount }: PortalProjectCardProps) {
  const [imgError, setImgError] = useState(false)
  const showCover = Boolean(coverUrl) && !imgError

  return (
    <Link
      href={`/portal/${project.id}`}
      className="group block rounded-2xl overflow-hidden"
      style={{ aspectRatio: '16/9', position: 'relative' }}
    >
      {/* Cover image */}
      {showCover ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={coverUrl}
          alt={project.name}
          onError={() => setImgError(true)}
          style={{
            position: 'absolute', inset: 0,
            width: '100%', height: '100%',
            objectFit: 'cover',
            transform: 'scale(1.05)',
            transition: 'transform 600ms ease',
          }}
          className="group-hover:scale-110"
        />
      ) : (
        /* Gradient fallback */
        <div
          style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(135deg, rgba(255,149,0,0.06) 0%, rgba(255,149,0,0.02) 50%, #080808 100%)',
          }}
        >
          <span
            style={{
              position: 'absolute', top: '50%', left: '50%',
              transform: 'translate(-50%, -50%)',
              fontSize: '5rem', fontWeight: 900,
              color: 'rgba(255,149,0,0.08)',
              userSelect: 'none', letterSpacing: '-0.05em',
              textTransform: 'uppercase',
            }}
          >
            {project.name.charAt(0)}
          </span>
        </div>
      )}

      {/* Gradient overlay */}
      <div
        style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(to top, rgba(8,8,8,0.92) 0%, rgba(8,8,8,0.3) 50%, transparent 100%)',
        }}
      />

      {/* Hover glow ring */}
      <div
        style={{
          position: 'absolute', inset: 0,
          borderRadius: '1rem',
          border: '1px solid rgba(255,255,255,0.06)',
          boxShadow: '0 0 0 0 rgba(255,149,0,0)',
          transition: 'box-shadow 300ms ease, border-color 300ms ease',
        }}
        className="group-hover:[border-color:rgba(255,149,0,0.4)] group-hover:[box-shadow:0_0_40px_rgba(255,149,0,0.15)]"
      />

      {/* Text overlay */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '16px 20px' }}>
        <div className="flex items-end justify-between gap-3">
          <div>
            <p
              className="font-black uppercase tracking-wider text-white leading-tight"
              style={{ fontSize: '0.9rem' }}
            >
              {project.name}
            </p>
            <p
              className="text-[10px] font-semibold uppercase tracking-widest mt-0.5"
              style={{ color: '#666' }}
            >
              {characterCount} character{characterCount !== 1 ? 's' : ''}
            </p>
          </div>
          <span
            className="text-[10px] font-black uppercase tracking-wider flex-shrink-0 transition-opacity opacity-0 group-hover:opacity-100"
            style={{ color: '#FF9500' }}
          >
            View →
          </span>
        </div>
      </div>
    </Link>
  )
}
