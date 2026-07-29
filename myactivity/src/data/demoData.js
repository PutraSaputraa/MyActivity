import { addDays, startOfWeek, toDateKey } from '../lib/date'

const today = new Date()
const monday = startOfWeek(today)
const dateAt = (offset) => toDateKey(addDays(monday, offset))

export const demoUser = { id: 'demo-user', username: 'galih' }

export const demoActivities = [
  {
    id: 'activity-1',
    title: 'Olahraga 30 menit',
    description: 'Lari santai atau latihan ringan di rumah.',
    category: 'Health',
    priority: 'High',
    repeatType: 'specific',
    repeatDays: ['MONDAY', 'WEDNESDAY', 'FRIDAY'],
    startDate: dateAt(-14),
    endDate: null,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'activity-2',
    title: 'Membaca 20 halaman',
    description: 'Lanjutkan buku yang sedang dibaca.',
    category: 'Personal',
    priority: 'Medium',
    repeatType: 'daily',
    repeatDays: [],
    startDate: dateAt(-14),
    endDate: null,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'activity-3',
    title: 'Belajar React',
    description: 'Praktik component patterns selama satu jam.',
    category: 'Study',
    priority: 'Medium',
    repeatType: 'specific',
    repeatDays: ['TUESDAY', 'THURSDAY', 'SATURDAY'],
    startDate: dateAt(-14),
    endDate: null,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'activity-4',
    title: 'Weekly review',
    description: 'Tinjau target dan rencanakan minggu depan.',
    category: 'Work',
    priority: 'Low',
    repeatType: 'weekly',
    repeatDays: [],
    startDate: dateAt(6),
    endDate: null,
    createdAt: new Date().toISOString(),
  },
]

export const demoCompletions = [
  { id: 'c-1', activityId: 'activity-2', completionDate: dateAt(0), completed: true },
  { id: 'c-2', activityId: 'activity-1', completionDate: dateAt(0), completed: true },
  { id: 'c-3', activityId: 'activity-2', completionDate: dateAt(1), completed: true },
  { id: 'c-4', activityId: 'activity-3', completionDate: dateAt(1), completed: true },
  { id: 'c-5', activityId: 'activity-2', completionDate: dateAt(2), completed: true },
]

export const demoAgendas = [
  {
    id: 'agenda-1',
    title: 'Presentasi proyek',
    description: 'Presentasi hasil pengembangan website kepada tim.',
    agendaType: 'Meeting',
    date: toDateKey(addDays(today, 1)),
    startTime: '09:00',
    endTime: '10:30',
    location: 'Ruang Garuda',
    priority: 'High',
    status: 'Upcoming',
    reminderMinutes: 60,
  },
  {
    id: 'agenda-2',
    title: 'Kumpulkan laporan bulanan',
    description: 'Finalisasi data dan kirim laporan ke manajer.',
    agendaType: 'Deadline',
    date: toDateKey(addDays(today, 3)),
    startTime: '17:00',
    endTime: '',
    location: '',
    priority: 'High',
    status: 'Upcoming',
    reminderMinutes: 1440,
  },
  {
    id: 'agenda-3',
    title: 'Janji temu dokter',
    description: 'Kontrol rutin.',
    agendaType: 'Appointment',
    date: toDateKey(addDays(today, 6)),
    startTime: '15:30',
    endTime: '16:00',
    location: 'Klinik Sehat',
    priority: 'Medium',
    status: 'Upcoming',
    reminderMinutes: 60,
  },
]

