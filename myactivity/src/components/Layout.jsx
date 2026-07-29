import { useState } from 'react'
import {
  CalendarDays,
  Home,
  LogOut,
  Menu,
  Moon,
  Sparkles,
  Sun,
  X,
} from 'lucide-react'
import { useApp } from '../context/AppContext'
import Logo from './Logo'

export default function Layout({ page, setPage, children }) {
  const { user, logout, theme, setTheme, isDemoMode } = useApp()
  const [mobileOpen, setMobileOpen] = useState(false)

  const navigate = (next) => {
    setPage(next)
    setMobileOpen(false)
  }

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileOpen ? 'is-open' : ''}`}>
        <div className="sidebar__top">
          <Logo />
          <button className="icon-button sidebar__close" onClick={() => setMobileOpen(false)} aria-label="Tutup menu">
            <X size={20} />
          </button>
        </div>
        {isDemoMode && (
          <div className="demo-note">
            <Sparkles size={15} />
            <span>Mode demo lokal</span>
          </div>
        )}
        <nav className="sidebar__nav" aria-label="Navigasi utama">
          <button className={page === 'home' ? 'nav-item is-active' : 'nav-item'} onClick={() => navigate('home')}>
            <Home size={19} />
            <span>Home</span>
          </button>
          <button
            className={page === 'calendar' ? 'nav-item is-active' : 'nav-item'}
            onClick={() => navigate('calendar')}
          >
            <CalendarDays size={19} />
            <span>Calendar</span>
          </button>
        </nav>
        <div className="sidebar__footer">
          <button
            className="nav-item"
            onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
            aria-label={theme === 'light' ? 'Aktifkan mode gelap' : 'Aktifkan mode terang'}
          >
            {theme === 'light' ? <Moon size={19} /> : <Sun size={19} />}
            <span>{theme === 'light' ? 'Mode gelap' : 'Mode terang'}</span>
          </button>
          <div className="profile-mini">
            <span className="avatar">{user.username.slice(0, 1).toUpperCase()}</span>
            <div>
              <strong>{user.username}</strong>
              <small>Akun pribadi</small>
            </div>
            <button className="icon-button icon-button--on-dark" onClick={logout} aria-label="Logout">
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </aside>
      {mobileOpen && <button className="sidebar-overlay" aria-label="Tutup menu" onClick={() => setMobileOpen(false)} />}
      <div className="main-shell">
        <div className="mobile-topbar">
          <button className="icon-button" onClick={() => setMobileOpen(true)} aria-label="Buka menu">
            <Menu size={21} />
          </button>
          <Logo />
          <button
            className="icon-button"
            onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
            aria-label="Ganti tema"
          >
            {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
          </button>
        </div>
        <main className="main-content">{children}</main>
        <nav className="bottom-nav" aria-label="Navigasi mobile">
          <button className={page === 'home' ? 'is-active' : ''} onClick={() => navigate('home')}>
            <Home size={20} />
            <span>Home</span>
          </button>
          <button className={page === 'calendar' ? 'is-active' : ''} onClick={() => navigate('calendar')}>
            <CalendarDays size={20} />
            <span>Calendar</span>
          </button>
          <button onClick={logout}>
            <LogOut size={20} />
            <span>Logout</span>
          </button>
        </nav>
      </div>
    </div>
  )
}

