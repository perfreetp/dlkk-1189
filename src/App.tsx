import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import { useAuthStore } from '@/stores/auth'
import Layout from '@/components/Layout'
import Login from '@/pages/Login'
import Courses from '@/pages/Courses'
import Practice from '@/pages/Practice'
import Result from '@/pages/Result'
import Mistakes from '@/pages/Mistakes'
import Bookmarks from '@/pages/Bookmarks'
import InstructorQuestions from '@/pages/instructor/Questions'
import InstructorSubmissions from '@/pages/instructor/Submissions'
import InstructorReview from '@/pages/instructor/Review'
import InstructorStats from '@/pages/instructor/Stats'
import InstructorStudents from '@/pages/instructor/Students'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, fetchMe, token } = useAuthStore()
  const location = useLocation()

  useEffect(() => {
    if (token && !isAuthenticated) {
      fetchMe()
    }
  }, [])

  if (!token && !isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return <>{children}</>
}

function InstructorRoute({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, token, fetchMe } = useAuthStore()

  useEffect(() => {
    if (token && !user) {
      fetchMe()
    }
  }, [])

  if (!user) {
    return null
  }

  if (user.role !== 'instructor') {
    return <Navigate to="/courses" replace />
  }

  return <>{children}</>
}

function AuthRedirect() {
  const { isAuthenticated } = useAuthStore()
  if (isAuthenticated) {
    return <Navigate to="/courses" replace />
  }
  return <Login />
}

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<AuthRedirect />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/courses" replace />} />
          <Route path="courses" element={<Courses />} />
          <Route path="practice/:questionId" element={<Practice />} />
          <Route path="result" element={<Result />} />
          <Route path="mistakes" element={<Mistakes />} />
          <Route path="bookmarks" element={<Bookmarks />} />
          <Route
            path="instructor/questions"
            element={
              <InstructorRoute>
                <InstructorQuestions />
              </InstructorRoute>
            }
          />
          <Route
            path="instructor/submissions"
            element={
              <InstructorRoute>
                <InstructorSubmissions />
              </InstructorRoute>
            }
          />
          <Route
            path="instructor/review"
            element={
              <InstructorRoute>
                <InstructorReview />
              </InstructorRoute>
            }
          />
          <Route
            path="instructor/stats"
            element={
              <InstructorRoute>
                <InstructorStats />
              </InstructorRoute>
            }
          />
          <Route
            path="instructor/students"
            element={
              <InstructorRoute>
                <InstructorStudents />
              </InstructorRoute>
            }
          />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  )
}
