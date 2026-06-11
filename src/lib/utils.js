const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;' }
const esc = s => String(s).replace(/[&<>]/g, c => ESC[c])

const prettyName = key => key.replace(/_/g, ' ').replace(/^./, c => c.toUpperCase())

function fmtReset(val) {
  if (!val) return ''
  const d = new Date(val)
  const diff = d - Date.now()
  if (diff <= 0) return 'soon'
  const h = Math.floor(diff / 3600000)
  const m = Math.floor((diff % 3600000) / 60000)
  if (h >= 24) return d.toLocaleDateString('en-US', { weekday: 'short', hour: 'numeric', minute: '2-digit' })
  return h > 0 ? `Resets in ${h} hr ${m} min` : `Resets in ${m} min`
}

function pctOf(obj) {
  if (obj == null) return null
  if (typeof obj.utilization === 'number') return Math.round(obj.utilization * (obj.utilization <= 1 ? 100 : 1))
  const used = obj.used ?? obj.current ?? obj.count
  const max = obj.max ?? obj.limit ?? obj.maximum
  if (typeof used === 'number' && typeof max === 'number' && max > 0) return Math.round(used / max * 100)
  return null
}

function resetOf(obj) {
  const v = obj?.resets_at ?? obj?.reset_at ?? obj?.resetTime ?? obj?.reset_time ?? obj?.resetAt
  return v ? fmtReset(typeof v === 'number' && v < 1e12 ? v * 1000 : v) : ''
}

function fillClass(pct) {
  return pct >= 90 ? 'danger' : pct >= 70 ? 'warn' : ''
}

const PLAN_LABELS = {
  stripe_subscription: 'Pro',
  free: 'Free',
  enterprise: 'Enterprise',
  team: 'Team',
}

function planLabel(billingType) {
  return PLAN_LABELS[billingType] || billingType
}

if (typeof module !== 'undefined') {
  module.exports = { esc, prettyName, fmtReset, pctOf, resetOf, fillClass, planLabel }
}
