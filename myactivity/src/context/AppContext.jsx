import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from 'firebase/auth'
import {
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore'
import { demoActivities, demoAgendas, demoCompletions, demoUser } from '../data/demoData'
import { auth, db } from '../firebase'
import { addDays, fromDateKey, isActivityScheduled, toDateKey } from '../lib/date'

const AppContext = createContext(null)
const DEMO_STORAGE_KEY = 'myactivity-demo-state'
const DEMO_SESSION_KEY = 'myactivity-demo-session'

const clone = (value) => JSON.parse(JSON.stringify(value))
const initialDemoState = {
  activities: clone(demoActivities),
  completions: clone(demoCompletions),
  agendas: clone(demoAgendas),
}

const getDemoState = () => {
  try {
    return JSON.parse(localStorage.getItem(DEMO_STORAGE_KEY)) || initialDemoState
  } catch {
    return initialDemoState
  }
}

const usernameToEmail = (username) => {
  const normalized = username.trim().toLowerCase()
  const encoded = btoa(normalized).replaceAll('=', '').replaceAll('+', '-').replaceAll('/', '_')
  return `u.${encoded}@users.myactivity.app`
}

const firebaseErrorMessage = (error) => {
  const messages = {
    'auth/email-already-in-use': 'Username sudah digunakan.',
    'auth/invalid-email': 'Format username tidak valid.',
    'auth/invalid-credential': 'Username atau password salah.',
    'auth/user-not-found': 'Username tidak ditemukan.',
    'auth/wrong-password': 'Password yang kamu masukkan salah.',
    'auth/weak-password': 'Password minimal 6 karakter.',
    'auth/too-many-requests': 'Terlalu banyak percobaan. Silakan coba lagi nanti.',
    'auth/network-request-failed': 'Koneksi ke Firebase gagal. Periksa jaringanmu.',
    'permission-denied': 'Akses Firestore ditolak. Periksa Security Rules.',
  }
  return messages[error?.code] || error?.message || 'Terjadi kesalahan. Silakan coba lagi.'
}

const serializeSnapshot = (snapshot) =>
  snapshot.docs.map((item) => {
    const data = item.data()
    return {
      id: item.id,
      ...data,
      createdAt: data.createdAt?.toDate?.().toISOString() || data.createdAt || null,
      updatedAt: data.updatedAt?.toDate?.().toISOString() || data.updatedAt || null,
      completedAt: data.completedAt?.toDate?.().toISOString() || data.completedAt || null,
    }
  })

const activityPayload = (input) => ({
  title: input.title?.trim() || '',
  description: input.description?.trim() || '',
  category: input.category || 'Personal',
  priority: input.priority || 'Medium',
  repeatType: input.repeatType || 'once',
  repeatDays: input.repeatDays || [],
  startDate: input.startDate,
  endDate: input.endDate || null,
  excludedDates: input.excludedDates || [],
})

const agendaPayload = (input) => ({
  title: input.title?.trim() || '',
  description: input.description?.trim() || '',
  agendaType: input.agendaType || 'Other',
  date: input.date,
  startTime: input.startTime,
  endTime: input.endTime || '',
  location: input.location?.trim() || '',
  priority: input.priority || 'Medium',
  reminderMinutes: Number(input.reminderMinutes || 0),
  status: input.status || 'Upcoming',
  ...(input.completedAt !== undefined ? { completedAt: input.completedAt } : {}),
})

const dateBefore = (date) => toDateKey(addDays(fromDateKey(date), -1))

export function AppProvider({ children }) {
  const [user, setUser] = useState(null)
  const [activities, setActivities] = useState([])
  const [completions, setCompletions] = useState([])
  const [agendas, setAgendas] = useState([])
  const [loading, setLoading] = useState(false)
  const [authLoading, setAuthLoading] = useState(true)
  const [toast, setToast] = useState(null)
  const [theme, setTheme] = useState(() => localStorage.getItem('myactivity-theme') || 'light')

  const notify = useCallback((message, type = 'success') => {
    setToast({ id: Date.now(), message, type })
  }, [])

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    localStorage.setItem('myactivity-theme', theme)
  }, [theme])

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        setUser({
          id: firebaseUser.uid,
          username: firebaseUser.displayName || 'Pengguna',
          isDemo: false,
        })
      } else if (localStorage.getItem(DEMO_SESSION_KEY)) {
        setUser({ ...demoUser, isDemo: true })
      } else {
        setUser(null)
      }
      setAuthLoading(false)
    })
    return unsubscribe
  }, [])

  useEffect(() => {
    if (!user) {
      setActivities([])
      setCompletions([])
      setAgendas([])
      setLoading(false)
      return undefined
    }

    if (user.isDemo) {
      const state = getDemoState()
      setActivities(state.activities)
      setCompletions(state.completions)
      setAgendas(state.agendas)
      setLoading(false)
      return undefined
    }

    setLoading(true)
    let readyCount = 0
    const markReady = () => {
      readyCount += 1
      if (readyCount >= 3) setLoading(false)
    }
    const handleError = (error) => {
      notify(firebaseErrorMessage(error), 'error')
      setLoading(false)
    }
    const userPath = ['users', user.id]
    const unsubActivities = onSnapshot(
      collection(db, ...userPath, 'activities'),
      (snapshot) => {
        setActivities(serializeSnapshot(snapshot))
        markReady()
      },
      handleError,
    )
    const unsubCompletions = onSnapshot(
      collection(db, ...userPath, 'completions'),
      (snapshot) => {
        setCompletions(serializeSnapshot(snapshot))
        markReady()
      },
      handleError,
    )
    const unsubAgendas = onSnapshot(
      collection(db, ...userPath, 'agendas'),
      (snapshot) => {
        setAgendas(serializeSnapshot(snapshot))
        markReady()
      },
      handleError,
    )

    return () => {
      unsubActivities()
      unsubCompletions()
      unsubAgendas()
    }
  }, [user, notify])

  useEffect(() => {
    if (!user?.isDemo || loading) return
    localStorage.setItem(
      DEMO_STORAGE_KEY,
      JSON.stringify({ activities, completions, agendas }),
    )
  }, [activities, completions, agendas, loading, user])

  const login = async ({ username, password }) => {
    try {
      const credential = await signInWithEmailAndPassword(
        auth,
        usernameToEmail(username),
        password,
      )
      localStorage.removeItem(DEMO_SESSION_KEY)
      setUser({
        id: credential.user.uid,
        username: credential.user.displayName || username.trim(),
        isDemo: false,
      })
    } catch (error) {
      throw new Error(firebaseErrorMessage(error))
    }
  }

  const register = async ({ username, password }) => {
    try {
      const cleanUsername = username.trim()
      const credential = await createUserWithEmailAndPassword(
        auth,
        usernameToEmail(cleanUsername),
        password,
      )
      await updateProfile(credential.user, { displayName: cleanUsername })
      await setDoc(doc(db, 'users', credential.user.uid), {
        username: cleanUsername,
        usernameNormalized: cleanUsername.toLowerCase(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
      localStorage.removeItem(DEMO_SESSION_KEY)
      setUser({ id: credential.user.uid, username: cleanUsername, isDemo: false })
    } catch (error) {
      throw new Error(firebaseErrorMessage(error))
    }
  }

  const loginDemo = async () => {
    if (auth.currentUser) await signOut(auth)
    localStorage.setItem(DEMO_SESSION_KEY, 'true')
    setUser({ ...demoUser, isDemo: true })
  }

  const logout = async () => {
    localStorage.removeItem(DEMO_SESSION_KEY)
    if (auth.currentUser) await signOut(auth)
    setUser(null)
  }

  const addActivity = async (input) => {
    const ref = user.isDemo
      ? { id: crypto.randomUUID() }
      : doc(collection(db, 'users', user.id, 'activities'))
    const optimistic = {
      ...activityPayload(input),
      id: ref.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    setActivities((current) => [...current, optimistic])
    if (user.isDemo) {
      notify('Aktivitas berhasil ditambahkan.')
      return optimistic
    }
    try {
      await setDoc(ref, {
        ...activityPayload(input),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
      notify('Aktivitas berhasil ditambahkan.')
      return optimistic
    } catch (error) {
      setActivities((current) => current.filter((item) => item.id !== ref.id))
      notify(firebaseErrorMessage(error), 'error')
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
        {
          ...activityPayload({ ...activity, ...input }),
          id: crypto.randomUUID(),
          repeatType: 'once',
          startDate: date,
          endDate: date,
        },
      ])
    } else if (scope === 'future' && date) {
      setActivities((current) => [
        ...current.map((item) => (item.id === id ? { ...item, endDate: dateBefore(date) } : item)),
        {
          ...activityPayload({ ...activity, ...input }),
          id: crypto.randomUUID(),
          startDate: date,
        },
      ])
    } else {
      setActivities((current) =>
        current.map((item) => (item.id === id ? { ...item, ...activityPayload(input) } : item)),
      )
    }

    if (user.isDemo) {
      notify('Aktivitas berhasil diperbarui.')
      return
    }
    try {
      const sourceRef = doc(db, 'users', user.id, 'activities', id)
      if (scope === 'date' && date) {
        const replacementRef = doc(collection(db, 'users', user.id, 'activities'))
        const batch = writeBatch(db)
        batch.update(sourceRef, {
          excludedDates: arrayUnion(date),
          updatedAt: serverTimestamp(),
        })
        batch.set(replacementRef, {
          ...activityPayload({ ...activity, ...input }),
          repeatType: 'once',
          repeatDays: [],
          startDate: date,
          endDate: date,
          excludedDates: [],
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        })
        await batch.commit()
      } else if (scope === 'future' && date) {
        const replacementRef = doc(collection(db, 'users', user.id, 'activities'))
        const batch = writeBatch(db)
        batch.update(sourceRef, { endDate: dateBefore(date), updatedAt: serverTimestamp() })
        batch.set(replacementRef, {
          ...activityPayload({ ...activity, ...input }),
          startDate: date,
          excludedDates: [],
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        })
        await batch.commit()
      } else {
        await updateDoc(sourceRef, {
          ...activityPayload(input),
          updatedAt: serverTimestamp(),
        })
      }
      notify('Aktivitas berhasil diperbarui.')
    } catch (error) {
      setActivities(previous)
      notify(firebaseErrorMessage(error), 'error')
    }
  }

  const deleteActivity = async (id, scope = 'all', date = null) => {
    const previousActivities = clone(activities)
    const previousCompletions = clone(completions)
    if (scope === 'date' && date) {
      setActivities((current) =>
        current.map((item) =>
          item.id === id
            ? { ...item, excludedDates: [...new Set([...(item.excludedDates || []), date])] }
            : item,
        ),
      )
    } else if (scope === 'future' && date) {
      setActivities((current) =>
        current.map((item) => (item.id === id ? { ...item, endDate: dateBefore(date) } : item)),
      )
    } else {
      setActivities((current) => current.filter((item) => item.id !== id))
      setCompletions((current) => current.filter((item) => item.activityId !== id))
    }

    if (user.isDemo) {
      notify('Aktivitas berhasil dihapus.')
      return
    }
    try {
      const activityRef = doc(db, 'users', user.id, 'activities', id)
      if (scope === 'date' && date) {
        await updateDoc(activityRef, {
          excludedDates: arrayUnion(date),
          updatedAt: serverTimestamp(),
        })
      } else if (scope === 'future' && date) {
        await updateDoc(activityRef, {
          endDate: dateBefore(date),
          updatedAt: serverTimestamp(),
        })
      } else {
        const completionQuery = query(
          collection(db, 'users', user.id, 'completions'),
          where('activityId', '==', id),
        )
        const completionDocs = await getDocs(completionQuery)
        const batch = writeBatch(db)
        batch.delete(activityRef)
        completionDocs.forEach((item) => batch.delete(item.ref))
        await batch.commit()
      }
      notify('Aktivitas berhasil dihapus.')
    } catch (error) {
      setActivities(previousActivities)
      setCompletions(previousCompletions)
      notify(firebaseErrorMessage(error), 'error')
    }
  }

  const toggleCompletion = async (activityId, completionDate) => {
    const existing = completions.find(
      (item) => item.activityId === activityId && item.completionDate === completionDate,
    )
    const completed = !existing?.completed
    const previous = clone(completions)
    const completionId = `${activityId}_${completionDate}`
    const next = {
      id: completionId,
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
    if (user.isDemo) return
    try {
      await setDoc(
        doc(db, 'users', user.id, 'completions', completionId),
        {
          activityId,
          completionDate,
          completed,
          completedAt: completed ? serverTimestamp() : null,
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      )
    } catch (error) {
      setCompletions(previous)
      notify(firebaseErrorMessage(error), 'error')
    }
  }

  const addAgenda = async (input) => {
    const ref = user.isDemo
      ? { id: crypto.randomUUID() }
      : doc(collection(db, 'users', user.id, 'agendas'))
    const optimistic = { ...agendaPayload(input), id: ref.id, status: 'Upcoming' }
    setAgendas((current) => [...current, optimistic])
    if (user.isDemo) {
      notify('Agenda berhasil dibuat.')
      return optimistic
    }
    try {
      await setDoc(ref, {
        ...agendaPayload(input),
        status: 'Upcoming',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
      notify('Agenda berhasil dibuat.')
      return optimistic
    } catch (error) {
      setAgendas((current) => current.filter((item) => item.id !== ref.id))
      notify(firebaseErrorMessage(error), 'error')
      throw error
    }
  }

  const updateAgenda = async (id, input) => {
    const previous = clone(agendas)
    setAgendas((current) =>
      current.map((item) => (item.id === id ? { ...item, ...agendaPayload(input) } : item)),
    )
    if (user.isDemo) {
      notify('Agenda berhasil diperbarui.')
      return
    }
    try {
      await updateDoc(doc(db, 'users', user.id, 'agendas', id), {
        ...agendaPayload(input),
        updatedAt: serverTimestamp(),
      })
      notify('Agenda berhasil diperbarui.')
    } catch (error) {
      setAgendas(previous)
      notify(firebaseErrorMessage(error), 'error')
    }
  }

  const deleteAgenda = async (id) => {
    const previous = clone(agendas)
    setAgendas((current) => current.filter((item) => item.id !== id))
    if (user.isDemo) {
      notify('Agenda berhasil dihapus.')
      return
    }
    try {
      await deleteDoc(doc(db, 'users', user.id, 'agendas', id))
      notify('Agenda berhasil dihapus.')
    } catch (error) {
      setAgendas(previous)
      notify(firebaseErrorMessage(error), 'error')
    }
  }

  const completeAgenda = (agenda) =>
    updateAgenda(agenda.id, {
      ...agenda,
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
      isDemoMode: Boolean(user?.isDemo),
      demoAvailable: true,
      login,
      register,
      loginDemo,
      logout,
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

