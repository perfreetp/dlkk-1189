import { useEffect, useState } from 'react'
import { apiFetch } from '@/stores/auth'
import { Search, Filter, ChevronDown, ChevronUp } from 'lucide-react'

interface Submission {
  id: number
  user_id: number
  question_id: number
  sql_text: string
  result_json: string
  is_correct: number
  score: number
  instructor_comment: string
  duration_ms: number
  submitted_at: string
  question_title: string
}

export default function Submissions() {
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [studentFilter, setStudentFilter] = useState('')
  const [questionFilter, setQuestionFilter] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  useEffect(() => {
    fetchSubmissions()
  }, [])

  const fetchSubmissions = async () => {
    let url = '/api/submissions?'
    if (studentFilter) url += `user_id=${studentFilter}&`
    if (questionFilter) url += `question_id=${questionFilter}&`
    if (startDate) url += `start_date=${startDate}&`
    if (endDate) url += `end_date=${endDate}&`
    const res = await apiFetch<Submission[]>(url)
    if (res.success && res.data) {
      setSubmissions(res.data)
    }
  }

  const handleFilter = () => {
    fetchSubmissions()
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h2 className="font-display text-2xl font-bold text-text-primary mb-6">提交记录</h2>

      <div className="flex gap-3 mb-6 flex-wrap">
        <input
          value={studentFilter}
          onChange={(e) => setStudentFilter(e.target.value)}
          placeholder="学员ID"
          className="px-3 py-2 bg-bg-secondary border border-border-dark rounded-lg text-sm text-text-primary focus:outline-none focus:border-accent-cyan w-28"
        />
        <input
          value={questionFilter}
          onChange={(e) => setQuestionFilter(e.target.value)}
          placeholder="题目ID"
          className="px-3 py-2 bg-bg-secondary border border-border-dark rounded-lg text-sm text-text-primary focus:outline-none focus:border-accent-cyan w-28"
        />
        <input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          className="px-3 py-2 bg-bg-secondary border border-border-dark rounded-lg text-sm text-text-primary focus:outline-none focus:border-accent-cyan"
        />
        <input
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          className="px-3 py-2 bg-bg-secondary border border-border-dark rounded-lg text-sm text-text-primary focus:outline-none focus:border-accent-cyan"
        />
        <button
          onClick={handleFilter}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-accent-cyan/20 text-accent-cyan text-sm font-medium hover:bg-accent-cyan/30 transition-all"
        >
          <Filter className="w-4 h-4" /> 筛选
        </button>
      </div>

      <div className="bg-bg-secondary border border-border-dark rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-bg-tertiary">
              <th className="px-4 py-3 text-left text-xs font-medium text-accent-cyan uppercase">学员</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-accent-cyan uppercase">题目</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-accent-cyan uppercase">正确性</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-accent-cyan uppercase">分数</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-accent-cyan uppercase">评语</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-accent-cyan uppercase">耗时</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-accent-cyan uppercase">提交时间</th>
            </tr>
          </thead>
          <tbody>
            {submissions.map((sub) => (
              <>
                <tr
                  key={sub.id}
                  onClick={() => setExpandedId(expandedId === sub.id ? null : sub.id)}
                  className="border-t border-border-dark/50 cursor-pointer hover:bg-bg-tertiary/30 transition-colors"
                >
                  <td className="px-4 py-2.5 text-text-primary">用户{sub.user_id}</td>
                  <td className="px-4 py-2.5 text-text-secondary">{sub.question_title || `题${sub.question_id}`}</td>
                  <td className="px-4 py-2.5">
                    {sub.is_correct ? (
                      <span className="px-2 py-0.5 rounded text-xs font-medium bg-success-emerald/20 text-success-emerald">正确</span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-xs font-medium bg-error-pink/20 text-error-pink">错误</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-text-primary">{sub.score}</td>
                  <td className="px-4 py-2.5 text-text-secondary max-w-[200px] truncate">{sub.instructor_comment || '-'}</td>
                  <td className="px-4 py-2.5 text-text-secondary">{sub.duration_ms}ms</td>
                  <td className="px-4 py-2.5 text-text-secondary text-xs">
                    {new Date(sub.submitted_at).toLocaleString()}
                    {expandedId === sub.id ? (
                      <ChevronUp className="w-3.5 h-3.5 inline ml-1" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5 inline ml-1" />
                    )}
                  </td>
                </tr>
                {expandedId === sub.id && (
                  <tr key={`${sub.id}-detail`} className="border-t border-border-dark/30">
                    <td colSpan={7} className="px-6 py-3 bg-bg-primary/50">
                      <pre className="text-xs font-mono text-text-primary whitespace-pre-wrap p-3 bg-bg-primary rounded-lg border border-border-dark max-h-60 overflow-auto">
                        {sub.sql_text}
                      </pre>
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
        {submissions.length === 0 && (
          <div className="text-center py-12 text-text-secondary text-sm">暂无提交记录</div>
        )}
      </div>
    </div>
  )
}
