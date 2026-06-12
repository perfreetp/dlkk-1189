import { type Request, type Response, type NextFunction } from 'express'
import jwt from 'jsonwebtoken'

const JWT_SECRET = 'sql-practice-local-secret-key'

export interface AuthUser {
  id: number
  username: string
  role: string
}

export interface AuthRequest extends Request {
  user: AuthUser
}

export function authenticateToken(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : null

  if (!token) {
    res.status(401).json({ success: false, error: '未提供认证令牌' })
    return
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthUser
    ;(req as AuthRequest).user = decoded
    next()
  } catch {
    res.status(403).json({ success: false, error: '令牌无效或已过期' })
  }
}

export function generateToken(user: AuthUser): string {
  return jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '7d' })
}
