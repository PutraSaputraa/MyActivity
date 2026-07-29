import { useEffect, useState } from 'react'
import { CalendarDays, Check, LoaderCircle } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { DAY_KEYS, DAY_SHORT, toDateKey } from '../lib/date'
import Modal from './Modal'

const initialForm = {
  title: '',
  description: '',
  category: 'Personal',
  priority: 'Medium',
  startDate: toDateKey(new Date()),
  repeatType: 'daily',
  repeatDays: [],
  endDate: '',
}

const repeatLabels = {
  once: 'Sekali saja',
  daily: 'Setiap hari',
  specific: 'Hari tertentu setiap minggu',
  weekly: 'Setiap minggu',
  monthly: 'Setiap bulan',
}

export default function ActivityModal({ open, onClose, activity = null, selectedDate = null }) {
  const { addActivity, updateActivity } = useApp()
  const [form, setForm] = useState(initialForm)
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const [scope, setScope] = useState('all')

  useEffect(() => {
    if (!open) return
    setForm(
      activity
        ? { ...initialForm, ...activity, endDate: activity.endDate || '' }
        : { ...initialForm, startDate: selectedDate || toDateKey(new Date()) },
    )
    setErrors({})
    setScope('all')
  }, [open, activity, selectedDate])

  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }))

  const validate = () => {
    const next = {}
    if (!form.title.trim()) next.title = 'Nama aktivitas wajib diisi.'
    if (!form.startDate) next.startDate = 'Tanggal mulai wajib diisi.'
    if (form.repeatType === 'specific' && form.repeatDays.length === 0) {
      next.repeatDays = 'Pilih minimal satu hari.'
    }
    if (form.endDate && form.endDate < form.startDate) {
      next.endDate = 'Tanggal berakhir tidak boleh sebelum tanggal mulai.'
    }
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const submit = async (event) => {
    event.preventDefault()
    if (!validate()) return
    setSaving(true)
    const payload = {
      ...form,
      title: form.title.trim(),
      description: form.description.trim(),
      endDate: form.endDate || null,
      repeatDays: form.repeatType === 'specific' ? form.repeatDays : [],
    }
    try {
      if (activity) await updateActivity(activity.id, payload, scope, selectedDate)
      else await addActivity(payload)
      onClose()
    } finally {
      setSaving(false)
    }
  }

  const toggleDay = (day) =>
    update(
      'repeatDays',
      form.repeatDays.includes(day)
        ? form.repeatDays.filter((item) => item !== day)
        : [...form.repeatDays, day],
    )

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={activity ? 'Edit aktivitas' : 'Tambah aktivitas'}
      subtitle="Susun rutinitas kecil yang ingin kamu jaga."
      size="large"
    >
      <form onSubmit={submit} noValidate>
        <div className="form-grid">
          <label className="field field--full">
            <span>Nama aktivitas</span>
            <input
              value={form.title}
              onChange={(event) => update('title', event.target.value)}
              placeholder="Contoh: Olahraga 30 menit"
              aria-invalid={Boolean(errors.title)}
            />
            {errors.title && <small className="field-error">{errors.title}</small>}
          </label>
          <label className="field field--full">
            <span>Deskripsi <em>Opsional</em></span>
            <textarea
              value={form.description}
              onChange={(event) => update('description', event.target.value)}
              placeholder="Tambahkan catatan agar lebih mudah diingat..."
              rows="3"
            />
          </label>
          <label className="field">
            <span>Kategori</span>
            <select value={form.category} onChange={(event) => update('category', event.target.value)}>
              {['Personal', 'Work', 'Study', 'Health', 'Finance', 'Other'].map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Prioritas</span>
            <select value={form.priority} onChange={(event) => update('priority', event.target.value)}>
              <option value="Low">Rendah</option>
              <option value="Medium">Sedang</option>
              <option value="High">Tinggi</option>
            </select>
          </label>
          <label className="field">
            <span>Tanggal mulai</span>
            <input
              type="date"
              value={form.startDate}
              onChange={(event) => update('startDate', event.target.value)}
              aria-invalid={Boolean(errors.startDate)}
            />
            {errors.startDate && <small className="field-error">{errors.startDate}</small>}
          </label>
          <label className="field">
            <span>Tanggal berakhir <em>Opsional</em></span>
            <input
              type="date"
              value={form.endDate}
              onChange={(event) => update('endDate', event.target.value)}
              aria-invalid={Boolean(errors.endDate)}
            />
            {errors.endDate && <small className="field-error">{errors.endDate}</small>}
          </label>
          <label className="field field--full">
            <span>Jenis pengulangan</span>
            <select value={form.repeatType} onChange={(event) => update('repeatType', event.target.value)}>
              {Object.entries(repeatLabels).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </label>
          {form.repeatType === 'specific' && (
            <fieldset className="field field--full day-picker">
              <legend>Hari pengulangan</legend>
              <div>
                {DAY_KEYS.map((day, index) => (
                  <button
                    key={day}
                    className={form.repeatDays.includes(day) ? 'day-chip is-selected' : 'day-chip'}
                    type="button"
                    onClick={() => toggleDay(day)}
                    aria-pressed={form.repeatDays.includes(day)}
                  >
                    {form.repeatDays.includes(day) && <Check size={13} />}
                    {DAY_SHORT[index]}
                  </button>
                ))}
              </div>
              {errors.repeatDays && <small className="field-error">{errors.repeatDays}</small>}
            </fieldset>
          )}
          {activity && activity.repeatType !== 'once' && selectedDate && (
            <label className="field field--full">
              <span>Terapkan perubahan</span>
              <select value={scope} onChange={(event) => setScope(event.target.value)}>
                <option value="date">Hanya aktivitas pada tanggal ini</option>
                <option value="future">Aktivitas ini dan jadwal berikutnya</option>
                <option value="all">Seluruh rangkaian aktivitas</option>
              </select>
            </label>
          )}
        </div>
        <div className="modal__footer">
          <button className="button button--ghost" type="button" onClick={onClose}>Batal</button>
          <button className="button button--primary" type="submit" disabled={saving}>
            {saving ? <LoaderCircle className="spin" size={18} /> : <CalendarDays size={18} />}
            {saving ? 'Menyimpan...' : activity ? 'Simpan perubahan' : 'Buat aktivitas'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

