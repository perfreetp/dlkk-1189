import { useEffect, useState } from 'react'
import { apiFetch } from '@/stores/auth'
import { Users, User, ChevronRight, XCircle, CheckCircle2, Clock, Filter } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts'

interface StudentSummary {
  id: number
  username: string
  total_submissions: number
  correct_submissions: number
  pass_rate: number
  unresolved_mistakes: number
  recent_submissions: any[]
}

interface KnowledgePointStat {
  id: number
  name: string
  category: string
  color: string
  total_submissions: number
  correct_submissions: number
  pass_rate: number
}

interface RecentSubmission {
  id: number
  question_title: string
  is_correct: boolean
  score: number
  instructor_comment: string | null
  duration_ms: number
  submitted_at: string
}

interface Mistake {
  id: number
  question_title: string
  error_type: string
  retry_count: number
}

interface StudentDetail {
  user: { id: number; username: string }
  knowledge_point_stats: KnowledgePointStat[]
  recent_submissions: RecentSubmission[]
  mistakes: Mistake[]
}

interface Course {
  id: number
  name: string
}

const getColor = (rate: number) => {
  if (rate < 40) return '#e94560'
  if (rate < 70) return '#f59e0b'
  return '#10b981'
}

export default function Students() {
  const [students, setStudents] = useState<StudentSummary[]>([])
  const [courses, setCourses] = useState<Course[]>([])
  const [selectedCourseId, setSelectedCourseId] = useState<number | null>(null)
  const [selectedStudent, setSelectedStudent] = useState<StudentDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [detailLoading, setDetailLoading] = useState(false)

  useEffect(() => {
    loadCourses()
    loadStudents()
  }, [])

  useEffect(() => {
    loadStudents()
    if (selectedStudent) {
      setSelectedStudent(null)
    }
  }, [selectedCourseId])

  const loadCourses = async () => {
    const res = await apiFetch<Course[]>('/api/courses')
    if (res.success && res.data) {
      setCourses(res.data)
    }
  }

  const loadStudents = async () => {
    setLoading(true)
    const query = selectedCourseId ? `?course_id=${selectedCourseId}` : ''
    const res = await apiFetch<StudentSummary[]>(`/api/stats/students${query}`)
    if (res.success && res.data) {
      setStudents(res.data)
    }
    setLoading(false)
  }

  const loadStudentDetail = async (studentId: number) => {
    setDetailLoading(true)
    const query = selectedCourseId ? `?course_id=${selectedCourseId}` : ''
    const res = await apiFetch<StudentDetail>(`/api/stats/students/${studentId}${query}`)
    if (res.success && res.data) {
      setSelectedStudent(res.data)
    }
    setDetailLoading(false)
  }

  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return minutes > 0 ? `${minutes}分${remainingSeconds}秒` : `${remainingSeconds}秒`
  }

  const barData = (selectedStudent?.knowledge_point_stats || []).map((kp) => ({
    name: kp.name,
    passRate: kp.pass_rate,
    color: getColor(kp.pass_rate),
  }))

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-display text-2xl font-bold text-text-primary flex items-center gap-2">
          <Users className="w-6 h-6 text-accent-cyan" /> 学员分析
        </h2>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-text-secondary" />
          <select
            value={selectedCourseId ?? ''}
            onChange={(e) => setSelectedCourseId(e.target.value ? Number(e.target.value) : null)}
            className="bg-bg-secondary border border-border-dark rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-accent-cyan/50"
          >
            <option value="">全部课程</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="bg-bg-secondary border border-border-dark rounded-xl overflow-hidden animate-fade-in-up">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-bg-tertiary">
              <th className="px-4 py-3 text-left text-xs font-medium text-accent-cyan uppercase">学员</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-accent-cyan uppercase">总提交</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-accent-cyan uppercase">正确提交</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-accent-cyan uppercase">通过率</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-accent-cyan uppercase">未解决错误</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-accent-cyan uppercase">操作</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-text-secondary">加载中...</td>
              </tr>
            ) : students.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-text-secondary">暂无学员数据</td>
              </tr>
            ) : (
              students.map((s) => (
                <tr key={s.id} className="border-t border-border-dark/50 hover:bg-bg-tertiary/30 transition-colors">
                  <td className="px-4 py-2.5 text-text-primary flex items-center gap-2">
                    <User className="w-4 h-4 text-text-secondary" />
                    {s.username}
                  </td>
                  <td className="px-4 py-2.5 text-text-primary">{s.total_submissions}</td>
                  <td className="px-4 py-2.5 text-text-primary">{s.correct_submissions}</td>
                  <td className="px-4 py-2.5">
                    <span style={{ color: getColor(s.pass_rate) }} className="font-medium">
                      {s.pass_rate}%
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    {s.unresolved_mistakes > 0 ? (
                      <span className="text-error-pink font-medium">{s.unresolved_mistakes}</span>
                    ) : (
                      <span className="text-success-emerald">0</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5">
                    <button
                      onClick={() => loadStudentDetail(s.id)}
                      disabled={detailLoading}
                      className="flex items-center gap-1 text-accent-cyan hover:text-accent-cyan/80 text-xs font-medium transition-colors disabled:opacity-50"
                    >
                      查看详情 <ChevronRight className="w-3 h-3" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {selectedStudent && (
        <div className="mt-6 animate-fade-in-up">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display text-lg font-bold text-text-primary flex items-center gap-2">
              <User className="w-5 h-5 text-accent-cyan" />
              {selectedStudent.user.username} - 学员详情
            </h3>
            <button
              onClick={() => setSelectedStudent(null)}
              className="text-text-secondary hover:text-text-primary transition-colors"
            >
              <XCircle className="w-5 h-5" />
            </button>
          </div>

          <div className="bg-bg-secondary border border-border-dark rounded-xl p-5 mb-6">
            <h4 className="text-sm font-medium text-text-primary mb-4 flex items-center gap-2">
              知识点通过率
            </h4>
            {barData.length > 0 ? (
              <>
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
              </>
            ) : (
              <div className="text-text-secondary text-sm text-center py-8">暂无知识点数据</div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="bg-bg-secondary border border-border-dark rounded-xl overflow-hidden">
              <h4 className="text-sm font-medium text-text-primary px-5 pt-5 pb-3 flex items-center gap-2">
                <Clock className="w-4 h-4 text-accent-cyan" /> 近期提交
              </h4>
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-bg-tertiary">
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-accent-cyan uppercase">题目</th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-accent-cyan uppercase">结果</th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-accent-cyan uppercase">用时</th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-accent-cyan uppercase">提交时间</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedStudent.recent_submissions.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-6 text-center text-text-secondary">暂无提交记录</td>
                    </tr>
                  ) : (
                    selectedStudent.recent_submissions.map((sub) => (
                      <tr key={sub.id} className="border-t border-border-dark/50">
                        <td className="px-4 py-2.5 text-text-primary">{sub.question_title}</td>
                        <td className="px-4 py-2.5">
                          {sub.is_correct ? (
                            <span className="flex items-center gap-1 text-success-emerald">
                              <CheckCircle2 className="w-3.5 h-3.5" /> 正确
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-error-pink">
                              <XCircle className="w-3.5 h-3.5" /> 错误
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-text-secondary">{formatDuration(sub.duration_ms)}</td>
                        <td className="px-4 py-2.5 text-text-secondary">
                          {new Date(sub.submitted_at).toLocaleDateString('zh-CN')}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="bg-bg-secondary border border-border-dark rounded-xl overflow-hidden">
              <h4 className="text-sm font-medium text-text-primary px-5 pt-5 pb-3 flex items-center gap-2">
                <XCircle className="w-4 h-4 text-error-pink" /> 错误记录
              </h4>
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-bg-tertiary">
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-accent-cyan uppercase">题目</th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-accent-cyan uppercase">错误类型</th>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-accent-cyan uppercase">重试次数</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedStudent.mistakes.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-4 py-6 text-center text-text-secondary">暂无错误记录 🎉</td>
                    </tr>
                  ) : (
                    selectedStudent.mistakes.map((m) => (
                      <tr key={m.id} className="border-t border-border-dark/50">
                        <td className="px-4 py-2.5 text-text-primary">{m.question_title}</td>
                        <td className="px-4 py-2.5">
                          <span className="px-2 py-0.5 rounded text-xs bg-error-pink/10 text-error-pink">
                            {m.error_type}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-text-primary">{m.retry_count}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
