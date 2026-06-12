import { useEffect, useState } from 'react'
import { apiFetch } from '@/stores/auth'
import SqlEditor from '@/components/SqlEditor'
import DataTable from '@/components/DataTable'
import { Plus, Search, Play, Trash2, Save } from 'lucide-react'

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
  knowledge_points?: KnowledgePoint[]
}

interface PracticeSet {
  id: number
  name: string
  course_id: number
}

const emptyQuestion: Partial<Question> = {
  title: '',
  description: '',
  hint: '',
  reference_sql: '',
  reference_result_json: '',
  setup_sql: '',
  difficulty: 'beginner',
  sort_order: 0,
}

export default function Questions() {
  const [questions, setQuestions] = useState<Question[]>([])
  const [practiceSets, setPracticeSets] = useState<PracticeSet[]>([])
  const [knowledgePoints, setKnowledgePoints] = useState<KnowledgePoint[]>([])
  const [selected, setSelected] = useState<Partial<Question>>({ ...emptyQuestion })
  const [selectedKps, setSelectedKps] = useState<number[]>([])
  const [search, setSearch] = useState('')
  const [refResult, setRefResult] = useState<any[] | null>(null)
  const [saving, setSaving] = useState(false)
  const [isNew, setIsNew] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    const [qRes, psRes, kpRes] = await Promise.all([
      apiFetch<Question[]>('/api/courses'),
      apiFetch<PracticeSet[]>('/api/courses'),
      apiFetch<KnowledgePoint[]>('/api/stats/knowledge-points'),
    ])
    if (psRes.success && psRes.data) {
      const allPs: PracticeSet[] = []
      for (const c of psRes.data as any[]) {
        const detail = await apiFetch<any>(`/api/courses/${c.id}`)
        if (detail.success && detail.data?.practice_sets) {
          allPs.push(...detail.data.practice_sets)
        }
      }
      setPracticeSets(allPs)
    }
    if (kpRes.success && kpRes.data) {
      setKnowledgePoints(kpRes.data as KnowledgePoint[])
    }
  }

  const fetchQuestionsForSet = async (psId: number) => {
    const res = await apiFetch<any>(`/api/courses/practice-sets/${psId}`)
    if (res.success && res.data?.questions) {
      const detailed = []
      for (const q of res.data.questions) {
        const qRes = await apiFetch<Question>(`/api/questions/${q.id}`)
        if (qRes.success && qRes.data) detailed.push(qRes.data)
      }
      setQuestions(detailed)
    }
  }

  const handleSelectQuestion = async (q: Question) => {
    const res = await apiFetch<Question>(`/api/questions/${q.id}`)
    if (res.success && res.data) {
      setSelected(res.data)
      setSelectedKps(res.data.knowledge_points?.map((kp) => kp.id) || [])
      setIsNew(false)
      setRefResult(null)
    }
  }

  const handleNew = () => {
    setSelected({ ...emptyQuestion })
    setSelectedKps([])
    setIsNew(true)
    setRefResult(null)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const body = {
        ...selected,
        reference_result_json: refResult ? JSON.stringify(refResult) : selected.reference_result_json,
        knowledge_point_ids: selectedKps,
      }
      if (isNew) {
        const res = await apiFetch('/api/questions', {
          method: 'POST',
          body: JSON.stringify(body),
        })
        if (res.success) {
          setIsNew(false)
          if (selected.practice_set_id) fetchQuestionsForSet(selected.practice_set_id)
        }
      } else {
        await apiFetch(`/api/questions/${selected.id}`, {
          method: 'PUT',
          body: JSON.stringify(body),
        })
      }
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!selected.id) return
    await apiFetch(`/api/questions/${selected.id}`, { method: 'DELETE' })
    if (selected.practice_set_id) fetchQuestionsForSet(selected.practice_set_id)
    handleNew()
  }

  const handleRunRef = async () => {
    if (!selected.reference_sql || !selected.setup_sql) return
    const res = await apiFetch<any[]>('/api/sql/execute', {
      method: 'POST',
      body: JSON.stringify({ sql: selected.reference_sql, setup_sql: selected.setup_sql }),
    })
    if (res.success && res.data) {
      setRefResult(res.data)
      setSelected({ ...selected, reference_result_json: JSON.stringify(res.data) })
    }
  }

  const filtered = questions.filter(
    (q) => !search || q.title.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="flex h-[calc(100vh-0px)]">
      <div className="w-72 shrink-0 border-r border-border-dark bg-bg-secondary/30 flex flex-col">
        <div className="p-3 border-b border-border-dark">
          <button
            onClick={handleNew}
            className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg bg-accent-cyan/20 text-accent-cyan text-sm font-medium hover:bg-accent-cyan/30 transition-all"
          >
            <Plus className="w-4 h-4" /> 新建题目
          </button>
          <div className="mt-2 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-secondary" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="搜索题目..."
              className="w-full pl-8 pr-3 py-1.5 bg-bg-primary border border-border-dark rounded-md text-sm text-text-primary focus:outline-none focus:border-accent-cyan"
            />
          </div>
          <select
            value={selected.practice_set_id || ''}
            onChange={(e) => {
              const v = Number(e.target.value)
              if (v) fetchQuestionsForSet(v)
            }}
            className="mt-2 w-full px-3 py-1.5 bg-bg-primary border border-border-dark rounded-md text-sm text-text-primary focus:outline-none focus:border-accent-cyan"
          >
            <option value="">选择练习集</option>
            {practiceSets.map((ps) => (
              <option key={ps.id} value={ps.id}>{ps.name}</option>
            ))}
          </select>
        </div>
        <div className="flex-1 overflow-y-auto">
          {filtered.map((q) => (
            <div
              key={q.id}
              onClick={() => handleSelectQuestion(q)}
              className={`px-3 py-2 cursor-pointer border-b border-border-dark/30 text-sm transition-colors ${
                selected.id === q.id
                  ? 'bg-accent-cyan/10 text-accent-cyan'
                  : 'text-text-secondary hover:bg-bg-tertiary/30 hover:text-text-primary'
              }`}
            >
              {q.title}
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-text-secondary mb-1">标题</label>
            <input
              value={selected.title || ''}
              onChange={(e) => setSelected({ ...selected, title: e.target.value })}
              className="w-full px-3 py-2 bg-bg-secondary border border-border-dark rounded-lg text-sm text-text-primary focus:outline-none focus:border-accent-cyan"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-text-secondary mb-1">难度</label>
              <select
                value={selected.difficulty || 'beginner'}
                onChange={(e) => setSelected({ ...selected, difficulty: e.target.value })}
                className="w-full px-3 py-2 bg-bg-secondary border border-border-dark rounded-lg text-sm text-text-primary focus:outline-none focus:border-accent-cyan"
              >
                <option value="beginner">入门</option>
                <option value="intermediate">进阶</option>
                <option value="advanced">高级</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-text-secondary mb-1">练习集</label>
              <select
                value={selected.practice_set_id || ''}
                onChange={(e) => setSelected({ ...selected, practice_set_id: Number(e.target.value) })}
                className="w-full px-3 py-2 bg-bg-secondary border border-border-dark rounded-lg text-sm text-text-primary focus:outline-none focus:border-accent-cyan"
              >
                <option value="">选择练习集</option>
                {practiceSets.map((ps) => (
                  <option key={ps.id} value={ps.id}>{ps.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-xs text-text-secondary mb-1">描述</label>
          <textarea
            value={selected.description || ''}
            onChange={(e) => setSelected({ ...selected, description: e.target.value })}
            rows={3}
            className="w-full px-3 py-2 bg-bg-secondary border border-border-dark rounded-lg text-sm text-text-primary focus:outline-none focus:border-accent-cyan resize-none"
          />
        </div>

        <div>
          <label className="block text-xs text-text-secondary mb-1">提示</label>
          <textarea
            value={selected.hint || ''}
            onChange={(e) => setSelected({ ...selected, hint: e.target.value })}
            rows={2}
            className="w-full px-3 py-2 bg-bg-secondary border border-border-dark rounded-lg text-sm text-text-primary focus:outline-none focus:border-accent-cyan resize-none"
          />
        </div>

        <div>
          <label className="block text-xs text-text-secondary mb-1">知识点</label>
          <div className="flex flex-wrap gap-2">
            {knowledgePoints.map((kp) => (
              <button
                key={kp.id}
                onClick={() =>
                  setSelectedKps((prev) =>
                    prev.includes(kp.id) ? prev.filter((k) => k !== kp.id) : [...prev, kp.id]
                  )
                }
                className={`px-2.5 py-1 rounded text-xs font-medium transition-all ${
                  selectedKps.includes(kp.id)
                    ? 'ring-1 ring-accent-cyan'
                    : ''
                }`}
                style={{ backgroundColor: `${kp.color}20`, color: kp.color }}
              >
                {kp.name}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs text-text-secondary mb-1">参考SQL</label>
          <SqlEditor
            value={selected.reference_sql || ''}
            onChange={(v) => setSelected({ ...selected, reference_sql: v })}
            height="150px"
          />
        </div>

        <div>
          <label className="block text-xs text-text-secondary mb-1">建表SQL (setup_sql)</label>
          <SqlEditor
            value={selected.setup_sql || ''}
            onChange={(v) => setSelected({ ...selected, setup_sql: v })}
            height="120px"
          />
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleRunRef}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-accent-cyan/20 text-accent-cyan text-sm font-medium hover:bg-accent-cyan/30 transition-all"
          >
            <Play className="w-4 h-4" /> 运行参考SQL
          </button>
          {refResult && (
            <span className="text-xs text-success-emerald">
              已获取参考结果 ({refResult.length} 行)
            </span>
          )}
        </div>

        {refResult && refResult.length > 0 && (
          <DataTable
            columns={Object.keys(refResult[0])}
            rows={refResult}
            maxHeight="200px"
          />
        )}

        <div className="flex gap-3 pt-2">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1.5 px-5 py-2 rounded-lg bg-gradient-to-r from-accent-blue to-accent-cyan/80 text-white text-sm font-medium hover:brightness-110 disabled:opacity-50 transition-all"
          >
            <Save className="w-4 h-4" /> {saving ? '保存中...' : '保存'}
          </button>
          {!isNew && selected.id && (
            <button
              onClick={handleDelete}
              className="flex items-center gap-1.5 px-5 py-2 rounded-lg bg-error-pink/20 text-error-pink text-sm font-medium hover:bg-error-pink/30 transition-all"
            >
              <Trash2 className="w-4 h-4" /> 删除
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
