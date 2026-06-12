import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiFetch } from '@/stores/auth'
import { RotateCcw, Filter } from 'lucide-react'

interface Mistake {
  id: number
  question_id: number
  error_type: string
  retry_count: number
  is_resolved: number
  created_at: string
  question_title: string
}

const errorTypeLabels: Record<string, string> = {
  syntax_error: '语法错误',
  wrong_result: '结果错误',
}

const errorTypeColors: Record<string, string> = {
  syntax_error: 'bg-error-pink/20 text-error-pink',
  wrong_result: 'bg-warning-amber/20 text-warning-amber',
}

export default function Mistakes() {
  const [mistakes, setMistakes] = useState<Mistake[]>([])
  const [kpFilter, setKpFilter] = useState('')
  const [resolvedFilter, setResolvedFilter] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    fetchMistakes()
  }, [])

  const fetchMistakes = async () => {
    let url = '/api/mistakes'
    if (resolvedFilter !== '') url += `?is_resolved=${resolvedFilter}`
    const res = await apiFetch<Mistake[]>(url)
    if (res.success && res.data) {
      setMistakes(res.data)
    }
  }

  const handleRetry = async (m: Mistake) => {
    await apiFetch(`/api/mistakes/${m.id}/retry`, { method: 'POST' })
    navigate(`/practice/${m.question_id}`)
  }

  const handleDelete = async (id: number) => {
    await apiFetch(`/api/mistakes/${id}`, { method: 'DELETE' })
    fetchMistakes()
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h2 className="font-display text-2xl font-bold text-text-primary mb-6">错题本</h2>

      <div className="flex gap-3 mb-6">
        <select
          value={resolvedFilter}
          onChange={(e) => {
            setResolvedFilter(e.target.value)
            setTimeout(fetchMistakes, 0)
          }}
          className="px-4 py-2 bg-bg-secondary border border-border-dark rounded-lg text-sm text-text-primary focus:outline-none focus:border-accent-cyan"
        >
          <option value="">全部</option>
          <option value="0">未解决</option>
          <option value="1">已解决</option>
        </select>
      </div>

      <div className="space-y-3">
        {mistakes.map((m) => (
          <div
            key={m.id}
            className={`bg-bg-secondary border border-border-dark rounded-xl p-4 transition-all hover:border-accent-cyan/20 ${
              m.is_resolved ? 'opacity-60' : ''
            } animate-fade-in-up`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-sm font-medium text-text-primary">{m.question_title || `题目${m.question_id}`}</h3>
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${errorTypeColors[m.error_type] || 'bg-bg-tertiary text-text-secondary'}`}>
                    {errorTypeLabels[m.error_type] || m.error_type}
                  </span>
                  {m.is_resolved ? (
                    <span className="px-2 py-0.5 rounded text-xs font-medium bg-success-emerald/20 text-success-emerald">已解决</span>
                  ) : null}
                </div>
                <div className="flex items-center gap-4 text-xs text-text-secondary">
                  <span>重试 {m.retry_count} 次</span>
                  <span>{new Date(m.created_at).toLocaleString()}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {!m.is_resolved && (
                  <button
                    onClick={() => handleRetry(m)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-accent-cyan/20 text-accent-cyan text-xs font-medium hover:bg-accent-cyan/30 transition-all"
                  >
                    <RotateCcw className="w-3.5 h-3.5" /> 重做
                  </button>
                )}
                <button
                  onClick={() => handleDelete(m.id)}
                  className="px-3 py-1.5 rounded-lg text-xs text-text-secondary hover:text-error-pink hover:bg-error-pink/10 transition-all"
                >
                  删除
                </button>
              </div>
            </div>
          </div>
        ))}
        {mistakes.length === 0 && (
          <div className="text-center py-12 text-text-secondary text-sm">
            暂无错题记录，继续保持！
          </div>
        )}
      </div>
    </div>
  )
}
