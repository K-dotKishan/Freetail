import React, { useEffect, useState } from 'react'
import { BarChart3, ArrowRight, ChevronDown, ChevronUp, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { getGroups } from '../api/groupApi'
import { getGroupBalances } from '../api/expenseApi'
import { useAuth } from '../context/AuthContext'
import PageHeader from '../components/PageHeader'
import { PageLoader } from '../components/Spinner'
import { formatINR, formatDate, initials, avatarGradient } from '../utils/format'
import { RadialBarChart, RadialBar, ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts'
import clsx from 'clsx'

const CHART_COLORS = ['#6366f1', '#8b5cf6', '#a78bfa', '#10b981', '#f43f5e', '#f59e0b']

function BalanceMeter({ value, max }) {
  const pct = max > 0 ? Math.min(Math.abs(value) / max * 100, 100) : 0
  const isPos = value >= 0
  return (
    <div className="flex items-center gap-2 mt-2">
      <div className="flex-1 h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
        <div
          className={clsx('h-full rounded-full transition-all duration-700', isPos ? 'bg-emerald-400' : 'bg-rose-400')}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-[10px] text-white/30 font-mono w-8 text-right">{Math.round(pct)}%</span>
    </div>
  )
}

function MemberBalanceCard({ balance, maxAbs, isMe, expanded, onToggle }) {
  const net = balance.net_balance
  const isPos = net >= 0
  const isZero = Math.abs(net) < 1

  return (
    <div className={clsx(
      'card transition-all duration-300',
      isMe ? 'border-brand-500/30 bg-brand-500/5' : '',
    )}>
      <div className="p-5 cursor-pointer" onClick={onToggle}>
        <div className="flex items-center gap-3">
          <div className={clsx('avatar-lg bg-gradient-to-br flex-shrink-0', avatarGradient(balance.user_name))}>
            {initials(balance.user_name)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-semibold text-white">{balance.user_name}</p>
              {isMe && <span className="badge-brand text-[10px]">You</span>}
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              {isZero ? (
                <span className="flex items-center gap-1 text-xs text-white/40"><Minus size={12} /> Settled up</span>
              ) : isPos ? (
                <span className="flex items-center gap-1 text-xs text-emerald-400"><TrendingUp size={12} /> Gets back</span>
              ) : (
                <span className="flex items-center gap-1 text-xs text-rose-400"><TrendingDown size={12} /> Owes</span>
              )}
            </div>
            <BalanceMeter value={net} max={maxAbs} />
          </div>
          <div className="text-right flex-shrink-0">
            <p className={clsx('text-lg font-bold font-mono',
              isZero ? 'text-white/40' : isPos ? 'text-emerald-400' : 'text-rose-400')}>
              {isZero ? '₹0' : `${isPos ? '+' : '-'}${formatINR(Math.abs(net))}`}
            </p>
            <button className="text-white/20 hover:text-white/60 mt-1 transition-colors">
              {expanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
            </button>
          </div>
        </div>
      </div>

      {/* Expense breakdown */}
      {expanded && balance.expenses?.length > 0 && (
        <div className="border-t border-white/[0.06] p-4">
          <p className="text-xs text-white/30 uppercase tracking-wider font-medium mb-3">Expense Breakdown</p>
          <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
            {balance.expenses.map((e, i) => (
              <div key={i} className="flex items-center gap-3 py-1.5 px-2 rounded-lg hover:bg-white/[0.03] transition-colors">
                <span className={clsx('text-xs font-medium px-2 py-0.5 rounded-md flex-shrink-0',
                  e.role === 'paid' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-rose-500/15 text-rose-400')}>
                  {e.role === 'paid' ? 'paid' : 'owes'}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-white/70 truncate">{e.description}</p>
                  <p className="text-[10px] text-white/30">{formatDate(e.date)}</p>
                </div>
                <span className={clsx('text-xs font-mono font-medium flex-shrink-0',
                  e.role === 'paid' ? 'text-emerald-400' : 'text-rose-400')}>
                  {e.role === 'paid' ? '+' : '-'}{formatINR(e.amount)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function SettlementPlan({ transactions, userNames }) {
  if (!transactions?.length) return (
    <div className="card p-6 text-center">
      <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 flex items-center justify-center mx-auto mb-3">
        <TrendingUp size={20} className="text-emerald-400" />
      </div>
      <p className="font-semibold text-emerald-400">All settled up! 🎉</p>
      <p className="text-sm text-white/30 mt-1">No payments needed</p>
    </div>
  )

  return (
    <div className="card p-6">
      <h3 className="font-semibold text-white mb-1">Minimum Payments to Settle</h3>
      <p className="text-xs text-white/30 mb-5">
        {transactions.length} transaction{transactions.length !== 1 ? 's' : ''} will clear all debts
      </p>
      <div className="space-y-3">
        {transactions.map((t, i) => (
          <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
            <div className={clsx('avatar-sm bg-gradient-to-br flex-shrink-0', avatarGradient(t.from_user_name))}>
              {initials(t.from_user_name)}
            </div>
            <div className="flex-1">
              <p className="text-sm text-white">
                <span className="font-medium">{t.from_user_name}</span>
                <span className="text-white/40 mx-1">pays</span>
                <span className="font-medium">{t.to_user_name}</span>
              </p>
            </div>
            <ArrowRight size={14} className="text-white/20 flex-shrink-0" />
            <span className="font-bold font-mono text-white text-sm flex-shrink-0">
              {formatINR(t.amount)}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function Balances() {
  const { user } = useAuth()
  const [groups, setGroups] = useState([])
  const [selectedGroup, setSelectedGroup] = useState(null)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [balanceLoading, setBalanceLoading] = useState(false)
  const [expandedUser, setExpandedUser] = useState(null)

  useEffect(() => {
    getGroups().then(r => {
      setGroups(r.data)
      if (r.data.length > 0) {
        setSelectedGroup(r.data[0])
        loadBalances(r.data[0].id)
      } else {
        setLoading(false)
      }
    })
  }, [])

  const loadBalances = (groupId) => {
    setBalanceLoading(true)
    getGroupBalances(groupId)
      .then(r => setData(r.data))
      .catch(console.error)
      .finally(() => { setLoading(false); setBalanceLoading(false) })
  }

  const handleGroupChange = (group) => {
    setSelectedGroup(group)
    setData(null)
    setExpandedUser(null)
    loadBalances(group.id)
  }

  if (loading) return <PageLoader />

  const balances = data?.balances || []
  const transactions = data?.settlements_needed || []
  const maxAbs = Math.max(...balances.map(b => Math.abs(b.net_balance)), 1)

  // Chart data
  const pieData = balances.map((b, i) => ({
    name: b.user_name,
    value: Math.abs(b.net_balance),
    fill: CHART_COLORS[i % CHART_COLORS.length],
  })).filter(d => d.value > 0)

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader
        title="Balances"
        subtitle="Who owes what, and why"
        icon={BarChart3}
      />

      {/* Group selector */}
      {groups.length > 1 && (
        <div className="flex gap-2 flex-wrap">
          {groups.map(g => (
            <button key={g.id}
              onClick={() => handleGroupChange(g)}
              className={clsx('btn btn-sm', selectedGroup?.id === g.id ? 'btn-primary' : 'btn-secondary')}>
              {g.name}
            </button>
          ))}
        </div>
      )}

      {groups.length === 0 ? (
        <div className="card empty-state py-20">
          <div className="empty-icon"><BarChart3 size={28} /></div>
          <p className="section-title">No groups yet</p>
          <p className="text-white/30 text-sm">Create a group and add expenses to see balances</p>
        </div>
      ) : balanceLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1,2,3,4].map(i => (
            <div key={i} className="card p-5 space-y-3">
              <div className="shimmer h-12 w-12 rounded-full" />
              <div className="shimmer h-4 w-32" />
              <div className="shimmer h-6 w-24" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Left: balance cards */}
          <div className="xl:col-span-2 space-y-3">
            {balances.map(b => (
              <MemberBalanceCard
                key={b.user_id}
                balance={b}
                maxAbs={maxAbs}
                isMe={b.user_id === user?.id}
                expanded={expandedUser === b.user_id}
                onToggle={() => setExpandedUser(expandedUser === b.user_id ? null : b.user_id)}
              />
            ))}
          </div>

          {/* Right: chart + settlement plan */}
          <div className="space-y-5">
            {/* Pie chart */}
            {pieData.length > 0 && (
              <div className="card p-5">
                <h3 className="font-semibold text-white mb-4">Balance Distribution</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={85}
                      paddingAngle={3} dataKey="value">
                      {pieData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                    </Pie>
                    <Tooltip
                      contentStyle={{ background: '#1e1e35', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12 }}
                      formatter={(v) => formatINR(v)}
                      labelStyle={{ color: '#fff' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap gap-2 mt-2">
                  {pieData.map((d, i) => (
                    <div key={i} className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ background: d.fill }} />
                      <span className="text-xs text-white/50">{d.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <SettlementPlan transactions={transactions} />
          </div>
        </div>
      )}
    </div>
  )
}
