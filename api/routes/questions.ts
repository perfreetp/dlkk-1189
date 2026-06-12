import { Router, type Response } from 'express'
import { getSystemDb, getPracticeDb, queryToArray, saveSystemDb } from '../database.js'
import { authenticateToken, type AuthRequest } from '../middleware/auth.js'

const router = Router()

router.get('/export/csv', authenticateToken, (req: AuthRequest, res: Response): void => {
  try {
    if (req.user.role !== 'instructor') {
      res.status(403).json({ success: false, error: '仅教师可导出' })
      return
    }
    const db = getSystemDb()
    const questions = queryToArray(db, 'SELECT * FROM questions ORDER BY practice_set_id, sort_order')
    const headers = ['练习集ID', '标题', '描述', '提示', '参考SQL', '参考结果JSON', '建表SQL', '难度', '排序', '知识点IDs']
    const csvRows = [headers.join(',')]
    for (const q of questions) {
      const kps = queryToArray(
        db,
        'SELECT knowledge_point_id FROM question_knowledge_points WHERE question_id = ?',
        [q.id]
      )
      const kpIds = kps.map((k: any) => k.knowledge_point_id).join(';')
      const row = [
        q.practice_set_id || '',
        q.title || '',
        q.description || '',
        q.hint || '',
        q.reference_sql || '',
        q.reference_result_json || '',
        q.setup_sql || '',
        q.difficulty || 'beginner',
        q.sort_order || 0,
        kpIds,
      ]
      const escaped = row.map(val => {
        const str = String(val)
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
          return `"${str.replace(/"/g, '""')}"`
        }
        return str
      })
      csvRows.push(escaped.join(','))
    }
    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', 'attachment; filename=questions.csv')
    res.send('\uFEFF' + csvRows.join('\n'))
  } catch (error) {
    res.status(500).json({ success: false, error: '导出题目失败' })
  }
})

router.post('/import/csv', authenticateToken, (req: AuthRequest, res: Response): void => {
  try {
    if (req.user.role !== 'instructor') {
      res.status(403).json({ success: false, error: '仅教师可导入' })
      return
    }
    const { rows } = req.body
    if (!Array.isArray(rows) || rows.length === 0) {
      res.status(400).json({ success: false, error: '无有效数据' })
      return
    }
    const db = getSystemDb()
    let imported = 0
    for (const row of rows) {
      const practice_set_id = Number(row['练习集ID'] || row.practice_set_id)
      const title = row['标题'] || row.title
      if (!practice_set_id || !title) continue
      const description = row['描述'] || row.description || ''
      const hint = row['提示'] || row.hint || ''
      const reference_sql = row['参考SQL'] || row.reference_sql || ''
      const reference_result_json = row['参考结果JSON'] || row.reference_result_json || '[]'
      const setup_sql = row['建表SQL'] || row.setup_sql || ''
      const difficulty = row['难度'] || row.difficulty || 'beginner'
      const sort_order = Number(row['排序'] || row.sort_order || 0)
      const kpIdsStr = row['知识点IDs'] || row.knowledge_point_ids || ''

      db.run(
        'INSERT INTO questions (practice_set_id, title, description, hint, reference_sql, reference_result_json, setup_sql, difficulty, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [practice_set_id, title, description, hint, reference_sql, reference_result_json, setup_sql, difficulty, sort_order]
      )
      const newQ = queryToArray(db, 'SELECT * FROM questions ORDER BY id DESC LIMIT 1')
      if (newQ.length > 0 && kpIdsStr) {
        const kpIds = String(kpIdsStr).split(';').map(Number).filter(n => !isNaN(n) && n > 0)
        for (const kpId of kpIds) {
          const existing = queryToArray(
            db,
            'SELECT * FROM question_knowledge_points WHERE question_id = ? AND knowledge_point_id = ?',
            [newQ[0].id, kpId]
          )
          if (existing.length === 0) {
            db.run('INSERT INTO question_knowledge_points (question_id, knowledge_point_id) VALUES (?, ?)', [newQ[0].id, kpId])
          }
        }
      }
      imported++
    }
    saveSystemDb()
    res.json({ success: true, data: { imported } })
  } catch (error) {
    res.status(500).json({ success: false, error: '导入题目失败' })
  }
})

router.get('/:id', authenticateToken, (req: AuthRequest, res: Response): void => {
  try {
    const db = getSystemDb()
    const questions = queryToArray(db, 'SELECT * FROM questions WHERE id = ?', [req.params.id])
    if (questions.length === 0) {
      res.status(404).json({ success: false, error: '题目不存在' })
      return
    }
    const question = questions[0]
    const kps = queryToArray(
      db,
      'SELECT kp.* FROM knowledge_points kp JOIN question_knowledge_points qkp ON kp.id = qkp.knowledge_point_id WHERE qkp.question_id = ?',
      [req.params.id]
    )
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
    const {
      practice_set_id, title, description, hint, reference_sql, reference_result_json, setup_sql, difficulty, sort_order, knowledge_point_ids } = req.body
    if (!practice_set_id || !title) {
      res.status(400).json({ success: false, error: '练习集ID和标题为必填项' })
      return
    }
    const db = getSystemDb()
    db.run(
      'INSERT INTO questions (practice_set_id, title, description, hint, reference_sql, reference_result_json, setup_sql, difficulty, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        practice_set_id,
        title,
        description || null,
        hint || null,
        reference_sql || null,
        reference_result_json || null,
        setup_sql || null,
        difficulty || 'beginner',
        sort_order || 0,
      ]
    )
    const newQ = queryToArray(db, 'SELECT * FROM questions ORDER BY id DESC LIMIT 1')
    const questionId = newQ[0].id

    if (knowledge_point_ids && Array.isArray(knowledge_point_ids)) {
      for (const kpId of knowledge_point_ids) {
        const existing = queryToArray(
          db,
          'SELECT * FROM question_knowledge_points WHERE question_id = ? AND knowledge_point_id = ?',
          [questionId, kpId]
        )
        if (existing.length === 0) {
          db.run(
            'INSERT INTO question_knowledge_points (question_id, knowledge_point_id) VALUES (?, ?)',
            [questionId, kpId]
          )
        }
      }
    }

    withKnowledgePoints(db, newQ[0])

    saveSystemDb()
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
    const { title, description, hint, reference_sql, reference_result_json, setup_sql, difficulty, sort_order, knowledge_point_ids } = req.body

    db.run(
      'UPDATE questions SET title = COALESCE(?, title), description = COALESCE(?, description), hint = COALESCE(?, hint), reference_sql = COALESCE(?, reference_sql), reference_result_json = COALESCE(?, reference_result_json), setup_sql = COALESCE(?, setup_sql), difficulty = COALESCE(?, difficulty), sort_order = COALESCE(?, sort_order) WHERE id = ?',
      [title, description, hint, reference_sql, reference_result_json, setup_sql, difficulty, sort_order, req.params.id]
    )

    if (knowledge_point_ids !== undefined && Array.isArray(knowledge_point_ids)) {
      db.run('DELETE FROM question_knowledge_points WHERE question_id = ?', [req.params.id])
      for (const kpId of knowledge_point_ids) {
        db.run(
          'INSERT INTO question_knowledge_points (question_id, knowledge_point_id) VALUES (?, ?)',
          [req.params.id, kpId]
        )
      }
    }

    const updated = queryToArray(db, 'SELECT * FROM questions WHERE id = ?', [req.params.id])
    withKnowledgePoints(db, updated[0])
    saveSystemDb()
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
    saveSystemDb()
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
    const rows = queryToArray(practiceDb, `SELECT * FROM "${req.params.tableName}" LIMIT 20`)
    res.json({ success: true, data: rows })
  } catch (error) {
    res.status(500).json({ success: false, error: '获取示例数据失败' })
  }
})

function withKnowledgePoints(db: any, question: any): void {
  const kps = queryToArray(
    db,
    'SELECT kp.* FROM knowledge_points kp JOIN question_knowledge_points qkp ON kp.id = qkp.knowledge_point_id WHERE qkp.question_id = ?',
    [question.id]
  )
  question.knowledge_points = kps
}

export default router
