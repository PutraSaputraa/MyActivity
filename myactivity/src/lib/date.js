export const DAY_KEYS = [
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY',
  'SUNDAY',
]

export const DAY_SHORT = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min']

export const toDateKey = (value) => {
  const date = value instanceof Date ? value : new Date(value)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export const fromDateKey = (value) => {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, month - 1, day)
}

export const addDays = (value, amount) => {
  const date = value instanceof Date ? new Date(value) : fromDateKey(value)
  date.setDate(date.getDate() + amount)
  return date
}

export const startOfWeek = (value = new Date()) => {
  const date = value instanceof Date ? new Date(value) : fromDateKey(value)
  const offset = date.getDay() === 0 ? -6 : 1 - date.getDay()
  date.setDate(date.getDate() + offset)
  date.setHours(0, 0, 0, 0)
  return date
}

export const getWeek = (value = new Date()) => {
  const start = startOfWeek(value)
  return Array.from({ length: 7 }, (_, index) => addDays(start, index))
}

export const formatLongDate = (value, options = {}) =>
  new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    ...options,
  }).format(value instanceof Date ? value : fromDateKey(value))

export const formatDayMonth = (value) =>
  new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short' }).format(
    value instanceof Date ? value : fromDateKey(value),
  )

export const formatMonthYear = (value) =>
  new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric' }).format(value)

export const formatTime = (time) => (time ? `${time.replace(':', '.')} WIB` : '')

export const isSameDay = (a, b) => toDateKey(a) === toDateKey(b)

export const dayKeyForDate = (value) => {
  const day = (value instanceof Date ? value : fromDateKey(value)).getDay()
  return DAY_KEYS[day === 0 ? 6 : day - 1]
}

export const isActivityScheduled = (activity, value) => {
  const dateKey = toDateKey(value)
  if (dateKey < activity.startDate || (activity.endDate && dateKey > activity.endDate)) return false
  if (activity.excludedDates?.includes(dateKey)) return false

  const date = fromDateKey(dateKey)
  const start = fromDateKey(activity.startDate)

  switch (activity.repeatType) {
    case 'daily':
      return true
    case 'specific':
      return activity.repeatDays?.includes(dayKeyForDate(date))
    case 'weekly':
      return date.getDay() === start.getDay()
    case 'monthly':
      return date.getDate() === start.getDate()
    default:
      return dateKey === activity.startDate
  }
}

export const getAgendaStatus = (agenda, now = new Date()) => {
  if (agenda.status === 'Completed') return 'Completed'
  const start = new Date(`${agenda.date}T${agenda.startTime || '23:59'}:00`)
  const end = new Date(`${agenda.date}T${agenda.endTime || agenda.startTime || '23:59'}:00`)
  if (now > end) return 'Overdue'
  if (agenda.endTime && now >= start && now <= end) return 'Ongoing'
  return 'Upcoming'
}

export const getRelativeAgendaTime = (agenda, now = new Date()) => {
  const target = new Date(`${agenda.date}T${agenda.startTime || '23:59'}:00`)
  const diff = target - now
  if (diff < 0) return 'Terlambat'
  if (diff < 60 * 60 * 1000) {
    const minutes = Math.max(1, Math.round(diff / 60000))
    return `${minutes} menit lagi`
  }
  if (diff < 24 * 60 * 60 * 1000) return `${Math.round(diff / 3600000)} jam lagi`
  const days = Math.ceil(diff / 86400000)
  if (days === 1) return 'Besok'
  return `${days} hari lagi`
}

export const getMonthGrid = (monthDate) => {
  const first = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1)
  const start = startOfWeek(first)
  return Array.from({ length: 42 }, (_, index) => addDays(start, index))
}

export const getGreeting = () => {
  const hour = new Date().getHours()
  if (hour < 11) return 'Selamat pagi'
  if (hour < 15) return 'Selamat siang'
  if (hour < 18) return 'Selamat sore'
  return 'Selamat malam'
}

