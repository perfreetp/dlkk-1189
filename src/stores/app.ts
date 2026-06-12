import { create } from 'zustand'
import { apiFetch } from './auth'

interface KnowledgePoint {
  id: number
  name: string
  category: string
  color: string
}

interface Question {
  id: number
  practice_set_id: number
  title: string
  description: string
  hint: string
  reference_sql: string
  reference_result_json: string
  setup_sql: string
  difficulty: string
  sort_order: number
  knowledge_points: KnowledgePoint[]
}

interface PracticeSet {
  id: number
  course_id: number
  name: string
  description: string
  difficulty: string
  sort_order: number
  questions: { id: number; title: string; difficulty: string; sort_order: number }[]
}

interface Course {
  id: number
  name: string
  description: string
  icon: string
  sort_order: number
  practice_set_count: number
  practice_sets?: PracticeSet[]
}

interface SchemaInfo {
  table: string
  columns: { name: string; type: string; pk: number }[]
}

interface SubmissionResult {
  is_correct: boolean
  results: any[]
  reference_result: any[]
  completed_count?: number
  total_count?: number
  error?: string
}

interface AppState {
  courses: Course[]
  currentCourse: Course | null
  currentPracticeSet: PracticeSet | null
  currentQuestion: Question | null
  schema: SchemaInfo[]
  sampleData: Record<string, any[]>
  executeResult: any[] | null
  executeError: string | null
  executeTime: number | null
  submissionResult: SubmissionResult | null
  loading: boolean
  error: string | null

  fetchCourses: () => Promise<void>
  fetchCourse: (id: number) => Promise<void>
  fetchPracticeSet: (id: number) => Promise<void>
  fetchQuestion: (id: number) => Promise<void>
  fetchSchema: (questionId: number) => Promise<void>
  fetchSampleData: (questionId: number, tableName: string) => Promise<void>
  executeSql: (sql: string, setupSql: string) => Promise<void>
  submitSql: (questionId: number, sqlText: string, durationMs: number) => Promise<void>
  clearResults: () => void
}

export const useAppStore = create<AppState>((set) => ({
  courses: [],
  currentCourse: null,
  currentPracticeSet: null,
  currentQuestion: null,
  schema: [],
  sampleData: {},
  executeResult: null,
  executeError: null,
  executeTime: null,
  submissionResult: null,
  loading: false,
  error: null,

  fetchCourses: async () => {
    set({ loading: true })
    try {
      const res = await apiFetch<Course[]>('/api/courses')
      if (res.success && res.data) {
        set({ courses: res.data, loading: false })
      } else {
        set({ loading: false, error: res.error })
      }
    } catch {
      set({ loading: false, error: '获取课程失败' })
    }
  },

  fetchCourse: async (id) => {
    set({ loading: true })
    try {
      const res = await apiFetch<Course>(`/api/courses/${id}`)
      if (res.success && res.data) {
        set({ currentCourse: res.data, loading: false })
      } else {
        set({ loading: false, error: res.error })
      }
    } catch {
      set({ loading: false, error: '获取课程详情失败' })
    }
  },

  fetchPracticeSet: async (id) => {
    set({ loading: true })
    try {
      const res = await apiFetch<PracticeSet>(`/api/courses/practice-sets/${id}`)
      if (res.success && res.data) {
        set({ currentPracticeSet: res.data, loading: false })
      } else {
        set({ loading: false, error: res.error })
      }
    } catch {
      set({ loading: false, error: '获取练习集失败' })
    }
  },

  fetchQuestion: async (id) => {
    set({ loading: true, executeResult: null, executeError: null, submissionResult: null })
    try {
      const res = await apiFetch<Question>(`/api/questions/${id}`)
      if (res.success && res.data) {
        set({ currentQuestion: res.data, loading: false })
      } else {
        set({ loading: false, error: res.error })
      }
    } catch {
      set({ loading: false, error: '获取题目失败' })
    }
  },

  fetchSchema: async (questionId) => {
    try {
      const res = await apiFetch<SchemaInfo[]>(`/api/questions/${questionId}/schema`)
      if (res.success && res.data) {
        set({ schema: res.data })
      }
    } catch {}
  },

  fetchSampleData: async (questionId, tableName) => {
    try {
      const res = await apiFetch<any[]>(`/api/questions/${questionId}/sample-data/${tableName}`)
      if (res.success && res.data) {
        set((state) => ({
          sampleData: { ...state.sampleData, [tableName]: res.data! },
        }))
      }
    } catch {}
  },

  executeSql: async (sql, setupSql) => {
    set({ loading: true, executeError: null })
    const start = Date.now()
    try {
      const res = await apiFetch<any[]>('/api/sql/execute', {
        method: 'POST',
        body: JSON.stringify({ sql, setup_sql: setupSql }),
      })
      const elapsed = Date.now() - start
      if (res.success && res.data) {
        set({ executeResult: res.data, executeTime: elapsed, loading: false })
      } else {
        set({ executeError: res.error || '执行失败', executeTime: elapsed, loading: false })
      }
    } catch {
      set({ executeError: '网络错误', loading: false })
    }
  },

  submitSql: async (questionId, sqlText, durationMs) => {
    set({ loading: true, executeError: null })
    try {
      const res = await apiFetch<SubmissionResult>('/api/sql/submit', {
        method: 'POST',
        body: JSON.stringify({ question_id: questionId, sql_text: sqlText, duration_ms: durationMs }),
      })
      if (res.success && res.data) {
        set({ submissionResult: res.data, executeResult: res.data.results, loading: false })
      } else {
        set({ executeError: res.error || '提交失败', loading: false })
      }
    } catch {
      set({ executeError: '网络错误', loading: false })
    }
  },

  clearResults: () => {
    set({ executeResult: null, executeError: null, executeTime: null, submissionResult: null })
  },
}))

export type { Course, PracticeSet, Question, SchemaInfo, KnowledgePoint, SubmissionResult }
