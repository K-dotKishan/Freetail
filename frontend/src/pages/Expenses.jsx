import React, { useEffect, useState } from 'react'
import {
  Receipt, Plus, Trash2, Edit2, Filter, Search,
  ChevronDown, SplitSquareHorizontal, X
} from 'lucide-react'
import { getExpenses, createExpense, updateExpense, deleteExpense } from '../api/expenseApi'
import { getGroups } from '../api/groupApi'
import { getUsers } from '../api/authApi'
import Modal from '../components/Modal'
import PageHeader from '../components/PageHeader'
import { PageLoader, Spinner } from '../components/Spinner'
import { useToast } from '../components/Toast'
import { formatINR, formatCurrency, formatDate, splitTypeLabel, initials, avatarGradient } from '../utils/format'
import clsx from 'clsx'

const SPLIT_TYPES = ['equal', 'unequal', 'percentage', 'share']

function SplitTypeBadge({ type }) {
  const colors = {
    equal: 'badge-brand', unequal: 'badge-warning',
    percentage: 'badge-success', share: 'badge-neutral',
  }
  return <span className={colors[type] || 'badge-neutral'}>{splitTypeLabel(type)}</span>
}

function ExpenseRow({ expense, onEdit, onDelete }) {
  const [expanded, setExpanded] = useState(false)
  return (
    <>
      <tr className="cursor-pointer" onClick={() => setExpanded(v => !v)}>
        <td>
          <div className="flex items-center gap-3">
            <div className={clsx('avatar-sm bg-gradient-to-br flex-shrink-0', avatarGradient(expense.description))}>
              <Receipt size={12} />
            </div>
            <div>
              <p className="font-medium text-white text-sm">{expense.description}</p>
              <p className="text-xs text-white/30 mt-0.5">{formatDate(expense.date)}</p>
            </div>
          </div>
        </td>
        <td>
          <div className={clsx('avatar-sm bg-gradient-to-br inline-flex mr-2', avatarGradient(expense.payer_name))}>
            {initials(expense.payer_name)}
          </div>
          <span className="text-sm text-white/70">{expense.payer_name}</span>
        </td>
        <td><SplitTypeBadge type={expense.split_type} /></td>
        <td>
          <div>
            <p className="font-semibold font-mono text-white text-sm">{formatINR(expense.amount_inr || expense.amount)}</p>
            {expense.currency !== 'INR' && (
              <p className="text-xs text-white/30">{formatCurrency(expense.amount, expense.currency)}</p>
            )}
          </div>
        </td>
        <td>
          <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
            <button onClick={() => onEdit(expense)} className="btn-ghost btn-icon btn-sm p-2">
              <Edit2 size={13} />
            </button>
            <button onClick={() => onDelete(expense)} className="btn-ghost btn-icon btn-sm p-2 hover:text-accent-400">
              <Trash2 size={13} />
            </button>
            <ChevronDown size={14} className={clsx('text-white/20 transition-transform ml-1', expanded && 'rotate-180')} />
          </div>
        </td>
      </tr>
      {expanded && expense.splits?.length > 0 && (
        <tr>
          <td colSpan={5} className="!py-0 !px-4">
            <div className="pb-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
              {expense.splits.map(s => (
                <div key={s.id} className="flex items-center gap-2 bg-white/[0.03] rounded-xl px-3 py-2">
                  <div className={clsx('avatar-sm bg-gradient-to-br flex-shrink-0', avatarGradient(s.member_name))}>
                    {initials(s.member_name)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-white truncate">{s.member_name}</p>
                    <p className="text-xs text-white/40 font-mono">{formatINR(s.owed_amount)}</p>
                  </div>
                </div>
              ))}
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

function ExpenseForm({ groups, users, initial, onSubmit, loading }) {
  const [form, setForm] = useState(initial || {
    group: '', description: '', date: new Date().toISOString().slice(0, 10),
    amount: '', currency: 'INR', exchange_rate: '84',
    paid_by: '', split_type: 'equal', notes: '',
    splits_input: [],
  })
  const [participants, setParticipants] = useState(initial?.splits_input || [])

  const selectedGroup = groups.find(g => String(g.id) === String(form.group))
  const groupMembers = selectedGroup?.memberships?.filter(m => !m.left_at) || []

  const toggleParticipant = (userId) => {
    setParticipants(prev => {
      const exists = prev.find(p => String(p.user_id) === String(userId))
      if (exists) return prev.filter(p => String(p.user_id) !== String(userId))
      return [...prev, { user_id: userId, split_value: '1' }]
    })
  }

  const updateSplitValue = (userId, val) => {
    setParticipants(prev => prev.map(p => String(p.user_id) === String(userId) ? { ...p, split_value: val } : p))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    onSubmit({ ...form, splits_input: participants })
  }

  const showSplitValues = form.split_type !== 'equal'
  const splitHint = {
    unequal: 'Enter exact amount each person owes',
    percentage: 'Enter % for each person (must sum to 100)',
    share: 'Enter share count (e.g. 1, 2 for double share)',
  }[form.split_type] || ''

  return (
    <form onSubmit={handleSubmit} className="space-y-4" id="expense-form">
      <div className="grid grid-cols-2 gap-3">
        <div className="field-group col-span-2">
          <label className="label">Group</label>
          <select className="select" required value={form.group}
            onChange={e => setForm(f => ({ ...f, group: e.target.value }))}>
            <option value="">Select group…</option>
            {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
        </div>
        <div className="field-group col-span-2">
          <label className="label">Description</label>
          <input className="input" placeholder="Dinner at Marina Bites" required
            value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
        </div>
        <div className="field-group">
          <label className="label">Amount</label>
          <input className="input" type="number" step="0.01" placeholder="1200" required
            value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} />
        </div>
        <div className="field-group">
          <label className="label">Currency</label>
          <select className="select" value={form.currency}
            onChange={e => setForm(f => ({ ...f, currency: e.target.value }))}>
            <option value="INR">INR</option>
            <option value="USD">USD</option>
          </select>
        </div>
        {form.currency === 'USD' && (
          <div className="field-group col-span-2">
            <label className="label">USD → INR Rate</label>
            <input className="input" type="number" step="0.01"
              value={form.exchange_rate} onChange={e => setForm(f => ({ ...f, exchange_rate: e.target.value }))} />
          </div>
        )}
        <div className="field-group">
          <label className="label">Date</label>
          <input className="input" type="date" required
            value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
        </div>
        <div className="field-group">
          <label className="label">Paid By</label>
          <select className="select" required value={form.paid_by}
            onChange={e => setForm(f => ({ ...f, paid_by: e.target.value }))}>
            <option value="">Select payer…</option>
            {users.map(u => <option key={u.id} value={u.id}>{u.display_name || u.username}</option>)}
          </select>
        </div>
        <div className="field-group col-span-2">
          <label className="label">Split Type</label>
          <div className="flex gap-2 flex-wrap">
            {SPLIT_TYPES.map(t => (
              <button key={t} type="button"
                onClick={() => setForm(f => ({ ...f, split_type: t }))}
                className={clsx('btn btn-sm capitalize', form.split_type === t ? 'btn-primary' : 'btn-secondary')}>
                {splitTypeLabel(t)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Participants */}
      {form.group && (
        <div className="field-group">
          <label className="label">Participants</label>
          {splitHint && <p className="text-xs text-white/30 mb-2">{splitHint}</p>}
          <div className="space-y-1.5">
            {groupMembers.map(m => {
              const u = m.user_detail
              const name = u?.display_name || u?.username
              const selected = participants.find(p => String(p.user_id) === String(u?.id))
              return (
                <div key={m.id}
                  className={clsx(
                    'flex items-center gap-3 p-2.5 rounded-xl border cursor-pointer transition-all',
                    selected ? 'bg-brand-500/10 border-brand-500/30' : 'bg-white/[0.03] border-white/[0.06] hover:border-white/[0.12]'
                  )}
                  onClick={() => toggleParticipant(u.id)}>
                  <div className={clsx('avatar-sm bg-gradient-to-br flex-shrink-0', avatarGradient(name))}>
                    {initials(name)}
                  </div>
                  <span className="flex-1 text-sm text-white">{name}</span>
                  {showSplitValues && selected && (
                    <input
                      className="input w-24 text-xs py-1 px-2"
                      type="number" step="0.01"
                      placeholder={form.split_type === 'percentage' ? '%' : 'value'}
                      value={selected.split_value}
                      onClick={e => e.stopPropagation()}
                      onChange={e => updateSplitValue(u.id, e.target.value)}
                    />
                  )}
                  <div className={clsx('w-4 h-4 rounded-full border flex-shrink-0 transition-all',
                    selected ? 'bg-brand-500 border-brand-400' : 'border-white/20')} />
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div className="field-group">
        <label className="label">Notes (optional)</label>
        <input className="input" placeholder="Any notes…"
          value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
      </div>
    </form>
  )
}

export default function Expenses() {
  const toast = useToast()
  const [expenses, setExpenses] = useState([])
  const [groups, setGroups] = useState([])
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [editExpense, setEditExpense] = useState(null)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [filterGroup, setFilterGroup] = useState('')

  useEffect(() => {
    Promise.all([getExpenses(), getGroups(), getUsers()])
      .then(([eRes, gRes, uRes]) => {
        setExpenses(eRes.data)
        setGroups(gRes.data)
        setUsers(uRes.data)
      })
      .finally(() => setLoading(false))
  }, [])

  const refresh = (gId) => getExpenses(gId || filterGroup || undefined).then(r => setExpenses(r.data))

  const handleCreate = async (form) => {
    setSaving(true)
    try {
      await createExpense(form)
      await refresh()
      setShowCreate(false)
      toast('Expense added!', 'success')
    } catch (e) { toast(e.response?.data?.detail || 'Failed to add', 'error') }
    finally { setSaving(false) }
  }

  const handleEdit = async (form) => {
    setSaving(true)
    try {
      await updateExpense(editExpense.id, form)
      await refresh()
      setEditExpense(null)
      toast('Expense updated', 'success')
    } catch { toast('Failed to update', 'error') }
    finally { setSaving(false) }
  }

  const handleDelete = async (expense) => {
    if (!confirm(`Delete "${expense.description}"?`)) return
    try {
      await deleteExpense(expense.id)
      setExpenses(prev => prev.filter(e => e.id !== expense.id))
      toast('Expense deleted', 'success')
    } catch { toast('Failed to delete', 'error') }
  }

  const filtered = expenses.filter(e => {
    const matchSearch = !search || e.description.toLowerCase().includes(search.toLowerCase())
    const matchGroup = !filterGroup || String(e.group) === filterGroup
    return matchSearch && matchGroup
  })

  if (loading) return <PageLoader />

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader
        title="Expenses"
        subtitle={`${expenses.length} total expenses`}
        icon={Receipt}
        actions={
          <button onClick={() => setShowCreate(true)} className="btn-primary">
            <Plus size={16} /> Add Expense
          </button>
        }
      />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
          <input className="input pl-9" placeholder="Search expenses…"
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="select w-48" value={filterGroup}
          onChange={e => { setFilterGroup(e.target.value); refresh(e.target.value) }}>
          <option value="">All groups</option>
          {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
        </select>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="card empty-state py-20">
          <div className="empty-icon"><Receipt size={28} /></div>
          <p className="section-title">No expenses found</p>
          <p className="text-white/30 text-sm">
            {search ? 'Try a different search term' : 'Add your first expense to get started'}
          </p>
          {!search && (
            <button onClick={() => setShowCreate(true)} className="btn-primary mt-4">
              <Plus size={16} /> Add Expense
            </button>
          )}
        </div>
      ) : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Expense</th>
                <th>Paid By</th>
                <th>Split</th>
                <th>Amount</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(e => (
                <ExpenseRow key={e.id} expense={e} onEdit={setEditExpense} onDelete={handleDelete} />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Add Expense" size="lg"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setShowCreate(false)}>Cancel</button>
            <button className="btn-primary" type="submit" form="expense-form" disabled={saving}>
              {saving ? <Spinner size="sm" /> : <Plus size={15} />} Add Expense
            </button>
          </>
        }>
        <ExpenseForm groups={groups} users={users} onSubmit={handleCreate} loading={saving} />
      </Modal>

      {/* Edit modal */}
      <Modal open={!!editExpense} onClose={() => setEditExpense(null)} title="Edit Expense" size="lg"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setEditExpense(null)}>Cancel</button>
            <button className="btn-primary" type="submit" form="expense-form" disabled={saving}>
              {saving ? <Spinner size="sm" /> : null} Save Changes
            </button>
          </>
        }>
        {editExpense && (
          <ExpenseForm groups={groups} users={users} initial={editExpense} onSubmit={handleEdit} loading={saving} />
        )}
      </Modal>
    </div>
  )
}
