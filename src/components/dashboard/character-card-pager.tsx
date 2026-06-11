'use client'

import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { CharacterCardItem, type SpineCardConfig } from './character-card-item'
import { RenameTaskButton } from './rename-task-button'
import { DeleteTaskInline } from './delete-task-inline'
import type { PrvTask, PrvProject } from '@/lib/types/database'

/**
 * Max cards per page.
 *
 * Browsers cap WebGL contexts per page (Firefox ~8, Chrome ~16).
 * Keeping 8 cards per page stays within all browser limits and ensures
 * navigating to a new page fully disposes the previous set before loading the next.
 */
export const PAGE_SIZE = 8

export interface TaskPageData {
  task: PrvTask
  artUrl?: string
  spineConfig?: SpineCardConfig
}

interface CharacterCardPagerProps {
  taskData: TaskPageData[]
  project: PrvProject
  linkPrefix: string
  showActions?: boolean
  clientId?: string
}

export function CharacterCardPager({
  taskData,
  project,
  linkPrefix,
  showActions = false,
  clientId,
}: CharacterCardPagerProps) {
  const [page, setPage] = useState(0)

  const totalPages = Math.ceil(taskData.length / PAGE_SIZE)
  // Clamp page in case taskData shrinks (e.g. after delete)
  const safePage = Math.min(page, Math.max(0, totalPages - 1))
  const pageTasks = taskData.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE)

  function goTo(next: number) {
    setPage(Math.max(0, Math.min(next, totalPages - 1)))
    // Scroll grid back into view when navigating
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className="space-y-6">
      {/* Grid — only renders PAGE_SIZE cards at a time */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {pageTasks.map(({ task, artUrl, spineConfig }) => (
          <div key={task.id} className="flex flex-col gap-2">
            <CharacterCardItem
              task={task}
              href={`${linkPrefix}/characters/${task.id}`}
              artUrl={artUrl}
              spineConfig={spineConfig}
              cardBgType={project.card_bg_type}
              cardBgValue={project.card_bg_value}
            />
            {showActions && clientId && (
              <div className="flex gap-1">
                <RenameTaskButton task={task} clientId={clientId} />
                <DeleteTaskInline task={task} clientId={clientId} />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Pagination controls — only shown when needed */}
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

          {/* Page number pills */}
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
