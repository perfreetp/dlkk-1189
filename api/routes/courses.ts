import { Router, type Response } from 'express'
import { getSystemDb, queryToArray } from '../database.js'
import { authenticateToken, type AuthRequest } from '../middleware/auth.js'

const router = Router()

router.get('/', (req: AuthRequest, res: Response): void => {
  try {
    const db = getSystemDb()
    const courses = queryToArray(db, 'SELECT * FROM courses ORDER BY sort_order')
    const result = courses.map(c => {
      const sets = queryToArray(db, 'SELECT COUNT(*) as cnt FROM practice_sets WHERE course_id = ?', [c.id])
      return { ...c, practice_set_count: sets[0].cnt }
    })
    res.json({ success: true, data: result })
  } catch (error) {
    res.status(500).json({ success: false, error: '获取课程列表失败' })
  }
})

router.get('/progress', authenticateToken, (req: AuthRequest, res: Response): void => {
  try {
    const db = getSystemDb()
    const progress = queryToArray(
      db,
      'SELECT practice_set_id, completed_count, total_count FROM user_progress WHERE user_id = ?',
      [req.user.id]
    )
    const progressMap: Record<number, { completed_count: number; total_count: number }> = {}
    for (const p of progress) {
      progressMap[p.practice_set_id] = { completed_count: p.completed_count, total_count: p.total_count }
    }

    const submittedQs = queryToArray(
      db,
      `SELECT DISTINCT s.question_id, s.is_correct, q.practice_set_id
       FROM submissions s
       JOIN questions q ON s.question_id = q.id
       WHERE s.user_id = ?`,
      [req.user.id]
    )
    const correctSet: Set<number> = new Set()
    const attemptedSet: Set<number> = new Set()
    for (const sq of submittedQs) {
      attemptedSet.add(sq.question_id)
      if (sq.is_correct) correctSet.add(sq.question_id)
    }

    res.json({
      success: true,
      data: {
        progressMap,
        correctQuestionIds: Array.from(correctSet),
        attemptedQuestionIds: Array.from(attemptedSet),
      },
    })
  } catch (error) {
    res.status(500).json({ success: false, error: '获取进度失败' })
  }
})

router.get('/:id', (req: AuthRequest, res: Response): void => {
  try {
    const db = getSystemDb()
    const courses = queryToArray(db, 'SELECT * FROM courses WHERE id = ?', [req.params.id])
    if (courses.length === 0) {
      res.status(404).json({ success: false, error: '课程不存在' })
      return
    }
    const practiceSets = queryToArray(db, 'SELECT * FROM practice_sets WHERE course_id = ? ORDER BY sort_order', [req.params.id])
    res.json({ success: true, data: { ...courses[0], practice_sets: practiceSets } })
  } catch (error) {
    res.status(500).json({ success: false, error: '获取课程详情失败' })
  }
})

router.get('/practice-sets/:id', (req: AuthRequest, res: Response): void => {
  try {
    const db = getSystemDb()
    const sets = queryToArray(db, 'SELECT * FROM practice_sets WHERE id = ?', [req.params.id])
    if (sets.length === 0) {
      res.status(404).json({ success: false, error: '练习集不存在' })
      return
    }
    const questions = queryToArray(db, 'SELECT id, title, difficulty, sort_order FROM questions WHERE practice_set_id = ? ORDER BY sort_order', [req.params.id])
    res.json({ success: true, data: { ...sets[0], questions } })
  } catch (error) {
    res.status(500).json({ success: false, error: '获取练习集失败' })
  }
})

router.get('/practice-sets/:id/progress', authenticateToken, (req: AuthRequest, res: Response): void => {
  try {
    const db = getSystemDb()
    const progress = queryToArray(db, 'SELECT * FROM user_progress WHERE user_id = ? AND practice_set_id = ?', [req.user.id, req.params.id])
    const questions = queryToArray(db, 'SELECT id FROM questions WHERE practice_set_id = ?', [req.params.id])
    const totalCount = questions.length
    if (progress.length > 0) {
      res.json({ success: true, data: { ...progress[0], total_count: totalCount } })
    } else {
      res.json({ success: true, data: { user_id: req.user.id, practice_set_id: parseInt(req.params.id), completed_count: 0, total_count: totalCount } })
    }
  } catch (error) {
    res.status(500).json({ success: false, error: '获取进度失败' })
  }
})

export default router
