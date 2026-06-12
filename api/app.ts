import express, {
  type Request,
  type Response,
  type NextFunction,
} from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { initDatabase } from './database.js'
import authRoutes from './routes/auth.js'
import courseRoutes from './routes/courses.js'
import questionRoutes from './routes/questions.js'
import sqlRoutes from './routes/sql.js'
import submissionRoutes from './routes/submissions.js'
import mistakeRoutes from './routes/mistakes.js'
import bookmarkRoutes from './routes/bookmarks.js'
import statsRoutes from './routes/stats.js'

dotenv.config()

const app: express.Application = express()

app.use(cors())
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

let initialized = false
app.use((req: Request, res: Response, next: NextFunction) => {
  if (initialized) { next(); return }
  initDatabase().then(() => { initialized = true; next() }).catch(next)
})

app.use('/api/auth', authRoutes)
app.use('/api/courses', courseRoutes)
app.use('/api/questions', questionRoutes)
app.use('/api/sql', sqlRoutes)
app.use('/api/submissions', submissionRoutes)
app.use('/api/mistakes', mistakeRoutes)
app.use('/api/bookmarks', bookmarkRoutes)
app.use('/api/stats', statsRoutes)

app.use('/api/health', (req: Request, res: Response, next: NextFunction): void => {
  res.status(200).json({ success: true, message: 'ok' })
})

app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
  res.status(500).json({ success: false, error: 'Server internal error' })
})

app.use((req: Request, res: Response) => {
  res.status(404).json({ success: false, error: 'API not found' })
})

export default app
