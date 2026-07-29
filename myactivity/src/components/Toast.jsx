import { useEffect } from 'react'
import { CheckCircle2, CircleAlert, X } from 'lucide-react'
import { useApp } from '../context/AppContext'

export default function Toast() {
  const { toast, setToast } = useApp()

  useEffect(() => {
    if (!toast) return undefined
    const timeout = setTimeout(() => setToast(null), 3600)
    return () => clearTimeout(timeout)
  }, [toast, setToast])

  if (!toast) return null
  const Icon = toast.type === 'error' ? CircleAlert : CheckCircle2
  return (
    <div className={`toast toast--${toast.type}`} role="status">
      <Icon size={19} aria-hidden="true" />
      <span>{toast.message}</span>
      <button className="icon-button icon-button--small" onClick={() => setToast(null)} aria-label="Tutup notifikasi">
        <X size={16} />
      </button>
    </div>
  )
}

