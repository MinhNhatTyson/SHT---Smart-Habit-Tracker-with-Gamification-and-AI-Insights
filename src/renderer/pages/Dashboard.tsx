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

import { useEffect, useMemo } from 'react'
import {
  Zap, Flame, Trophy, CheckCircle2, Circle,
  TrendingUp, Star, Calendar, Target,
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Cell,
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
// Stat Card  (Design.md: feature-card on cream, hairline border)
// ─────────────────────────────────────────────────────────────
function StatCard({
  icon, label, value, accent = 'var(--coral)',
}: {
  icon: React.ReactNode
  label: string
  value: string | number
  accent?: string
}) {
  return (
    <div style={{
      flex:          1,
      minWidth:      0,
      background:    'var(--canvas)',
      border:        '1px solid var(--hairline)',
      borderRadius:  'var(--radius-lg)',
      padding:       '20px 22px',
      display:       'flex',
      alignItems:    'center',
      gap:           16,
      boxShadow:     'var(--shadow-sm)',
      transition:    'box-shadow var(--transition-fast), border-color var(--transition-fast)',
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
        width:          44,
        height:         44,
        borderRadius:   'var(--radius-md)',
        background:     `${accent}18`,
        border:         `1px solid ${accent}30`,
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'center',
        flexShrink:     0,
      }}>
        {icon}
      </div>
      <div>
        <div style={{
          fontFamily:    'var(--font-display)',
          fontWeight:    800,
          fontSize:      '1.65rem',
          color:         'var(--ink)',
          lineHeight:    1,
          letterSpacing: '-0.04em',
        }}>
          {value}
        </div>
        <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 5, fontWeight: 500 }}>
          {label}
        </div>
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
        display:      'flex',
        alignItems:   'center',
        gap:          14,
        padding:      '12px 14px',
        borderRadius: 'var(--radius-md)',
        background:   completed ? 'var(--surface-soft)' : 'var(--canvas)',
        border:       '1px solid var(--hairline)',
        cursor:       completed ? 'default' : 'pointer',
        transition:   'all var(--transition-fast)',
        opacity:      completed ? 0.6 : 1,
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
        width:          36,
        height:         36,
        borderRadius:   'var(--radius-md)',
        background:     `${habit.color}18`,
        border:         `1px solid ${habit.color}35`,
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'center',
        fontSize:       17,
        flexShrink:     0,
      }}>
        {habit.icon}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize:       14,
          fontWeight:     600,
          color:          completed ? 'var(--muted)' : 'var(--ink)',
          textDecoration: completed ? 'line-through' : 'none',
          whiteSpace:     'nowrap',
          overflow:       'hidden',
          textOverflow:   'ellipsis',
        }}>
          {habit.name}
        </div>
        <div style={{ fontSize: 11, color: 'var(--muted-soft)', marginTop: 2 }}>
          {habit.category}
        </div>
      </div>

      {!completed && (
        <div style={{
          fontSize:      11,
          fontWeight:    700,
          color:         'var(--coral)',
          background:    'rgba(204,120,92,0.10)',
          border:        '1px solid rgba(204,120,92,0.25)',
          borderRadius:  'var(--radius-full)',
          padding:       '2px 9px',
          flexShrink:    0,
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
// Chart Tooltip — dark surface (Design.md code-window-card)
// ─────────────────────────────────────────────────────────────
function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background:   'var(--surface-dark)',
      border:       '1px solid rgba(255,255,255,0.10)',
      borderRadius: 'var(--radius-md)',
      padding:      '8px 14px',
      fontSize:     13,
      color:        'var(--on-dark)',
      boxShadow:    'var(--shadow-md)',
    }}>
      <div style={{ color: 'var(--on-dark-soft)', marginBottom: 3, fontSize: 11 }}>{label}</div>
      <div style={{
        color:         '#e8a55a',
        fontWeight:    700,
        fontFamily:    'var(--font-display)',
        letterSpacing: '-0.02em',
      }}>
        {payload[0].value} completions
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

  const weekLogs = getWeekLogs()

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

  // Loading
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
        background:    'var(--canvas)',
        border:        '1px solid var(--hairline)',
        borderRadius:  'var(--radius-xl)',
        padding:       '32px 36px',
        display:       'flex',
        alignItems:    'center',
        justifyContent:'space-between',
        gap:           24,
        boxShadow:     'var(--shadow-sm)',
        position:      'relative',
        overflow:      'hidden',
      }}>
        {/* Warm coral glow — very subtle, top-right */}
        <div style={{
          position: 'absolute', top: -60, right: -60,
          width: 200, height: 200, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(204,120,92,0.09), transparent 70%)',
          pointerEvents: 'none',
        }} />

        {/* Greeting */}
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

          {/* Streak chip — the ONE coral element in this band */}
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

        {/* Level card — dark surface */}
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
        />
        <StatCard
          icon={<Star size={20} color="var(--accent-gold)" />}
          label="Longest Streak"
          value={`${user.longestStreak}d`}
          accent="var(--accent-gold)"
        />
      </div>

      {/* ── 3. Two-column grid ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>

        {/* Today's Habits — cream canvas card */}
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

          {/* Thin progress bar */}
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

          {/* Weekly chart — dark surface */}
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
                  content={<ChartTooltip />}
                  cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                />
                <Bar dataKey="count" radius={[5, 5, 0, 0]}>
                  {weekChartData.map((entry, i) => (
                    <Cell
                      key={i}
                      fill={
                        entry.isToday  ? '#cc785c' :
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

          {/* Recent badges — cream card */}
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
