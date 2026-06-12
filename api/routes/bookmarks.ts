import { Router, type Response } from 'express'
import { getSystemDb, queryToArray } from '../database.js'
import { authenticateToken, type AuthRequest } from '../middleware/auth.js'

const router = Router()

router.get('/', authenticateToken, (req: AuthRequest, res: Response): void => {
  try {
    const db = getSystemDb()
    const bookmarks = queryToArray(db, 'SELECT * FROM bookmarks WHERE user_id = ? ORDER BY created_at DESC', [req.user.id])
    res.json({ success: true, data: bookmarks })
  } catch (error) {
    res.status(500).json({ success: false, error: '获取收藏列表失败' })
  }
})

router.post('/', authenticateToken, (req: AuthRequest, res: Response): void => {
  try {
    const { question_id, sql_text, note, tags } = req.body
    if (!sql_text) {
      res.status(400).json({ success: false, error: 'SQL语句为必填项' })
      return
    }
    const db = getSystemDb()
    const tagsJson = JSON.stringify(tags || [])
    db.run('INSERT INTO bookmarks (user_id, question_id, sql_text, note, tags_json) VALUES (?, ?, ?, ?, ?)', [req.user.id, question_id || null, sql_text, note || null, tagsJson])
    const newBookmark = queryToArray(db, 'SELECT * FROM bookmarks ORDER BY id DESC LIMIT 1')
    res.status(201).json({ success: true, data: newBookmark[0] })
  } catch (error) {
    res.status(500).json({ success: false, error: '创建收藏失败' })
  }
})

router.delete('/:id', authenticateToken, (req: AuthRequest, res: Response): void => {
  try {
    const db = getSystemDb()
    const bookmarks = queryToArray(db, 'SELECT * FROM bookmarks WHERE id = ?', [req.params.id])
    if (bookmarks.length === 0) {
      res.status(404).json({ success: false, error: '收藏不存在' })
      return
    }
    if (bookmarks[0].user_id !== req.user.id) {
      res.status(403).json({ success: false, error: '无权删除此收藏' })
      return
    }
    db.run('DELETE FROM bookmarks WHERE id = ?', [req.params.id])
    res.json({ success: true, data: null })
  } catch (error) {
    res.status(500).json({ success: false, error: '删除收藏失败' })
  }
})

export default router
