import React, { useState } from 'react'
import { AlertTriangle, XCircle, Info, ChevronDown } from 'lucide-react'
import clsx from 'clsx'

const SEV_ICON = { error: XCircle, warning: AlertTriangle, info: Info }
const SEV_STYLES = {
  error:   'text-rose-400 bg-rose-500/10 border-rose-500/25',
  warning: 'text-amber-400 bg-amber-500/10 border-amber-500/25',
  info:    'text-brand-300 bg-brand-500/10 border-brand-500/25',
}

export default function AnomalyTable({ anomalies = [] }) {
  const [expanded, setExpanded] = useState(false)
  if (!anomalies.length) return null

  const errors   = anomalies.filter(a => a.severity === 'error')
  const warnings = anomalies.filter(a => a.severity === 'warning')
  const infos    = anomalies.filter(a => a.severity === 'info')

  return (
    <div className="space-y-2">
      {/* Summary pill */}
      <button
        onClick={() => setExpanded(v => !v)}
        className="flex items-center gap-2 text-xs transition-opacity hover:opacity-80"
      >
        {errors.length > 0 && (
          <span className="badge-danger">{errors.length} error{errors.length !== 1 ? 's' : ''}</span>
        )}
        {warnings.length > 0 && (
          <span className="badge-warning">{warnings.length} warning{warnings.length !== 1 ? 's' : ''}</span>
        )}
        {infos.length > 0 && (
          <span className="badge-brand">{infos.length} info</span>
        )}
        <ChevronDown size={12} className={clsx('text-white/30 transition-transform', expanded && 'rotate-180')} />
      </button>

      {expanded && (
        <div className="space-y-1.5 animate-slide-up">
          {anomalies.map((a, i) => {
            const Icon = SEV_ICON[a.severity] || Info
            return (
              <div key={i} className={clsx(
                'flex items-start gap-2.5 px-3 py-2.5 rounded-xl border text-xs',
                SEV_STYLES[a.severity] || SEV_STYLES.info
              )}>
                <Icon size={13} className="flex-shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <p className="font-medium">{a.code?.replace(/_/g, ' ')}</p>
                  <p className="opacity-75 leading-relaxed">{a.message}</p>
                  {a.policy && <p className="opacity-50 italic">→ {a.policy}</p>}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
