import { Router, type Response } from 'express'
import { getSystemDb, queryToArray } from '../database.js'
import { authenticateToken, type AuthRequest } from '../middleware/auth.js'

const router = Router()

router.get('/', authenticateToken, (req: AuthRequest, res: Response): void => {
  try {
    const db = getSystemDb()
    const { is_resolved } = req.query

    let sql = 'SELECT m.*, q.title as question_title FROM mistakes m LEFT JOIN questions q ON m.question_id = q.id WHERE m.user_id = ?'
    const params: any[] = [req.user.id]

    if (is_resolved !== undefined) {
      sql += ' AND m.is_resolved = ?'
      params.push(is_resolved === '1' ? 1 : 0)
    }

    sql += ' ORDER BY m.created_at DESC'
    const results = queryToArray(db, sql, params)
    res.json({ success: true, data: results })
  } catch (error) {
    res.status(500).json({ success: false, error: '获取错题列表失败' })
  }
})

router.delete('/:id', authenticateToken, (req: AuthRequest, res: Response): void => {
  try {
    const db = getSystemDb()
    const mistakes = queryToArray(db, 'SELECT * FROM mistakes WHERE id = ?', [req.params.id])
    if (mistakes.length === 0) {
      res.status(404).json({ success: false, error: '错题记录不存在' })
      return
    }
    if (mistakes[0].user_id !== req.user.id && req.user.role !== 'instructor') {
      res.status(403).json({ success: false, error: '无权删除此错题记录' })
      return
    }
    db.run('DELETE FROM mistakes WHERE id = ?', [req.params.id])
    res.json({ success: true, data: null })
  } catch (error) {
    res.status(500).json({ success: false, error: '删除错题失败' })
  }
})

router.post('/:id/retry', authenticateToken, (req: AuthRequest, res: Response): void => {
  try {
    const db = getSystemDb()
    const mistakes = queryToArray(db, 'SELECT * FROM mistakes WHERE id = ?', [req.params.id])
    if (mistakes.length === 0) {
      res.status(404).json({ success: false, error: '错题记录不存在' })
      return
    }
    if (mistakes[0].user_id !== req.user.id) {
      res.status(403).json({ success: false, error: '无权操作此错题记录' })
      return
    }
    db.run('UPDATE mistakes SET retry_count = retry_count + 1 WHERE id = ?', [req.params.id])
    const updated = queryToArray(db, 'SELECT * FROM mistakes WHERE id = ?', [req.params.id])
    res.json({ success: true, data: updated[0] })
  } catch (error) {
    res.status(500).json({ success: false, error: '重试操作失败' })
  }
})

export default router
