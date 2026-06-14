import React, { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Users, Receipt, ArrowLeftRight,
  Upload, BarChart3, LogOut, Menu, X, Zap, ChevronRight
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { initials, avatarGradient } from '../utils/format'
import clsx from 'clsx'

const NAV = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/groups',    icon: Users,           label: 'Groups' },
  { to: '/expenses',  icon: Receipt,         label: 'Expenses' },
  { to: '/balances',  icon: BarChart3,       label: 'Balances' },
  { to: '/settlements', icon: ArrowLeftRight, label: 'Settlements' },
  { to: '/import',    icon: Upload,          label: 'Import CSV' },
]

export default function Layout({ children }) {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)

  const handleSignOut = () => {
    signOut()
    navigate('/login')
  }

  return (
    <div className="flex h-screen overflow-hidden">
      {/* ── Background orbs ── */}
      <div className="bg-orb bg-orb-1" />
      <div className="bg-orb bg-orb-2" />
      <div className="bg-orb bg-orb-3" />

      {/* ── Sidebar ── */}
      <aside className={clsx(
        'fixed inset-y-0 left-0 z-40 w-64 flex flex-col',
        'bg-surface-card/80 backdrop-blur-xl border-r border-white/[0.07]',
        'transition-transform duration-300',
        mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      )}>
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 py-6 border-b border-white/[0.06]">
          <div className="w-9 h-9 rounded-xl bg-gradient-brand flex items-center justify-center shadow-glow-sm">
            <Zap size={18} className="text-white" />
          </div>
          <div>
            <p className="font-bold text-white text-base leading-none">SplitSpace</p>
            <p className="text-[11px] text-white/30 mt-0.5">Shared expenses</p>
          </div>
        </div>

        {/* Nav items */}
        <nav className="flex-1 px-3 py-4 overflow-y-auto space-y-0.5">
          {NAV.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) => clsx(
                isActive ? 'nav-item-active' : 'nav-item',
                'group'
              )}
            >
              <Icon size={17} className="flex-shrink-0" />
              <span className="flex-1">{label}</span>
              <ChevronRight size={13} className="opacity-0 group-hover:opacity-40 transition-opacity" />
            </NavLink>
          ))}
        </nav>

        {/* User footer */}
        <div className="px-3 py-4 border-t border-white/[0.06]">
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.07]">
            <div className={clsx(
              'avatar-md bg-gradient-to-br flex-shrink-0 text-sm font-bold',
              avatarGradient(user?.display_name || user?.username)
            )}>
              {initials(user?.display_name || user?.username)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">
                {user?.display_name || user?.username}
              </p>
              <p className="text-xs text-white/30 truncate">{user?.email}</p>
            </div>
            <button
              onClick={handleSignOut}
              className="p-1.5 rounded-lg text-white/30 hover:text-accent-400 hover:bg-accent-500/10 transition-all"
              title="Sign out"
            >
              <LogOut size={15} />
            </button>
          </div>
        </div>
      </aside>

      {/* ── Mobile overlay ── */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* ── Main content ── */}
      <div className="flex-1 flex flex-col lg:pl-64 min-h-screen">
        {/* Top bar (mobile) */}
        <header className="lg:hidden flex items-center justify-between px-4 py-3 bg-surface-card/80 backdrop-blur border-b border-white/[0.07] sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-brand flex items-center justify-center">
              <Zap size={15} className="text-white" />
            </div>
            <span className="font-bold text-white">SplitSpace</span>
          </div>
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="btn-icon btn-secondary"
          >
            {mobileOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto relative z-10 p-5 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  )
}
