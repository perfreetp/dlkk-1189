import { useEffect, useState } from 'react'
import { apiFetch } from '@/stores/auth'
import { Trash2, Edit3, Check, X, Tag } from 'lucide-react'

interface BookmarkItem {
  id: number
  question_id: number
  sql_text: string
  note: string
  tags_json: string
  created_at: string
}

export default function Bookmarks() {
  const [bookmarks, setBookmarks] = useState<BookmarkItem[]>([])
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editNote, setEditNote] = useState('')
  const [editTags, setEditTags] = useState('')
  const [tagFilter, setTagFilter] = useState('')

  useEffect(() => {
    fetchBookmarks()
  }, [])

  const fetchBookmarks = async () => {
    const res = await apiFetch<BookmarkItem[]>('/api/bookmarks')
    if (res.success && res.data) {
      setBookmarks(res.data)
    }
  }

  const handleDelete = async (id: number) => {
    await apiFetch(`/api/bookmarks/${id}`, { method: 'DELETE' })
    fetchBookmarks()
  }

  const startEdit = (b: BookmarkItem) => {
    setEditingId(b.id)
    setEditNote(b.note || '')
    setEditTags(b.tags_json ? JSON.parse(b.tags_json).join(', ') : '')
  }

  const cancelEdit = () => {
    setEditingId(null)
  }

  const saveEdit = async (b: BookmarkItem) => {
    const tags = editTags.split(',').map((t) => t.trim()).filter(Boolean)
    await apiFetch(`/api/bookmarks/${b.id}`, {
      method: 'PUT',
      body: JSON.stringify({ note: editNote, tags }),
    })
    setEditingId(null)
    fetchBookmarks()
  }

  const allTags = Array.from(
    new Set(bookmarks.flatMap((b) => {
      try { return JSON.parse(b.tags_json) } catch { return [] }
    }))
  )

  const filtered = tagFilter
    ? bookmarks.filter((b) => {
        try {
          const tags: string[] = JSON.parse(b.tags_json)
          return tags.includes(tagFilter)
        } catch { return false }
      })
    : bookmarks

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h2 className="font-display text-2xl font-bold text-text-primary mb-6">收藏写法</h2>

      {allTags.length > 0 && (
        <div className="flex gap-2 mb-6 flex-wrap">
          <button
            onClick={() => setTagFilter('')}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
              tagFilter === '' ? 'bg-accent-cyan/20 text-accent-cyan' : 'bg-bg-tertiary text-text-secondary hover:text-text-primary'
            }`}
          >
            全部
          </button>
          {allTags.map((tag) => (
            <button
              key={tag}
              onClick={() => setTagFilter(tag)}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                tagFilter === tag ? 'bg-accent-cyan/20 text-accent-cyan' : 'bg-bg-tertiary text-text-secondary hover:text-text-primary'
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
      )}

      <div className="space-y-4">
        {filtered.map((b) => {
          const tags: string[] = (() => { try { return JSON.parse(b.tags_json) } catch { return [] } })()
          const isEditing = editingId === b.id

          return (
            <div
              key={b.id}
              className="bg-bg-secondary border border-border-dark rounded-xl p-5 hover:border-accent-cyan/20 transition-all animate-fade-in-up"
            >
              <pre className="text-sm font-mono text-accent-cyan p-3 bg-bg-primary rounded-lg border border-border-dark/50 whitespace-pre-wrap mb-3">
                {b.sql_text}
              </pre>

              {isEditing ? (
                <div className="space-y-2">
                  <input
                    value={editNote}
                    onChange={(e) => setEditNote(e.target.value)}
                    placeholder="添加备注..."
                    className="w-full px-3 py-2 bg-bg-primary border border-border-dark rounded-lg text-sm text-text-primary focus:outline-none focus:border-accent-cyan"
                  />
                  <input
                    value={editTags}
                    onChange={(e) => setEditTags(e.target.value)}
                    placeholder="标签（逗号分隔）..."
                    className="w-full px-3 py-2 bg-bg-primary border border-border-dark rounded-lg text-sm text-text-primary focus:outline-none focus:border-accent-cyan"
                  />
                  <div className="flex gap-2">
                    <button onClick={() => saveEdit(b)} className="p-1.5 rounded text-success-emerald hover:bg-success-emerald/10 transition-colors">
                      <Check className="w-4 h-4" />
                    </button>
                    <button onClick={cancelEdit} className="p-1.5 rounded text-text-secondary hover:bg-bg-tertiary transition-colors">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start justify-between">
                  <div>
                    {b.note && (
                      <p className="text-sm text-text-secondary mb-2">{b.note}</p>
                    )}
                    {tags.length > 0 && (
                      <div className="flex gap-1.5 flex-wrap">
                        {tags.map((tag) => (
                          <span key={tag} className="flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-accent-cyan/10 text-accent-cyan">
                            <Tag className="w-2.5 h-2.5" /> {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    <button
                      onClick={() => startEdit(b)}
                      className="p-1.5 rounded text-text-secondary hover:text-accent-cyan hover:bg-accent-cyan/10 transition-colors"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(b.id)}
                      className="p-1.5 rounded text-text-secondary hover:text-error-pink hover:bg-error-pink/10 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              <div className="mt-2 text-xs text-text-secondary">
                来源: 题目{b.question_id} · {new Date(b.created_at).toLocaleString()}
              </div>
            </div>
          )
        })}
        {filtered.length === 0 && (
          <div className="text-center py-12 text-text-secondary text-sm">
            暂无收藏，在练习页面中收藏SQL写法
          </div>
        )}
      </div>
    </div>
  )
}
