import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { X, Sparkles, Check, Infinity } from 'lucide-react'
import { Button } from './Button'

interface UpgradeDialogProps {
  open: boolean
  onClose: () => void
}

const FEATURES = [
  { label: 'Monthly trade limit', basic: '10 trades/mo', pro: <><Infinity className="w-3.5 h-3.5 inline" /> Unlimited</> },
  { label: 'Account limit', basic: '2 accounts', pro: <><Infinity className="w-3.5 h-3.5 inline" /> Unlimited</> },
  { label: 'Checklist limit', basic: '1 checklist', pro: <><Infinity className="w-3.5 h-3.5 inline" /> Unlimited</> },
  { label: 'Weekly outlook', basic: 'Not available', pro: 'Full access' },
]

export function UpgradeDialog({ open, onClose }: UpgradeDialogProps) {
  const navigate = useNavigate()

  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div className="relative card p-6 max-w-sm w-full mx-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-warning" />
            <h2 className="text-lg font-semibold text-text-primary">Upgrade to Pro</h2>
          </div>
          <button onClick={onClose} className="p-1 text-text-muted hover:text-text-primary rounded-lg hover:bg-hover transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-sm text-text-secondary mb-5">Unlock unlimited everything and get the most out of TradeSense.</p>

        <div className="space-y-3 mb-6">
          {FEATURES.map((f) => (
            <div key={f.label} className="flex items-center justify-between text-sm">
              <span className="text-text-primary">{f.label}</span>
              <div className="flex items-center gap-3 text-right">
                <span className="text-xs text-text-muted line-through">{f.basic}</span>
                <span className="text-xs font-medium text-success flex items-center gap-1">
                  <Check className="w-3 h-3" />
                  {f.pro}
                </span>
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={() => { onClose(); navigate('/plans') }}>
            Upgrade Now
          </Button>
        </div>
      </div>
    </div>
  )
}
