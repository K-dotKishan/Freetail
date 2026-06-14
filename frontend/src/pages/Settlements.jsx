import React, { useEffect, useState } from 'react'
import { ArrowLeftRight, Plus, Trash2, CheckCircle2, ArrowRight } from 'lucide-react'
import { getSettlements, createSettlement, deleteSettlement } from '../api/settlementApi'
import { getGroups } from '../api/groupApi'
import { getGroupBalances } from '../api/expenseApi'
import { getUsers } from '../api/authApi'
import Modal from '../components/Modal'
import PageHeader from '../components/PageHeader'
import { PageLoader, Spinner } from '../components/Spinner'
import { useToast } from '../components/Toast'
import { formatINR, formatDate, initials, avatarGradient } from '../utils/format'
import clsx from 'clsx'

function SettlementRow({ s, onDelete }) {
  const payerName = s.payer_detail?.display_name || s.payer_detail?.username || 'Unknown'
  const payeeName = s.payee_detail?.display_name || s.payee_detail?.username || 'Unknown'
  return (
    <div className="flex items-center gap-4 py-3.5 border-b border-white/[0.04] last:border-0">
      <div className={clsx('avatar-md bg-gradient-to-br flex-shrink-0', avatarGradient(payerName))}>
        {initials(payerName)}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 text-sm">
          <span className="font-medium text-white">{payerName}</span>
          <ArrowRight size={13} className="text-white/20 flex-shrink-0" />
          <span className="font-medium text-white">{payeeName}</span>
        </div>
        {s.notes && <p className="text-xs text-white/30 mt-0.5 truncate">{s.notes}</p>}
      </div>
      <div className="text-right flex-shrink-0 mr-2">
        <p className="font-bold font-mono text-emerald-400 text-sm">{formatINR(s.amount)}</p>
        <p className="text-xs text-white/30 mt-0.5">{formatDate(s.date)}</p>
      </div>
      <button onClick={() => onDelete(s)} className="btn-ghost btn-icon btn-sm p-2 hover:text-accent-400">
        <Trash2 size={14} />
      </button>
    </div>
  )
}

function SuggestedSettlement({ t, onRecord }) {
  return (
    <div className="flex items-center gap-3 p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:border-brand-500/30 hover:bg-brand-500/5 transition-all">
      <div className={clsx('avatar-sm bg-gradient-to-br flex-shrink-0', avatarGradient(t.from_user_name))}>
        {initials(t.from_user_name)}
      </div>
      <div className="flex-1">
        <p className="text-sm text-white">
          <span className="font-medium">{t.from_user_name}</span>
          <span className="text-white/40 mx-1.5">→</span>
          <span className="font-medium">{t.to_user_name}</span>
        </p>
      </div>
      <span className="font-bold font-mono text-white text-sm flex-shrink-0">{formatINR(t.amount)}</span>
      <button onClick={() => onRecord(t)} className="btn-primary btn-sm flex-shrink-0">
        Record
      </button>
    </div>
  )
}

export default function Settlements() {
  const toast = useToast()
  const [settlements, setSettlements] = useState([])
  const [groups, setGroups] = useState([])
  const [users, setUsers] = useState([])
  const [suggested, setSuggested] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [filterGroup, setFilterGroup] = useState('')
  const [form, setForm] = useState({ group: '', payer: '', payee: '', amount: '', date: new Date().toISOString().slice(0, 10), notes: '' })

  useEffect(() => {
    Promise.all([getSettlements(), getGroups(), getUsers()])
      .then(([sRes, gRes, uRes]) => {
        setSettlements(sRes.data)
        setGroups(gRes.data)
        setUsers(uRes.data)
        if (gRes.data.length > 0) loadSuggested(gRes.data[0].id)
      })
      .finally(() => setLoading(false))
  }, [])

  const loadSuggested = (groupId) => {
    getGroupBalances(groupId).then(r => {
      setSuggested(r.data.settlements_needed || [])
    }).catch(() => {})
  }

  const refresh = () => getSettlements(filterGroup || undefined).then(r => setSettlements(r.data))

  const handleCreate = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await createSettlement(form)
      await refresh()
      setShowCreate(false)
      setForm({ group: '', payer: '', payee: '', amount: '', date: new Date().toISOString().slice(0, 10), notes: '' })
      toast('Settlement recorded!', 'success')
    } catch (err) {
      toast(err.response?.data?.detail || 'Failed to record', 'error')
    } finally { setSaving(false) }
  }

  const handleDelete = async (s) => {
    if (!confirm('Delete this settlement?')) return
    try {
      await deleteSettlement(s.id)
      setSettlements(prev => prev.filter(x => x.id !== s.id))
      toast('Settlement deleted', 'success')
    } catch { toast('Failed', 'error') }
  }

  const handleRecordSuggested = (t) => {
    const payer = users.find(u => (u.display_name || u.username) === t.from_user_name)
    const payee = users.find(u => (u.display_name || u.username) === t.to_user_name)
    setForm(f => ({
      ...f,
      payer: payer?.id || '',
      payee: payee?.id || '',
      amount: String(t.amount),
      group: groups[0]?.id || '',
    }))
    setShowCreate(true)
  }

  const filtered = settlements.filter(s => !filterGroup || String(s.group) === filterGroup)

  if (loading) return <PageLoader />

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader
        title="Settlements"
        subtitle="Record payments between members"
        icon={ArrowLeftRight}
        actions={
          <button onClick={() => setShowCreate(true)} className="btn-primary">
            <Plus size={16} /> Record Payment
          </button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Suggested settlements */}
        <div className="lg:col-span-2">
          <div className="card p-5">
            <div className="flex items-center gap-2 mb-4">
              <CheckCircle2 size={16} className="text-emerald-400" />
              <h2 className="font-semibold text-white">Suggested Payments</h2>
            </div>
            {suggested.length === 0 ? (
              <div className="text-center py-6">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/15 flex items-center justify-center mx-auto mb-2">
                  <CheckCircle2 size={18} className="text-emerald-400" />
                </div>
                <p className="text-sm text-emerald-400 font-medium">All settled up!</p>
                <p className="text-xs text-white/30 mt-1">No outstanding balances</p>
              </div>
            ) : (
              <div className="space-y-2">
                {suggested.map((t, i) => (
                  <SuggestedSettlement key={i} t={t} onRecord={handleRecordSuggested} />
                ))}
              </div>
            )}

            {/* Group selector for suggested */}
            {groups.length > 1 && (
              <div className="mt-4">
                <label className="label">Check group</label>
                <select className="select text-xs" onChange={e => loadSuggested(e.target.value)}>
                  {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Settlement history */}
        <div className="lg:col-span-3">
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-white">Settlement History</h2>
              <select className="select text-xs w-40" value={filterGroup}
                onChange={e => { setFilterGroup(e.target.value); refresh() }}>
                <option value="">All groups</option>
                {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
            </div>
            {filtered.length === 0 ? (
              <div className="empty-state py-8">
                <div className="empty-icon"><ArrowLeftRight size={22} /></div>
                <p className="text-white/30 text-sm">No settlements recorded yet</p>
              </div>
            ) : (
              <div>
                {filtered.map(s => <SettlementRow key={s.id} s={s} onDelete={handleDelete} />)}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Create modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Record Settlement"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setShowCreate(false)}>Cancel</button>
            <button className="btn-primary" form="settlement-form" disabled={saving}>
              {saving ? <Spinner size="sm" /> : <Plus size={15} />} Record
            </button>
          </>
        }>
        <form id="settlement-form" onSubmit={handleCreate} className="space-y-4">
          <div className="field-group">
            <label className="label">Group</label>
            <select className="select" required value={form.group}
              onChange={e => setForm(f => ({ ...f, group: e.target.value }))}>
              <option value="">Select group…</option>
              {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="field-group">
              <label className="label">Payer (sends money)</label>
              <select className="select" required value={form.payer}
                onChange={e => setForm(f => ({ ...f, payer: e.target.value }))}>
                <option value="">Select…</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.display_name || u.username}</option>)}
              </select>
            </div>
            <div className="field-group">
              <label className="label">Payee (receives money)</label>
              <select className="select" required value={form.payee}
                onChange={e => setForm(f => ({ ...f, payee: e.target.value }))}>
                <option value="">Select…</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.display_name || u.username}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="field-group">
              <label className="label">Amount (₹)</label>
              <input className="input" type="number" step="0.01" placeholder="5000" required
                value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} />
            </div>
            <div className="field-group">
              <label className="label">Date</label>
              <input className="input" type="date" required
                value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
            </div>
          </div>
          <div className="field-group">
            <label className="label">Notes (optional)</label>
            <input className="input" placeholder="UPI transfer, cash, etc."
              value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
          </div>
        </form>
      </Modal>
    </div>
  )
}
