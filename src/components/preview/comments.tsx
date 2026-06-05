'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Send } from 'lucide-react'

interface Comment {
  id: string
  content: string
  author_id: string
  asset_id: string | null
  created_at: string
  Prv_profiles?: { display_name: string } | null
}

interface CommentsProps {
  projectId: string
  assetId?: string | null
}

export function Comments({ projectId, assetId = null }: CommentsProps) {
  const [comments, setComments] = useState<Comment[]>([])
  const [content, setContent] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch(`/api/projects/${projectId}/comments`)
      .then((r) => r.json())
      .then((data: Comment[]) => {
        const filtered = assetId
          ? data.filter((c) => c.asset_id === assetId)
          : data.filter((c) => c.asset_id === null)
        setComments(filtered)
      })
  }, [projectId, assetId])

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel(`comments:${projectId}`)
      .on(
        'postgres_changes' as any, // eslint-disable-line @typescript-eslint/no-explicit-any
        {
          event: 'INSERT',
          schema: 'public',
          table: 'Prv_comments',
          filter: `project_id=eq.${projectId}`,
        },
        (payload: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
          const newComment = payload.new as Comment
          const matches = assetId
            ? newComment.asset_id === assetId
            : newComment.asset_id === null
          if (matches) setComments((prev) => [...prev, newComment])
        }
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [projectId, assetId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [comments])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!content.trim()) return
    setSubmitting(true)
    await fetch(`/api/projects/${projectId}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: content.trim(), asset_id: assetId }),
    })
    setContent('')
    setSubmitting(false)
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto space-y-3 mb-4 max-h-96">
        {comments.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-8">
            No comments yet. Be the first!
          </p>
        ) : (
          comments.map((comment) => (
            <div key={comment.id} className="bg-gray-50 rounded-lg px-4 py-3">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-medium text-gray-800">
                  {comment.Prv_profiles?.display_name ?? 'Unknown'}
                </span>
                <span className="text-xs text-gray-400">
                  {new Date(comment.created_at).toLocaleDateString()}
                </span>
              </div>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{comment.content}</p>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Add a comment…"
          rows={2}
          className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSubmit(e)
          }}
        />
        <Button
          type="submit"
          disabled={submitting || !content.trim()}
          size="sm"
          className="self-end"
        >
          <Send size={14} />
        </Button>
      </form>
    </div>
  )
}
