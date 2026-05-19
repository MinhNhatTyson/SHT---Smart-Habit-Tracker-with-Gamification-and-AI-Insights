// src/renderer/pages/Dashboard.tsx
// HabitQuest Dashboard
//
// Design.md principles applied:
//   • Cream canvas (--canvas) as page floor
//   • Coral (--coral) only on primary CTAs and key accents — used sparingly
//   • Dark navy (--surface-dark) for data-heavy panels (chart, code-like surfaces)
//   • Syne display for headlines (negative tracking, weight 700-800)
//   • DM Sans body (weight 400-500)
//   • Warm hairline borders (--hairline) — never cold gray
//   • Surface alternation: canvas → surface-card → surface-dark
//   • Generous padding (--space-xl = 32px inside cards)
//   • Shadow: rare, warm, low alpha

import { useEffect, useMemo, useState } from 'react'
import {
  Zap, Flame, Trophy, CheckCircle2, Circle,
  TrendingUp, Star, Calendar, Target, ChevronDown,
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Cell,
  AreaChart, Area, CartesianGrid,
} from 'recharts'
import { useStore, getXpPercent, getXpProgress, XP_PER_LEVEL } from '../store/useStore'

const DEMO_USER_ID = 1

const RARITY_COLOR: Record<string, string> = {
  common:    '#6b7280',
  rare:      '#3b82f6',
  epic:      '#8b5cf6',
  legendary: '#e8a55a',
}

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────
function toLocalDate(iso: string): string {
  const d = new Date(iso)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// ─────────────────────────────────────────────────────────────
// Stat Card
// ─────────────────────────────────────────────────────────────
function StatCard({
  icon, label, value, accent = 'var(--coral)', trend,
}: {
  icon:    React.ReactNode
  label:   string
  value:   string | number
  accent?: string
  trend?:  { delta: number; label: string }
}) {
  const trendColor = !trend
    ? ''
    : trend.delta > 0
      ? 'var(--accent-success)'
      : trend.delta < 0
        ? 'var(--accent-danger)'
        : 'var(--muted)'

  return (
    <div
      style={{
        flex: 1, minWidth: 0,
        background: 'var(--canvas)',
        border: '1px solid var(--hairline)',
        borderRadius: 'var(--radius-lg)',
        padding: '20px 22px',
        display: 'flex', alignItems: 'center', gap: 16,
        boxShadow: 'var(--shadow-sm)',
        transition: 'box-shadow var(--transition-fast), border-color var(--transition-fast)',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.boxShadow   = 'var(--shadow-md)'
        e.currentTarget.style.borderColor = accent
      }}
      onMouseLeave={e => {
        e.currentTarget.style.boxShadow   = 'var(--shadow-sm)'
        e.currentTarget.style.borderColor = 'var(--hairline)'
      }}
    >
      <div style={{
        width: 44, height: 44,
        borderRadius: 'var(--radius-md)',
        background: `${accent}18`,
        border: `1px solid ${accent}30`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        {icon}
      </div>

      <div>
        <div style={{
          fontFamily: 'var(--font-display)', fontWeight: 800,
          fontSize: '1.65rem', color: 'var(--ink)',
          lineHeight: 1, letterSpacing: '-0.04em',
        }}>
          {value}
        </div>
        <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 5, fontWeight: 500 }}>
          {label}
        </div>

        {trend && (
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 3,
            marginTop: 7, padding: '2px 8px',
            borderRadius: 'var(--radius-full)',
            background: trend.delta > 0
              ? 'rgba(93,184,114,0.12)'
              : trend.delta < 0
                ? 'rgba(239,68,68,0.10)'
                : 'rgba(108,106,100,0.10)',
            border: `1px solid ${
              trend.delta > 0 ? 'rgba(93,184,114,0.30)' :
              trend.delta < 0 ? 'rgba(239,68,68,0.25)'  :
                                'rgba(108,106,100,0.20)'
            }`,
          }}>
            <span style={{ fontSize: 11, color: trendColor, lineHeight: 1 }}>
              {trend.delta > 0 ? '↑' : trend.delta < 0 ? '↓' : '→'}
            </span>
            <span style={{ fontSize: 11, fontWeight: 700, color: trendColor }}>
              {trend.delta > 0 ? '+' : ''}{trend.delta}
            </span>
            <span style={{ fontSize: 11, color: 'var(--muted)' }}>
              {trend.label}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Habit Row
// ─────────────────────────────────────────────────────────────
function HabitRow({
  habit, completed, onComplete,
}: {
  habit: { id: number; name: string; icon: string; color: string; category: string }
  completed: boolean
  onComplete: (id: number) => void
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => !completed && onComplete(habit.id)}
      onKeyDown={e => e.key === 'Enter' && !completed && onComplete(habit.id)}
      style={{
        display: 'flex', alignItems: 'center', gap: 14,
        padding: '12px 14px',
        borderRadius: 'var(--radius-md)',
        background: completed ? 'var(--surface-soft)' : 'var(--canvas)',
        border: '1px solid var(--hairline)',
        cursor: completed ? 'default' : 'pointer',
        transition: 'all var(--transition-fast)',
        opacity: completed ? 0.6 : 1,
      }}
      onMouseEnter={e => {
        if (!completed) {
          e.currentTarget.style.borderColor = habit.color
          e.currentTarget.style.boxShadow   = `0 0 0 3px ${habit.color}14`
        }
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = 'var(--hairline)'
        e.currentTarget.style.boxShadow   = 'none'
      }}
    >
      <div style={{
        width: 36, height: 36,
        borderRadius: 'var(--radius-md)',
        background: `${habit.color}18`,
        border: `1px solid ${habit.color}35`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 17, flexShrink: 0,
      }}>
        {habit.icon}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 14, fontWeight: 600,
          color: completed ? 'var(--muted)' : 'var(--ink)',
          textDecoration: completed ? 'line-through' : 'none',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {habit.name}
        </div>
        <div style={{ fontSize: 11, color: 'var(--muted-soft)', marginTop: 2 }}>
          {habit.category}
        </div>
      </div>

      {!completed && (
        <div style={{
          fontSize: 11, fontWeight: 700,
          color: 'var(--coral)',
          background: 'rgba(204,120,92,0.10)',
          border: '1px solid rgba(204,120,92,0.25)',
          borderRadius: 'var(--radius-full)',
          padding: '2px 9px', flexShrink: 0,
          letterSpacing: '0.02em',
        }}>
          +10 XP
        </div>
      )}

      <div style={{
        flexShrink: 0,
        color: completed ? 'var(--accent-success)' : 'var(--muted-soft)',
      }}>
        {completed ? <CheckCircle2 size={19} /> : <Circle size={19} />}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Weekly chart tooltip
// ─────────────────────────────────────────────────────────────
function WeekTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: 'var(--surface-dark)',
      border: '1px solid rgba(255,255,255,0.10)',
      borderRadius: 'var(--radius-md)',
      padding: '8px 14px', fontSize: 13,
      color: 'var(--on-dark)', boxShadow: 'var(--shadow-md)',
    }}>
      <div style={{ color: 'var(--on-dark-soft)', marginBottom: 3, fontSize: 11 }}>{label}</div>
      <div style={{ color: '#e8a55a', fontWeight: 700, fontFamily: 'var(--font-display)' }}>
        {payload[0].value} completions
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Monthly chart tooltip
// ─────────────────────────────────────────────────────────────
function MonthTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null
  const entry = payload[0].payload
  return (
    <div style={{
      background: 'var(--surface-dark-elevated)',
      border: '1px solid rgba(255,255,255,0.12)',
      borderRadius: 'var(--radius-md)',
      padding: '8px 14px', fontSize: 13,
      color: 'var(--on-dark)', boxShadow: 'var(--shadow-md)',
    }}>
      <div style={{ color: 'var(--on-dark-soft)', fontSize: 11, marginBottom: 3 }}>
        {entry.date}
      </div>
      <div style={{ color: '#e8a55a', fontWeight: 700 }}>
        {entry.count} completion{entry.count !== 1 ? 's' : ''}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Monthly Graph Panel
// Hidden by default, toggled open. Shows a 30-day area chart
// of daily completions + per-habit breakdown.
// ─────────────────────────────────────────────────────────────
function MonthlyGraph({
  open, logs, habits,
}: {
  open:   boolean
  logs:   Array<{ habitId: number; completedAt: string }>
  habits: Array<{
    id: number; name: string; icon: string
    color: string; targetDaysPerWeek: number
  }>
}) {
  const monthData = useMemo(() => {
    return Array.from({ length: 30 }, (_, i) => {
      const d = new Date()
      d.setDate(d.getDate() - (29 - i))
      const dateStr = toLocalDate(d.toISOString())
      const count   = logs.filter(l => toLocalDate(l.completedAt) === dateStr).length
      const label   = i % 5 === 0 ? `${d.getMonth() + 1}/${d.getDate()}` : ''
      return { date: dateStr, label, count }
    })
  }, [logs])

  const habitMonthStats = useMemo(() => {
    const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    return habits.map(habit => {
      const count  = logs.filter(l =>
        l.habitId === habit.id && new Date(l.completedAt) >= monthAgo
      ).length
      const target = Math.max(1, Math.round(habit.targetDaysPerWeek * 4.3))
      const pct    = Math.min(100, Math.round((count / target) * 100))
      return { habit, count, target, pct }
    })
  }, [logs, habits])

  const monthTotal = useMemo(
    () => monthData.reduce((s, d) => s + d.count, 0),
    [monthData]
  )

  const prevMonthTotal = useMemo(() => {
    const start = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000)
    const end   = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    return logs.filter(l => {
      const d = new Date(l.completedAt)
      return d >= start && d < end
    }).length
  }, [logs])

  const monthDelta = monthTotal - prevMonthTotal

  return (
    <div style={{
      overflow:   'hidden',
      maxHeight:  open ? '700px' : '0px',
      opacity:    open ? 1 : 0,
      transition: 'max-height 420ms cubic-bezier(0.4, 0, 0.2, 1), opacity 280ms ease',
    }}>
      {/* Spacer so card doesn't snap against button */}
      <div style={{ height: 4 }} />

      <div style={{
        background:   'var(--surface-dark)',
        border:       '1px solid rgba(255,255,255,0.07)',
        borderRadius: 'var(--radius-xl)',
        padding:      '28px 32px',
      }}>

        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <h2 style={{
            margin: 0, fontSize: '1rem',
            color: 'var(--on-dark)',
            display: 'flex', alignItems: 'center', gap: 7,
          }}>
            <TrendingUp size={15} color="#e8a55a" />
            Monthly Habit Tracking
          </h2>
          <p style={{ margin: '5px 0 0', fontSize: 13, color: 'var(--on-dark-soft)' }}>
            {monthTotal} completions in the last 30 days
            {monthDelta !== 0 && (
              <span style={{
                marginLeft: 8, fontWeight: 600,
                color: monthDelta > 0 ? 'var(--accent-success)' : 'var(--accent-danger)',
              }}>
                {monthDelta > 0 ? '↑' : '↓'} {Math.abs(monthDelta)} vs prev month
              </span>
            )}
          </p>
        </div>

        {/* Area chart */}
        <ResponsiveContainer width="100%" height={180}>
          <AreaChart data={monthData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
            <defs>
              <linearGradient id="monthGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#cc785c" stopOpacity={0.35} />
                <stop offset="95%" stopColor="#cc785c" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="rgba(255,255,255,0.05)"
              vertical={false}
            />
            <XAxis
              dataKey="label"
              tick={{ fill: '#a09d96', fontSize: 11 }}
              axisLine={false} tickLine={false}
              interval={0}
            />
            <YAxis
              tick={{ fill: '#a09d96', fontSize: 11 }}
              axisLine={false} tickLine={false}
              allowDecimals={false}
            />
            <Tooltip
              content={<MonthTooltip />}
              cursor={{ stroke: 'rgba(255,255,255,0.12)', strokeWidth: 1 }}
            />
            <Area
              type="monotone"
              dataKey="count"
              stroke="#cc785c"
              strokeWidth={2}
              fill="url(#monthGrad)"
              dot={false}
              activeDot={{ r: 4, fill: '#cc785c', strokeWidth: 0 }}
            />
          </AreaChart>
        </ResponsiveContainer>

        {/* Per-habit breakdown */}
        {habitMonthStats.length > 0 && (
          <div style={{
            marginTop: 28, paddingTop: 24,
            borderTop: '1px solid rgba(255,255,255,0.07)',
          }}>
            <div style={{
              fontSize: 11, fontWeight: 600,
              color: 'var(--on-dark-soft)',
              letterSpacing: '0.08em', textTransform: 'uppercase',
              marginBottom: 16,
            }}>
              Per habit — last 30 days
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {habitMonthStats.map(({ habit, count, target, pct }) => (
                <div key={habit.id}>
                  <div style={{
                    display: 'flex', alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: 6,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 15 }}>{habit.icon}</span>
                      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--on-dark)' }}>
                        {habit.name}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 12, color: 'var(--on-dark-soft)' }}>
                        {count} / {target}
                      </span>
                      <span style={{
                        fontSize: 11, fontWeight: 700,
                        color: pct >= 80
                          ? 'var(--accent-success)'
                          : pct >= 50 ? '#e8a55a' : 'var(--accent-danger)',
                        background: pct >= 80
                          ? 'rgba(93,184,114,0.15)'
                          : pct >= 50
                            ? 'rgba(232,165,90,0.15)'
                            : 'rgba(239,68,68,0.12)',
                        borderRadius: 'var(--radius-full)',
                        padding: '2px 8px',
                      }}>
                        {pct}%
                      </span>
                    </div>
                  </div>

                  <div style={{
                    height: 6, borderRadius: 'var(--radius-full)',
                    background: 'rgba(255,255,255,0.07)', overflow: 'hidden',
                  }}>
                    <div style={{
                      height: '100%',
                      width: `${pct}%`,
                      borderRadius: 'var(--radius-full)',
                      background: pct >= 80
                        ? 'var(--accent-success)'
                        : pct >= 50 ? '#e8a55a' : habit.color,
                      transition: 'width 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)',
                    }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Dashboard
// ─────────────────────────────────────────────────────────────
export default function Dashboard() {
  const {
    user, habits, logs, userBadges,
    loading, loadAll, logHabit,
    isCompletedToday, getWeekLogs,
  } = useStore()

  useEffect(() => { loadAll(DEMO_USER_ID) }, [])

  const [showGraph, setShowGraph] = useState(false)

  const weekLogs = getWeekLogs()

  // Last week (14–7 days ago) for week-over-week trend
  const lastWeekLogs = useMemo(() => {
    const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)
    const oneWeekAgo  = new Date(Date.now() -  7 * 24 * 60 * 60 * 1000)
    return logs.filter(l => {
      const d = new Date(l.completedAt)
      return d >= twoWeeksAgo && d < oneWeekAgo
    })
  }, [logs])

  const weekTrend = weekLogs.length - lastWeekLogs.length

  const completedCount = useMemo(
    () => habits.filter(h => isCompletedToday(h.id)).length,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [habits, logs]
  )

  const completionRate = habits.length
    ? Math.round((completedCount / habits.length) * 100)
    : 0

  const weekChartData = useMemo(() => {
    const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date()
      d.setDate(d.getDate() - (6 - i))
      const key   = d.toDateString()
      const count = weekLogs.filter(
        l => new Date(l.completedAt).toDateString() === key
      ).length
      return { day: dayLabels[d.getDay()], count, isToday: i === 6 }
    })
  }, [weekLogs])

  const recentBadges = userBadges.slice(0, 4)

  const hour     = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'

  // ── Loading ──────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: '60vh', flexDirection: 'column', gap: 16,
      }}>
        <div style={{
          width: 40, height: 40,
          border: '3px solid var(--hairline)',
          borderTop: '3px solid var(--coral)',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }} />
        <p style={{ color: 'var(--muted)', fontSize: 14, fontWeight: 500 }}>
          Loading your quest…
        </p>
      </div>
    )
  }

  if (!user) return null

  const xpPercent  = getXpPercent(user.totalPoints)
  const xpProgress = getXpProgress(user.totalPoints)

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', gap: 24,
      animation: 'fadeIn 220ms ease forwards',
    }}>

      {/* ── 1. Hero band ── */}
      <div style={{
        background: 'var(--canvas)',
        border: '1px solid var(--hairline)',
        borderRadius: 'var(--radius-xl)',
        padding: '32px 36px',
        display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', gap: 24,
        boxShadow: 'var(--shadow-sm)',
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', top: -60, right: -60,
          width: 200, height: 200, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(204,120,92,0.09), transparent 70%)',
          pointerEvents: 'none',
        }} />

        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{
            fontSize: 11, fontWeight: 600, letterSpacing: '0.10em',
            color: 'var(--muted)', textTransform: 'uppercase', marginBottom: 8,
          }}>
            {greeting}
          </div>
          <h1 style={{ margin: 0, color: 'var(--ink)' }}>
            {user.avatar}&nbsp;{user.username}
          </h1>
          <p style={{ margin: '8px 0 0', color: 'var(--muted)', fontSize: 14 }}>
            {completedCount === habits.length && habits.length > 0
              ? '🎉 All habits done for today — outstanding!'
              : `${completedCount} of ${habits.length} habits completed today`}
          </p>
          {user.currentStreak > 0 && (
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              marginTop: 14, padding: '5px 12px',
              borderRadius: 'var(--radius-full)',
              background: 'var(--coral)', color: 'var(--on-primary)',
              fontSize: 12, fontWeight: 700, letterSpacing: '0.04em',
              boxShadow: '0 2px 8px rgba(204,120,92,0.28)',
            }}>
              <Flame size={12} />
              {user.currentStreak}-day streak
            </div>
          )}
        </div>

        <div style={{
          minWidth: 196,
          background: 'var(--surface-dark)',
          border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: 'var(--radius-lg)',
          padding: '20px 22px',
          position: 'relative', zIndex: 1, flexShrink: 0,
        }}>
          <div style={{
            display: 'flex', justifyContent: 'space-between',
            alignItems: 'center', marginBottom: 12,
          }}>
            <span style={{
              fontFamily: 'var(--font-display)', fontWeight: 800,
              fontSize: '1.05rem', color: 'var(--on-dark)',
              letterSpacing: '-0.03em',
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <Zap size={14} color="#e8a55a" />
              Level {user.level}
            </span>
            <span style={{ fontSize: 11, color: 'var(--on-dark-soft)' }}>
              {xpProgress}/{XP_PER_LEVEL} XP
            </span>
          </div>
          <div className="xp-bar">
            <div className="xp-bar-fill" style={{ width: `${xpPercent}%` }} />
          </div>
          <div style={{
            marginTop: 12, fontSize: 12,
            color: 'var(--on-dark-soft)',
            display: 'flex', gap: 16,
          }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <Trophy size={11} color="#e8a55a" />
              {user.totalPoints.toLocaleString()} pts
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <Star size={11} />
              {userBadges.length} badges
            </span>
          </div>
        </div>
      </div>

      {/* ── 2. Stat row ── */}
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        <StatCard
          icon={<Target size={20} color="var(--coral)" />}
          label="Completed Today"
          value={`${completedCount}/${habits.length}`}
          accent="var(--coral)"
        />
        <StatCard
          icon={<Flame size={20} color="var(--accent-danger)" />}
          label="Current Streak"
          value={`${user.currentStreak}d`}
          accent="var(--accent-danger)"
        />
        <StatCard
          icon={<TrendingUp size={20} color="var(--accent-info)" />}
          label="This Week"
          value={weekLogs.length}
          accent="var(--accent-info)"
          trend={{ delta: weekTrend, label: 'vs last week' }}
        />
        <StatCard
          icon={<Star size={20} color="var(--accent-gold)" />}
          label="Longest Streak"
          value={`${user.longestStreak}d`}
          accent="var(--accent-gold)"
        />
      </div>

      {/* ── 3. Monthly graph toggle ── */}
      <div>
        <button
          onClick={() => setShowGraph(v => !v)}
          style={{
            display: 'flex', alignItems: 'center', gap: 7,
            padding: '8px 18px',
            borderRadius: 'var(--radius-md)',
            border: `1px solid ${showGraph ? 'var(--coral)' : 'var(--hairline)'}`,
            background: showGraph ? 'rgba(204,120,92,0.08)' : 'var(--canvas)',
            color: showGraph ? 'var(--coral)' : 'var(--muted)',
            fontFamily: 'var(--font-body)',
            fontSize: 13, fontWeight: 600,
            cursor: 'pointer',
            boxShadow: 'var(--shadow-sm)',
            transition: 'all var(--transition-fast)',
          }}
          onMouseEnter={e => {
            if (!showGraph) {
              e.currentTarget.style.borderColor = 'var(--coral)'
              e.currentTarget.style.color       = 'var(--ink)'
            }
          }}
          onMouseLeave={e => {
            if (!showGraph) {
              e.currentTarget.style.borderColor = 'var(--hairline)'
              e.currentTarget.style.color       = 'var(--muted)'
            }
          }}
        >
          <TrendingUp size={14} />
          Monthly Tracking
          <ChevronDown
            size={14}
            style={{
              transform:  showGraph ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform var(--transition-normal)',
            }}
          />
        </button>

        {/* Monthly graph panel — slides open */}
        <MonthlyGraph open={showGraph} logs={logs} habits={habits} />
      </div>

      {/* ── 4. Two-column grid ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>

        {/* Today's Habits */}
        <div style={{
          background: 'var(--canvas)',
          border: '1px solid var(--hairline)',
          borderRadius: 'var(--radius-xl)',
          padding: '28px',
          display: 'flex', flexDirection: 'column', gap: 10,
          boxShadow: 'var(--shadow-sm)',
        }}>
          <div style={{
            display: 'flex', justifyContent: 'space-between',
            alignItems: 'center', marginBottom: 4,
          }}>
            <h2 style={{
              margin: 0, fontSize: '1rem', color: 'var(--ink)',
              display: 'flex', alignItems: 'center', gap: 7,
            }}>
              <Calendar size={15} color="var(--coral)" />
              Today's Habits
            </h2>
            <div style={{
              fontSize: 11, fontWeight: 700, letterSpacing: '0.05em',
              color:      completionRate === 100 ? 'var(--on-primary)' : 'var(--coral)',
              background: completionRate === 100 ? 'var(--coral)' : 'rgba(204,120,92,0.10)',
              border:    `1px solid ${completionRate === 100 ? 'var(--coral)' : 'rgba(204,120,92,0.25)'}`,
              borderRadius: 'var(--radius-full)',
              padding: '3px 10px',
              transition: 'all var(--transition-normal)',
            }}>
              {completionRate}%
            </div>
          </div>

          <div className="xp-bar" style={{ height: 3, marginBottom: 4 }}>
            <div className="xp-bar-fill" style={{
              width: `${completionRate}%`,
              background: completionRate === 100
                ? 'var(--accent-success)'
                : 'linear-gradient(90deg, var(--coral), var(--accent-gold))',
            }} />
          </div>

          {habits.length === 0 ? (
            <div style={{
              textAlign: 'center', padding: '32px 0',
              color: 'var(--muted)', fontSize: 14,
            }}>
              No habits yet — add some in the Habits tab!
            </div>
          ) : (
            habits.map(habit => (
              <HabitRow
                key={habit.id}
                habit={habit}
                completed={isCompletedToday(habit.id)}
                onComplete={id => logHabit(id, DEMO_USER_ID)}
              />
            ))
          )}
        </div>

        {/* Right column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Weekly chart */}
          <div style={{
            background: 'var(--surface-dark)',
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: 'var(--radius-xl)',
            padding: '28px', flex: 1,
          }}>
            <h2 style={{
              margin: '0 0 20px', fontSize: '1rem',
              color: 'var(--on-dark)',
              display: 'flex', alignItems: 'center', gap: 7,
            }}>
              <TrendingUp size={15} color="#e8a55a" />
              Weekly Progress
            </h2>

            <ResponsiveContainer width="100%" height={148}>
              <BarChart
                data={weekChartData}
                barSize={26}
                margin={{ top: 4, right: 4, bottom: 0, left: -24 }}
              >
                <XAxis
                  dataKey="day"
                  tick={{ fill: '#a09d96', fontSize: 11 }}
                  axisLine={false} tickLine={false}
                />
                <YAxis
                  tick={{ fill: '#a09d96', fontSize: 11 }}
                  axisLine={false} tickLine={false}
                  allowDecimals={false}
                />
                <Tooltip
                  content={<WeekTooltip />}
                  cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                />
                <Bar dataKey="count" radius={[5, 5, 0, 0]}>
                  {weekChartData.map((entry, i) => (
                    <Cell
                      key={i}
                      fill={
                        entry.isToday   ? '#cc785c' :
                        entry.count > 0 ? '#e8a55a' :
                        '#252320'
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>

            <div style={{
              display: 'flex', gap: 16, marginTop: 14,
              fontSize: 11, color: 'var(--on-dark-soft)',
            }}>
              {[
                { color: '#cc785c', label: 'Today' },
                { color: '#e8a55a', label: 'Completed' },
                { color: '#252320', label: 'Missed', outline: true },
              ].map(({ color, label, outline }) => (
                <span key={label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span style={{
                    width: 8, height: 8, borderRadius: 2,
                    background: color, display: 'inline-block',
                    border: outline ? '1px solid rgba(255,255,255,0.15)' : 'none',
                  }} />
                  {label}
                </span>
              ))}
            </div>
          </div>

          {/* Recent badges */}
          <div style={{
            background: 'var(--canvas)',
            border: '1px solid var(--hairline)',
            borderRadius: 'var(--radius-xl)',
            padding: '28px',
            boxShadow: 'var(--shadow-sm)',
          }}>
            <h2 style={{
              margin: '0 0 16px', fontSize: '1rem', color: 'var(--ink)',
              display: 'flex', alignItems: 'center', gap: 7,
            }}>
              <Trophy size={15} color="var(--accent-gold)" />
              Recent Badges
            </h2>

            {recentBadges.length === 0 ? (
              <div style={{
                textAlign: 'center', padding: '20px 0',
                color: 'var(--muted)', fontSize: 13,
              }}>
                Complete habits to earn your first badge!
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {recentBadges.map(ub => (
                  <div
                    key={ub.id}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '10px 12px',
                      borderRadius: 'var(--radius-md)',
                      background: 'var(--surface-soft)',
                      border: `1px solid ${RARITY_COLOR[ub.badge.rarity] ?? 'var(--hairline)'}28`,
                      transition: 'border-color var(--transition-fast)',
                    }}
                    onMouseEnter={e =>
                      (e.currentTarget.style.borderColor =
                        `${RARITY_COLOR[ub.badge.rarity] ?? 'var(--hairline)'}70`)
                    }
                    onMouseLeave={e =>
                      (e.currentTarget.style.borderColor =
                        `${RARITY_COLOR[ub.badge.rarity] ?? 'var(--hairline)'}28`)
                    }
                  >
                    <span style={{ fontSize: 22, flexShrink: 0 }}>{ub.badge.icon}</span>
                    <div style={{ minWidth: 0 }}>
                      <div style={{
                        fontSize: 12, fontWeight: 600, color: 'var(--ink)',
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                      }}>
                        {ub.badge.name}
                      </div>
                      <div style={{
                        fontSize: 10, fontWeight: 700,
                        color: RARITY_COLOR[ub.badge.rarity] ?? 'var(--muted)',
                        textTransform: 'uppercase', letterSpacing: '0.07em', marginTop: 2,
                      }}>
                        {ub.badge.rarity}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  )
}
