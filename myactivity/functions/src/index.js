import bcrypt from 'bcryptjs'
import cookieParser from 'cookie-parser'
import cors from 'cors'
import express from 'express'
import admin from 'firebase-admin'
import { randomUUID } from 'node:crypto'
import jwt from 'jsonwebtoken'
import { onRequest } from 'firebase-functions/v2/https'
import { defineSecret, defineString } from 'firebase-functions/params'
import { logger } from 'firebase-functions'

admin.initializeApp()

const db = admin.firestore()
const FieldValue = admin.firestore.FieldValue
const jwtSecret = defineSecret('JWT_SECRET')
const webAppOrigin = defineString('WEB_APP_ORIGIN', { default: 'http://localhost:5173' })
const cookieSecure = defineString('COOKIE_SECURE', { default: 'true' })
const app = express()

const USERNAME_PATTERN = /^[a-zA-Z0-9._]+$/
const SESSION_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000
const COOKIE_NAME = 'myactivity_session'

app.disable('x-powered-by')
app.use(
  cors({
    credentials: true,
    origin(origin, callback) {
      const allowed = [webAppOrigin.value(), 'http://localhost:5173', 'http://127.0.0.1:5173']
      if (!origin || allowed.includes(origin)) callback(null, true)
      else callback(new Error('Origin tidak diizinkan.'))
    },
  }),
)
app.use(express.json({ limit: '100kb' }))
app.use(cookieParser())

const normalizeUsername = (username = '') => username.trim().toLowerCase()

const serialize = (doc) => {
  const data = doc.data()
  return {
    id: doc.id,
    ...data,
    createdAt: data.createdAt?.toDate?.().toISOString() || data.createdAt || null,
    updatedAt: data.updatedAt?.toDate?.().toISOString() || data.updatedAt || null,
    completedAt: data.completedAt?.toDate?.().toISOString() || data.completedAt || null,
  }
}

const publicUser = (doc) => ({
  id: doc.id,
  username: doc.data().username,
  createdAt: doc.data().createdAt?.toDate?.().toISOString() || null,
})

const cookieOptions = () => ({
  httpOnly: true,
  secure: cookieSecure.value() === 'true',
  sameSite: 'lax',
  maxAge: SESSION_MAX_AGE_MS,
  path: '/',
})

const createSession = (res, user) => {
  const token = jwt.sign(
    { sub: user.id, username: user.username },
    jwtSecret.value(),
    { expiresIn: '7d', issuer: 'myactivity-api', audience: 'myactivity-web' },
  )
  res.cookie(COOKIE_NAME, token, cookieOptions())
}

const requireAuth = async (req, res, next) => {
  const token = req.cookies[COOKIE_NAME]
  if (!token) return res.status(401).json({ message: 'Session telah berakhir. Silakan login kembali.' })
  try {
    const payload = jwt.verify(token, jwtSecret.value(), {
      issuer: 'myactivity-api',
      audience: 'myactivity-web',
    })
    const userDoc = await db.collection('users').doc(payload.sub).get()
    if (!userDoc.exists) throw new Error('User missing')
    req.user = { id: userDoc.id, username: userDoc.data().username }
    return next()
  } catch {
    res.clearCookie(COOKIE_NAME, { ...cookieOptions(), maxAge: 0 })
    return res.status(401).json({ message: 'Session telah berakhir. Silakan login kembali.' })
  }
}

const validateCredentials = ({ username, password }) => {
  if (!username?.trim()) return 'Username wajib diisi.'
  if (username.trim().length < 3) return 'Username minimal 3 karakter.'
  if (!USERNAME_PATTERN.test(username.trim())) {
    return 'Username hanya boleh menggunakan huruf, angka, titik, dan underscore.'
  }
  if (!password || password.length < 6) return 'Password minimal 6 karakter.'
  return null
}

const assertOwner = async (collection, id, userId) => {
  const ref = db.collection(collection).doc(id)
  const doc = await ref.get()
  if (!doc.exists || doc.data().userId !== userId) {
    const error = new Error('Data tidak ditemukan.')
    error.status = 404
    throw error
  }
  return { ref, doc }
}

const dateBefore = (dateString) => {
  const date = new Date(`${dateString}T12:00:00Z`)
  date.setUTCDate(date.getUTCDate() - 1)
  return date.toISOString().slice(0, 10)
}

app.post('/api/auth/register', async (req, res, next) => {
  try {
    const message = validateCredentials(req.body)
    if (message) return res.status(400).json({ message })
    const username = req.body.username.trim()
    const normalized = normalizeUsername(username)
    const passwordHash = await bcrypt.hash(req.body.password, 12)
    const userId = randomUUID()
    const userRef = db.collection('users').doc(userId)
    const usernameRef = db.collection('usernames').doc(normalized)

    await db.runTransaction(async (transaction) => {
      const existing = await transaction.get(usernameRef)
      if (existing.exists) {
        const error = new Error('Username sudah digunakan.')
        error.status = 409
        throw error
      }
      const timestamps = { createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() }
      transaction.create(userRef, { username, usernameNormalized: normalized, passwordHash, ...timestamps })
      transaction.create(usernameRef, { userId, createdAt: FieldValue.serverTimestamp() })
    })

    createSession(res, { id: userId, username })
    return res.status(201).json({ user: { id: userId, username } })
  } catch (error) {
    return next(error)
  }
})

app.post('/api/auth/login', async (req, res, next) => {
  try {
    const username = normalizeUsername(req.body.username)
    if (!username) return res.status(400).json({ message: 'Username wajib diisi.' })
    const usernameDoc = await db.collection('usernames').doc(username).get()
    if (!usernameDoc.exists) return res.status(404).json({ message: 'Username tidak ditemukan.' })
    const userDoc = await db.collection('users').doc(usernameDoc.data().userId).get()
    if (!userDoc.exists) return res.status(404).json({ message: 'Username tidak ditemukan.' })
    const valid = await bcrypt.compare(req.body.password || '', userDoc.data().passwordHash)
    if (!valid) return res.status(401).json({ message: 'Password yang kamu masukkan salah.' })
    const user = publicUser(userDoc)
    createSession(res, user)
    return res.json({ user })
  } catch (error) {
    return next(error)
  }
})

app.get('/api/auth/session', requireAuth, (req, res) => res.json({ user: req.user }))

app.post('/api/auth/logout', (req, res) => {
  res.clearCookie(COOKIE_NAME, { ...cookieOptions(), maxAge: 0 })
  res.json({ ok: true })
})

app.get('/api/bootstrap', requireAuth, async (req, res, next) => {
  try {
    const [activities, completions, agendas] = await Promise.all([
      db.collection('activities').where('userId', '==', req.user.id).get(),
      db.collection('activityCompletions').where('userId', '==', req.user.id).get(),
      db.collection('agendas').where('userId', '==', req.user.id).get(),
    ])
    return res.json({
      activities: activities.docs.map(serialize),
      completions: completions.docs.map(serialize),
      agendas: agendas.docs.map(serialize),
    })
  } catch (error) {
    return next(error)
  }
})

app.post('/api/activities', requireAuth, async (req, res, next) => {
  try {
    if (!req.body.title?.trim()) return res.status(400).json({ message: 'Nama aktivitas wajib diisi.' })
    if (!req.body.startDate) return res.status(400).json({ message: 'Tanggal mulai wajib diisi.' })
    if (req.body.endDate && req.body.endDate < req.body.startDate) {
      return res.status(400).json({ message: 'Tanggal berakhir tidak boleh sebelum tanggal mulai.' })
    }
    if (req.body.repeatType === 'specific' && !req.body.repeatDays?.length) {
      return res.status(400).json({ message: 'Pilih minimal satu hari pengulangan.' })
    }
    const ref = db.collection('activities').doc(randomUUID())
    const activity = {
      userId: req.user.id,
      title: req.body.title.trim(),
      description: req.body.description?.trim() || '',
      category: req.body.category || 'Personal',
      priority: req.body.priority || 'Medium',
      repeatType: req.body.repeatType || 'once',
      repeatDays: req.body.repeatDays || [],
      startDate: req.body.startDate,
      endDate: req.body.endDate || null,
      excludedDates: [],
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    }
    await ref.set(activity)
    const created = await ref.get()
    return res.status(201).json({ activity: serialize(created) })
  } catch (error) {
    return next(error)
  }
})

app.put('/api/activities/:id', requireAuth, async (req, res, next) => {
  try {
    const { ref, doc } = await assertOwner('activities', req.params.id, req.user.id)
    const { scope = 'all', date, ...updates } = req.body
    const safeUpdates = {
      title: updates.title?.trim(),
      description: updates.description?.trim() || '',
      category: updates.category,
      priority: updates.priority,
      repeatType: updates.repeatType,
      repeatDays: updates.repeatDays || [],
      startDate: updates.startDate,
      endDate: updates.endDate || null,
      updatedAt: FieldValue.serverTimestamp(),
    }
    Object.keys(safeUpdates).forEach((key) => safeUpdates[key] === undefined && delete safeUpdates[key])

    if (scope === 'date' && date) {
      const replacementRef = db.collection('activities').doc(randomUUID())
      const batch = db.batch()
      batch.update(ref, { excludedDates: FieldValue.arrayUnion(date), updatedAt: FieldValue.serverTimestamp() })
      batch.set(replacementRef, {
        ...doc.data(),
        ...safeUpdates,
        repeatType: 'once',
        repeatDays: [],
        startDate: date,
        endDate: date,
        excludedDates: [],
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      })
      await batch.commit()
    } else if (scope === 'future' && date) {
      const replacementRef = db.collection('activities').doc(randomUUID())
      const batch = db.batch()
      batch.update(ref, { endDate: dateBefore(date), updatedAt: FieldValue.serverTimestamp() })
      batch.set(replacementRef, {
        ...doc.data(),
        ...safeUpdates,
        startDate: date,
        excludedDates: [],
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      })
      await batch.commit()
    } else {
      await ref.update(safeUpdates)
    }
    return res.json({ ok: true })
  } catch (error) {
    return next(error)
  }
})

app.delete('/api/activities/:id', requireAuth, async (req, res, next) => {
  try {
    const { ref } = await assertOwner('activities', req.params.id, req.user.id)
    const { scope = 'all', date } = req.body || {}
    if (scope === 'date' && date) {
      await ref.update({ excludedDates: FieldValue.arrayUnion(date), updatedAt: FieldValue.serverTimestamp() })
    } else if (scope === 'future' && date) {
      await ref.update({ endDate: dateBefore(date), updatedAt: FieldValue.serverTimestamp() })
    } else {
      const completions = await db
        .collection('activityCompletions')
        .where('activityId', '==', req.params.id)
        .where('userId', '==', req.user.id)
        .get()
      const batch = db.batch()
      batch.delete(ref)
      completions.docs.forEach((item) => batch.delete(item.ref))
      await batch.commit()
    }
    return res.json({ ok: true })
  } catch (error) {
    return next(error)
  }
})

app.put('/api/activities/:id/completion', requireAuth, async (req, res, next) => {
  try {
    await assertOwner('activities', req.params.id, req.user.id)
    if (!req.body.completionDate) return res.status(400).json({ message: 'Tanggal penyelesaian wajib diisi.' })
    const id = `${req.params.id}_${req.body.completionDate}`
    await db.collection('activityCompletions').doc(id).set(
      {
        activityId: req.params.id,
        userId: req.user.id,
        completionDate: req.body.completionDate,
        completed: Boolean(req.body.completed),
        completedAt: req.body.completed ? FieldValue.serverTimestamp() : null,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    )
    return res.json({ ok: true })
  } catch (error) {
    return next(error)
  }
})

app.post('/api/agendas', requireAuth, async (req, res, next) => {
  try {
    if (!req.body.title?.trim()) return res.status(400).json({ message: 'Judul agenda wajib diisi.' })
    if (!req.body.date) return res.status(400).json({ message: 'Tanggal agenda wajib diisi.' })
    if (!req.body.startTime) return res.status(400).json({ message: 'Waktu mulai wajib diisi.' })
    if (req.body.endTime && req.body.endTime < req.body.startTime) {
      return res.status(400).json({ message: 'Waktu selesai tidak boleh lebih awal.' })
    }
    const ref = db.collection('agendas').doc(randomUUID())
    await ref.set({
      userId: req.user.id,
      title: req.body.title.trim(),
      description: req.body.description?.trim() || '',
      agendaType: req.body.agendaType || 'Other',
      date: req.body.date,
      startTime: req.body.startTime,
      endTime: req.body.endTime || '',
      location: req.body.location?.trim() || '',
      priority: req.body.priority || 'Medium',
      status: 'Upcoming',
      reminderMinutes: Number(req.body.reminderMinutes || 0),
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    })
    return res.status(201).json({ agenda: serialize(await ref.get()) })
  } catch (error) {
    return next(error)
  }
})

app.put('/api/agendas/:id', requireAuth, async (req, res, next) => {
  try {
    const { ref } = await assertOwner('agendas', req.params.id, req.user.id)
    const allowed = [
      'title',
      'description',
      'agendaType',
      'date',
      'startTime',
      'endTime',
      'location',
      'priority',
      'status',
      'reminderMinutes',
      'completedAt',
    ]
    const updates = Object.fromEntries(
      Object.entries(req.body).filter(([key]) => allowed.includes(key)),
    )
    await ref.update({ ...updates, updatedAt: FieldValue.serverTimestamp() })
    return res.json({ ok: true })
  } catch (error) {
    return next(error)
  }
})

app.delete('/api/agendas/:id', requireAuth, async (req, res, next) => {
  try {
    const { ref } = await assertOwner('agendas', req.params.id, req.user.id)
    await ref.delete()
    return res.json({ ok: true })
  } catch (error) {
    return next(error)
  }
})

app.use((error, req, res, next) => {
  logger.error('API request failed', { error: error.message, path: req.path })
  if (res.headersSent) return next(error)
  return res.status(error.status || 500).json({
    message: error.status ? error.message : 'Terjadi kesalahan pada server. Silakan coba lagi.',
  })
})

export const api = onRequest(
  {
    region: 'asia-southeast2',
    secrets: [jwtSecret],
    timeoutSeconds: 60,
    memory: '256MiB',
  },
  app,
)

