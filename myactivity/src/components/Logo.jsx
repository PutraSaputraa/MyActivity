import { Check } from 'lucide-react'

export default function Logo({ compact = false }) {
  return (
    <div className={`brand ${compact ? 'brand--compact' : ''}`}>
      <span className="brand__mark" aria-hidden="true"><Check size={18} strokeWidth={3} /></span>
      {!compact && <span>MyActivity</span>}
    </div>
  )
}

