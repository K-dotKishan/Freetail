import React from 'react'
import { ArrowRight, Trash2 } from 'lucide-react'
import { formatINR, formatDate, initials, avatarGradient } from '../utils/format'
import clsx from 'clsx'

export default function SettlementTable({ settlements = [], onDelete, emptyMessage }) {
  if (settlements.length === 0) {
    return (
      <div className="empty-state py-12">
        <div className="empty-icon"><ArrowRight size={22} /></div>
        <p className="text-white/30 text-sm">{emptyMessage || 'No settlements'}</p>
      </div>
    )
  }

  return (
    <div className="table-container">
      <table className="table">
        <thead>
          <tr>
            <th>From → To</th>
            <th>Amount</th>
            <th>Date</th>
            <th>Notes</th>
            {onDelete && <th></th>}
          </tr>
        </thead>
        <tbody>
          {settlements.map(s => {
            const payerName = s.payer_detail?.display_name || s.payer_detail?.username || 'Unknown'
            const payeeName = s.payee_detail?.display_name || s.payee_detail?.username || 'Unknown'
            return (
              <tr key={s.id}>
                <td>
                  <div className="flex items-center gap-2">
                    <div className={clsx('avatar-sm bg-gradient-to-br flex-shrink-0', avatarGradient(payerName))}>
                      {initials(payerName)}
                    </div>
                    <span className="text-sm font-medium text-white">{payerName}</span>
                    <ArrowRight size={13} className="text-white/20 flex-shrink-0" />
                    <div className={clsx('avatar-sm bg-gradient-to-br flex-shrink-0', avatarGradient(payeeName))}>
                      {initials(payeeName)}
                    </div>
                    <span className="text-sm font-medium text-white">{payeeName}</span>
                  </div>
                </td>
                <td>
                  <span className="font-bold font-mono text-emerald-400 text-sm">{formatINR(s.amount)}</span>
                </td>
                <td className="text-sm text-white/50">{formatDate(s.date)}</td>
                <td className="text-xs text-white/30 max-w-xs truncate">{s.notes || '—'}</td>
                {onDelete && (
                  <td>
                    <button onClick={() => onDelete(s)} className="btn-ghost btn-icon btn-sm p-2 hover:text-accent-400">
                      <Trash2 size={13} />
                    </button>
                  </td>
                )}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
