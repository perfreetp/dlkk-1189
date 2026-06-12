import { useEffect, useState } from 'react'
import { apiFetch } from '@/stores/auth'
import { Download, TrendingUp } from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Cell,
} from 'recharts'

interface KpStat {
  id: number
  name: string
  category: string
  color: string
  total_questions: number
  correct_questions: number
  total_submissions: number | null
  total_students: number | null
  pass_rate: number
}

const getColor = (rate: number) => {
  if (rate < 40) return '#e94560'
  if (rate < 70) return '#f59e0b'
  return '#10b981'
}

export default function Stats() {
  const [kpStats, setKpStats] = useState<KpStat[]>([])
  const [totalSubmissions, setTotalSubmissions] = useState(0)
  const [overallPassRate, setOverallPassRate] = useState(0)
  const [avgScore, setAvgScore] = useState(0)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    const kpRes = await apiFetch<KpStat[]>('/api/stats/knowledge-points')
    if (kpRes.success && kpRes.data) {
      setKpStats(kpRes.data)
      const total = kpRes.data.reduce((s, k) => s + k.total_questions, 0)
      const correct = kpRes.data.reduce((s, k) => s + k.correct_questions, 0)
      setOverallPassRate(total > 0 ? Math.round((correct / total) * 100) : 0)
    }
    const subRes = await apiFetch<any[]>('/api/submissions')
    if (subRes.success && subRes.data) {
      setTotalSubmissions(subRes.data.length)
      const correctCount = subRes.data.filter((s: any) => s.is_correct).length
      setOverallPassRate(subRes.data.length > 0 ? Math.round((correctCount / subRes.data.length) * 100) : 0)
      const scores = subRes.data.map((s: any) => s.score || 0)
      setAvgScore(scores.length > 0 ? Math.round(scores.reduce((a: number, b: number) => a + b, 0) / scores.length) : 0)
    }
  }

  const handleExport = async () => {
    const token = localStorage.getItem('token')
    if (!token) return
    try {
      const res = await fetch('/api/stats/export', {
        headers: { 'Authorization': `Bearer ${token}` },
      })
      if (res.ok) {
        const blob = await res.blob()
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'submissions.csv'
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      }
    } catch (err) {
      console.error('导出失败', err)
    }
  }

  const barData = kpStats.map((kp) => ({
    name: kp.name,
    passRate: kp.pass_rate,
    color: getColor(kp.pass_rate),
  }))

  const radarData = kpStats.map((kp) => ({
    subject: kp.name,
    rate: kp.pass_rate,
    fullMark: 100,
  }))

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-display text-2xl font-bold text-text-primary">知识点统计</h2>
        <button
          onClick={handleExport}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-bg-secondary border border-border-dark text-text-secondary text-sm hover:text-accent-cyan hover:border-accent-cyan/30 transition-all"
        >
          <Download className="w-4 h-4" /> 导出CSV
        </button>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-bg-secondary border border-border-dark rounded-xl p-5">
          <div className="text-xs text-text-secondary mb-1">总提交数</div>
          <div className="text-3xl font-display font-bold text-text-primary">{totalSubmissions}</div>
        </div>
        <div className="bg-bg-secondary border border-border-dark rounded-xl p-5">
          <div className="text-xs text-text-secondary mb-1">学员总数</div>
          <div className="text-3xl font-display font-bold text-text-primary">
            {kpStats.reduce((s, k) => Math.max(s, k.total_students || 0), 0)}
          </div>
        </div>
        <div className="bg-bg-secondary border border-border-dark rounded-xl p-5">
          <div className="text-xs text-text-secondary mb-1">整体通过率</div>
          <div className="text-3xl font-display font-bold text-accent-cyan">{overallPassRate}%</div>
        </div>
        <div className="bg-bg-secondary border border-border-dark rounded-xl p-5">
          <div className="text-xs text-text-secondary mb-1">平均分数</div>
          <div className="text-3xl font-display font-bold text-text-primary">{avgScore}</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="bg-bg-secondary border border-border-dark rounded-xl p-5">
          <h3 className="text-sm font-medium text-text-primary mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-accent-cyan" /> 知识点通过率
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={barData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} />
              <YAxis stroke="#94a3b8" fontSize={11} domain={[0, 100]} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#111827',
                  border: '1px solid #1e293b',
                  borderRadius: '8px',
                  color: '#e2e8f0',
                }}
                formatter={(value: number) => [`${value}%`, '通过率']}
              />
              <Bar dataKey="passRate" radius={[4, 4, 0, 0]}>
                {barData.map((entry, index) => (
                  <Cell key={index} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="flex gap-4 justify-center mt-3 text-xs text-text-secondary">
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-error-pink" /> &lt;40%</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-warning-amber" /> 40-70%</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-success-emerald" /> &gt;70%</span>
          </div>
        </div>

        <div className="bg-bg-secondary border border-border-dark rounded-xl p-5">
          <h3 className="text-sm font-medium text-text-primary mb-4">掌握程度雷达图</h3>
          <ResponsiveContainer width="100%" height={300}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="#1e293b" />
              <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: '#94a3b8', fontSize: 10 }} />
              <Radar
                name="通过率"
                dataKey="rate"
                stroke="#00d2ff"
                fill="#00d2ff"
                fillOpacity={0.2}
                strokeWidth={2}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="mt-6 bg-bg-secondary border border-border-dark rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-bg-tertiary">
              <th className="px-4 py-3 text-left text-xs font-medium text-accent-cyan uppercase">知识点</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-accent-cyan uppercase">分类</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-accent-cyan uppercase">题目数</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-accent-cyan uppercase">提交数</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-accent-cyan uppercase">学员数</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-accent-cyan uppercase">通过率</th>
            </tr>
          </thead>
          <tbody>
            {kpStats.map((kp) => (
              <tr key={kp.id} className="border-t border-border-dark/50">
                <td className="px-4 py-2.5 text-text-primary">
                  <span className="inline-block w-2 h-2 rounded-full mr-2" style={{ backgroundColor: kp.color }} />
                  {kp.name}
                </td>
                <td className="px-4 py-2.5 text-text-secondary">{kp.category}</td>
                <td className="px-4 py-2.5 text-text-primary">{kp.total_questions}</td>
                <td className="px-4 py-2.5 text-text-primary">{kp.total_submissions || 0}</td>
                <td className="px-4 py-2.5 text-text-primary">{kp.total_students || 0}</td>
                <td className="px-4 py-2.5">
                  <span style={{ color: getColor(kp.pass_rate) }} className="font-medium">
                    {kp.pass_rate}%
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
