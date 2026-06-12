import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppStore, type Course, type PracticeSet } from '@/stores/app'
import { apiFetch } from '@/stores/auth'
import { Search, ChevronDown, ChevronRight, CheckCircle2, Circle } from 'lucide-react'

const difficultyColors: Record<string, string> = {
  beginner: 'bg-success-emerald/20 text-success-emerald',
  intermediate: 'bg-warning-amber/20 text-warning-amber',
  advanced: 'bg-error-pink/20 text-error-pink',
}

const difficultyLabels: Record<string, string> = {
  beginner: '入门',
  intermediate: '进阶',
  advanced: '高级',
}

function ProgressRing({ progress, size = 40 }: { progress: number; size?: number }) {
  const radius = (size - 4) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (progress / 100) * circumference

  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#1e293b" strokeWidth={3} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={progress >= 100 ? '#10b981' : '#00d2ff'}
        strokeWidth={3}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
      />
    </svg>
  )
}

function CourseCard({
  course,
  expanded,
  onToggle,
  progressMap,
  correctQIds,
  attemptedQIds,
}: {
  course: Course
  expanded: boolean
  onToggle: () => void
  progressMap: Record<number, { completed_count: number; total_count: number }>
  correctQIds: number[]
  attemptedQIds: number[]
}) {
  const navigate = useNavigate()

  const courseProgress = course.practice_sets
    ? course.practice_sets.reduce(
        (acc, ps) => {
          const p = progressMap[ps.id]
          if (p) {
            acc.completed += p.completed_count
            acc.total += p.total_count
          } else {
            const qCount = ps.questions?.length || 0
            acc.total += qCount
          }
          return acc
        },
        { completed: 0, total: 0 }
      )
    : { completed: 0, total: 0 }

  const coursePercent = courseProgress.total > 0
    ? Math.round((courseProgress.completed / courseProgress.total) * 100)
    : 0

  const getNextQuestion = (ps: PracticeSet) => {
    if (!ps.questions || ps.questions.length === 0) return null
    const correctSet = new Set(correctQIds)
    const nextQ = ps.questions.find((q) => !correctSet.has(q.id))
    return nextQ || ps.questions[0]
  }

  return (
    <div className="animate-fade-in-up">
      <div
        onClick={onToggle}
        className="bg-bg-secondary border border-border-dark rounded-xl p-5 cursor-pointer transition-all duration-300 hover:glow-cyan hover:-translate-y-0.5 group"
      >
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <span className="text-3xl">{course.icon}</span>
            <div>
              <h3 className="font-display text-lg font-semibold text-text-primary group-hover:text-accent-cyan transition-colors">
                {course.name}
              </h3>
              <p className="text-sm text-text-secondary mt-1">{course.description}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-xs text-text-secondary">{course.practice_set_count} 个练习集</p>
              {coursePercent > 0 && (
                <p className="text-xs text-accent-cyan mt-0.5">{coursePercent}% 完成</p>
              )}
            </div>
            <ProgressRing progress={coursePercent} />
            {expanded ? (
              <ChevronDown className="w-5 h-5 text-text-secondary" />
            ) : (
              <ChevronRight className="w-5 h-5 text-text-secondary" />
            )}
          </div>
        </div>
      </div>

      {expanded && course.practice_sets && (
        <div className="mt-2 ml-6 space-y-2 animate-fade-in-up">
          {course.practice_sets.map((ps) => {
            const p = progressMap[ps.id]
            const psCompleted = p?.completed_count || 0
            const psTotal = p?.total_count || ps.questions?.length || 0
            const psPercent = psTotal > 0 ? Math.round((psCompleted / psTotal) * 100) : 0
            const nextQ = getNextQuestion(ps)
            const correctSet = new Set(correctQIds)
            const attemptedSet = new Set(attemptedQIds)

            return (
              <div
                key={ps.id}
                onClick={() => {
                  if (nextQ) {
                    navigate(`/practice/${nextQ.id}?set=${ps.id}`)
                  }
                }}
                className="bg-bg-secondary/50 border border-border-dark/50 rounded-lg p-4 flex items-center justify-between hover:border-accent-cyan/30 hover:bg-bg-secondary transition-all cursor-pointer"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-medium text-text-primary">{ps.name}</h4>
                    {psPercent >= 100 && (
                      <CheckCircle2 className="w-4 h-4 text-success-emerald shrink-0" />
                    )}
                  </div>
                  <p className="text-xs text-text-secondary mt-0.5">{ps.description}</p>
                  <div className="flex items-center gap-3 mt-2">
                    <div className="flex-1 h-1.5 bg-bg-tertiary rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${psPercent >= 100 ? 'bg-success-emerald' : 'bg-accent-cyan'}`}
                        style={{ width: `${psPercent}%` }}
                      />
                    </div>
                    <span className="text-xs text-text-secondary shrink-0">
                      {psCompleted}/{psTotal}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-3 ml-3">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${difficultyColors[ps.difficulty] || difficultyColors.beginner}`}>
                    {difficultyLabels[ps.difficulty] || ps.difficulty}
                  </span>
                  <span className="text-xs text-text-secondary">{ps.questions?.length || 0} 题</span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default function Courses() {
  const { courses, fetchCourses, fetchCourse } = useAppStore()
  const [search, setSearch] = useState('')
  const [diffFilter, setDiffFilter] = useState('')
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [progressMap, setProgressMap] = useState<Record<number, { completed_count: number; total_count: number }>>({})
  const [correctQIds, setCorrectQIds] = useState<number[]>([])
  const [attemptedQIds, setAttemptedQIds] = useState<number[]>([])

  const loadProgress = async () => {
    const res = await apiFetch<any>('/api/courses/progress')
    if (res.success && res.data) {
      setProgressMap(res.data.progressMap || {})
      setCorrectQIds(res.data.correctQuestionIds || [])
      setAttemptedQIds(res.data.attemptedQuestionIds || [])
    }
  }

  useEffect(() => {
    fetchCourses()
    loadProgress()
  }, [])

  const handleToggle = async (courseId: number) => {
    if (expandedId === courseId) {
      setExpandedId(null)
      return
    }
    if (!courses.find((c) => c.id === courseId)?.practice_sets) {
      await fetchCourse(courseId)
    }
    setExpandedId(courseId)
  }

  const filtered = courses.filter((c) => {
    const matchSearch = !search || c.name.toLowerCase().includes(search.toLowerCase())
    return matchSearch
  })

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h2 className="font-display text-2xl font-bold text-text-primary">课程目录</h2>
        <p className="text-text-secondary text-sm mt-1">选择课程开始你的SQL学习之旅</p>
      </div>

      <div className="flex gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜索课程..."
            className="w-full pl-9 pr-4 py-2 bg-bg-secondary border border-border-dark rounded-lg text-text-primary text-sm focus:outline-none focus:border-accent-cyan"
          />
        </div>
        <select
          value={diffFilter}
          onChange={(e) => setDiffFilter(e.target.value)}
          className="px-4 py-2 bg-bg-secondary border border-border-dark rounded-lg text-text-primary text-sm focus:outline-none focus:border-accent-cyan"
        >
          <option value="">全部难度</option>
          <option value="beginner">入门</option>
          <option value="intermediate">进阶</option>
          <option value="advanced">高级</option>
        </select>
      </div>

      <div className="space-y-4">
        {filtered.map((course) => (
          <CourseCard
            key={course.id}
            course={course}
            expanded={expandedId === course.id}
            onToggle={() => handleToggle(course.id)}
            progressMap={progressMap}
            correctQIds={correctQIds}
            attemptedQIds={attemptedQIds}
          />
        ))}
        {filtered.length === 0 && (
          <div className="text-center py-12 text-text-secondary">暂无课程</div>
        )}
      </div>
    </div>
  )
}
