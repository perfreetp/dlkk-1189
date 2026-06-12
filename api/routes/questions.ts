import { Router, type Response } from 'express'
import { getSystemDb, getPracticeDb, queryToArray } from '../database.js'
import { authenticateToken, type AuthRequest } from '../middleware/auth.js'

const router = Router()

router.get('/:id', authenticateToken, (req: AuthRequest, res: Response): void => {
  try {
    const db = getSystemDb()
    const questions = queryToArray(db, 'SELECT * FROM questions WHERE id = ?', [req.params.id])
    if (questions.length === 0) {
      res.status(404).json({ success: false, error: '题目不存在' })
      return
    }
    const question = questions[0]
    const kps = queryToArray(db, 'SELECT kp.* FROM knowledge_points kp JOIN question_knowledge_points qkp ON kp.id = qkp.knowledge_point_id WHERE qkp.question_id = ?', [req.params.id])
    if (req.user.role !== 'instructor') {
      delete question.reference_sql
      delete question.reference_result_json
    }
    res.json({ success: true, data: { ...question, knowledge_points: kps } })
  } catch (error) {
    res.status(500).json({ success: false, error: '获取题目失败' })
  }
})

router.post('/', authenticateToken, (req: AuthRequest, res: Response): void => {
  try {
    if (req.user.role !== 'instructor') {
      res.status(403).json({ success: false, error: '仅教师可创建题目' })
      return
    }
    const { practice_set_id, title, description, hint, reference_sql, reference_result_json, setup_sql, difficulty, sort_order } = req.body
    if (!practice_set_id || !title) {
      res.status(400).json({ success: false, error: '练习集ID和标题为必填项' })
      return
    }
    const db = getSystemDb()
    db.run(
      'INSERT INTO questions (practice_set_id, title, description, hint, reference_sql, reference_result_json, setup_sql, difficulty, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [practice_set_id, title, description, hint, reference_sql, reference_result_json, setup_sql, difficulty || 'beginner', sort_order || 0]
    )
    const newQ = queryToArray(db, 'SELECT * FROM questions ORDER BY id DESC LIMIT 1')
    res.status(201).json({ success: true, data: newQ[0] })
  } catch (error) {
    res.status(500).json({ success: false, error: '创建题目失败' })
  }
})

router.put('/:id', authenticateToken, (req: AuthRequest, res: Response): void => {
  try {
    if (req.user.role !== 'instructor') {
      res.status(403).json({ success: false, error: '仅教师可更新题目' })
      return
    }
    const db = getSystemDb()
    const existing = queryToArray(db, 'SELECT * FROM questions WHERE id = ?', [req.params.id])
    if (existing.length === 0) {
      res.status(404).json({ success: false, error: '题目不存在' })
      return
    }
    const { title, description, hint, reference_sql, reference_result_json, setup_sql, difficulty, sort_order } = req.body
    db.run(
      'UPDATE questions SET title = COALESCE(?, title), description = COALESCE(?, description), hint = COALESCE(?, hint), reference_sql = COALESCE(?, reference_sql), reference_result_json = COALESCE(?, reference_result_json), setup_sql = COALESCE(?, setup_sql), difficulty = COALESCE(?, difficulty), sort_order = COALESCE(?, sort_order) WHERE id = ?',
      [title, description, hint, reference_sql, reference_result_json, setup_sql, difficulty, sort_order, req.params.id]
    )
    const updated = queryToArray(db, 'SELECT * FROM questions WHERE id = ?', [req.params.id])
    res.json({ success: true, data: updated[0] })
  } catch (error) {
    res.status(500).json({ success: false, error: '更新题目失败' })
  }
})

router.delete('/:id', authenticateToken, (req: AuthRequest, res: Response): void => {
  try {
    if (req.user.role !== 'instructor') {
      res.status(403).json({ success: false, error: '仅教师可删除题目' })
      return
    }
    const db = getSystemDb()
    const existing = queryToArray(db, 'SELECT * FROM questions WHERE id = ?', [req.params.id])
    if (existing.length === 0) {
      res.status(404).json({ success: false, error: '题目不存在' })
      return
    }
    db.run('DELETE FROM question_knowledge_points WHERE question_id = ?', [req.params.id])
    db.run('DELETE FROM questions WHERE id = ?', [req.params.id])
    res.json({ success: true, data: null })
  } catch (error) {
    res.status(500).json({ success: false, error: '删除题目失败' })
  }
})

router.get('/:id/schema', authenticateToken, (req: AuthRequest, res: Response): void => {
  try {
    const db = getSystemDb()
    const questions = queryToArray(db, 'SELECT setup_sql FROM questions WHERE id = ?', [req.params.id])
    if (questions.length === 0) {
      res.status(404).json({ success: false, error: '题目不存在' })
      return
    }
    const practiceDb = getPracticeDb(questions[0].setup_sql)
    const tables = queryToArray(practiceDb, "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")
    const schema: any[] = []
    for (const t of tables) {
      const cols = queryToArray(practiceDb, `PRAGMA table_info(${t.name})`)
      schema.push({ table: t.name, columns: cols })
    }
    res.json({ success: true, data: schema })
  } catch (error) {
    res.status(500).json({ success: false, error: '获取表结构失败' })
  }
})

router.get('/:id/sample-data/:tableName', authenticateToken, (req: AuthRequest, res: Response): void => {
  try {
    const db = getSystemDb()
    const questions = queryToArray(db, 'SELECT setup_sql FROM questions WHERE id = ?', [req.params.id])
    if (questions.length === 0) {
      res.status(404).json({ success: false, error: '题目不存在' })
      return
    }
    const practiceDb = getPracticeDb(questions[0].setup_sql)
    const rows = queryToArray(practiceDb, `SELECT * FROM ${req.params.tableName} LIMIT 20`)
    res.json({ success: true, data: rows })
  } catch (error) {
    res.status(500).json({ success: false, error: '获取示例数据失败' })
  }
})

export default router
