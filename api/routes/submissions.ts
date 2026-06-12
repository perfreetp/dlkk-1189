import { Router, type Response } from 'express'
import { getSystemDb, queryToArray, saveSystemDb } from '../database.js'
import { authenticateToken, type AuthRequest } from '../middleware/auth.js'

const router = Router()

router.get('/', authenticateToken, (req: AuthRequest, res: Response): void => {
  try {
    const db = getSystemDb()
    const { user_id, question_id, start_date, end_date } = req.query

    let sql = 'SELECT s.*, q.title as question_title FROM submissions s LEFT JOIN questions q ON s.question_id = q.id WHERE 1=1'
    const params: any[] = []

    if (user_id) {
      sql += ' AND s.user_id = ?'
      params.push(user_id)
    }
    if (question_id) {
      sql += ' AND s.question_id = ?'
      params.push(question_id)
    }
    if (start_date) {
      sql += ' AND s.submitted_at >= ?'
      params.push(start_date)
    }
    if (end_date) {
      sql += ' AND s.submitted_at <= ?'
      params.push(end_date)
    }

    if (req.user.role !== 'instructor') {
      sql += ' AND s.user_id = ?'
      params.push(req.user.id)
    }

    sql += ' ORDER BY s.submitted_at DESC'
    const results = queryToArray(db, sql, params)
    res.json({ success: true, data: results })
  } catch (error) {
    res.status(500).json({ success: false, error: '获取提交记录失败' })
  }
})

router.get('/:id', authenticateToken, (req: AuthRequest, res: Response): void => {
  try {
    const db = getSystemDb()
    const submissions = queryToArray(db, 'SELECT s.*, q.title as question_title FROM submissions s LEFT JOIN questions q ON s.question_id = q.id WHERE s.id = ?', [req.params.id])
    if (submissions.length === 0) {
      res.status(404).json({ success: false, error: '提交记录不存在' })
      return
    }
    const sub = submissions[0]
    if (req.user.role !== 'instructor' && sub.user_id !== req.user.id) {
      res.status(403).json({ success: false, error: '无权查看此提交记录' })
      return
    }
    res.json({ success: true, data: sub })
  } catch (error) {
    res.status(500).json({ success: false, error: '获取提交记录详情失败' })
  }
})

router.post('/batch-review', authenticateToken, (req: AuthRequest, res: Response): void => {
  try {
    if (req.user.role !== 'instructor') {
      res.status(403).json({ success: false, error: '仅教师可批量批改' })
      return
    }
    const { reviews } = req.body as { reviews: Array<{ id: number; score: number; instructor_comment: string }> }
    if (!reviews || !Array.isArray(reviews)) {
      res.status(400).json({ success: false, error: 'reviews数组为必填项' })
      return
    }

    const db = getSystemDb()
    for (const review of reviews) {
      db.run('UPDATE submissions SET score = ?, instructor_comment = ? WHERE id = ?', [review.score, review.instructor_comment, review.id])
    }
    saveSystemDb()
    res.json({ success: true, data: { updated: reviews.length } })
  } catch (error) {
    res.status(500).json({ success: false, error: '批量批改失败' })
  }
})

export default router
