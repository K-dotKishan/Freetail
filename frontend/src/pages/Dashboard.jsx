import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  TrendingUp, TrendingDown, Users, Receipt, ArrowLeftRight,
  Upload, ArrowRight, Wallet, Activity, Clock
} from 'lucide-react'
import { getGroups } from '../api/groupApi'
import { getExpenses, getGroupBalances } from '../api/expenseApi'
import { useAuth } from '../context/AuthContext'
import { formatINR, formatDate, initials, avatarGradient } from '../utils/format'
import { PageLoader, SkeletonCard } from '../components/Spinner'
import clsx from 'clsx'

function StatCard({ label, value, icon: Icon, color = 'brand', trend, sub }) {
  const colorMap = {
    brand: { bg: 'bg-brand-500/15', text: 'text-brand-400', glow: 'shadow-glow-sm' },
    green: { bg: 'bg-emerald-500/15', text: 'text-emerald-400', glow: 'shadow-glow-emerald' },
    red:   { bg: 'bg-accent-500/15',  text: 'text-accent-400',  glow: 'shadow-glow-rose' },
    amber: { bg: 'bg-amber-500/15',   text: 'text-amber-400',   glow: '' },
  }
  const c = colorMap[color] || colorMap.brand
  return (
    <div className="stat-card group card-hover">
      <div className="absolute top-0 right-0 w-32 h-32 rounded-full opacity-5 -translate-y-8 translate-x-8"
        style={{ background: 'radial-gradient(circle, white 0%, transparent 70%)' }} />
      <div className="flex items-start justify-between mb-3">
        <div className={clsx('w-10 h-10 rounded-xl flex items-center justify-center', c.bg, c.glow)}>
          <Icon size={18} className={c.text} />
        </div>
        {trend !== undefined && (
          <span className={clsx('text-xs font-medium flex items-center gap-0.5',
            trend >= 0 ? 'text-emerald-400' : 'text-accent-400')}>
            {trend >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            {Math.abs(trend)}%
          </span>
        )}
      </div>
      <p className="stat-label">{label}</p>
      <p className="stat-value">{value}</p>
      {sub && <p className="text-xs text-white/30 mt-0.5">{sub}</p>}
    </div>
  )
}

function RecentExpenseRow({ expense }) {
  return (
    <div className="flex items-center gap-3 py-3 border-b border-white/[0.04] last:border-0 group">
      <div className={clsx('avatar-md flex-shrink-0 bg-gradient-to-br',
        avatarGradient(expense.payer_name))}>
        {initials(expense.payer_name)}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white truncate">{expense.description}</p>
        <p className="text-xs text-white/30 mt-0.5">{formatDate(expense.date)} · paid by {expense.payer_name}</p>
      </div>
      <span className="text-sm font-semibold font-mono text-white/80 flex-shrink-0">
        {formatINR(expense.amount_inr || expense.amount)}
      </span>
    </div>
  )
}

export default function Dashboard() {
  const { user } = useAuth()
  const [groups, setGroups] = useState([])
  const [expenses, setExpenses] = useState([])
  const [balances, setBalances] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([getGroups(), getExpenses()])
      .then(([gRes, eRes]) => {
        setGroups(gRes.data)
        setExpenses(eRes.data)
        // Load balances for first group
        if (gRes.data.length > 0) {
          return getGroupBalances(gRes.data[0].id)
        }
      })
      .then(bRes => { if (bRes) setBalances(bRes.data.balances || []) })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <PageLoader />

  const myBalance = balances.find(b => b.user_id === user?.id)
  const netBalance = myBalance?.net_balance || 0
  const recent = expenses.slice(0, 6)
  const totalSpent = expenses.reduce((s, e) => s + parseFloat(e.amount_inr || e.amount || 0), 0)
  const myOwed = balances
    .filter(b => b.user_id !== user?.id && b.net_balance < 0)
    .reduce((s, b) => s + Math.abs(b.net_balance), 0)

  return (
    <div className="animate-fade-in space-y-8">
      {/* ── Welcome ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">
            Hey, {user?.display_name || user?.username} 👋
          </h1>
          <p className="text-white/40 text-sm mt-1">Here's what's happening with your expenses</p>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/import" className="btn-secondary btn-sm">
            <Upload size={14} /> Import CSV
          </Link>
          <Link to="/expenses" className="btn-primary btn-sm">
            <Receipt size={14} /> Add Expense
          </Link>
        </div>
      </div>

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Your Balance"
          value={formatINR(Math.abs(netBalance))}
          icon={Wallet}
          color={netBalance >= 0 ? 'green' : 'red'}
          sub={netBalance >= 0 ? 'others owe you' : 'you owe others'}
        />
        <StatCard
          label="Total Groups"
          value={groups.length}
          icon={Users}
          color="brand"
        />
        <StatCard
          label="Total Expenses"
          value={expenses.length}
          icon={Receipt}
          color="amber"
          sub={formatINR(totalSpent) + ' total'}
        />
        <StatCard
          label="Pending Settle"
          value={formatINR(Math.abs(netBalance))}
          icon={ArrowLeftRight}
          color={netBalance < 0 ? 'red' : 'green'}
        />
      </div>

      {/* ── Net balance hero ── */}
      <div className={clsx(
        'relative overflow-hidden rounded-3xl p-8 border',
        netBalance >= 0
          ? 'bg-gradient-to-r from-emerald-900/40 to-teal-900/30 border-emerald-500/20'
          : 'bg-gradient-to-r from-rose-900/40 to-pink-900/30 border-rose-500/20'
      )}>
        <div className="absolute top-0 right-0 w-64 h-64 opacity-10 -translate-y-16 translate-x-16"
          style={{ background: netBalance >= 0 ? 'radial-gradient(circle, #10b981 0%, transparent 70%)' : 'radial-gradient(circle, #f43f5e 0%, transparent 70%)' }} />
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-3">
            {netBalance >= 0
              ? <TrendingUp size={18} className="text-emerald-400" />
              : <TrendingDown size={18} className="text-rose-400" />}
            <span className="text-sm font-medium text-white/60">
              {netBalance >= 0 ? "You're owed" : "You owe"}
            </span>
          </div>
          <p className={clsx('text-5xl font-bold font-mono',
            netBalance >= 0 ? 'text-emerald-400' : 'text-rose-400')}>
            {formatINR(Math.abs(netBalance))}
          </p>
          <p className="text-white/40 text-sm mt-2">
            {netBalance >= 0
              ? 'Across all your groups. Great job!'
              : 'Across all your groups. Time to settle up!'}
          </p>
          <div className="flex gap-3 mt-5">
            <Link to="/balances" className={clsx('btn btn-sm',
              netBalance >= 0
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30'
                : 'bg-rose-500/20 text-rose-300 border border-rose-500/30 hover:bg-rose-500/30')}>
              View Breakdown <ArrowRight size={13} />
            </Link>
            <Link to="/settlements" className="btn-secondary btn-sm">
              Settle Up
            </Link>
          </div>
        </div>
      </div>

      {/* ── Bottom grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Recent expenses */}
        <div className="lg:col-span-3 card p-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <Activity size={16} className="text-brand-400" />
              <h2 className="font-semibold text-white">Recent Expenses</h2>
            </div>
            <Link to="/expenses" className="text-xs text-brand-400 hover:text-brand-300 flex items-center gap-1 transition-colors">
              View all <ArrowRight size={12} />
            </Link>
          </div>
          {recent.length === 0 ? (
            <div className="empty-state py-8">
              <div className="empty-icon"><Receipt size={24} /></div>
              <p className="text-white/30 text-sm">No expenses yet</p>
              <Link to="/expenses" className="btn-primary btn-sm mt-2">Add your first</Link>
            </div>
          ) : (
            <div>{recent.map(e => <RecentExpenseRow key={e.id} expense={e} />)}</div>
          )}
        </div>

        {/* Groups & quick actions */}
        <div className="lg:col-span-2 space-y-4">
          {/* Groups */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Users size={16} className="text-brand-400" />
                <h2 className="font-semibold text-white">Groups</h2>
              </div>
              <Link to="/groups" className="text-xs text-brand-400 hover:text-brand-300 flex items-center gap-1">
                Manage <ArrowRight size={12} />
              </Link>
            </div>
            {groups.length === 0 ? (
              <p className="text-white/30 text-sm text-center py-4">No groups yet</p>
            ) : (
              <div className="space-y-2">
                {groups.slice(0, 4).map(g => (
                  <div key={g.id} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/[0.04] transition-colors cursor-pointer">
                    <div className="w-8 h-8 rounded-lg bg-gradient-brand flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                      {g.name[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{g.name}</p>
                      <p className="text-xs text-white/30">{g.member_count} members</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick links */}
          <div className="card p-5">
            <h2 className="font-semibold text-white mb-3 flex items-center gap-2">
              <Clock size={16} className="text-brand-400" /> Quick Actions
            </h2>
            <div className="grid grid-cols-2 gap-2">
              {[
                { to: '/expenses', icon: Receipt, label: 'Add Expense', color: 'text-brand-400' },
                { to: '/settlements', icon: ArrowLeftRight, label: 'Settle Up', color: 'text-emerald-400' },
                { to: '/import', icon: Upload, label: 'Import CSV', color: 'text-amber-400' },
                { to: '/balances', icon: Wallet, label: 'Balances', color: 'text-rose-400' },
              ].map(({ to, icon: Icon, label, color }) => (
                <Link key={to} to={to}
                  className="flex flex-col items-center gap-2 p-3 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] hover:border-white/[0.12] transition-all text-center">
                  <Icon size={18} className={color} />
                  <span className="text-xs text-white/60 font-medium">{label}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
