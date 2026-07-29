import { useMemo, useState } from 'react'
import {
  ArrowRight,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Edit3,
  Flame,
  MapPin,
  MoreHorizontal,
  Plus,
  RotateCcw,
  Sparkles,
  Trash2,
  Trophy,
} from 'lucide-react'
import ActivityModal from '../components/ActivityModal'
import Modal from '../components/Modal'
import { useApp } from '../context/AppContext'
import {
  addDays,
  formatDayMonth,
  formatLongDate,
  formatTime,
  getAgendaStatus,
  getGreeting,
  getRelativeAgendaTime,
  getWeek,
  isActivityScheduled,
  isSameDay,
  startOfWeek,
  toDateKey,
} from '../lib/date'

const categoryLabels = {
  Personal: 'Personal',
  Work: 'Pekerjaan',
  Study: 'Belajar',
  Health: 'Kesehatan',
  Finance: 'Keuangan',
  Other: 'Lainnya',
}

const agendaLabels = {
  Meeting: 'Rapat',
  Deadline: 'Deadline',
  Event: 'Acara',
  Exam: 'Ujian',
  Appointment: 'Janji temu',
  Other: 'Lainnya',
}

function getStreaks(activities, completions) {
  const today = new Date()
  let current = 0
  let perfect = 0
  let currentOpen = true
  let perfectOpen = true

  for (let offset = 0; offset > -365 && (currentOpen || perfectOpen); offset -= 1) {
    const date = addDays(today, offset)
    const dateKey = toDateKey(date)
    const scheduled = activities.filter((item) => isActivityScheduled(item, date))
    if (scheduled.length === 0) continue
    const done = scheduled.filter((activity) =>
      completions.some(
        (item) =>
          item.activityId === activity.id &&
          item.completionDate === dateKey &&
          item.completed,
      ),
    ).length
    const isToday = offset === 0

    if (currentOpen) {
      if (done > 0) current += 1
      else if (!isToday) currentOpen = false
    }
    if (perfectOpen) {
      if (done === scheduled.length) perfect += 1
      else if (!isToday) perfectOpen = false
    }
  }
  return { current, perfect }
}

function DashboardSkeleton() {
  return (
    <div className="dashboard-skeleton" aria-label="Memuat dashboard">
      <div className="skeleton skeleton--title" />
      <div className="skeleton-grid">
        <div className="skeleton skeleton--card" />
        <div className="skeleton skeleton--card" />
        <div className="skeleton skeleton--card" />
      </div>
      <div className="skeleton skeleton--board" />
    </div>
  )
}

export default function HomePage({ onNavigateCalendar }) {
  const {
    user,
    activities,
    completions,
    agendas,
    loading,
    isCompleted,
    toggleCompletion,
    deleteActivity,
  } = useApp()
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()))
  const [activityModal, setActivityModal] = useState({ open: false, activity: null, date: null })
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleteScope, setDeleteScope] = useState('all')

  const week = useMemo(() => getWeek(weekStart), [weekStart])
  const streaks = useMemo(() => getStreaks(activities, completions), [activities, completions])
  const closestAgenda = useMemo(
    () =>
      agendas
        .filter((item) => getAgendaStatus(item) !== 'Completed')
        .sort(
          (a, b) =>
            new Date(`${a.date}T${a.startTime || '23:59'}`) -
            new Date(`${b.date}T${b.startTime || '23:59'}`),
        )
        .find((item) => getAgendaStatus(item) !== 'Overdue') ||
      agendas.find((item) => getAgendaStatus(item) === 'Overdue'),
    [agendas],
  )

  if (loading) return <DashboardSkeleton />

  const weekLabel = `${formatDayMonth(week[0])} — ${formatDayMonth(week[6])}`
  const isCurrentWeek = isSameDay(weekStart, startOfWeek(new Date()))

  const askDelete = (activity, date) => {
    setDeleteTarget({ activity, date })
    setDeleteScope(activity.repeatType === 'once' ? 'all' : 'date')
  }

  const confirmDelete = async () => {
    await deleteActivity(deleteTarget.activity.id, deleteScope, deleteTarget.date)
    setDeleteTarget(null)
  }

  return (
    <>
      <header className="page-header home-header">
        <div>
          <span className="eyebrow eyebrow--plain">{getGreeting()}</span>
          <h1>{user.username}! <span aria-hidden="true">👋</span></h1>
          <p>{formatLongDate(new Date())}</p>
        </div>
        <button
          className="button button--primary"
          onClick={() => setActivityModal({ open: true, activity: null, date: toDateKey(new Date()) })}
        >
          <Plus size={18} />
          Tambah Aktivitas
        </button>
      </header>

      <section className="overview-grid" aria-label="Ringkasan aktivitas">
        <article className="overview-card overview-card--streak">
          <div className="overview-card__icon"><Flame size={22} /></div>
          <div className="overview-card__label">
            <span>Current streak</span>
            <small>Terus pertahankan!</small>
          </div>
          <strong>{streaks.current}</strong>
          <span className="overview-card__unit">Hari</span>
          <div className="mini-bars" aria-hidden="true">
            {[35, 52, 68, 44, 76, 84, 100].map((height, index) => (
              <span key={index} style={{ height: `${height}%` }} />
            ))}
          </div>
        </article>

        <article className="overview-card overview-card--perfect">
          <div className="overview-card__icon"><Trophy size={22} /></div>
          <div className="overview-card__label">
            <span>Perfect streak</span>
            <small>Semua aktivitas selesai</small>
          </div>
          <strong>{streaks.perfect}</strong>
          <span className="overview-card__unit">Hari</span>
          <div className="perfect-dots" aria-hidden="true">
            {week.map((day, index) => {
              const date = toDateKey(day)
              const scheduled = activities.filter((item) => isActivityScheduled(item, day))
              const complete = scheduled.length > 0 && scheduled.every((item) => isCompleted(item.id, date))
              return <span key={date} className={complete ? 'is-complete' : ''}>{complete ? <Check size={11} /> : index + 1}</span>
            })}
          </div>
        </article>

        <article
          className="overview-card overview-card--agenda"
          onClick={() => onNavigateCalendar(closestAgenda ? { date: closestAgenda.date, agendaId: closestAgenda.id } : { createAgenda: true })}
          role="button"
          tabIndex="0"
          onKeyDown={(event) => event.key === 'Enter' && event.currentTarget.click()}
        >
          <div className="overview-card__agenda-head">
            <div className="overview-card__icon"><CalendarDays size={21} /></div>
            <span>Agenda terdekat</span>
            {closestAgenda && <b className={`status-dot status-dot--${closestAgenda.agendaType.toLowerCase()}`}>{agendaLabels[closestAgenda.agendaType]}</b>}
          </div>
          {closestAgenda ? (
            <>
              <h3>{closestAgenda.title}</h3>
              <div className="agenda-meta">
                <span><Clock3 size={14} />{formatLongDate(closestAgenda.date, { weekday: undefined, year: undefined })}, {formatTime(closestAgenda.startTime)}</span>
                {closestAgenda.location && <span><MapPin size={14} />{closestAgenda.location}</span>}
              </div>
              <div className="agenda-card__footer">
                <span className="time-badge">{getRelativeAgendaTime(closestAgenda)}</span>
                <button type="button">Lihat kalender <ArrowRight size={15} /></button>
              </div>
            </>
          ) : (
            <div className="empty-inline">
              <strong>Tidak ada agenda terdekat</strong>
              <span>Jadwalmu masih kosong.</span>
              <button type="button">Buat agenda <ArrowRight size={15} /></button>
            </div>
          )}
        </article>
      </section>

      <section className="weekly-section">
        <div className="section-heading">
          <div>
            <span className="eyebrow eyebrow--plain">RUTINITAS MINGGUAN</span>
            <h2>Aktivitas minggu ini</h2>
            <p>{weekLabel}</p>
          </div>
          <div className="week-nav">
            {!isCurrentWeek && (
              <button className="button button--ghost button--small" onClick={() => setWeekStart(startOfWeek(new Date()))}>
                <RotateCcw size={15} /> Minggu ini
              </button>
            )}
            <button className="icon-button" onClick={() => setWeekStart(addDays(weekStart, -7))} aria-label="Minggu sebelumnya">
              <ChevronLeft size={19} />
            </button>
            <button className="icon-button" onClick={() => setWeekStart(addDays(weekStart, 7))} aria-label="Minggu berikutnya">
              <ChevronRight size={19} />
            </button>
          </div>
        </div>

        <div className="week-board">
          {week.map((day) => {
            const dateKey = toDateKey(day)
            const dayActivities = activities.filter((item) => isActivityScheduled(item, day))
            const completedCount = dayActivities.filter((item) => isCompleted(item.id, dateKey)).length
            const progress = dayActivities.length ? Math.round((completedCount / dayActivities.length) * 100) : 0
            const isToday = isSameDay(day, new Date())
            const isPast = day < new Date() && !isToday
            const perfect = dayActivities.length > 0 && completedCount === dayActivities.length
            return (
              <article
                className={`day-column ${isToday ? 'is-today' : ''} ${isPast ? 'is-past' : ''} ${perfect ? 'is-perfect' : ''}`}
                key={dateKey}
              >
                <header className="day-column__header">
                  <div>
                    <span>{new Intl.DateTimeFormat('id-ID', { weekday: 'long' }).format(day)}</span>
                    <strong>{day.getDate()}</strong>
                  </div>
                  {isToday && <b>Hari ini</b>}
                  {perfect && !isToday && <b className="perfect-label"><Sparkles size={11} /> Perfect</b>}
                </header>
                <div className="day-progress">
                  <div><span>{completedCount} dari {dayActivities.length} selesai</span><strong>{progress}%</strong></div>
                  <span className="progress-track"><i style={{ width: `${progress}%` }} /></span>
                </div>
                <div className="day-tasks">
                  {dayActivities.length ? (
                    dayActivities.map((activity) => {
                      const completed = isCompleted(activity.id, dateKey)
                      return (
                        <div className={`task-item ${completed ? 'is-completed' : ''}`} key={activity.id}>
                          <button
                            className="task-check"
                            onClick={() => toggleCompletion(activity.id, dateKey)}
                            aria-label={`${completed ? 'Batalkan' : 'Tandai'} ${activity.title} selesai`}
                            aria-pressed={completed}
                          >
                            {completed && <Check size={13} strokeWidth={3} />}
                          </button>
                          <div className="task-item__content">
                            <span>{activity.title}</span>
                            <small><i className={`category-dot category-dot--${activity.category.toLowerCase()}`} />{categoryLabels[activity.category]}</small>
                          </div>
                          <div className="task-actions">
                            <button
                              onClick={() => setActivityModal({ open: true, activity, date: dateKey })}
                              aria-label={`Edit ${activity.title}`}
                            >
                              <Edit3 size={14} />
                            </button>
                            <button onClick={() => askDelete(activity, dateKey)} aria-label={`Hapus ${activity.title}`}>
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      )
                    })
                  ) : (
                    <div className="empty-day">
                      <span className="empty-day__icon"><MoreHorizontal size={18} /></span>
                      <strong>Belum ada aktivitas</strong>
                      <small>Hari yang masih lapang</small>
                    </div>
                  )}
                </div>
                <button
                  className="add-day-button"
                  onClick={() => setActivityModal({ open: true, activity: null, date: dateKey })}
                >
                  <Plus size={15} /> Tambah
                </button>
              </article>
            )
          })}
        </div>
      </section>

      <ActivityModal
        open={activityModal.open}
        activity={activityModal.activity}
        selectedDate={activityModal.date}
        onClose={() => setActivityModal({ open: false, activity: null, date: null })}
      />
      <Modal
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="Hapus aktivitas?"
        subtitle={deleteTarget ? `“${deleteTarget.activity.title}” akan dihapus sesuai pilihanmu.` : ''}
      >
        {deleteTarget?.activity.repeatType !== 'once' && (
          <label className="field">
            <span>Jadwal yang dihapus</span>
            <select value={deleteScope} onChange={(event) => setDeleteScope(event.target.value)}>
              <option value="date">Hanya pada tanggal ini</option>
              <option value="future">Jadwal mulai tanggal ini</option>
              <option value="all">Seluruh aktivitas berulang</option>
            </select>
          </label>
        )}
        <div className="modal__footer">
          <button className="button button--ghost" onClick={() => setDeleteTarget(null)}>Batal</button>
          <button className="button button--danger" onClick={confirmDelete}><Trash2 size={17} /> Hapus aktivitas</button>
        </div>
      </Modal>
    </>
  )
}

