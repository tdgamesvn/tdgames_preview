'use client'

import { useState, useMemo } from 'react'
import { Search } from 'lucide-react'
import type { PrvTask } from '@/lib/types/database'

interface RosterClientProps {
  tasks: PrvTask[]
  children: (filteredTasks: PrvTask[]) => React.ReactNode
}

export function RosterClient({ tasks, children }: RosterClientProps) {
  const [query, setQuery] = useState('')
  const showSearch = tasks.length >= 8

  const filtered = useMemo(() => {
    if (!query.trim()) return tasks
    const q = query.toLowerCase()
    return tasks.filter(t => t.name.toLowerCase().includes(q))
  }, [tasks, query])

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
      {children(filtered)}
    </div>
  )
}
