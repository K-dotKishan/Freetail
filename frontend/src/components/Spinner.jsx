import React from 'react'
import clsx from 'clsx'

export function Spinner({ size = 'md', className }) {
  const s = { sm: 'w-4 h-4', md: 'w-6 h-6', lg: 'w-10 h-10' }[size]
  return (
    <div className={clsx('inline-block', s, className)}>
      <svg className="animate-spin" viewBox="0 0 24 24" fill="none">
        <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
        <path
          className="opacity-80"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.4 0 0 5.4 0 12h4z"
        />
      </svg>
    </div>
  )
}

export function PageLoader() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-gradient-brand flex items-center justify-center shadow-glow animate-pulse-slow">
          <Spinner size="sm" className="text-white" />
        </div>
        <p className="text-white/30 text-sm">Loading…</p>
      </div>
    </div>
  )
}

export function SkeletonCard() {
  return (
    <div className="card p-5 space-y-3">
      <div className="shimmer h-4 w-1/3" />
      <div className="shimmer h-8 w-2/3" />
      <div className="shimmer h-3 w-1/2" />
    </div>
  )
}
