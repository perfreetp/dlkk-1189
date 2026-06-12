import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/auth'
import { Database } from 'lucide-react'

const SQL_KEYWORDS = 'SELECT FROM WHERE INSERT INTO UPDATE DELETE CREATE TABLE JOIN ON GROUP BY ORDER HAVING AND OR NOT NULL INNER LEFT RIGHT OUTER AS COUNT SUM AVG MAX MIN DISTINCT LIMIT'.split(' ')

function CodeRain() {
  const columns = useMemo(() => {
    return Array.from({ length: 20 }, (_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      duration: `${8 + Math.random() * 12}s`,
      delay: `${Math.random() * 10}s`,
      text: Array.from({ length: 20 }, () => SQL_KEYWORDS[Math.floor(Math.random() * SQL_KEYWORDS.length)]).join('\n'),
    }))
  }, [])

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {columns.map((col) => (
        <div
          key={col.id}
          className="code-rain-column"
          style={{
            left: col.left,
            animationDuration: col.duration,
            animationDelay: col.delay,
          }}
        >
          {col.text}
        </div>
      ))}
    </div>
  )
}

export default function Login() {
  const [tab, setTab] = useState<'login' | 'register'>('login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState('student')
  const { login, register, loading, error, clearError } = useAuthStore()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (tab === 'login') {
      await login(username, password)
    } else {
      await register(username, password, role)
    }
    if (useAuthStore.getState().isAuthenticated) {
      navigate('/courses')
    }
  }

  const switchTab = (t: 'login' | 'register') => {
    setTab(t)
    clearError()
  }

  return (
    <div className="min-h-screen bg-bg-primary flex items-center justify-center relative overflow-hidden">
      <CodeRain />
      <div className="relative z-10 w-full max-w-md animate-scale-in">
        <div className="bg-bg-secondary border border-border-dark rounded-xl p-8 glow-cyan">
          <div className="flex items-center justify-center mb-6">
            <Database className="w-10 h-10 text-accent-cyan mr-3" />
            <h1 className="font-display text-3xl font-bold text-text-primary">SQL练功房</h1>
          </div>

          <div className="flex mb-6 bg-bg-primary rounded-lg p-1">
            <button
              onClick={() => switchTab('login')}
              className={`flex-1 py-2 rounded-md text-sm font-medium transition-all ${
                tab === 'login'
                  ? 'bg-accent-cyan/20 text-accent-cyan'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              登录
            </button>
            <button
              onClick={() => switchTab('register')}
              className={`flex-1 py-2 rounded-md text-sm font-medium transition-all ${
                tab === 'register'
                  ? 'bg-accent-cyan/20 text-accent-cyan'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              注册
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm text-text-secondary mb-1.5">用户名</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-2.5 bg-bg-primary border border-border-dark rounded-lg text-text-primary focus:outline-none focus:border-accent-cyan focus:ring-1 focus:ring-accent-cyan/30 transition-all"
                placeholder="请输入用户名"
                required
              />
            </div>

            <div>
              <label className="block text-sm text-text-secondary mb-1.5">密码</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2.5 bg-bg-primary border border-border-dark rounded-lg text-text-primary focus:outline-none focus:border-accent-cyan focus:ring-1 focus:ring-accent-cyan/30 transition-all"
                placeholder="请输入密码"
                required
              />
            </div>

            {tab === 'register' && (
              <div>
                <label className="block text-sm text-text-secondary mb-1.5">角色</label>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setRole('student')}
                    className={`flex-1 py-2.5 rounded-lg text-sm font-medium border transition-all ${
                      role === 'student'
                        ? 'border-accent-cyan bg-accent-cyan/10 text-accent-cyan'
                        : 'border-border-dark text-text-secondary hover:border-text-secondary'
                    }`}
                  >
                    学员
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole('instructor')}
                    className={`flex-1 py-2.5 rounded-lg text-sm font-medium border transition-all ${
                      role === 'instructor'
                        ? 'border-accent-cyan bg-accent-cyan/10 text-accent-cyan'
                        : 'border-border-dark text-text-secondary hover:border-text-secondary'
                    }`}
                  >
                    讲师
                  </button>
                </div>
              </div>
            )}

            {error && (
              <div className="animate-shake px-4 py-2.5 bg-error-pink/10 border border-error-pink/30 rounded-lg text-error-pink text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-lg bg-gradient-to-r from-accent-blue to-accent-cyan/80 text-white font-medium hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? '处理中...' : tab === 'login' ? '登 录' : '注 册'}
            </button>
          </form>

          <p className="mt-4 text-center text-xs text-text-secondary">
            演示账号: student / 123456 或 instructor / 123456
          </p>
        </div>
      </div>
    </div>
  )
}
