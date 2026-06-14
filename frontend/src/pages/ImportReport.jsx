import React, { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  FileText, CheckCircle, XCircle, AlertTriangle, Info,
  Download, ArrowLeft, BarChart2
} from 'lucide-react'
import { getImportReport } from '../api/importApi'
import PageHeader from '../components/PageHeader'
import { PageLoader } from '../components/Spinner'
import { formatDate } from '../utils/format'
import clsx from 'clsx'

const SEV_ICON = { error: XCircle, warning: AlertTriangle, info: Info }
const SEV_COLOR = {
  error: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
  warning: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  info: 'text-brand-300 bg-brand-500/10 border-brand-500/20',
}
const DEC_COLOR = {
  accept: 'badge-success',
  reject: 'badge-danger',
  accept_modified: 'badge-brand',
  pending: 'badge-warning',
}

function AnomalyTag({ anomaly }) {
  const Icon = SEV_ICON[anomaly.severity] || Info
  return (
    <div className={clsx('flex items-start gap-2 p-2.5 rounded-xl border text-xs', SEV_COLOR[anomaly.severity] || '')}>
      <Icon size={12} className="flex-shrink-0 mt-0.5" />
      <div>
        <span className="font-medium">{anomaly.code?.replace(/_/g, ' ')}</span>
        <p className="text-current opacity-70 mt-0.5">{anomaly.message}</p>
      </div>
    </div>
  )
}

function SummaryBar({ label, count, total, color }) {
  const pct = total > 0 ? (count / total) * 100 : 0
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-white/50">{label}</span>
        <span className={clsx('font-mono font-medium', color)}>{count}</span>
      </div>
      <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
        <div className={clsx('h-full rounded-full transition-all duration-700', color.replace('text-', 'bg-'))}
          style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

export default function ImportReport() {
  const { batchId } = useParams()
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    getImportReport(batchId, 'json')
      .then(r => setReport(r.data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [batchId])

  const downloadText = async () => {
    const res = await getImportReport(batchId, 'text')
    const blob = new Blob([res.data], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `import-report-${batchId}.txt`; a.click()
  }

  if (loading) return <PageLoader />
  if (!report) return <div className="card p-8 text-center text-white/40">Report not found</div>

  const rows = report.rows || []
  const anomalyRows = rows.filter(r => r.has_anomaly)
  const accepted = rows.filter(r => r.decision === 'accept' || r.decision === 'accept_modified')
  const rejected = rows.filter(r => r.decision === 'reject')

  // Aggregate anomaly codes
  const codeCounts = {}
  rows.forEach(r => r.anomalies?.forEach(a => {
    if (!codeCounts[a.code]) codeCounts[a.code] = { count: 0, severity: a.severity, message: a.message }
    codeCounts[a.code].count++
  }))

  const filteredRows = rows.filter(r => {
    if (filter === 'anomaly') return r.has_anomaly
    if (filter === 'clean') return !r.has_anomaly
    if (filter === 'accepted') return r.decision === 'accept' || r.decision === 'accept_modified'
    if (filter === 'rejected') return r.decision === 'reject'
    return true
  })

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader
        title="Import Report"
        subtitle={`Batch #${batchId} · ${report.file_name}`}
        icon={FileText}
        actions={
          <div className="flex gap-2">
            <Link to="/import" className="btn-secondary btn-sm">
              <ArrowLeft size={14} /> Back
            </Link>
            <button onClick={downloadText} className="btn-secondary btn-sm">
              <Download size={14} /> Download .txt
            </button>
          </div>
        }
      />

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Rows', value: report.total_rows, color: 'text-white' },
          { label: 'Accepted', value: accepted.length, color: 'text-emerald-400' },
          { label: 'Rejected', value: rejected.length, color: 'text-rose-400' },
          { label: 'Anomalies', value: report.anomaly_count, color: 'text-amber-400' },
        ].map(s => (
          <div key={s.label} className="stat-card">
            <p className="stat-label">{s.label}</p>
            <p className={clsx('stat-value', s.color)}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Anomaly summary */}
        <div className="card p-5 space-y-4">
          <div className="flex items-center gap-2">
            <BarChart2 size={15} className="text-brand-400" />
            <h3 className="font-semibold text-white">Anomaly Types</h3>
          </div>
          <SummaryBar label="Accepted" count={accepted.length} total={rows.length} color="text-emerald-400" />
          <SummaryBar label="Rejected" count={rejected.length} total={rows.length} color="text-rose-400" />
          <SummaryBar label="With Anomalies" count={anomalyRows.length} total={rows.length} color="text-amber-400" />

          <div className="divider" />

          <div className="space-y-2">
            {Object.entries(codeCounts).sort((a, b) => b[1].count - a[1].count).map(([code, info]) => {
              const Icon = SEV_ICON[info.severity] || Info
              return (
                <div key={code} className="flex items-start gap-2">
                  <Icon size={12} className={clsx('flex-shrink-0 mt-0.5', SEVERITY_COLOR_TEXT[info.severity])} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-white/60 font-medium">{code.replace(/_/g, ' ')}</p>
                  </div>
                  <span className="text-xs font-mono text-white/30">×{info.count}</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Row list */}
        <div className="lg:col-span-2 space-y-4">
          {/* Filter tabs */}
          <div className="flex gap-2 flex-wrap">
            {[
              ['all', 'All'], ['anomaly', 'Issues'], ['clean', 'Clean'],
              ['accepted', 'Accepted'], ['rejected', 'Rejected']
            ].map(([val, label]) => (
              <button key={val} onClick={() => setFilter(val)}
                className={clsx('btn btn-sm', filter === val ? 'btn-primary' : 'btn-secondary')}>
                {label}
              </button>
            ))}
          </div>

          <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
            {filteredRows.map(row => (
              <div key={row.row_number} className={clsx(
                'card p-4 space-y-2',
                row.decision === 'reject' && 'opacity-50',
              )}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-white/20 font-mono">#{row.row_number}</span>
                      <p className="text-sm font-medium text-white truncate">{row.description}</p>
                    </div>
                    <p className="text-xs text-white/30 mt-0.5">
                      {formatDate(row.date)} · {row.amount} {row.currency}
                    </p>
                  </div>
                  <span className={clsx('badge flex-shrink-0', DEC_COLOR[row.decision] || 'badge-neutral')}>
                    {row.decision}
                  </span>
                </div>
                {row.anomalies?.length > 0 && (
                  <div className="grid grid-cols-1 gap-1.5">
                    {row.anomalies.map((a, i) => <AnomalyTag key={i} anomaly={a} />)}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// Helper (inline since not in format.js)
const SEVERITY_COLOR_TEXT = {
  error: 'text-rose-400',
  warning: 'text-amber-400',
  info: 'text-brand-300',
}
