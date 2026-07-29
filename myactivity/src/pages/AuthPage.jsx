import { useState } from 'react'
import {
  ArrowRight,
  CalendarCheck2,
  CheckCircle2,
  Eye,
  EyeOff,
  Flame,
  LoaderCircle,
  LockKeyhole,
  UserRound,
} from 'lucide-react'
import { useApp } from '../context/AppContext'
import Logo from '../components/Logo'

export default function AuthPage() {
  const { login, register, loginDemo, demoAvailable } = useApp()
  const [mode, setMode] = useState('login')
  const [form, setForm] = useState({ username: '', password: '', confirmPassword: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)

  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }))

  const validate = () => {
    const next = {}
    if (!form.username.trim()) next.username = 'Username wajib diisi.'
    else if (form.username.length < 3) next.username = 'Username minimal 3 karakter.'
    else if (!/^[a-zA-Z0-9._]+$/.test(form.username)) {
      next.username = 'Gunakan huruf, angka, titik, atau underscore.'
    }
    if (!form.password) next.password = 'Password wajib diisi.'
    else if (form.password.length < 6) next.password = 'Password minimal 6 karakter.'
    if (mode === 'register' && form.password !== form.confirmPassword) {
      next.confirmPassword = 'Konfirmasi password belum sama.'
    }
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const submit = async (event) => {
    event.preventDefault()
    if (!validate()) return
    setSubmitting(true)
    setErrors({})
    try {
      if (mode === 'login') await login(form)
      else await register(form)
    } catch (error) {
      setErrors({ form: error.message })
    } finally {
      setSubmitting(false)
    }
  }

  const enterDemo = async () => {
    setSubmitting(true)
    try {
      await loginDemo()
    } catch (error) {
      setErrors({ form: error.message })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="auth-page">
      <section className="auth-showcase">
        <div className="auth-showcase__inner">
          <Logo />
          <div className="auth-copy">
            <span className="eyebrow"><CheckCircle2 size={15} /> Rencanakan. Jalankan. Tumbuh.</span>
            <h1>Ruang tenang untuk hari yang lebih <em>terarah.</em></h1>
            <p>Bangun rutinitas baik, pantau progres, dan simpan semua agenda penting dalam satu tempat.</p>
          </div>
          <div className="auth-preview" aria-hidden="true">
            <div className="auth-preview__top">
              <div><small>Progress hari ini</small><strong>3 dari 4 selesai</strong></div>
              <span className="preview-ring">75%</span>
            </div>
            <div className="preview-task is-done"><CheckCircle2 size={18} /><span>Olahraga pagi</span><small>07.00</small></div>
            <div className="preview-task is-done"><CheckCircle2 size={18} /><span>Membaca buku</span><small>12.30</small></div>
            <div className="preview-task"><span className="fake-check" /><span>Belajar React</span><small>19.00</small></div>
          </div>
          <div className="auth-stats">
            <div><Flame size={20} /><span><strong>12 hari</strong><small>Current streak</small></span></div>
            <div><CalendarCheck2 size={20} /><span><strong>8 agenda</strong><small>Minggu ini</small></span></div>
          </div>
        </div>
      </section>
      <section className="auth-panel">
        <div className="auth-form-wrap">
          <div className="auth-mobile-logo"><Logo /></div>
          <div className="auth-heading">
            <span className="eyebrow eyebrow--plain">{mode === 'login' ? 'SELAMAT DATANG KEMBALI' : 'MULAI PERJALANANMU'}</span>
            <h2>{mode === 'login' ? 'Masuk ke akunmu' : 'Buat akun baru'}</h2>
            <p>{mode === 'login' ? 'Lanjutkan progres dan aktivitasmu hari ini.' : 'Hanya butuh satu menit untuk memulai.'}</p>
          </div>
          <div className="auth-tabs" role="tablist">
            <button className={mode === 'login' ? 'is-active' : ''} onClick={() => { setMode('login'); setErrors({}) }} type="button">Login</button>
            <button className={mode === 'register' ? 'is-active' : ''} onClick={() => { setMode('register'); setErrors({}) }} type="button">Register</button>
          </div>
          <form className="auth-form" onSubmit={submit} noValidate>
            {errors.form && <div className="form-alert" role="alert">{errors.form}</div>}
            <label className="field">
              <span>Username</span>
              <div className="input-icon">
                <UserRound size={18} />
                <input
                  value={form.username}
                  onChange={(event) => update('username', event.target.value)}
                  placeholder="Masukkan username"
                  autoComplete="username"
                  aria-invalid={Boolean(errors.username)}
                />
              </div>
              {errors.username && <small className="field-error">{errors.username}</small>}
            </label>
            <label className="field">
              <span>Password</span>
              <div className="input-icon">
                <LockKeyhole size={18} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={(event) => update('password', event.target.value)}
                  placeholder="Minimal 6 karakter"
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  aria-invalid={Boolean(errors.password)}
                />
                <button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}>
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {errors.password && <small className="field-error">{errors.password}</small>}
            </label>
            {mode === 'register' && (
              <label className="field">
                <span>Konfirmasi password</span>
                <div className="input-icon">
                  <LockKeyhole size={18} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={form.confirmPassword}
                    onChange={(event) => update('confirmPassword', event.target.value)}
                    placeholder="Ulangi password"
                    autoComplete="new-password"
                    aria-invalid={Boolean(errors.confirmPassword)}
                  />
                </div>
                {errors.confirmPassword && <small className="field-error">{errors.confirmPassword}</small>}
              </label>
            )}
            <button className="button button--primary button--wide button--large" type="submit" disabled={submitting}>
              {submitting ? <LoaderCircle className="spin" size={19} /> : null}
              {submitting ? 'Memproses...' : mode === 'login' ? 'Masuk ke MyActivity' : 'Buat akun'}
              {!submitting && <ArrowRight size={18} />}
            </button>
          </form>
          {demoAvailable && (
            <div className="demo-entry">
              <span>atau coba tanpa membuat akun</span>
              <button type="button" className="button button--outline button--wide" onClick={enterDemo} disabled={submitting}>
                Lihat dashboard demo
              </button>
              <small>Tidak memerlukan akun Firebase</small>
            </div>
          )}
          <p className="auth-switch">
            {mode === 'login' ? 'Belum punya akun?' : 'Sudah punya akun?'}
            <button type="button" onClick={() => setMode(mode === 'login' ? 'register' : 'login')}>
              {mode === 'login' ? 'Daftar sekarang' : 'Login di sini'}
            </button>
          </p>
        </div>
      </section>
    </div>
  )
}
