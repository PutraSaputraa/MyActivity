import { useEffect, useState } from 'react'
import { Bell, LoaderCircle } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { toDateKey } from '../lib/date'
import Modal from './Modal'

const agendaTypes = [
  ['Meeting', 'Rapat'],
  ['Deadline', 'Deadline'],
  ['Event', 'Acara'],
  ['Exam', 'Ujian'],
  ['Appointment', 'Janji temu'],
  ['Other', 'Lainnya'],
]

const initialForm = {
  title: '',
  description: '',
  agendaType: 'Meeting',
  date: toDateKey(new Date()),
  startTime: '09:00',
  endTime: '',
  location: '',
  priority: 'Medium',
  reminderMinutes: 60,
}

export default function AgendaModal({ open, onClose, agenda = null, selectedDate = null }) {
  const { addAgenda, updateAgenda } = useApp()
  const [form, setForm] = useState(initialForm)
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setForm(
      agenda
        ? { ...initialForm, ...agenda }
        : { ...initialForm, date: selectedDate || toDateKey(new Date()) },
    )
    setErrors({})
  }, [open, agenda, selectedDate])

  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }))

  const validate = () => {
    const next = {}
    if (!form.title.trim()) next.title = 'Judul agenda wajib diisi.'
    if (!form.date) next.date = 'Tanggal agenda wajib diisi.'
    if (!form.startTime) next.startTime = 'Waktu mulai wajib diisi.'
    if (form.endTime && form.endTime < form.startTime) {
      next.endTime = 'Waktu selesai tidak boleh lebih awal.'
    }
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const submit = async (event) => {
    event.preventDefault()
    if (!validate()) return
    setSaving(true)
    try {
      const payload = {
        ...form,
        title: form.title.trim(),
        description: form.description.trim(),
        location: form.location.trim(),
        reminderMinutes: Number(form.reminderMinutes),
      }
      if (agenda) await updateAgenda(agenda.id, payload)
      else await addAgenda(payload)
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={agenda ? 'Edit agenda' : 'Tambah agenda'}
      subtitle="Simpan detail penting agar tidak ada yang terlewat."
      size="large"
    >
      <form onSubmit={submit} noValidate>
        <div className="form-grid">
          <label className="field field--full">
            <span>Judul agenda</span>
            <input
              value={form.title}
              onChange={(event) => update('title', event.target.value)}
              placeholder="Contoh: Presentasi proyek"
              aria-invalid={Boolean(errors.title)}
            />
            {errors.title && <small className="field-error">{errors.title}</small>}
          </label>
          <label className="field field--full">
            <span>Deskripsi <em>Opsional</em></span>
            <textarea
              value={form.description}
              onChange={(event) => update('description', event.target.value)}
              placeholder="Tambahkan catatan agenda..."
              rows="3"
            />
          </label>
          <label className="field">
            <span>Jenis agenda</span>
            <select value={form.agendaType} onChange={(event) => update('agendaType', event.target.value)}>
              {agendaTypes.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
          <label className="field">
            <span>Tanggal</span>
            <input
              type="date"
              value={form.date}
              onChange={(event) => update('date', event.target.value)}
              aria-invalid={Boolean(errors.date)}
            />
            {errors.date && <small className="field-error">{errors.date}</small>}
          </label>
          <label className="field">
            <span>Waktu mulai</span>
            <input
              type="time"
              value={form.startTime}
              onChange={(event) => update('startTime', event.target.value)}
              aria-invalid={Boolean(errors.startTime)}
            />
            {errors.startTime && <small className="field-error">{errors.startTime}</small>}
          </label>
          <label className="field">
            <span>Waktu selesai <em>Opsional</em></span>
            <input
              type="time"
              value={form.endTime}
              onChange={(event) => update('endTime', event.target.value)}
              aria-invalid={Boolean(errors.endTime)}
            />
            {errors.endTime && <small className="field-error">{errors.endTime}</small>}
          </label>
          <label className="field">
            <span>Lokasi <em>Opsional</em></span>
            <input
              value={form.location}
              onChange={(event) => update('location', event.target.value)}
              placeholder="Contoh: Ruang Garuda"
            />
          </label>
          <label className="field">
            <span>Prioritas</span>
            <select value={form.priority} onChange={(event) => update('priority', event.target.value)}>
              <option value="Low">Rendah</option>
              <option value="Medium">Sedang</option>
              <option value="High">Tinggi</option>
            </select>
          </label>
          <label className="field field--full">
            <span>Pengingat</span>
            <select
              value={form.reminderMinutes}
              onChange={(event) => update('reminderMinutes', event.target.value)}
            >
              <option value="0">Tidak ada pengingat</option>
              <option value="10">10 menit sebelumnya</option>
              <option value="30">30 menit sebelumnya</option>
              <option value="60">1 jam sebelumnya</option>
              <option value="1440">1 hari sebelumnya</option>
            </select>
          </label>
        </div>
        <div className="modal__footer">
          <button className="button button--ghost" type="button" onClick={onClose}>Batal</button>
          <button className="button button--primary" type="submit" disabled={saving}>
            {saving ? <LoaderCircle className="spin" size={18} /> : <Bell size={18} />}
            {saving ? 'Menyimpan...' : agenda ? 'Simpan perubahan' : 'Buat agenda'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

