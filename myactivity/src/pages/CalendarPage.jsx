import { useEffect, useMemo, useState } from 'react'
import {
  Bell,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Circle,
  Clock3,
  Edit3,
  FileClock,
  ListFilter,
  MapPin,
  Plus,
  Search,
  Sparkles,
  Trash2,
} from 'lucide-react'
import ActivityModal from '../components/ActivityModal'
import AgendaModal from '../components/AgendaModal'
import Modal from '../components/Modal'
import { useApp } from '../context/AppContext'
import {
  DAY_SHORT,
  formatLongDate,
  formatMonthYear,
  formatTime,
  getAgendaStatus,
  getMonthGrid,
  isActivityScheduled,
  isSameDay,
  toDateKey,
} from '../lib/date'

const agendaLabels = {
  Meeting: 'Rapat',
  Deadline: 'Deadline',
  Event: 'Acara',
  Exam: 'Ujian',
  Appointment: 'Janji temu',
  Other: 'Lainnya',
}

const priorityLabels = { High: 'Tinggi', Medium: 'Sedang', Low: 'Rendah' }

const statusLabels = {
  Upcoming: 'Akan datang',
  Ongoing: 'Sedang berlangsung',
  Completed: 'Selesai',
  Overdue: 'Terlambat',
}

const filters = [
  ['all', 'Semua'],
  ['activity', 'Aktivitas'],
  ['Meeting', 'Rapat'],
  ['Deadline', 'Deadline'],
  ['Event', 'Acara'],
  ['Exam', 'Ujian'],
  ['Completed', 'Selesai'],
  ['Uncompleted', 'Belum selesai'],
  ['Overdue', 'Terlambat'],
]

export default function CalendarPage({ intent, clearIntent }) {
  const {
    activities,
    agendas,
    loading,
    isCompleted,
    toggleCompletion,
    completeAgenda,
    deleteAgenda,
  } = useApp()
  const [month, setMonth] = useState(() => new Date())
  const [selectedDate, setSelectedDate] = useState(() => toDateKey(new Date()))
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [activityModal, setActivityModal] = useState({ open: false, activity: null })
  const [agendaModal, setAgendaModal] = useState({ open: false, agenda: null })
  const [detailAgenda, setDetailAgenda] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)

  useEffect(() => {
    if (!intent) return
    if (intent.date) {
      setSelectedDate(intent.date)
      const date = new Date(`${intent.date}T12:00:00`)
      setMonth(new Date(date.getFullYear(), date.getMonth(), 1))
    }
    if (intent.agendaId) {
      const agenda = agendas.find((item) => item.id === intent.agendaId)
      if (agenda) setDetailAgenda(agenda)
    }
    if (intent.createAgenda) setAgendaModal({ open: true, agenda: null })
    clearIntent()
  }, [intent, agendas, clearIntent])

  const monthDays = useMemo(() => getMonthGrid(month), [month])
  const normalizedSearch = search.toLowerCase().trim()

  const matchText = (item) =>
    !normalizedSearch ||
    [item.title, item.description, item.location]
      .filter(Boolean)
      .some((value) => value.toLowerCase().includes(normalizedSearch))

  const matchAgendaFilter = (agenda) => {
    const status = getAgendaStatus(agenda)
    if (filter === 'all') return true
    if (filter === 'activity') return false
    if (filter === 'Uncompleted') return status !== 'Completed'
    if (['Completed', 'Overdue'].includes(filter)) return status === filter
    return agenda.agendaType === filter
  }

  const matchActivityFilter = (activity, date) => {
    if (!matchText(activity)) return false
    if (filter === 'all' || filter === 'activity') return true
    if (filter === 'Completed') return isCompleted(activity.id, date)
    if (filter === 'Uncompleted') return !isCompleted(activity.id, date)
    return false
  }

  const selectedActivities = activities
    .filter((item) => isActivityScheduled(item, selectedDate))
    .filter((item) => matchActivityFilter(item, selectedDate))
  const selectedAgendas = agendas
    .filter((item) => item.date === selectedDate && matchText(item) && matchAgendaFilter(item))
    .sort((a, b) => a.startTime.localeCompare(b.startTime))

  const goToday = () => {
    const today = new Date()
    setMonth(today)
    setSelectedDate(toDateKey(today))
  }

  const changeMonth = (amount) =>
    setMonth((current) => new Date(current.getFullYear(), current.getMonth() + amount, 1))

  const openAgenda = (agenda) => {
    setSelectedDate(agenda.date)
    setDetailAgenda(agenda)
  }

  const handleCompleteAgenda = async () => {
    await completeAgenda(detailAgenda)
    setDetailAgenda((current) => ({
      ...current,
      status: current.status === 'Completed' ? 'Upcoming' : 'Completed',
    }))
  }

  const confirmDelete = async () => {
    await deleteAgenda(deleteTarget.id)
    if (detailAgenda?.id === deleteTarget.id) setDetailAgenda(null)
    setDeleteTarget(null)
  }

  return (
    <>
      <header className="page-header calendar-header">
        <div>
          <span className="eyebrow eyebrow--plain">RENCANA & AGENDA</span>
          <h1>Kalender</h1>
          <p>Lihat ritme harianmu dalam satu tampilan.</p>
        </div>
        <button className="button button--primary" onClick={() => setAgendaModal({ open: true, agenda: null })}>
          <Plus size={18} /> Tambah Agenda
        </button>
      </header>

      <section className="calendar-toolbar">
        <label className="search-box">
          <Search size={18} />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari aktivitas atau agenda..." />
        </label>
        <div className="filter-strip" aria-label="Filter kalender">
          <span><ListFilter size={16} /> Filter</span>
          {filters.map(([value, label]) => (
            <button key={value} className={filter === value ? 'is-active' : ''} onClick={() => setFilter(value)}>
              {label}
            </button>
          ))}
        </div>
      </section>

      <div className="calendar-layout">
        <section className="calendar-card">
          <header className="calendar-card__header">
            <div>
              <button className="icon-button" onClick={() => changeMonth(-1)} aria-label="Bulan sebelumnya">
                <ChevronLeft size={19} />
              </button>
              <h2>{formatMonthYear(month)}</h2>
              <button className="icon-button" onClick={() => changeMonth(1)} aria-label="Bulan berikutnya">
                <ChevronRight size={19} />
              </button>
            </div>
            <button className="button button--ghost button--small" onClick={goToday}>Hari ini</button>
          </header>
          <div className="calendar-weekdays">
            {DAY_SHORT.map((day) => <span key={day}>{day}</span>)}
          </div>
          {loading ? (
            <div className="calendar-loading">
              <div className="skeleton skeleton--board" />
            </div>
          ) : (
            <div className="calendar-grid">
              {monthDays.map((day) => {
                const date = toDateKey(day)
                const inMonth = day.getMonth() === month.getMonth()
                const dayActivities = activities
                  .filter((item) => isActivityScheduled(item, date))
                  .filter((item) => matchActivityFilter(item, date))
                const dayAgendas = agendas
                  .filter((item) => item.date === date && matchText(item) && matchAgendaFilter(item))
                  .sort((a, b) => a.startTime.localeCompare(b.startTime))
                const items = [
                  ...dayAgendas.map((item) => ({ kind: 'agenda', data: item })),
                  ...dayActivities.map((item) => ({ kind: 'activity', data: item })),
                ]
                return (
                  <button
                    className={`calendar-day ${!inMonth ? 'is-outside' : ''} ${isSameDay(day, new Date()) ? 'is-today' : ''} ${selectedDate === date ? 'is-selected' : ''}`}
                    key={date}
                    onClick={() => setSelectedDate(date)}
                    aria-label={`Pilih ${formatLongDate(date)}`}
                  >
                    <span className="calendar-day__number">{day.getDate()}</span>
                    <span className="calendar-day__items">
                      {items.slice(0, 2).map(({ kind, data }) =>
                        kind === 'agenda' ? (
                          <span
                            key={`agenda-${data.id}`}
                            className={`calendar-event calendar-event--${getAgendaStatus(data).toLowerCase()} calendar-event--${data.agendaType.toLowerCase()}`}
                          >
                            <i /> {data.startTime} {data.title}
                          </span>
                        ) : (
                          <span key={`activity-${data.id}`} className={`calendar-event calendar-event--activity ${isCompleted(data.id, date) ? 'is-complete' : ''}`}>
                            <i /> {data.title}
                          </span>
                        ),
                      )}
                      {items.length > 2 && <small>+{items.length - 2} lainnya</small>}
                    </span>
                    {items.length > 0 && (
                      <span className="calendar-day__mobile-dots" aria-hidden="true">
                        {dayActivities.length > 0 && <i className="dot-activity" />}
                        {dayAgendas.length > 0 && <i className="dot-agenda" />}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          )}
          <footer className="calendar-legend">
            <span><i className="dot-activity" /> Aktivitas</span>
            <span><i className="dot-meeting" /> Rapat / agenda</span>
            <span><i className="dot-deadline" /> Deadline</span>
            <span><i className="dot-overdue" /> Terlambat</span>
          </footer>
        </section>

        <aside className="selected-panel">
          <header className="selected-panel__header">
            <div>
              <span>{new Intl.DateTimeFormat('id-ID', { weekday: 'long' }).format(new Date(`${selectedDate}T12:00:00`))}</span>
              <h2>{new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'long' }).format(new Date(`${selectedDate}T12:00:00`))}</h2>
            </div>
            {isSameDay(selectedDate, new Date()) && <b>Hari ini</b>}
          </header>

          <div className="panel-section">
            <div className="panel-section__title">
              <span><Circle size={9} fill="currentColor" /> Aktivitas <b>{selectedActivities.length}</b></span>
              <button onClick={() => setActivityModal({ open: true, activity: null })} aria-label="Tambah aktivitas">
                <Plus size={16} />
              </button>
            </div>
            <div className="panel-list">
              {selectedActivities.length ? selectedActivities.map((activity) => {
                const completed = isCompleted(activity.id, selectedDate)
                return (
                  <div className={`panel-activity ${completed ? 'is-completed' : ''}`} key={activity.id}>
                    <button
                      className="task-check"
                      onClick={() => toggleCompletion(activity.id, selectedDate)}
                      aria-label={`${completed ? 'Batalkan' : 'Tandai'} ${activity.title} selesai`}
                    >
                      {completed && <Check size={13} />}
                    </button>
                    <button className="panel-item__main" onClick={() => setActivityModal({ open: true, activity })}>
                      <strong>{activity.title}</strong>
                      <small>{activity.category} · {priorityLabels[activity.priority]}</small>
                    </button>
                  </div>
                )
              }) : (
                <div className="panel-empty">
                  <span><Sparkles size={18} /></span>
                  <strong>Belum ada aktivitas</strong>
                  <small>Tambahkan rutinitas untuk tanggal ini.</small>
                  <button onClick={() => setActivityModal({ open: true, activity: null })}>Tambah aktivitas</button>
                </div>
              )}
            </div>
          </div>

          <div className="panel-section">
            <div className="panel-section__title panel-section__title--agenda">
              <span><Circle size={9} fill="currentColor" /> Agenda <b>{selectedAgendas.length}</b></span>
              <button onClick={() => setAgendaModal({ open: true, agenda: null })} aria-label="Tambah agenda">
                <Plus size={16} />
              </button>
            </div>
            <div className="panel-list">
              {selectedAgendas.length ? selectedAgendas.map((agenda) => {
                const status = getAgendaStatus(agenda)
                return (
                  <button className={`panel-agenda panel-agenda--${agenda.agendaType.toLowerCase()}`} key={agenda.id} onClick={() => openAgenda(agenda)}>
                    <span className="panel-agenda__time">{agenda.startTime}</span>
                    <span className="panel-agenda__line" />
                    <span className="panel-item__main">
                      <strong>{agenda.title}</strong>
                      <small>{agendaLabels[agenda.agendaType]}{agenda.location ? ` · ${agenda.location}` : ''}</small>
                    </span>
                    <span className={`status-text status-text--${status.toLowerCase()}`}>{statusLabels[status]}</span>
                  </button>
                )
              }) : (
                <div className="panel-empty">
                  <span><CalendarDays size={18} /></span>
                  <strong>Belum ada agenda</strong>
                  <small>Jadwalmu masih lapang pada tanggal ini.</small>
                  <button onClick={() => setAgendaModal({ open: true, agenda: null })}>Tambah agenda</button>
                </div>
              )}
            </div>
          </div>
        </aside>
      </div>

      <ActivityModal
        open={activityModal.open}
        activity={activityModal.activity}
        selectedDate={selectedDate}
        onClose={() => setActivityModal({ open: false, activity: null })}
      />
      <AgendaModal
        open={agendaModal.open}
        agenda={agendaModal.agenda}
        selectedDate={selectedDate}
        onClose={() => setAgendaModal({ open: false, agenda: null })}
      />
      <Modal
        open={Boolean(detailAgenda)}
        onClose={() => setDetailAgenda(null)}
        title="Detail agenda"
        subtitle="Semua informasi penting dalam satu tempat."
        size="medium"
      >
        {detailAgenda && (
          <div className="agenda-detail">
            <div className="agenda-detail__heading">
              <span className={`agenda-type-icon agenda-type-icon--${detailAgenda.agendaType.toLowerCase()}`}>
                <FileClock size={21} />
              </span>
              <div>
                <span className={`status-text status-text--${getAgendaStatus(detailAgenda).toLowerCase()}`}>
                  {statusLabels[getAgendaStatus(detailAgenda)]}
                </span>
                <h3>{detailAgenda.title}</h3>
                <small>{agendaLabels[detailAgenda.agendaType]} · Prioritas {priorityLabels[detailAgenda.priority]}</small>
              </div>
            </div>
            {detailAgenda.description && <p className="agenda-detail__description">{detailAgenda.description}</p>}
            <dl className="detail-list">
              <div><dt><CalendarDays size={17} /> Tanggal</dt><dd>{formatLongDate(detailAgenda.date)}</dd></div>
              <div><dt><Clock3 size={17} /> Waktu</dt><dd>{formatTime(detailAgenda.startTime)}{detailAgenda.endTime ? ` — ${formatTime(detailAgenda.endTime)}` : ''}</dd></div>
              {detailAgenda.location && <div><dt><MapPin size={17} /> Lokasi</dt><dd>{detailAgenda.location}</dd></div>}
              <div><dt><Bell size={17} /> Pengingat</dt><dd>{detailAgenda.reminderMinutes ? `${detailAgenda.reminderMinutes >= 1440 ? '1 hari' : detailAgenda.reminderMinutes >= 60 ? '1 jam' : `${detailAgenda.reminderMinutes} menit`} sebelumnya` : 'Tidak ada'}</dd></div>
            </dl>
            <div className="modal__footer modal__footer--spread">
              <button className="button button--danger-text" onClick={() => setDeleteTarget(detailAgenda)}>
                <Trash2 size={16} /> Hapus
              </button>
              <div>
                <button
                  className="button button--ghost"
                  onClick={() => {
                    setAgendaModal({ open: true, agenda: detailAgenda })
                    setDetailAgenda(null)
                  }}
                >
                  <Edit3 size={16} /> Edit
                </button>
                <button className="button button--primary" onClick={handleCompleteAgenda}>
                  <CheckCircle2 size={17} />
                  {getAgendaStatus(detailAgenda) === 'Completed' ? 'Batalkan selesai' : 'Tandai selesai'}
                </button>
              </div>
            </div>
          </div>
        )}
      </Modal>
      <Modal
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="Hapus agenda?"
        subtitle={deleteTarget ? `“${deleteTarget.title}” akan dihapus permanen.` : ''}
      >
        <div className="modal__footer">
          <button className="button button--ghost" onClick={() => setDeleteTarget(null)}>Batal</button>
          <button className="button button--danger" onClick={confirmDelete}><Trash2 size={17} /> Hapus agenda</button>
        </div>
      </Modal>
    </>
  )
}

