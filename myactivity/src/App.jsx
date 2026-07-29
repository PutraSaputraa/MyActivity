import { useEffect, useState } from 'react'
import { AppProvider, useApp } from './context/AppContext'
import Layout from './components/Layout'
import Toast from './components/Toast'
import AuthPage from './pages/AuthPage'
import HomePage from './pages/HomePage'
import CalendarPage from './pages/CalendarPage'

function AppContent() {
  const { user, authLoading } = useApp()
  const [page, setPage] = useState(() => window.location.hash === '#calendar' ? 'calendar' : 'home')
  const [calendarIntent, setCalendarIntent] = useState(null)

  useEffect(() => {
    const onHashChange = () => setPage(window.location.hash === '#calendar' ? 'calendar' : 'home')
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  const navigate = (next, intent = null) => {
    setPage(next)
    setCalendarIntent(intent)
    window.history.replaceState(null, '', next === 'calendar' ? '#calendar' : '#home')
  }

  if (authLoading) {
    return (
      <div className="app-loader" aria-label="Memuat aplikasi">
        <span className="loader-mark">✓</span>
        <span>MyActivity</span>
      </div>
    )
  }

  if (!user) return <AuthPage />

  return (
    <Layout page={page} setPage={(next) => navigate(next)}>
      {page === 'home' ? (
        <HomePage onNavigateCalendar={(intent) => navigate('calendar', intent)} />
      ) : (
        <CalendarPage intent={calendarIntent} clearIntent={() => setCalendarIntent(null)} />
      )}
      <Toast />
    </Layout>
  )
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  )
}

