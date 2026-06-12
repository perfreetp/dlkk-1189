import { Router, type Response } from 'express'
import bcrypt from 'bcryptjs'
import { getSystemDb, queryToArray, saveSystemDb } from '../database.js'
import { authenticateToken, generateToken, type AuthRequest } from '../middleware/auth.js'

const router = Router()

router.post('/register', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { username, password, role } = req.body
    if (!username || !password || !role) {
      res.status(400).json({ success: false, error: '用户名、密码和角色为必填项' })
      return
    }
    if (!['student', 'instructor'].includes(role)) {
      res.status(400).json({ success: false, error: '角色必须是student或instructor' })
      return
    }

    const db = getSystemDb()
    const existing = queryToArray(db, 'SELECT id FROM users WHERE username = ?', [username])
    if (existing.length > 0) {
      res.status(409).json({ success: false, error: '用户名已存在' })
      return
    }

    const passwordHash = await bcrypt.hash(password, 10)
    db.run('INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)', [username, passwordHash, role])

    const user = queryToArray(db, 'SELECT id, username, role FROM users WHERE username = ?', [username])[0]
    const token = generateToken({ id: user.id, username: user.username, role: user.role })
    saveSystemDb()
    res.status(201).json({ success: true, data: { user, token } })
  } catch (error) {
    res.status(500).json({ success: false, error: '注册失败' })
  }
})

router.post('/login', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { username, password } = req.body
    if (!username || !password) {
      res.status(400).json({ success: false, error: '用户名和密码为必填项' })
      return
    }

    const db = getSystemDb()
    const users = queryToArray(db, 'SELECT id, username, password_hash, role FROM users WHERE username = ?', [username])
    if (users.length === 0) {
      res.status(401).json({ success: false, error: '用户名或密码错误' })
      return
    }

    const user = users[0]
    const valid = await bcrypt.compare(password, user.password_hash)
    if (!valid) {
      res.status(401).json({ success: false, error: '用户名或密码错误' })
      return
    }

    const token = generateToken({ id: user.id, username: user.username, role: user.role })
    res.json({ success: true, data: { user: { id: user.id, username: user.username, role: user.role }, token } })
  } catch (error) {
    res.status(500).json({ success: false, error: '登录失败' })
  }
})

router.get('/me', authenticateToken, (req: AuthRequest, res: Response): void => {
  try {
    const db = getSystemDb()
    const user = queryToArray(db, 'SELECT id, username, role, created_at FROM users WHERE id = ?', [req.user.id])
    if (user.length === 0) {
      res.status(404).json({ success: false, error: '用户不存在' })
      return
    }
    res.json({ success: true, data: user[0] })
  } catch (error) {
    res.status(500).json({ success: false, error: '获取用户信息失败' })
  }
})

export default router
