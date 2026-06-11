'use client'

import { useState, useMemo, useEffect } from 'react'
import { Search, ChevronLeft, ChevronRight } from 'lucide-react'
import { CharacterCardItem, type SpineCardConfig } from '@/components/dashboard/character-card-item'
import { PAGE_SIZE } from '@/components/dashboard/character-card-pager'
import type { PrvTask } from '@/lib/types/database'

export interface CharacterCardData {
  task: PrvTask
  artUrl?: string
  spineConfig?: SpineCardConfig
}

interface PortalCharacterGridProps {
  cards: CharacterCardData[]
  linkPrefix: string
  cardBgType?: 'color' | 'image'
  cardBgValue?: string
}

export function PortalCharacterGrid({ cards, linkPrefix, cardBgType, cardBgValue }: PortalCharacterGridProps) {
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(0)

  // Reset to page 0 whenever search query changes
  useEffect(() => { setPage(0) }, [query])

  const showSearch = cards.length >= 8

  const filtered = useMemo(() => {
    if (!query.trim()) return cards
    const q = query.toLowerCase()
    return cards.filter(c => c.task.name.toLowerCase().includes(q))
  }, [cards, query])

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const safePage = Math.min(page, Math.max(0, totalPages - 1))
  const paginated = filtered.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE)

  function goTo(next: number) {
    setPage(Math.max(0, Math.min(next, totalPages - 1)))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className="space-y-5">
      {showSearch && (
        <div className="relative">
          <Search
            size={13}
            className="absolute left-3 top-1/2 -translate-y-1/2"
            style={{ color: '#444' }}
          />
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search characters..."
            className="w-full pl-8 pr-4 py-2.5 rounded-xl text-sm text-white outline-none"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          />
        </div>
      )}

      {filtered.length === 0 && query && (
        <p className="text-xs text-center py-8" style={{ color: '#444' }}>
          No characters match &ldquo;{query}&rdquo;
        </p>
      )}

      {/* Grid — only PAGE_SIZE cards rendered at once */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
        {paginated.map(({ task, artUrl, spineConfig }) => (
          <CharacterCardItem
            key={task.id}
            task={task}
            href={`${linkPrefix}/characters/${task.id}`}
            artUrl={artUrl}
            spineConfig={spineConfig}
            cardBgType={cardBgType}
            cardBgValue={cardBgValue}
          />
        ))}
      </div>

      {/* Pagination controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            onClick={() => goTo(safePage - 1)}
            disabled={safePage === 0}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.09)',
              color: '#aaa',
            }}
          >
            <ChevronLeft size={13} />
            Prev
          </button>

          <div className="flex items-center gap-1.5">
            {Array.from({ length: totalPages }, (_, i) => (
              <button
                key={i}
                onClick={() => goTo(i)}
                className="w-7 h-7 rounded-lg text-[11px] font-black transition-all"
                style={{
                  background: i === safePage ? 'rgba(255,149,0,0.15)' : 'rgba(255,255,255,0.04)',
                  border: i === safePage ? '1px solid rgba(255,149,0,0.4)' : '1px solid rgba(255,255,255,0.07)',
                  color: i === safePage ? '#FF9500' : '#555',
                }}
              >
                {i + 1}
              </button>
            ))}
          </div>

          <button
            onClick={() => goTo(safePage + 1)}
            disabled={safePage >= totalPages - 1}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.09)',
              color: '#aaa',
            }}
          >
            Next
            <ChevronRight size={13} />
          </button>
        </div>
      )}
    </div>
  )
}
