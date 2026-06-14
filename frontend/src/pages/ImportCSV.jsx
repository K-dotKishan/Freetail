import React, { useEffect, useState, useRef } from 'react'
import {
  Upload, FileText, AlertTriangle, CheckCircle, XCircle,
  Info, ChevronDown, ChevronRight, Eye, Check, X,
  RefreshCw, FileCheck, ArrowRight, Loader2
} from 'lucide-react'
import { getGroups } from '../api/groupApi'
import { uploadCSV, getImportBatches, approveImport, updateRowDecision } from '../api/importApi'
import { useToast } from '../components/Toast'
import { useNavigate } from 'react-router-dom'
import PageHeader from '../components/PageHeader'
import { Spinner } from '../components/Spinner'
import { formatDate, severityClass } from '../utils/format'
import clsx from 'clsx'

const SEVERITY_ICON = {
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
}
const SEVERITY_COLOR = {
  error: 'text-rose-400',
  warning: 'text-amber-400',
  info: 'text-brand-300',
}
const DECISION_COLORS = {
  accept: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  reject: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
  accept_modified: 'bg-brand-500/15 text-brand-300 border-brand-500/30',
  pending: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
}

function DropZone({ onFile }) {
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef()

  const handleDrop = (e) => {
    e.preventDefault()
    setDragging(false)
    const f = e.dataTransfer.files[0]
    if (f) onFile(f)
  }

  return (
    <div
      className={clsx(
        'relative rounded-3xl border-2 border-dashed transition-all duration-300 cursor-pointer group',
        dragging
          ? 'border-brand-400 bg-brand-500/10 shadow-glow-sm'
          : 'border-white/15 bg-white/[0.02] hover:border-brand-500/50 hover:bg-brand-500/5'
      )}
      onDragOver={e => { e.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
    >
      <input ref={inputRef} type="file" accept=".csv" className="hidden" onChange={e => e.target.files[0] && onFile(e.target.files[0])} />
      <div className="flex flex-col items-center justify-center py-16 px-8 text-center gap-4">
        <div className={clsx(
          'w-20 h-20 rounded-3xl flex items-center justify-center transition-all duration-300',
          dragging ? 'bg-brand-500/30 shadow-glow' : 'bg-brand-500/10 group-hover:bg-brand-500/20'
        )}>
          <Upload size={36} className="text-brand-400" />
        </div>
        <div>
          <p className="text-white font-semibold text-lg">Drop your CSV here</p>
          <p className="text-white/40 text-sm mt-1">or click to browse files</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-center">
          {['Date detection', 'Duplicate flagging', 'Currency handling', 'Member validation'].map(tag => (
            <span key={tag} className="badge-brand text-[11px]">{tag}</span>
          ))}
        </div>
      </div>
    </div>
  )
}

function AnomalyBadge({ anomaly }) {
  const Icon = SEVERITY_ICON[anomaly.severity] || Info
  return (
    <div className={clsx(
      'flex items-start gap-2.5 p-3 rounded-xl border text-xs',
      anomaly.severity === 'error' && 'bg-rose-500/8 border-rose-500/20',
      anomaly.severity === 'warning' && 'bg-amber-500/8 border-amber-500/20',
      anomaly.severity === 'info' && 'bg-brand-500/8 border-brand-500/20',
    )}>
      <Icon size={13} className={clsx('flex-shrink-0 mt-0.5', SEVERITY_COLOR[anomaly.severity])} />
      <div className="flex-1 min-w-0">
        <p className={clsx('font-medium', SEVERITY_COLOR[anomaly.severity])}>{anomaly.code?.replace(/_/g, ' ')}</p>
        <p className="text-white/50 mt-0.5 leading-relaxed">{anomaly.message}</p>
        {anomaly.policy && (
          <p className="text-white/30 mt-1 italic">→ {anomaly.policy}</p>
        )}
      </div>
    </div>
  )
}

function ImportRowCard({ row, onDecision }) {
  const [expanded, setExpanded] = useState(false)
  const pd = row.parsed_data || {}
  const hasErrors = row.anomalies?.some(a => a.severity === 'error')

  return (
    <div className={clsx(
      'rounded-2xl border transition-all duration-200',
      row.decision === 'reject' && 'opacity-50 border-white/[0.05] bg-white/[0.01]',
      row.decision === 'accept' && 'border-emerald-500/20 bg-emerald-500/3',
      row.decision === 'pending' && 'border-amber-500/20 bg-amber-500/3',
      !row.has_anomaly && 'border-white/[0.06] bg-white/[0.02]',
    )}>
      {/* Row header */}
      <div className="flex items-center gap-3 p-4 cursor-pointer" onClick={() => setExpanded(v => !v)}>
        <span className="text-xs text-white/20 font-mono w-6 flex-shrink-0">#{row.row_number}</span>

        {/* Decision indicator */}
        <div className={clsx(
          'w-2 h-2 rounded-full flex-shrink-0',
          row.decision === 'accept' && 'bg-emerald-400',
          row.decision === 'reject' && 'bg-rose-400',
          row.decision === 'pending' && 'bg-amber-400',
          row.decision === 'accept_modified' && 'bg-brand-400',
        )} />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-white truncate">{pd.description || row.raw_data?.description || '—'}</p>
            {pd.is_settlement && <span className="badge-warning text-[10px]">settlement</span>}
          </div>
          <div className="flex items-center gap-3 mt-0.5">
            <span className="text-xs text-white/30">{pd.date || '?'}</span>
            <span className="text-xs text-white/30">{pd.paid_by_name}</span>
            {pd.amount && <span className="text-xs font-mono text-white/50">{pd.amount} {pd.currency}</span>}
          </div>
        </div>

        {/* Anomaly count */}
        {row.has_anomaly && (
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {row.anomalies?.filter(a => a.severity === 'error').length > 0 && (
              <span className="badge-danger text-[10px]">
                {row.anomalies.filter(a => a.severity === 'error').length} error
              </span>
            )}
            {row.anomalies?.filter(a => a.severity === 'warning').length > 0 && (
              <span className="badge-warning text-[10px]">
                {row.anomalies.filter(a => a.severity === 'warning').length} warn
              </span>
            )}
          </div>
        )}

        {/* Decision buttons */}
        <div className="flex items-center gap-1 flex-shrink-0" onClick={e => e.stopPropagation()}>
          <button
            onClick={() => onDecision(row.id, 'accept')}
            className={clsx('p-1.5 rounded-lg transition-all', row.decision === 'accept' ? 'bg-emerald-500/20 text-emerald-400' : 'text-white/20 hover:text-emerald-400 hover:bg-emerald-500/10')}>
            <Check size={13} />
          </button>
          <button
            onClick={() => onDecision(row.id, 'reject')}
            className={clsx('p-1.5 rounded-lg transition-all', row.decision === 'reject' ? 'bg-rose-500/20 text-rose-400' : 'text-white/20 hover:text-rose-400 hover:bg-rose-500/10')}>
            <X size={13} />
          </button>
        </div>

        <ChevronDown size={13} className={clsx('text-white/20 flex-shrink-0 transition-transform', expanded && 'rotate-180')} />
      </div>

      {/* Expanded: anomalies */}
      {expanded && row.anomalies?.length > 0 && (
        <div className="px-4 pb-4 space-y-2 border-t border-white/[0.05] pt-3">
          {row.anomalies.map((a, i) => <AnomalyBadge key={i} anomaly={a} />)}
        </div>
      )}
    </div>
  )
}

export default function ImportCSV() {
  const toast = useToast()
  const navigate = useNavigate()
  const [groups, setGroups] = useState([])
  const [selectedGroup, setSelectedGroup] = useState('')
  const [file, setFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [approving, setApproving] = useState(false)
  const [batch, setBatch] = useState(null)
  const [rows, setRows] = useState([])
  const [decisions, setDecisions] = useState({}) // rowId -> decision
  const [pastBatches, setPastBatches] = useState([])
  const [tab, setTab] = useState('all') // all | anomaly | clean

  useEffect(() => {
    Promise.all([getGroups()])
      .then(([gRes]) => {
        setGroups(gRes.data)
        if (gRes.data.length > 0) setSelectedGroup(String(gRes.data[0].id))
      })
  }, [])

  const handleUpload = async () => {
    if (!file || !selectedGroup) { toast('Select a group and file first', 'warning'); return }
    setUploading(true)
    try {
      const res = await uploadCSV(selectedGroup, file)
      const data = res.data
      setBatch(data)
      const rowsList = data.rows || []
      setRows(rowsList)
      // Set initial decisions from server suggestions
      const init = {}
      rowsList.forEach(r => { init[r.id] = r.decision })
      setDecisions(init)
      toast(`Parsed ${data.total_rows} rows — ${data.anomaly_count} anomalies detected`, 'info')
    } catch (err) {
      toast(err.response?.data?.error || 'Upload failed', 'error')
    } finally { setUploading(false) }
  }

  const handleDecision = async (rowId, decision) => {
    setDecisions(prev => ({ ...prev, [rowId]: decision }))
    try { await updateRowDecision(batch.batch_id, rowId, decision) } catch {}
  }

  const handleAcceptAll = () => {
    const next = { ...decisions }
    rows.forEach(r => { if (!r.has_anomaly) next[r.id] = 'accept' })
    setDecisions(next)
  }

  const handleApprove = async () => {
    setApproving(true)
    try {
      const decList = Object.entries(decisions).map(([row_id, decision]) => ({ row_id: parseInt(row_id), decision }))
      const res = await approveImport(batch.batch_id, decList)
      toast(`Import complete: ${res.data.created_expenses} expenses, ${res.data.created_settlements} settlements created`, 'success')
      navigate(`/import/${batch.batch_id}/report`)
    } catch (err) {
      toast(err.response?.data?.error || 'Approval failed', 'error')
    } finally { setApproving(false) }
  }

  // Stats
  const accepted = Object.values(decisions).filter(d => d === 'accept' || d === 'accept_modified').length
  const rejected = Object.values(decisions).filter(d => d === 'reject').length
  const pending = Object.values(decisions).filter(d => d === 'pending').length

  const filteredRows = rows.filter(r => {
    if (tab === 'anomaly') return r.has_anomaly
    if (tab === 'clean') return !r.has_anomaly
    return true
  })

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader
        title="Import CSV"
        subtitle="Import expenses from the CSV export"
        icon={Upload}
        actions={
          batch && (
            <button
              onClick={() => navigate(`/import/${batch.batch_id}/report`)}
              className="btn-secondary btn-sm">
              <FileText size={14} /> View Report
            </button>
          )
        }
      />

      {!batch ? (
        /* ── Step 1: Upload ── */
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="card p-6 space-y-4">
            <h2 className="font-semibold text-white">Step 1: Select Group</h2>
            <div className="field-group">
              <label className="label">Import into group</label>
              <select className="select" value={selectedGroup} onChange={e => setSelectedGroup(e.target.value)}>
                <option value="">Select group…</option>
                {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
            </div>
          </div>

          <div className="card p-6 space-y-4">
            <h2 className="font-semibold text-white">Step 2: Select File</h2>
            <DropZone onFile={f => { setFile(f) }} />
            {file && (
              <div className="flex items-center gap-3 p-3 rounded-xl bg-brand-500/10 border border-brand-500/20">
                <FileText size={16} className="text-brand-400 flex-shrink-0" />
                <span className="text-sm text-brand-300">{file.name}</span>
                <button onClick={() => setFile(null)} className="ml-auto text-white/30 hover:text-white/60 transition-colors">
                  <X size={14} />
                </button>
              </div>
            )}
          </div>

          <button
            onClick={handleUpload}
            disabled={!file || !selectedGroup || uploading}
            className="btn-primary btn-lg w-full justify-center">
            {uploading ? <Loader2 size={18} className="animate-spin" /> : <Upload size={18} />}
            {uploading ? 'Analyzing CSV…' : 'Upload & Analyze'}
          </button>

          {/* Anomaly policy reminder */}
          <div className="card p-5 space-y-3">
            <h3 className="text-sm font-semibold text-white/60">What the importer checks</h3>
            <div className="grid grid-cols-2 gap-2 text-xs text-white/40">
              {[
                'Duplicate rows', 'Missing currency', 'Ambiguous dates',
                'Percentage sums', 'Unknown members', 'Settlement rows',
                'Negative amounts', 'Zero amounts', 'Ex-member splits',
                'Near-duplicate entries', 'Missing payer', 'Foreign currency',
              ].map(item => (
                <div key={item} className="flex items-center gap-2">
                  <CheckCircle size={11} className="text-brand-400/60 flex-shrink-0" />
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* ── Step 2: Review ── */
        <div className="space-y-5">
          {/* Summary strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'Total Rows', value: batch.total_rows, color: 'text-white' },
              { label: 'Anomalies', value: batch.anomaly_count, color: 'text-amber-400' },
              { label: 'Accepted', value: accepted, color: 'text-emerald-400' },
              { label: 'Pending', value: pending, color: 'text-amber-400' },
            ].map(s => (
              <div key={s.label} className="stat-card py-4">
                <p className="stat-label">{s.label}</p>
                <p className={clsx('stat-value', s.color)}>{s.value}</p>
              </div>
            ))}
          </div>

          {/* Action bar */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              {['all', 'anomaly', 'clean'].map(t => (
                <button key={t}
                  onClick={() => setTab(t)}
                  className={clsx('btn btn-sm capitalize', tab === t ? 'btn-primary' : 'btn-secondary')}>
                  {t === 'all' ? `All (${rows.length})` : t === 'anomaly' ? `Issues (${batch.anomaly_count})` : `Clean (${rows.length - batch.anomaly_count})`}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <button onClick={handleAcceptAll} className="btn-secondary btn-sm">
                <Check size={13} /> Accept Clean Rows
              </button>
              <button onClick={() => { setBatch(null); setFile(null); setRows([]) }} className="btn-secondary btn-sm">
                <RefreshCw size={13} /> Reset
              </button>
              <button
                onClick={handleApprove}
                disabled={pending > 0 || approving}
                className="btn-primary btn-sm">
                {approving ? <Spinner size="sm" /> : <FileCheck size={14} />}
                {approving ? 'Importing…' : `Import ${accepted} Rows`}
              </button>
            </div>
          </div>

          {pending > 0 && (
            <div className="alert-warning">
              <AlertTriangle size={15} />
              <span>{pending} rows still need a decision (accept or reject) before you can import.</span>
            </div>
          )}

          {/* Row list */}
          <div className="space-y-2">
            {filteredRows.map(row => (
              <ImportRowCard
                key={row.id}
                row={{ ...row, decision: decisions[row.id] || row.decision }}
                onDecision={handleDecision}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
