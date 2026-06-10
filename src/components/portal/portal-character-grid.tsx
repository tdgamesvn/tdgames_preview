'use client'

import { useState, useMemo } from 'react'
import { Search } from 'lucide-react'
import { CharacterCardItem, type SpineCardConfig } from '@/components/dashboard/character-card-item'
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
  const showSearch = cards.length >= 8

  const filtered = useMemo(() => {
    if (!query.trim()) return cards
    const q = query.toLowerCase()
    return cards.filter(c => c.task.name.toLowerCase().includes(q))
  }, [cards, query])

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

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {filtered.map(({ task, artUrl, spineConfig }) => (
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
    </div>
  )
}
