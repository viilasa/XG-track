import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { Layout } from '@/components/layout/Layout'
import { AuthPage } from '@/pages/AuthPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { TodayPage } from '@/pages/TodayPage'
import { InboxPage } from '@/pages/InboxPage'
import { AnalyticsPage } from '@/pages/AnalyticsPage'
import { AchievementsPage } from '@/pages/AchievementsPage'

export default function App() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen bg-x-bg flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <svg viewBox="0 0 24 24" className="w-12 h-12 fill-x-text animate-pulse">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
          </svg>
          <p className="text-x-muted text-sm">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return <AuthPage />
  }

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/today" element={<TodayPage />} />
        <Route path="/inbox" element={<InboxPage />} />
        <Route path="/analytics" element={<AnalyticsPage />} />
        <Route path="/achievements" element={<AchievementsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
