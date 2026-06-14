import React, { useState } from 'react'
import { ChevronDown, Receipt, Trash2, Edit2 } from 'lucide-react'
import { formatINR, formatCurrency, formatDate, splitTypeLabel, initials, avatarGradient } from '../utils/format'
import clsx from 'clsx'

/**
 * Standalone expense table for use in group detail views or elsewhere.
 * Accepts: expenses[], onEdit(expense), onDelete(expense)
 */
export default function ExpenseTable({ expenses = [], onEdit, onDelete, emptyMessage }) {
  const [expanded, setExpanded] = useState(null)

  if (expenses.length === 0) {
    return (
      <div className="empty-state py-12">
        <div className="empty-icon"><Receipt size={22} /></div>
        <p className="text-white/30 text-sm">{emptyMessage || 'No expenses'}</p>
      </div>
    )
  }

  return (
    <div className="table-container">
      <table className="table">
        <thead>
          <tr>
            <th>Description</th>
            <th>Paid By</th>
            <th>Split</th>
            <th>Amount</th>
            {(onEdit || onDelete) && <th>Actions</th>}
          </tr>
        </thead>
        <tbody>
          {expenses.map(e => (
            <React.Fragment key={e.id}>
              <tr className="cursor-pointer" onClick={() => setExpanded(expanded === e.id ? null : e.id)}>
                <td>
                  <div>
                    <p className="font-medium text-white text-sm">{e.description}</p>
                    <p className="text-xs text-white/30 mt-0.5">{formatDate(e.date)}</p>
                  </div>
                </td>
                <td className="text-sm text-white/70">{e.payer_name}</td>
                <td>
                  <span className="badge-brand text-[11px]">{splitTypeLabel(e.split_type)}</span>
                </td>
                <td>
                  <p className="font-semibold font-mono text-white text-sm">{formatINR(e.amount_inr || e.amount)}</p>
                  {e.currency !== 'INR' && (
                    <p className="text-xs text-white/30">{formatCurrency(e.amount, e.currency)}</p>
                  )}
                </td>
                {(onEdit || onDelete) && (
                  <td>
                    <div className="flex items-center gap-1" onClick={ev => ev.stopPropagation()}>
                      {onEdit && (
                        <button onClick={() => onEdit(e)} className="btn-ghost btn-icon btn-sm p-2">
                          <Edit2 size={13} />
                        </button>
                      )}
                      {onDelete && (
                        <button onClick={() => onDelete(e)} className="btn-ghost btn-icon btn-sm p-2 hover:text-accent-400">
                          <Trash2 size={13} />
                        </button>
                      )}
                      <ChevronDown size={13} className={clsx(
                        'text-white/20 transition-transform ml-1',
                        expanded === e.id && 'rotate-180'
                      )} />
                    </div>
                  </td>
                )}
              </tr>
              {expanded === e.id && e.splits?.length > 0 && (
                <tr>
                  <td colSpan={5} className="!py-0 !px-4">
                    <div className="pb-3 flex flex-wrap gap-2">
                      {e.splits.map(s => (
                        <div key={s.id} className="flex items-center gap-1.5 bg-white/[0.04] rounded-lg px-2.5 py-1.5">
                          <div className={clsx('avatar-sm bg-gradient-to-br', avatarGradient(s.member_name))}>
                            {initials(s.member_name)}
                          </div>
                          <span className="text-xs text-white/60">{s.member_name}</span>
                          <span className="text-xs font-mono text-white/40">{formatINR(s.owed_amount)}</span>
                        </div>
                      ))}
                    </div>
                  </td>
                </tr>
              )}
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </div>
  )
}
