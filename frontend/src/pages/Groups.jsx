import React, { useEffect, useState } from 'react'
import { Users, Plus, UserPlus, UserMinus, Edit2, Trash2, Calendar, Crown } from 'lucide-react'
import { getGroups, createGroup, updateGroup, deleteGroup, addMember, updateMembership } from '../api/groupApi'
import { getUsers } from '../api/authApi'
import { useToast } from '../components/Toast'
import { useAuth } from '../context/AuthContext'
import Modal from '../components/Modal'
import PageHeader from '../components/PageHeader'
import { PageLoader } from '../components/Spinner'
import { formatDate, initials, avatarGradient } from '../utils/format'
import clsx from 'clsx'

function MemberChip({ membership, onLeave }) {
  const name = membership.user_detail?.display_name || membership.user_detail?.username || membership.guest_name
  return (
    <div className={clsx(
      'flex items-center gap-2 px-3 py-2 rounded-xl border transition-all',
      membership.left_at
        ? 'bg-white/[0.02] border-white/[0.05] opacity-50'
        : 'bg-white/[0.05] border-white/[0.08] hover:border-white/[0.15]'
    )}>
      <div className={clsx('avatar-sm bg-gradient-to-br flex-shrink-0', avatarGradient(name))}>
        {initials(name)}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-white truncate">{name}</p>
        {membership.left_at && <p className="text-[10px] text-white/30">Left {formatDate(membership.left_at)}</p>}
      </div>
      {!membership.left_at && onLeave && (
        <button onClick={() => onLeave(membership)} className="text-white/20 hover:text-accent-400 transition-colors ml-1">
          <UserMinus size={12} />
        </button>
      )}
    </div>
  )
}

function GroupCard({ group, onEdit, onDelete, onAddMember, onRemoveMember }) {
  const activeMembers = group.memberships?.filter(m => !m.left_at) || []
  const pastMembers = group.memberships?.filter(m => m.left_at) || []

  return (
    <div className="card-hover p-6 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-brand flex items-center justify-center text-lg font-bold text-white shadow-glow-sm flex-shrink-0">
            {group.name[0].toUpperCase()}
          </div>
          <div>
            <h3 className="font-semibold text-white">{group.name}</h3>
            {group.description && <p className="text-xs text-white/40 mt-0.5 line-clamp-1">{group.description}</p>}
            <div className="flex items-center gap-2 mt-1">
              <span className="badge-brand text-[10px]">{group.default_currency}</span>
              <span className="text-[10px] text-white/30">{activeMembers.length} active</span>
            </div>
          </div>
        </div>
        <div className="flex gap-1 flex-shrink-0">
          <button onClick={() => onEdit(group)} className="btn-ghost btn-icon btn-sm p-2">
            <Edit2 size={14} />
          </button>
          <button onClick={() => onDelete(group)} className="btn-ghost btn-icon btn-sm p-2 hover:text-accent-400">
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Active members */}
      <div>
        <p className="text-[10px] text-white/30 uppercase tracking-wider font-medium mb-2">Active Members</p>
        <div className="grid grid-cols-2 gap-1.5">
          {activeMembers.map(m => (
            <MemberChip key={m.id} membership={m} onLeave={onRemoveMember} />
          ))}
        </div>
      </div>

      {/* Past members */}
      {pastMembers.length > 0 && (
        <div>
          <p className="text-[10px] text-white/30 uppercase tracking-wider font-medium mb-2">Past Members</p>
          <div className="grid grid-cols-2 gap-1.5">
            {pastMembers.map(m => (
              <MemberChip key={m.id} membership={m} />
            ))}
          </div>
        </div>
      )}

      <button onClick={() => onAddMember(group)} className="btn-secondary btn-sm w-full justify-center">
        <UserPlus size={13} /> Add Member
      </button>
    </div>
  )
}

export default function Groups() {
  const { user } = useAuth()
  const toast = useToast()
  const [groups, setGroups] = useState([])
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [showAddMember, setShowAddMember] = useState(null) // group
  const [showLeave, setShowLeave] = useState(null)         // membership
  const [editGroup, setEditGroup] = useState(null)

  const [createForm, setCreateForm] = useState({ name: '', description: '', default_currency: 'INR' })
  const [memberForm, setMemberForm] = useState({ user_id: '', joined_at: '' })
  const [leaveForm, setLeaveForm] = useState({ left_at: '' })

  useEffect(() => {
    Promise.all([getGroups(), getUsers()])
      .then(([gRes, uRes]) => {
        setGroups(gRes.data)
        setUsers(uRes.data)
      })
      .finally(() => setLoading(false))
  }, [])

  const refresh = () => getGroups().then(r => setGroups(r.data))

  const handleCreate = async (e) => {
    e.preventDefault()
    try {
      await createGroup(createForm)
      await refresh()
      setShowCreate(false)
      setCreateForm({ name: '', description: '', default_currency: 'INR' })
      toast('Group created!', 'success')
    } catch { toast('Failed to create group', 'error') }
  }

  const handleEdit = async (e) => {
    e.preventDefault()
    try {
      await updateGroup(editGroup.id, editGroup)
      await refresh()
      setEditGroup(null)
      toast('Group updated', 'success')
    } catch { toast('Failed to update', 'error') }
  }

  const handleDelete = async (group) => {
    if (!confirm(`Delete "${group.name}"? This cannot be undone.`)) return
    try {
      await deleteGroup(group.id)
      await refresh()
      toast('Group deleted', 'success')
    } catch { toast('Failed to delete', 'error') }
  }

  const handleAddMember = async (e) => {
    e.preventDefault()
    try {
      await addMember(showAddMember.id, memberForm)
      await refresh()
      setShowAddMember(null)
      setMemberForm({ user_id: '', joined_at: '' })
      toast('Member added!', 'success')
    } catch { toast('Failed to add member', 'error') }
  }

  const handleLeave = async (e) => {
    e.preventDefault()
    try {
      await updateMembership(showLeave.group, showLeave.id, leaveForm)
      await refresh()
      setShowLeave(null)
      toast('Member removed', 'success')
    } catch { toast('Failed to update membership', 'error') }
  }

  if (loading) return <PageLoader />

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader
        title="Groups"
        subtitle="Manage your expense-sharing groups"
        icon={Users}
        actions={
          <button onClick={() => setShowCreate(true)} className="btn-primary">
            <Plus size={16} /> New Group
          </button>
        }
      />

      {groups.length === 0 ? (
        <div className="card empty-state py-20">
          <div className="empty-icon"><Users size={28} /></div>
          <p className="section-title">No groups yet</p>
          <p className="text-white/30 text-sm">Create a group to start tracking shared expenses</p>
          <button onClick={() => setShowCreate(true)} className="btn-primary mt-4">
            <Plus size={16} /> Create your first group
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {groups.map(g => (
            <GroupCard
              key={g.id}
              group={g}
              onEdit={setEditGroup}
              onDelete={handleDelete}
              onAddMember={setShowAddMember}
              onRemoveMember={(m) => { setShowLeave({ ...m, group: g.id }); setLeaveForm({ left_at: '' }) }}
            />
          ))}
        </div>
      )}

      {/* Create group modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Create Group"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setShowCreate(false)}>Cancel</button>
            <button className="btn-primary" form="create-group-form">Create Group</button>
          </>
        }>
        <form id="create-group-form" onSubmit={handleCreate} className="space-y-4">
          <div className="field-group">
            <label className="label">Group Name</label>
            <input className="input" placeholder="Flat 5B" required
              value={createForm.name} onChange={e => setCreateForm(f => ({ ...f, name: e.target.value }))} />
          </div>
          <div className="field-group">
            <label className="label">Description (optional)</label>
            <input className="input" placeholder="Our flat expenses"
              value={createForm.description} onChange={e => setCreateForm(f => ({ ...f, description: e.target.value }))} />
          </div>
          <div className="field-group">
            <label className="label">Default Currency</label>
            <select className="select" value={createForm.default_currency}
              onChange={e => setCreateForm(f => ({ ...f, default_currency: e.target.value }))}>
              <option value="INR">INR — Indian Rupee</option>
              <option value="USD">USD — US Dollar</option>
            </select>
          </div>
        </form>
      </Modal>

      {/* Edit group modal */}
      <Modal open={!!editGroup} onClose={() => setEditGroup(null)} title="Edit Group"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setEditGroup(null)}>Cancel</button>
            <button className="btn-primary" form="edit-group-form">Save Changes</button>
          </>
        }>
        {editGroup && (
          <form id="edit-group-form" onSubmit={handleEdit} className="space-y-4">
            <div className="field-group">
              <label className="label">Group Name</label>
              <input className="input" required value={editGroup.name}
                onChange={e => setEditGroup(g => ({ ...g, name: e.target.value }))} />
            </div>
            <div className="field-group">
              <label className="label">Description</label>
              <input className="input" value={editGroup.description || ''}
                onChange={e => setEditGroup(g => ({ ...g, description: e.target.value }))} />
            </div>
          </form>
        )}
      </Modal>

      {/* Add member modal */}
      <Modal open={!!showAddMember} onClose={() => setShowAddMember(null)} title={`Add Member to ${showAddMember?.name}`}
        footer={
          <>
            <button className="btn-secondary" onClick={() => setShowAddMember(null)}>Cancel</button>
            <button className="btn-primary" form="add-member-form">Add Member</button>
          </>
        }>
        <form id="add-member-form" onSubmit={handleAddMember} className="space-y-4">
          <div className="field-group">
            <label className="label">Select User</label>
            <select className="select" required value={memberForm.user_id}
              onChange={e => setMemberForm(f => ({ ...f, user_id: e.target.value }))}>
              <option value="">Choose user…</option>
              {users.map(u => (
                <option key={u.id} value={u.id}>{u.display_name || u.username}</option>
              ))}
            </select>
          </div>
          <div className="field-group">
            <label className="label">Joined On</label>
            <input className="input" type="date" required value={memberForm.joined_at}
              onChange={e => setMemberForm(f => ({ ...f, joined_at: e.target.value }))} />
          </div>
        </form>
      </Modal>

      {/* Remove member modal */}
      <Modal open={!!showLeave} onClose={() => setShowLeave(null)} title="Remove Member"
        footer={
          <>
            <button className="btn-secondary" onClick={() => setShowLeave(null)}>Cancel</button>
            <button className="btn-danger" form="leave-form">Confirm Removal</button>
          </>
        }>
        <form id="leave-form" onSubmit={handleLeave} className="space-y-4">
          <div className="alert-warning">
            Member will be marked as having left the group on the specified date.
          </div>
          <div className="field-group">
            <label className="label">Left On</label>
            <input className="input" type="date" required value={leaveForm.left_at}
              onChange={e => setLeaveForm({ left_at: e.target.value })} />
          </div>
        </form>
      </Modal>
    </div>
  )
}
