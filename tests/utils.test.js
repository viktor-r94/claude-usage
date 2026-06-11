const { esc, prettyName, fmtReset, pctOf, resetOf, fillClass, planLabel } = require('../src/lib/utils')

// ---- esc ----
describe('esc', () => {
  test('escapes &, <, >', () => {
    expect(esc('<script>&"test"</script>')).toBe('&lt;script&gt;&amp;"test"&lt;/script&gt;')
  })
  test('leaves safe strings unchanged', () => {
    expect(esc('hello world')).toBe('hello world')
  })
  test('coerces non-strings', () => {
    expect(esc(42)).toBe('42')
    expect(esc(null)).toBe('null')
  })
})

// ---- prettyName ----
describe('prettyName', () => {
  test('replaces underscores and capitalises', () => {
    expect(prettyName('five_hour')).toBe('Five hour')
    expect(prettyName('seven_day')).toBe('Seven day')
    expect(prettyName('rate_limit_tier')).toBe('Rate limit tier')
  })
  test('single word', () => {
    expect(prettyName('usage')).toBe('Usage')
  })
})

// ---- fillClass ----
describe('fillClass', () => {
  test('returns empty string below 70', () => {
    expect(fillClass(0)).toBe('')
    expect(fillClass(69)).toBe('')
  })
  test('returns warn between 70 and 89', () => {
    expect(fillClass(70)).toBe('warn')
    expect(fillClass(89)).toBe('warn')
  })
  test('returns danger at 90 and above', () => {
    expect(fillClass(90)).toBe('danger')
    expect(fillClass(100)).toBe('danger')
  })
})

// ---- pctOf ----
describe('pctOf', () => {
  test('returns null for null/undefined', () => {
    expect(pctOf(null)).toBeNull()
    expect(pctOf(undefined)).toBeNull()
  })
  test('computes from used/max', () => {
    expect(pctOf({ used: 45, max: 100 })).toBe(45)
    expect(pctOf({ used: 1, max: 3 })).toBe(33)
  })
  test('uses current/limit aliases', () => {
    expect(pctOf({ current: 10, limit: 50 })).toBe(20)
  })
  test('uses count/maximum aliases', () => {
    expect(pctOf({ count: 3, maximum: 5 })).toBe(60)
  })
  test('uses utilization (0-1 range)', () => {
    expect(pctOf({ utilization: 0.45 })).toBe(45)
  })
  test('uses utilization (0-100 range)', () => {
    expect(pctOf({ utilization: 45 })).toBe(45)
  })
  test('returns null when max is 0 (avoid divide-by-zero)', () => {
    expect(pctOf({ used: 5, max: 0 })).toBeNull()
  })
  test('returns null for non-numeric values', () => {
    expect(pctOf({ used: 'a', max: 100 })).toBeNull()
  })
  test('returns null for plain object with no known fields', () => {
    expect(pctOf({ foo: 'bar' })).toBeNull()
  })
})

// ---- fmtReset ----
describe('fmtReset', () => {
  test('returns empty string for falsy input', () => {
    expect(fmtReset(null)).toBe('')
    expect(fmtReset(0)).toBe('')
    expect(fmtReset('')).toBe('')
  })
  test('returns "soon" for past dates', () => {
    expect(fmtReset(new Date(Date.now() - 1000).toISOString())).toBe('soon')
  })
  test('formats minutes-only reset', () => {
    const future = new Date(Date.now() + 30 * 60 * 1000 + 500).toISOString()
    expect(fmtReset(future)).toBe('Resets in 30 min')
  })
  test('formats hours and minutes reset', () => {
    const future = new Date(Date.now() + (4 * 3600 + 26 * 60) * 1000 + 500).toISOString()
    expect(fmtReset(future)).toBe('Resets in 4 hr 26 min')
  })
  test('formats day+ reset as weekday string', () => {
    const future = new Date(Date.now() + 25 * 3600 * 1000).toISOString()
    const result = fmtReset(future)
    // Should be a weekday name, not "Resets in X"
    expect(result).not.toMatch(/^Resets in/)
    expect(result.length).toBeGreaterThan(0)
  })
})

// ---- resetOf ----
describe('resetOf', () => {
  test('returns empty string for null', () => {
    expect(resetOf(null)).toBe('')
    expect(resetOf({})).toBe('')
  })
  test('reads resets_at field', () => {
    const future = new Date(Date.now() + 30 * 60 * 1000 + 500).toISOString()
    expect(resetOf({ resets_at: future })).toBe('Resets in 30 min')
  })
  test('reads reset_at alias', () => {
    const future = new Date(Date.now() + 30 * 60 * 1000 + 500).toISOString()
    expect(resetOf({ reset_at: future })).toBe('Resets in 30 min')
  })
  test('converts unix seconds (< 1e12) to ms', () => {
    const futureSeconds = Math.ceil((Date.now() + 30 * 60 * 1000) / 1000)
    expect(resetOf({ resets_at: futureSeconds })).toBe('Resets in 30 min')
  })
})

// ---- planLabel ----
describe('planLabel', () => {
  test('maps known billing types', () => {
    expect(planLabel('stripe_subscription')).toBe('Pro')
    expect(planLabel('free')).toBe('Free')
    expect(planLabel('enterprise')).toBe('Enterprise')
    expect(planLabel('team')).toBe('Team')
  })
  test('returns unknown types as-is', () => {
    expect(planLabel('some_new_tier')).toBe('some_new_tier')
    expect(planLabel('')).toBe('')
  })
})
