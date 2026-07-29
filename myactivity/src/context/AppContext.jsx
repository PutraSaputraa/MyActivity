import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { demoActivities, demoAgendas, demoCompletions, demoUser } from '../data/demoData'
import { addDays, fromDateKey, isActivityScheduled, toDateKey } from '../lib/date'
import { apiRequest, isDemoMode } from '../services/api'

const AppContext = createContext(null)

const STORAGE_KEY = 'myactivity-demo-state'
const SESSION_KEY = 'myactivity-demo-session'

const clone = (value) => JSON.parse(JSON.stringify(value))

const initialDemoState = {
  activities: clone(demoActivities),
  completions: clone(demoCompletions),
  agendas: clone(demoAgendas),
}

const getStoredState = () => {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || initialDemoState
  } catch {
    return initialDemoState
  }
}

const hashPassword = async (password) => {
  const bytes = new TextEncoder().encode(password)
  const hash = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(hash))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

export function AppProvider({ children }) {
  const [user, setUser] = useState(() => {
    if (!isDemoMode) return null
    return localStorage.getItem(SESSION_KEY) ? demoUser : null
  })
  const [activities, setActivities] = useState([])
  const [completions, setCompletions] = useState([])
  const [agendas, setAgendas] = useState([])
  const [loading, setLoading] = useState(true)
  const [authLoading, setAuthLoading] = useState(!isDemoMode)
  const [toast, setToast] = useState(null)
  const [theme, setTheme] = useState(() => localStorage.getItem('myactivity-theme') || 'light')

  const notify = useCallback((message, type = 'success') => {
    setToast({ id: Date.now(), message, type })
  }, [])

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      if (isDemoMode) {
        const state = getStoredState()
        setActivities(state.activities)
        setCompletions(state.completions)
        setAgendas(state.agendas)
      } else {
        const data = await apiRequest('/api/bootstrap')
        setActivities(data.activities)
        setCompletions(data.completions)
        setAgendas(data.agendas)
      }
    } catch (error) {
      notify(error.message || 'Gagal memuat aktivitas.', 'error')
    } finally {
      setLoading(false)
    }
  }, [notify])

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    localStorage.setItem('myactivity-theme', theme)
  }, [theme])

  useEffect(() => {
    const checkSession = async () => {
      if (isDemoMode) {
        setAuthLoading(false)
        if (user) await loadData()
        else setLoading(false)
        return
      }
      try {
        const data = await apiRequest('/api/auth/session')
        setUser(data.user)
        await loadData()
      } catch {
        setUser(null)
        setLoading(false)
      } finally {
        setAuthLoading(false)
      }
    }
    checkSession()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!isDemoMode || !user || loading) return
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ activities, completions, agendas }))
  }, [activities, completions, agendas, loading, user])

  const login = async ({ username, password }) => {
    if (isDemoMode) {
      const users = JSON.parse(localStorage.getItem('myactivity-demo-users') || '[]')
      const match = users.find((item) => item.username.toLowerCase() === username.toLowerCase())
      if (username.toLowerCase() === 'galih') {
        if (password !== 'demo123') throw new Error('Password yang kamu masukkan salah.')
      } else {
        if (!match) throw new Error('Username tidak ditemukan.')
        if (match.passwordHash !== (await hashPassword(password))) {
          throw new Error('Password yang kamu masukkan salah.')
        }
      }
      const current = match ? { id: match.id, username: match.username } : demoUser
      localStorage.setItem(SESSION_KEY, current.id)
      setUser(current)
      await loadData()
      return
    }
    const data = await apiRequest('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    })
    setUser(data.user)
    await loadData()
  }

  const register = async ({ username, password }) => {
    if (isDemoMode) {
      const users = JSON.parse(localStorage.getItem('myactivity-demo-users') || '[]')
      if (
        username.toLowerCase() === 'galih' ||
        users.some((item) => item.username.toLowerCase() === username.toLowerCase())
      ) {
        throw new Error('Username sudah digunakan.')
      }
      const newUser = {
        id: crypto.randomUUID(),
        username,
        passwordHash: await hashPassword(password),
      }
      localStorage.setItem('myactivity-demo-users', JSON.stringify([...users, newUser]))
      localStorage.setItem(SESSION_KEY, newUser.id)
      setUser({ id: newUser.id, username })
      setActivities([])
      setCompletions([])
      setAgendas([])
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ activities: [], completions: [], agendas: [] }))
      setLoading(false)
      return
    }
    const data = await apiRequest('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    })
    setUser(data.user)
    await loadData()
  }

  const logout = async () => {
    if (!isDemoMode) await apiRequest('/api/auth/logout', { method: 'POST' })
    localStorage.removeItem(SESSION_KEY)
    setUser(null)
    setActivities([])
    setCompletions([])
    setAgendas([])
  }

  const addActivity = async (input) => {
    const optimistic = {
      ...input,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    setActivities((current) => [...current, optimistic])
    try {
      if (!isDemoMode) {
        const data = await apiRequest('/api/activities', {
          method: 'POST',
          body: JSON.stringify(input),
        })
        setActivities((current) => current.map((item) => (item.id === optimistic.id ? data.activity : item)))
      }
      notify('Aktivitas berhasil ditambahkan.')
      return optimistic
    } catch (error) {
      setActivities((current) => current.filter((item) => item.id !== optimistic.id))
      notify(error.message, 'error')
      throw error
    }
  }

  const updateActivity = async (id, input, scope = 'all', date = null) => {
    const previous = clone(activities)
    const activity = activities.find((item) => item.id === id)
    if (!activity) return

    if (scope === 'date' && date) {
      setActivities((current) => [
        ...current.map((item) =>
          item.id === id
            ? { ...item, excludedDates: [...new Set([...(item.excludedDates || []), date])] }
            : item,
        ),
        { ...activity, ...input, id: crypto.randomUUID(), repeatType: 'once', startDate: date, endDate: date },
      ])
    } else if (scope === 'future' && date) {
      const previousDay = toDateKey(addDays(fromDateKey(date), -1))
      setActivities((current) => [
        ...current.map((item) => (item.id === id ? { ...item, endDate: previousDay } : item)),
        { ...activity, ...input, id: crypto.randomUUID(), startDate: date },
      ])
    } else {
      setActivities((current) => current.map((item) => (item.id === id ? { ...item, ...input } : item)))
    }

    try {
      if (!isDemoMode) {
        await apiRequest(`/api/activities/${id}`, {
          method: 'PUT',
          body: JSON.stringify({ ...input, scope, date }),
        })
        await loadData()
      }
      notify('Aktivitas berhasil diperbarui.')
    } catch (error) {
      setActivities(previous)
      notify(error.message, 'error')
    }
  }

  const deleteActivity = async (id, scope = 'all', date = null) => {
    const previous = clone(activities)
    if (scope === 'date' && date) {
      setActivities((current) =>
        current.map((item) =>
          item.id === id
            ? { ...item, excludedDates: [...new Set([...(item.excludedDates || []), date])] }
            : item,
        ),
      )
    } else if (scope === 'future' && date) {
      const previousDay = toDateKey(addDays(fromDateKey(date), -1))
      setActivities((current) =>
        current.map((item) => (item.id === id ? { ...item, endDate: previousDay } : item)),
      )
    } else {
      setActivities((current) => current.filter((item) => item.id !== id))
      setCompletions((current) => current.filter((item) => item.activityId !== id))
    }

    try {
      if (!isDemoMode) {
        await apiRequest(`/api/activities/${id}`, {
          method: 'DELETE',
          body: JSON.stringify({ scope, date }),
        })
      }
      notify('Aktivitas berhasil dihapus.')
    } catch (error) {
      setActivities(previous)
      notify(error.message, 'error')
    }
  }

  const toggleCompletion = async (activityId, completionDate) => {
    const existing = completions.find(
      (item) => item.activityId === activityId && item.completionDate === completionDate,
    )
    const completed = !existing?.completed
    const previous = clone(completions)
    const next = {
      id: existing?.id || crypto.randomUUID(),
      activityId,
      completionDate,
      completed,
      completedAt: completed ? new Date().toISOString() : null,
    }
    setCompletions((current) => [
      ...current.filter(
        (item) => !(item.activityId === activityId && item.completionDate === completionDate),
      ),
      next,
    ])
    try {
      if (!isDemoMode) {
        await apiRequest(`/api/activities/${activityId}/completion`, {
          method: 'PUT',
          body: JSON.stringify({ completionDate, completed }),
        })
      }
    } catch (error) {
      setCompletions(previous)
      notify('Status aktivitas gagal diperbarui.', 'error')
    }
  }

  const addAgenda = async (input) => {
    const optimistic = { ...input, id: crypto.randomUUID(), status: 'Upcoming' }
    setAgendas((current) => [...current, optimistic])
    try {
      if (!isDemoMode) {
        const data = await apiRequest('/api/agendas', {
          method: 'POST',
          body: JSON.stringify(input),
        })
        setAgendas((current) => current.map((item) => (item.id === optimistic.id ? data.agenda : item)))
      }
      notify('Agenda berhasil dibuat.')
      return optimistic
    } catch (error) {
      setAgendas((current) => current.filter((item) => item.id !== optimistic.id))
      notify(error.message, 'error')
      throw error
    }
  }

  const updateAgenda = async (id, input) => {
    const previous = clone(agendas)
    setAgendas((current) => current.map((item) => (item.id === id ? { ...item, ...input } : item)))
    try {
      if (!isDemoMode) {
        await apiRequest(`/api/agendas/${id}`, { method: 'PUT', body: JSON.stringify(input) })
      }
      notify('Agenda berhasil diperbarui.')
    } catch (error) {
      setAgendas(previous)
      notify(error.message, 'error')
    }
  }

  const deleteAgenda = async (id) => {
    const previous = clone(agendas)
    setAgendas((current) => current.filter((item) => item.id !== id))
    try {
      if (!isDemoMode) await apiRequest(`/api/agendas/${id}`, { method: 'DELETE' })
      notify('Agenda berhasil dihapus.')
    } catch (error) {
      setAgendas(previous)
      notify(error.message, 'error')
    }
  }

  const completeAgenda = (agenda) =>
    updateAgenda(agenda.id, {
      status: agenda.status === 'Completed' ? 'Upcoming' : 'Completed',
      completedAt: agenda.status === 'Completed' ? null : new Date().toISOString(),
    })

  const value = useMemo(
    () => ({
      user,
      activities,
      completions,
      agendas,
      loading,
      authLoading,
      toast,
      setToast,
      theme,
      setTheme,
      isDemoMode,
      login,
      register,
      logout,
      loadData,
      addActivity,
      updateActivity,
      deleteActivity,
      toggleCompletion,
      addAgenda,
      updateAgenda,
      deleteAgenda,
      completeAgenda,
      isCompleted: (activityId, date) =>
        completions.some(
          (item) => item.activityId === activityId && item.completionDate === date && item.completed,
        ),
      activitiesForDate: (date) => activities.filter((item) => isActivityScheduled(item, date)),
    }),
    [user, activities, completions, agendas, loading, authLoading, toast, theme],
  )

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export const useApp = () => useContext(AppContext)

