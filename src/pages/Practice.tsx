import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { useAppStore } from '@/stores/app'
import { useAuthStore } from '@/stores/auth'
import { apiFetch } from '@/stores/auth'
import SqlEditor from '@/components/SqlEditor'
import DataTable from '@/components/DataTable'
import {
  ChevronLeft,
  ChevronRight,
  Play,
  Send,
  Trash2,
  Bookmark,
  BookmarkCheck,
  Lightbulb,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
} from 'lucide-react'

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

type RightTab = 'result' | 'schema' | 'sample' | 'answer'

export default function Practice() {
  const { questionId } = useParams()
  const [searchParams] = useSearchParams()
  const practiceSetId = searchParams.get('set')
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const {
    currentQuestion,
    currentPracticeSet,
    schema,
    sampleData,
    executeResult,
    executeError,
    executeTime,
    submissionResult,
    loading,
    fetchPracticeSet,
    fetchQuestion,
    fetchSchema,
    fetchSampleData,
    executeSql,
    submitSql,
    clearResults,
  } = useAppStore()

  const [sql, setSql] = useState('')
  const [rightTab, setRightTab] = useState<RightTab>('result')
  const [hintVisible, setHintVisible] = useState(false)
  const [isBookmarked, setIsBookmarked] = useState(false)
  const [bookmarkId, setBookmarkId] = useState<number | null>(null)
  const startTimeRef = useRef(Date.now())

  useEffect(() => {
    if (practiceSetId) {
      fetchPracticeSet(Number(practiceSetId))
    }
  }, [practiceSetId])

  useEffect(() => {
    if (questionId) {
      fetchQuestion(Number(questionId))
      setSql('')
      setHintVisible(false)
      setRightTab('result')
      startTimeRef.current = Date.now()
      checkBookmark(Number(questionId))
    }
  }, [questionId])

  useEffect(() => {
    if (currentQuestion) {
      fetchSchema(currentQuestion.id)
    }
  }, [currentQuestion?.id])

  useEffect(() => {
    if (schema.length > 0 && rightTab === 'sample') {
      schema.forEach((s) => {
        if (!sampleData[s.table]) {
          fetchSampleData(currentQuestion!.id, s.table)
        }
      })
    }
  }, [schema, rightTab])

  const checkBookmark = async (qId: number) => {
    try {
      const res = await apiFetch<any[]>('/api/bookmarks')
      if (res.success && res.data) {
        const found = res.data.find((b: any) => b.question_id === qId)
        setIsBookmarked(!!found)
        setBookmarkId(found?.id || null)
      }
    } catch {}
  }

  const handleExecute = useCallback(() => {
    if (!currentQuestion || !sql.trim()) return
    executeSql(sql, currentQuestion.setup_sql)
    setRightTab('result')
  }, [sql, currentQuestion])

  const handleSubmit = useCallback(async () => {
    if (!currentQuestion || !sql.trim()) return
    const duration = Date.now() - startTimeRef.current
    await submitSql(currentQuestion.id, sql, duration)
    setRightTab('result')
  }, [sql, currentQuestion])

  const handleClear = () => {
    setSql('')
    clearResults()
  }

  const handleBookmark = async () => {
    if (!currentQuestion) return
    if (isBookmarked && bookmarkId) {
      await apiFetch(`/api/bookmarks/${bookmarkId}`, { method: 'DELETE' })
      setIsBookmarked(false)
      setBookmarkId(null)
    } else {
      const res = await apiFetch<{ id: number }>('/api/bookmarks', {
        method: 'POST',
        body: JSON.stringify({ question_id: currentQuestion.id, sql_text: sql }),
      })
      if (res.success && res.data) {
        setIsBookmarked(true)
        setBookmarkId((res.data as { id: number }).id)
      }
    }
  }

  const navigateQuestion = (direction: 'prev' | 'next') => {
    if (!currentPracticeSet || !currentQuestion) return
    const questions = currentPracticeSet.questions
    const idx = questions.findIndex((q) => q.id === currentQuestion.id)
    const newIdx = direction === 'prev' ? idx - 1 : idx + 1
    if (newIdx >= 0 && newIdx < questions.length) {
      navigate(`/practice/${questions[newIdx].id}?set=${practiceSetId}`)
    }
  }

  const currentQuestionIndex = currentPracticeSet?.questions?.findIndex(
    (q) => q.id === currentQuestion?.id
  )
  const totalQuestions = currentPracticeSet?.questions?.length || 0

  const resultColumns = executeResult && executeResult.length > 0
    ? Object.keys(executeResult[0])
    : []

  const isInstructor = user?.role === 'instructor'
  const showAnswer = isInstructor || submissionResult?.is_correct

  return (
    <div className="h-screen flex flex-col">
      <div className="h-10 bg-bg-secondary border-b border-border-dark flex items-center px-4 text-sm shrink-0">
        <button onClick={() => navigate('/courses')} className="text-text-secondary hover:text-accent-cyan transition-colors">
          课程
        </button>
        <span className="mx-2 text-text-secondary">/</span>
        <span className="text-text-secondary">
          {currentPracticeSet?.name || '练习集'}
        </span>
        <span className="mx-2 text-text-secondary">/</span>
        <span className="text-text-primary">
          {currentQuestion?.title || '题目'}
        </span>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="w-[280px] shrink-0 border-r border-border-dark bg-bg-secondary/30 overflow-y-auto p-4">
          {currentQuestion && (
            <div className="space-y-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${difficultyColors[currentQuestion.difficulty] || ''}`}>
                    {difficultyLabels[currentQuestion.difficulty] || currentQuestion.difficulty}
                  </span>
                  <span className="text-xs text-text-secondary">
                    {currentQuestionIndex !== undefined && totalQuestions > 0
                      ? `${currentQuestionIndex + 1} / ${totalQuestions}`
                      : ''}
                  </span>
                </div>
                <h3 className="text-base font-semibold text-text-primary">
                  {currentQuestion.title}
                </h3>
              </div>

              <div className="text-sm text-text-secondary leading-relaxed whitespace-pre-wrap">
                {currentQuestion.description}
              </div>

              {currentQuestion.hint && (
                <div>
                  <button
                    onClick={() => setHintVisible(!hintVisible)}
                    className="flex items-center gap-1.5 text-sm text-warning-amber hover:text-warning-amber/80 transition-colors"
                  >
                    <Lightbulb className="w-4 h-4" />
                    {hintVisible ? '隐藏提示' : '显示提示'}
                  </button>
                  {hintVisible && (
                    <div className="mt-2 p-3 bg-warning-amber/5 border border-warning-amber/20 rounded-lg text-sm text-text-primary animate-fade-in-up">
                      {currentQuestion.hint}
                    </div>
                  )}
                </div>
              )}

              {currentQuestion.knowledge_points && currentQuestion.knowledge_points.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {currentQuestion.knowledge_points.map((kp) => (
                    <span
                      key={kp.id}
                      className="px-2 py-0.5 rounded text-xs font-medium"
                      style={{ backgroundColor: `${kp.color}20`, color: kp.color }}
                    >
                      {kp.name}
                    </span>
                  ))}
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => navigateQuestion('prev')}
                  disabled={currentQuestionIndex === 0}
                  className="flex-1 flex items-center justify-center gap-1 py-2 rounded-lg text-sm bg-bg-tertiary text-text-secondary hover:text-text-primary disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                  <ChevronLeft className="w-4 h-4" /> 上一题
                </button>
                <button
                  onClick={() => navigateQuestion('next')}
                  disabled={currentQuestionIndex === totalQuestions - 1}
                  className="flex-1 flex items-center justify-center gap-1 py-2 rounded-lg text-sm bg-bg-tertiary text-text-secondary hover:text-text-primary disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                  下一题 <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-hidden p-3">
            <SqlEditor
              value={sql}
              onChange={setSql}
              onExecute={handleExecute}
              height="100%"
              tables={schema.map((s) => s.table)}
            />
          </div>

          {executeError && (
            <div className="mx-3 mb-2 animate-shake px-4 py-2.5 bg-error-pink/10 border border-error-pink/30 rounded-lg text-error-pink text-sm font-mono">
              {executeError}
            </div>
          )}

          {submissionResult?.is_correct && (
            <div className="mx-3 mb-2 animate-scale-in flex items-center gap-2 px-4 py-2.5 bg-success-emerald/10 border border-success-emerald/30 rounded-lg text-success-emerald text-sm">
              <CheckCircle2 className="w-5 h-5" />
              回答正确！
            </div>
          )}

          {submissionResult && !submissionResult.is_correct && !executeError && (
            <div className="mx-3 mb-2 animate-shake flex items-center gap-2 px-4 py-2.5 bg-error-pink/10 border border-error-pink/30 rounded-lg text-error-pink text-sm">
              <XCircle className="w-5 h-5" />
              回答错误，请重试
            </div>
          )}

          <div className="h-11 bg-bg-secondary border-t border-border-dark flex items-center px-3 gap-2 shrink-0">
            <button
              onClick={handleExecute}
              disabled={loading || !sql.trim()}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-accent-cyan/20 text-accent-cyan text-sm font-medium hover:bg-accent-cyan/30 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
              执行
              <kbd className="ml-1 px-1 py-0.5 bg-bg-primary rounded text-[10px] text-text-secondary">Ctrl+Enter</kbd>
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading || !sql.trim()}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-success-emerald/20 text-success-emerald text-sm font-medium hover:bg-success-emerald/30 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              <Send className="w-4 h-4" />
              提交
            </button>
            <button
              onClick={handleClear}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-bg-tertiary text-text-secondary text-sm hover:text-text-primary transition-all"
            >
              <Trash2 className="w-4 h-4" />
              清空
            </button>
            <div className="flex-1" />
            {executeTime !== null && (
              <div className="flex items-center gap-1 text-xs text-text-secondary">
                <Clock className="w-3 h-3" />
                {executeTime}ms
              </div>
            )}
            <button
              onClick={handleBookmark}
              className={`p-1.5 rounded-lg transition-all ${
                isBookmarked ? 'text-warning-amber' : 'text-text-secondary hover:text-warning-amber'
              }`}
              title={isBookmarked ? '取消收藏' : '收藏'}
            >
              {isBookmarked ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <div className="w-[360px] shrink-0 border-l border-border-dark bg-bg-secondary/30 flex flex-col overflow-hidden">
          <div className="flex border-b border-border-dark shrink-0">
            {([
              { key: 'result', label: '结果' },
              { key: 'schema', label: '表结构' },
              { key: 'sample', label: '示例数据' },
              { key: 'answer', label: '标准答案' },
            ] as const).map((tab) => (
              <button
                key={tab.key}
                onClick={() => setRightTab(tab.key)}
                className={`flex-1 py-2.5 text-xs font-medium transition-colors ${
                  rightTab === tab.key
                    ? 'text-accent-cyan border-b-2 border-accent-cyan'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {rightTab === 'result' && (
              <div>
                {executeResult && executeResult.length > 0 ? (
                  <DataTable columns={resultColumns} rows={executeResult} maxHeight="calc(100vh - 200px)" />
                ) : executeError ? (
                  <div className="text-center py-8 text-error-pink text-sm">执行出错</div>
                ) : (
                  <div className="text-center py-8 text-text-secondary text-sm">
                    点击"执行"运行SQL语句
                  </div>
                )}
              </div>
            )}

            {rightTab === 'schema' && (
              <div className="space-y-4">
                {schema.map((s) => (
                  <div key={s.table}>
                    <h4 className="text-sm font-medium text-accent-cyan mb-2">{s.table}</h4>
                    <div className="bg-bg-primary rounded-lg border border-border-dark overflow-hidden">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="bg-bg-tertiary">
                            <th className="px-3 py-1.5 text-left text-text-secondary">列名</th>
                            <th className="px-3 py-1.5 text-left text-text-secondary">类型</th>
                            <th className="px-3 py-1.5 text-left text-text-secondary">主键</th>
                          </tr>
                        </thead>
                        <tbody>
                          {s.columns.map((col: any) => (
                            <tr key={col.name} className="border-t border-border-dark/50">
                              <td className="px-3 py-1.5 text-text-primary font-mono">{col.name}</td>
                              <td className="px-3 py-1.5 text-text-secondary">{col.type}</td>
                              <td className="px-3 py-1.5">{col.pk ? <span className="text-warning-amber">PK</span> : ''}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
                {schema.length === 0 && (
                  <div className="text-center py-8 text-text-secondary text-sm">加载中...</div>
                )}
              </div>
            )}

            {rightTab === 'sample' && (
              <div className="space-y-4">
                {schema.map((s) => {
                  const data = sampleData[s.table]
                  const cols = data && data.length > 0 ? Object.keys(data[0]) : []
                  return (
                    <div key={s.table}>
                      <h4 className="text-sm font-medium text-accent-cyan mb-2">{s.table}</h4>
                      {data && data.length > 0 ? (
                        <DataTable columns={cols} rows={data} maxHeight="200px" />
                      ) : (
                        <div className="text-xs text-text-secondary py-2">加载中...</div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}

            {rightTab === 'answer' && (
              <div>
                {showAnswer && currentQuestion?.reference_sql ? (
                  <div>
                    <div className="mb-2 text-xs text-text-secondary">参考SQL</div>
                    <pre className="p-4 bg-bg-primary rounded-lg border border-border-dark text-sm text-text-primary font-mono whitespace-pre-wrap">
                      {currentQuestion.reference_sql}
                    </pre>
                    {submissionResult?.reference_result && (
                      <div className="mt-4">
                        <div className="mb-2 text-xs text-text-secondary">参考结果</div>
                        <DataTable
                          columns={Object.keys(submissionResult.reference_result[0] || {})}
                          rows={submissionResult.reference_result}
                          maxHeight="300px"
                        />
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8 text-text-secondary text-sm">
                    提交正确答案后可查看参考SQL
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
