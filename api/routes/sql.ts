import { Router, type Response } from 'express'
import { getSystemDb, getPracticeDb, queryToArray, saveSystemDb } from '../database.js'
import { authenticateToken, type AuthRequest } from '../middleware/auth.js'

const router = Router()

router.post('/execute', authenticateToken, (req: AuthRequest, res: Response): void => {
  try {
    const { sql, setup_sql } = req.body
    if (!sql) {
      res.status(400).json({ success: false, error: 'SQL语句为必填项' })
      return
    }
    const practiceDb = getPracticeDb(setup_sql)
    const results = queryToArray(practiceDb, sql)
    res.json({ success: true, data: results })
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message || 'SQL执行失败' })
  }
})

router.post('/submit', authenticateToken, (req: AuthRequest, res: Response): void => {
  try {
    const { question_id, sql_text, duration_ms } = req.body
    if (!question_id || !sql_text) {
      res.status(400).json({ success: false, error: '题目ID和SQL语句为必填项' })
      return
    }

    const db = getSystemDb()
    const questions = queryToArray(db, 'SELECT * FROM questions WHERE id = ?', [question_id])
    if (questions.length === 0) {
      res.status(404).json({ success: false, error: '题目不存在' })
      return
    }

    const question = questions[0]
    const practiceDb = getPracticeDb(question.setup_sql)

    let userResults: any[] = []
    let execError: string | null = null
    try {
      userResults = queryToArray(practiceDb, sql_text)
    } catch (error: any) {
      execError = error.message || 'SQL执行失败'
    }

    if (execError) {
      const stmt = db.prepare(
        'INSERT INTO submissions (user_id, question_id, sql_text, result_json, is_correct, duration_ms) VALUES (?, ?, ?, ?, ?, ?)'
      )
      stmt.bind([req.user.id, question_id, sql_text, null, 0, duration_ms || 0])
      stmt.step()
      stmt.free()

      const existingMistakes = queryToArray(
        db,
        'SELECT * FROM mistakes WHERE user_id = ? AND question_id = ? AND is_resolved = 0',
        [req.user.id, question_id]
      )
      if (existingMistakes.length === 0) {
        db.run(
          'INSERT INTO mistakes (user_id, question_id, error_type) VALUES (?, ?, ?)',
          [req.user.id, question_id, 'syntax_error']
        )
      }

      saveSystemDb()
      res.json({ success: true, data: { is_correct: false, error: execError, results: [] } })
      return
    }

    const referenceResult = JSON.parse(question.reference_result_json || '[]')

    const normalizeRow = (row: any): any => {
      const normalized: any = {}
      for (const key of Object.keys(row)) {
        normalized[key.toLowerCase()] = row[key]
      }
      return normalized
    }

    const normalizedUser = userResults.map(normalizeRow).map(r => JSON.stringify(r)).sort().join('|')
    const normalizedRef = referenceResult.map(normalizeRow).map(r => JSON.stringify(r)).sort().join('|')
    const isCorrect = normalizedUser === normalizedRef

    const resultJson = JSON.stringify(userResults)
    db.run(
      'INSERT INTO submissions (user_id, question_id, sql_text, result_json, is_correct, duration_ms) VALUES (?, ?, ?, ?, ?, ?)',
      [req.user.id, question_id, sql_text, resultJson, isCorrect ? 1 : 0, duration_ms || 0]
    )

    if (!isCorrect) {
      const existingMistakes = queryToArray(
        db,
        'SELECT * FROM mistakes WHERE user_id = ? AND question_id = ? AND is_resolved = 0',
        [req.user.id, question_id]
      )
      if (existingMistakes.length === 0) {
        db.run(
          'INSERT INTO mistakes (user_id, question_id, error_type) VALUES (?, ?, ?)',
          [req.user.id, question_id, 'wrong_result']
        )
      } else {
        db.run(
          'UPDATE mistakes SET retry_count = retry_count + 1 WHERE id = ?',
          [existingMistakes[0].id]
        )
      }
    } else {
      db.run(
        'UPDATE mistakes SET is_resolved = 1 WHERE user_id = ? AND question_id = ? AND is_resolved = 0',
        [req.user.id, question_id]
      )
    }

    const totalQ = queryToArray(
      db,
      'SELECT COUNT(*) as cnt FROM questions WHERE practice_set_id = ?',
      [question.practice_set_id]
    )

    const correctCountRows = queryToArray(
      db,
      `SELECT COUNT(DISTINCT question_id) as cnt 
       FROM submissions 
       WHERE user_id = ? 
         AND question_id IN (SELECT id FROM questions WHERE practice_set_id = ?) 
         AND is_correct = 1`,
      [req.user.id, question.practice_set_id]
    )

    const completed = correctCountRows[0]?.cnt || 0
    const total = totalQ[0]?.cnt || 0

    const existingProgress = queryToArray(
      db,
      'SELECT * FROM user_progress WHERE user_id = ? AND practice_set_id = ?',
      [req.user.id, question.practice_set_id]
    )

    if (existingProgress.length > 0) {
      db.run(
        'UPDATE user_progress SET completed_count = ?, total_count = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ? AND practice_set_id = ?',
        [completed, total, req.user.id, question.practice_set_id]
      )
    } else {
      db.run(
        'INSERT INTO user_progress (user_id, practice_set_id, completed_count, total_count) VALUES (?, ?, ?, ?)',
        [req.user.id, question.practice_set_id, completed, total]
      )
    }

    saveSystemDb()
    res.json({ success: true, data: { is_correct: isCorrect, results: userResults, reference_result: referenceResult, completed_count: completed, total_count: total } })
  } catch (error: any) {
    console.error('Submit error:', error)
    res.status(500).json({ success: false, error: '提交失败：' + (error.message || '未知错误') })
  }
})

export default router
