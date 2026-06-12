import { Router, type Response } from 'express'
import { getSystemDb, queryToArray } from '../database.js'
import { authenticateToken, type AuthRequest } from '../middleware/auth.js'

const router = Router()

router.get('/knowledge-points', authenticateToken, (req: AuthRequest, res: Response): void => {
  try {
    const db = getSystemDb()
    const knowledgePoints = queryToArray(db, 'SELECT * FROM knowledge_points')
    const isInstructor = req.user.role === 'instructor'

    const result = knowledgePoints.map(kp => {
      const totalQ = queryToArray(
        db,
        'SELECT COUNT(DISTINCT qkp.question_id) as cnt FROM question_knowledge_points qkp WHERE qkp.knowledge_point_id = ?',
        [kp.id]
      )

      let correctCount = 0
      let totalCount = 0
      let studentCount = 0

      if (isInstructor) {
        const totalSub = queryToArray(
          db,
          `SELECT COUNT(*) as cnt, COUNT(DISTINCT s.user_id) as student_cnt 
           FROM submissions s 
           JOIN question_knowledge_points qkp ON s.question_id = qkp.question_id 
           WHERE qkp.knowledge_point_id = ?`,
          [kp.id]
        )
        const correctSub = queryToArray(
          db,
          `SELECT COUNT(*) as cnt 
           FROM submissions s 
           JOIN question_knowledge_points qkp ON s.question_id = qkp.question_id 
           WHERE qkp.knowledge_point_id = ? AND s.is_correct = 1`,
          [kp.id]
        )
        totalCount = totalSub[0].cnt || 0
        correctCount = correctSub[0].cnt || 0
        studentCount = totalSub[0].student_cnt || 0
      } else {
        const correctQ = queryToArray(
          db,
          `SELECT COUNT(DISTINCT s.question_id) as cnt 
           FROM submissions s 
           JOIN question_knowledge_points qkp ON s.question_id = qkp.question_id 
           WHERE qkp.knowledge_point_id = ? AND s.is_correct = 1 AND s.user_id = ?`,
          [kp.id, req.user.id]
        )
        correctCount = correctQ[0].cnt || 0
        totalCount = totalQ[0].cnt || 0
      }

      const passRate = totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0

      return {
        ...kp,
        total_questions: totalQ[0].cnt,
        correct_questions: isInstructor ? correctCount : correctCount,
        total_submissions: isInstructor ? totalCount : null,
        total_students: isInstructor ? studentCount : null,
        pass_rate: passRate,
      }
    })
    res.json({ success: true, data: result })
  } catch (error) {
    res.status(500).json({ success: false, error: '获取知识点通过率失败' })
  }
})

router.get('/export', authenticateToken, (req: AuthRequest, res: Response): void => {
  try {
    if (req.user.role !== 'instructor') {
      res.status(403).json({ success: false, error: '仅教师可导出数据' })
      return
    }
    const db = getSystemDb()
    const submissions = queryToArray(
      db,
      `SELECT 
         s.id, 
         u.username, 
         q.title as question_title, 
         s.sql_text, 
         s.is_correct, 
         s.score,
         s.instructor_comment,
         s.duration_ms, 
         s.submitted_at 
       FROM submissions s 
       LEFT JOIN users u ON s.user_id = u.id 
       LEFT JOIN questions q ON s.question_id = q.id 
       ORDER BY s.submitted_at DESC`
    )

    const headers = ['学员', '题目', 'SQL语句', '是否正确', '分数', '评语', '耗时(ms)', '提交时间']
    const csvRows = [headers.join(',')]
    for (const s of submissions) {
      const row = [
        s.username || '',
        s.question_title || '',
        s.sql_text || '',
        s.is_correct ? '是' : '否',
        s.score || 0,
        s.instructor_comment || '',
        s.duration_ms || 0,
        s.submitted_at || '',
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
    res.setHeader('Content-Disposition', 'attachment; filename=submissions.csv')
    res.send('\uFEFF' + csvRows.join('\n'))
  } catch (error) {
    res.status(500).json({ success: false, error: '导出失败' })
  }
})

export default router
