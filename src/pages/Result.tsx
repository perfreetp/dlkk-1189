import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAppStore } from '@/stores/app'
import DataTable from '@/components/DataTable'
import { CheckCircle2, XCircle, ArrowLeft } from 'lucide-react'
import { apiFetch } from '@/stores/auth'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'

interface Submission {
  id: number
  question_id: number
  sql_text: string
  is_correct: number
  score: number
  duration_ms: number
  submitted_at: string
  result_json: string
}

export default function Result() {
  const [searchParams] = useSearchParams()
  const questionId = Number(searchParams.get('questionId'))
  const { submissionResult, currentQuestion, fetchQuestion } = useAppStore()
  const [submissions, setSubmissions] = useState<Submission[]>([])

  useEffect(() => {
    if (questionId) {
      fetchQuestion(questionId)
      fetchSubmissions()
    }
  }, [questionId])

  const fetchSubmissions = async () => {
    const res = await apiFetch<Submission[]>(`/api/submissions?question_id=${questionId}`)
    if (res.success && res.data) {
      setSubmissions(res.data)
    }
  }

  const userResult = submissionResult?.results || []
  const refResult = submissionResult?.reference_result || []
  const isCorrect = submissionResult?.is_correct

  const userColumns = userResult.length > 0 ? Object.keys(userResult[0]) : []
  const refColumns = refResult.length > 0 ? Object.keys(refResult[0]) : []

  const normalizeRow = (row: any) =>
    Object.keys(row)
      .sort()
      .map((k) => `${k}=${row[k]}`)
      .join('|')

  const userSet = new Set(userResult.map(normalizeRow))
  const refSet = new Set(refResult.map(normalizeRow))

  const userOnly = userResult.filter((r) => !refSet.has(normalizeRow(r)))
  const refOnly = refResult.filter((r) => !userSet.has(normalizeRow(r)))

  const chartData = submissions
    .slice()
    .reverse()
    .map((s, i) => ({
      index: i + 1,
      score: s.is_correct ? 100 : 0,
      duration: Math.round(s.duration_ms / 1000),
    }))

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <button
        onClick={() => window.history.back()}
        className="flex items-center gap-1.5 text-text-secondary hover:text-accent-cyan text-sm mb-4 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> 返回
      </button>

      <div
        className={`mb-6 p-4 rounded-xl border ${
          isCorrect
            ? 'bg-success-emerald/10 border-success-emerald/30 glow-success'
            : 'bg-error-pink/10 border-error-pink/30 glow-error'
        } animate-scale-in`}
      >
        <div className="flex items-center gap-3">
          {isCorrect ? (
            <CheckCircle2 className="w-8 h-8 text-success-emerald" />
          ) : (
            <XCircle className="w-8 h-8 text-error-pink" />
          )}
          <div>
            <h2 className={`text-xl font-display font-bold ${isCorrect ? 'text-success-emerald' : 'text-error-pink'}`}>
              {isCorrect ? '通过' : '未通过'}
            </h2>
            <p className="text-sm text-text-secondary">
              {currentQuestion?.title || '题目'}
            </p>
          </div>
          <div className="ml-auto text-right">
            <div className="text-3xl font-display font-bold text-text-primary">
              {isCorrect ? '100' : '0'}
            </div>
            <div className="text-xs text-text-secondary">分数</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6 mb-6">
        <div>
          <h3 className="text-sm font-medium text-accent-cyan mb-3">你的结果</h3>
          <DataTable
            columns={userColumns}
            rows={userResult}
            maxHeight="250px"
            highlightDiff={userOnly.length > 0 ? 'user' : undefined}
          />
          {userOnly.length > 0 && (
            <p className="text-xs text-error-pink mt-2">
              红色标记的行仅在你的结果中出现（多余行）
            </p>
          )}
        </div>
        <div>
          <h3 className="text-sm font-medium text-success-emerald mb-3">参考结果</h3>
          <DataTable
            columns={refColumns}
            rows={refResult}
            maxHeight="250px"
            highlightDiff={refOnly.length > 0 ? 'reference' : undefined}
          />
          {refOnly.length > 0 && (
            <p className="text-xs text-success-emerald mt-2">
              绿色标记的行仅在参考结果中出现（遗漏行）
            </p>
          )}
        </div>
      </div>

      {chartData.length > 1 && (
        <div className="bg-bg-secondary border border-border-dark rounded-xl p-5">
          <h3 className="text-sm font-medium text-text-primary mb-4">提交历史</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="index" stroke="#94a3b8" fontSize={12} />
              <YAxis stroke="#94a3b8" fontSize={12} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#111827',
                  border: '1px solid #1e293b',
                  borderRadius: '8px',
                  color: '#e2e8f0',
                }}
              />
              <Line type="stepAfter" dataKey="score" stroke="#00d2ff" strokeWidth={2} dot={{ r: 3 }} name="分数" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
