import React from 'react'
import { TrendingUp, TrendingDown, Minus, ArrowRight } from 'lucide-react'
import { formatINR, initials, avatarGradient } from '../utils/format'
import clsx from 'clsx'

/**
 * Compact balance card for a single user.
 * Shows net balance, arrow direction, and optional "settle" CTA.
 */
export default function BalanceCard({ balance, isMe, onSettle }) {
  const net = balance.net_balance
  const isPos = net >= 0
  const isZero = Math.abs(net) < 1
  const name = balance.user_name

  return (
    <div className={clsx(
      'flex items-center gap-4 p-4 rounded-2xl border transition-all duration-200',
      isMe
        ? 'bg-brand-500/8 border-brand-500/25'
        : 'bg-white/[0.03] border-white/[0.07] hover:border-white/[0.13]',
    )}>
      {/* Avatar */}
      <div className={clsx('avatar-md bg-gradient-to-br flex-shrink-0', avatarGradient(name))}>
        {initials(name)}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold text-white truncate">{name}</p>
          {isMe && <span className="badge-brand text-[10px]">You</span>}
        </div>
        <div className="flex items-center gap-1 mt-0.5">
          {isZero ? (
            <span className="flex items-center gap-1 text-xs text-white/30">
              <Minus size={10} /> Settled
            </span>
          ) : isPos ? (
            <span className="flex items-center gap-1 text-xs text-emerald-400">
              <TrendingUp size={10} /> Gets back
            </span>
          ) : (
            <span className="flex items-center gap-1 text-xs text-rose-400">
              <TrendingDown size={10} /> Owes
            </span>
          )}
        </div>
      </div>

      {/* Amount */}
      <div className="flex items-center gap-3 flex-shrink-0">
        <p className={clsx(
          'text-base font-bold font-mono',
          isZero ? 'text-white/30' : isPos ? 'text-emerald-400' : 'text-rose-400'
        )}>
          {isZero ? '₹0' : `${isPos ? '+' : '-'}${formatINR(Math.abs(net))}`}
        </p>
        {!isZero && !isPos && onSettle && (
          <button
            onClick={() => onSettle(balance)}
            className="btn-secondary btn-sm text-xs py-1 px-2.5 flex-shrink-0"
          >
            Settle <ArrowRight size={11} />
          </button>
        )}
      </div>
    </div>
  )
}
