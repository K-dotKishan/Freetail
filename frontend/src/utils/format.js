// Currency formatting
export function formatINR(amount) {
  const n = parseFloat(amount) || 0
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(n)
}

export function formatUSD(amount) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(parseFloat(amount) || 0)
}

export function formatCurrency(amount, currency = 'INR') {
  return currency === 'USD' ? formatUSD(amount) : formatINR(amount)
}

// Date formatting
export function formatDate(dateStr) {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function formatDateShort(dateStr) {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

// Avatar color from name
const COLORS = [
  'from-violet-500 to-indigo-600',
  'from-pink-500 to-rose-600',
  'from-emerald-500 to-teal-600',
  'from-amber-500 to-orange-600',
  'from-sky-500 to-blue-600',
  'from-fuchsia-500 to-purple-600',
]
export function avatarGradient(name) {
  const idx = (name?.charCodeAt(0) || 0) % COLORS.length
  return COLORS[idx]
}

export function initials(name) {
  if (!name) return '?'
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
}

// Split type label
export function splitTypeLabel(type) {
  return { equal: 'Equal', unequal: 'Unequal', percentage: 'Percentage', share: 'Shares' }[type] || type
}

// Severity colors
export function severityClass(severity) {
  return {
    error: 'badge-danger',
    warning: 'badge-warning',
    info: 'badge-brand',
  }[severity] || 'badge-neutral'
}
