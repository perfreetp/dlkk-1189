import { useEffect, useState } from 'react'
import { apiFetch } from '@/stores/auth'
import { Send, CheckSquare, Square } from 'lucide-react'

interface Submission {
  id: number
  user_id: number
  question_id: number
  sql_text: string
  is_correct: number
  score: number
  instructor_comment: string
  submitted_at: string
  question_title: string
}

export default function Review() {
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [comments, setComments] = useState<Record<number, string>>({})
  const [scores, setScores] = useState<Record<number, number>>({})
  const [bulkComment, setBulkComment] = useState('')
  const [bulkScore, setBulkScore] = useState(0)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchSubmissions()
  }, [])

  const fetchSubmissions = async () => {
    const res = await apiFetch<Submission[]>('/api/submissions')
    if (res.success && res.data) {
      setSubmissions(res.data)
      const initComments: Record<number, string> = {}
      const initScores: Record<number, number> = {}
      res.data.forEach((s) => {
        initComments[s.id] = s.instructor_comment || ''
        initScores[s.id] = s.score || 0
      })
      setComments(initComments)
      setScores(initScores)
    }
  }

  const toggleSelect = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const selectAll = () => {
    if (selected.size === submissions.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(submissions.map((s) => s.id)))
    }
  }

  const applyBulkComment = () => {
    const updated = { ...comments }
    selected.forEach((id) => {
      updated[id] = bulkComment
    })
    setComments(updated)
  }

  const applyBulkScore = () => {
    const updated = { ...scores }
    selected.forEach((id) => {
      updated[id] = bulkScore
    })
    setScores(updated)
  }

  const handleSubmit = async () => {
    if (selected.size === 0) return
    setSaving(true)
    try {
      const reviews = Array.from(selected).map((id) => ({
        id,
        score: scores[id] || 0,
        instructor_comment: comments[id] || '',
      }))
      await apiFetch('/api/submissions/batch-review', {
        method: 'POST',
        body: JSON.stringify({ reviews }),
      })
      setSelected(new Set())
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h2 className="font-display text-2xl font-bold text-text-primary mb-6">批量点评</h2>

      <div className="mb-4 p-4 bg-bg-secondary border border-border-dark rounded-xl">
        <h3 className="text-sm font-medium text-text-primary mb-3">批量操作（已选 {selected.size} 项）</h3>
        <div className="flex gap-3 items-end flex-wrap">
          <div>
            <label className="block text-xs text-text-secondary mb-1">统一评语</label>
            <input
              value={bulkComment}
              onChange={(e) => setBulkComment(e.target.value)}
              className="px-3 py-2 bg-bg-primary border border-border-dark rounded-lg text-sm text-text-primary focus:outline-none focus:border-accent-cyan w-60"
            />
          </div>
          <button
            onClick={applyBulkComment}
            disabled={selected.size === 0}
            className="px-4 py-2 rounded-lg bg-bg-tertiary text-text-secondary text-sm hover:text-text-primary disabled:opacity-30 transition-all"
          >
            应用评语
          </button>
          <div>
            <label className="block text-xs text-text-secondary mb-1">统一分数</label>
            <input
              type="number"
              min={0}
              max={100}
              value={bulkScore}
              onChange={(e) => setBulkScore(Number(e.target.value))}
              className="px-3 py-2 bg-bg-primary border border-border-dark rounded-lg text-sm text-text-primary focus:outline-none focus:border-accent-cyan w-24"
            />
          </div>
          <button
            onClick={applyBulkScore}
            disabled={selected.size === 0}
            className="px-4 py-2 rounded-lg bg-bg-tertiary text-text-secondary text-sm hover:text-text-primary disabled:opacity-30 transition-all"
          >
            应用分数
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving || selected.size === 0}
            className="flex items-center gap-1.5 px-5 py-2 rounded-lg bg-gradient-to-r from-accent-blue to-accent-cyan/80 text-white text-sm font-medium hover:brightness-110 disabled:opacity-50 transition-all"
          >
            <Send className="w-4 h-4" /> {saving ? '提交中...' : '提交点评'}
          </button>
        </div>
      </div>

      <div className="mb-3">
        <button onClick={selectAll} className="flex items-center gap-1.5 text-sm text-text-secondary hover:text-accent-cyan transition-colors">
          {selected.size === submissions.length ? <CheckSquare className="w-4 h-4 text-accent-cyan" /> : <Square className="w-4 h-4" />}
          全选/取消
        </button>
      </div>

      <div className="space-y-3">
        {submissions.map((sub) => (
          <div
            key={sub.id}
            className={`p-4 bg-bg-secondary border rounded-xl transition-all ${
              selected.has(sub.id) ? 'border-accent-cyan/40 glow-cyan' : 'border-border-dark'
            }`}
          >
            <div className="flex items-start gap-3">
              <button
                onClick={() => toggleSelect(sub.id)}
                className="mt-1 text-text-secondary hover:text-accent-cyan transition-colors"
              >
                {selected.has(sub.id) ? <CheckSquare className="w-4 h-4 text-accent-cyan" /> : <Square className="w-4 h-4" />}
              </button>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm text-text-primary">用户{sub.user_id}</span>
                  <span className="text-xs text-text-secondary">-</span>
                  <span className="text-sm text-text-secondary">{sub.question_title || `题${sub.question_id}`}</span>
                  {sub.is_correct ? (
                    <span className="px-1.5 py-0.5 rounded text-[10px] bg-success-emerald/20 text-success-emerald">正确</span>
                  ) : (
                    <span className="px-1.5 py-0.5 rounded text-[10px] bg-error-pink/20 text-error-pink">错误</span>
                  )}
                </div>
                <pre className="text-xs font-mono text-text-secondary p-2 bg-bg-primary rounded-lg border border-border-dark/50 max-h-24 overflow-auto">
                  {sub.sql_text}
                </pre>
                <div className="flex gap-3 mt-2">
                  <div className="flex-1">
                    <label className="block text-[10px] text-text-secondary mb-0.5">评语</label>
                    <input
                      value={comments[sub.id] || ''}
                      onChange={(e) => setComments({ ...comments, [sub.id]: e.target.value })}
                      className="w-full px-2 py-1 bg-bg-primary border border-border-dark rounded text-xs text-text-primary focus:outline-none focus:border-accent-cyan"
                    />
                  </div>
                  <div className="w-20">
                    <label className="block text-[10px] text-text-secondary mb-0.5">分数</label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={scores[sub.id] || 0}
                      onChange={(e) => setScores({ ...scores, [sub.id]: Number(e.target.value) })}
                      className="w-full px-2 py-1 bg-bg-primary border border-border-dark rounded text-xs text-text-primary focus:outline-none focus:border-accent-cyan"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
        {submissions.length === 0 && (
          <div className="text-center py-12 text-text-secondary text-sm">暂无提交记录</div>
        )}
      </div>
    </div>
  )
}
