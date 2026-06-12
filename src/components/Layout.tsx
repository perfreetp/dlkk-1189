import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/auth'
import {
  BookOpen,
  BookX,
  Bookmark,
  LogOut,
  Users,
  BarChart3,
  FileText,
  ClipboardCheck,
  Database,
} from 'lucide-react'

const studentNav = [
  { to: '/courses', label: '课程目录', icon: BookOpen },
  { to: '/mistakes', label: '错题本', icon: BookX },
  { to: '/bookmarks', label: '收藏写法', icon: Bookmark },
]

const instructorNav = [
  { to: '/courses', label: '课程目录', icon: BookOpen },
  { to: '/instructor/questions', label: '题目管理', icon: FileText },
  { to: '/instructor/submissions', label: '提交记录', icon: ClipboardCheck },
  { to: '/instructor/review', label: '批量点评', icon: Users },
  { to: '/instructor/students', label: '学员分析', icon: Users },
  { to: '/instructor/stats', label: '知识点统计', icon: BarChart3 },
]

export default function Layout() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const navItems = user?.role === 'instructor' ? instructorNav : studentNav

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="flex h-screen overflow-hidden bg-bg-primary">
      <aside className="w-60 flex-shrink-0 bg-bg-secondary border-r border-border-dark flex flex-col">
        <div className="h-16 flex items-center px-5 border-b border-border-dark">
          <Database className="w-7 h-7 text-accent-cyan mr-2.5" />
          <h1 className="font-display text-xl font-bold text-text-primary tracking-wide">
            SQL练功房
          </h1>
        </div>

        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/courses'}
              className={({ isActive }) =>
                `flex items-center px-3 py-2.5 rounded-lg text-sm transition-all duration-200 group ${
                  isActive
                    ? 'bg-accent-cyan/10 text-accent-cyan border-l-[3px] border-accent-cyan pl-[9px]'
                    : 'text-text-secondary hover:text-text-primary hover:bg-bg-tertiary/50 pl-3'
                }`
              }
            >
              <item.icon className="w-[18px] h-[18px] mr-3 flex-shrink-0" />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-border-dark p-4">
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-sm text-text-primary truncate">{user?.username}</p>
              <p className="text-xs text-text-secondary">
                {user?.role === 'instructor' ? '讲师' : '学员'}
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 rounded-lg text-text-secondary hover:text-error-pink hover:bg-bg-tertiary/50 transition-colors"
              title="退出登录"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      <main className="flex-1 overflow-auto bg-gradient-to-br from-bg-primary via-bg-primary to-accent-blue/10">
        <Outlet />
      </main>
    </div>
  )
}
