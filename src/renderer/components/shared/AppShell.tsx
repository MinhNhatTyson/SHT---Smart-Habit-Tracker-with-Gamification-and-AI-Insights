// src/renderer/components/shared/AppShell.tsx
// Persistent sidebar + main content wrapper
// Design.md: cream canvas, coral accent, hairline borders, Syne display

import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, Flame, Trophy, Sparkles,
  Users, Settings, Zap,
} from 'lucide-react'
import { useStore, getXpPercent, getXpProgress, XP_PER_LEVEL } from '../../store/useStore'
import { useEffect } from 'react'

const NAV = [
  { to: '/dashboard',    icon: LayoutDashboard, label: 'Dashboard'  },
  { to: '/habits',       icon: Flame,           label: 'Habits'     },
  { to: '/gamification', icon: Trophy,          label: 'Rewards'    },
  { to: '/insights',     icon: Sparkles,        label: 'Insights'   },
  { to: '/social',       icon: Users,           label: 'Social'     },
  { to: '/settings',     icon: Settings,        label: 'Settings'   },
]

// ── Quest Mark SVG logo ───────────────────────────────────────
// The "Q" icon: coral square, cream ring + inner hole + diagonal tail,
// plus three streak dots bottom-left. Scales cleanly to any size.
function QuestMarkIcon({ size = 34 }: { size?: number }) {
  const s = size
  const cx = s / 2
  const cy = s / 2 - s * 0.02
  const outerR = s * 0.30
  const innerR = s * 0.16
  const tailW  = Math.max(2, s * 0.10)

  // Tail from ~4 o'clock to outside bottom-right
  const t1x = cx + outerR * 0.55
  const t1y = cy + outerR * 0.55
  const t2x = cx + outerR * 1.02
  const t2y = cy + outerR * 1.02

  const dotSize = Math.max(2, s * 0.055)
  const dotGap  = dotSize + Math.max(1, s * 0.025)
  const dotY    = s - dotSize - s * 0.12
  const dotX0   = s * 0.12

  return (
    <svg
      width={s}
      height={s}
      viewBox={`0 0 ${s} ${s}`}
      fill="none"
      aria-label="SHT logo mark"
      role="img"
    >
      {/* Coral rounded square background */}
      <rect
        width={s}
        height={s}
        rx={s * 0.22}
        fill="var(--coral)"
      />

      {/* Q outer ring — cream */}
      <circle cx={cx} cy={cy} r={outerR} fill="var(--on-primary)" />

      {/* Q inner hole — punches back to coral */}
      <circle cx={cx} cy={cy} r={innerR} fill="var(--coral)" />

      {/* Q tail — cream diagonal stroke */}
      <line
        x1={t1x} y1={t1y}
        x2={t2x} y2={t2y}
        stroke="var(--on-primary)"
        strokeWidth={tailW}
        strokeLinecap="round"
      />

      {/* Streak dots — three small squares, bottom-left */}
      {[0, 1, 2].map(i => (
        <rect
          key={i}
          x={dotX0 + i * dotGap}
          y={dotY}
          width={dotSize}
          height={dotSize}
          rx={Math.max(1, dotSize / 3)}
          fill="var(--on-primary)"
          opacity={0.55 + i * 0.2}
        />
      ))}
    </svg>
  )
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { user, loadAll } = useStore()

  useEffect(() => {
    if (!user) loadAll(1)
  }, [])

  const xpPercent  = user ? getXpPercent(user.totalPoints)  : 0
  const xpProgress = user ? getXpProgress(user.totalPoints) : 0

  return (
    <div style={{
      display:    'flex',
      height:     '100vh',
      background: 'var(--canvas)',
      fontFamily: 'var(--font-body)',
    }}>

      {/* ── Sidebar ── */}
      <aside style={{
        width:         220,
        flexShrink:    0,
        background:    'var(--canvas)',
        borderRight:   '1px solid var(--hairline)',
        display:       'flex',
        flexDirection: 'column',
        padding:       '20px 12px',
        gap:           2,
      }}>

        {/* ── Wordmark / Logo ── */}
        <div style={{
          display:      'flex',
          alignItems:   'center',
          gap:          10,
          padding:      '8px 14px',
          marginBottom: 24,
        }}>
          {/* Quest Mark icon — replaces the plain emoji */}
          <QuestMarkIcon size={34} />

          {/* Wordmark text */}
          <div style={{ lineHeight: 1 }}>
            <div style={{
              fontFamily:    'var(--font-display)',
              fontWeight:    800,
              fontSize:      15,
              color:         'var(--ink)',
              letterSpacing: '-0.04em',
            }}>
              SHT
            </div>
            <div style={{
              fontSize:      9,
              fontWeight:    600,
              color:         'var(--muted)',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              marginTop:     2,
            }}>
              HabitQuest
            </div>
          </div>
        </div>

        {/* Nav section label */}
        <div style={{
          fontSize:      11,
          fontWeight:    600,
          color:         'var(--muted-soft)',
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          padding:       '0 14px',
          marginBottom:  6,
        }}>
          Navigation
        </div>

        {/* Nav links */}
        {NAV.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            style={({ isActive }) => ({
              display:        'flex',
              alignItems:     'center',
              gap:            10,
              padding:        '9px 14px',
              borderRadius:   'var(--radius-md)',
              textDecoration: 'none',
              color:           isActive ? 'var(--ink)'          : 'var(--muted)',
              background:      isActive ? 'var(--surface-card)' : 'transparent',
              fontWeight:      isActive ? 600                    : 400,
              fontSize:        14,
              transition:      'all var(--transition-fast)',
              borderLeft:      isActive
                ? '2px solid var(--coral)'
                : '2px solid transparent',
            })}
          >
            <Icon size={16} />
            {label}
          </NavLink>
        ))}

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* XP / Level widget */}
        <div style={{
          padding:      '14px 16px',
          borderRadius: 'var(--radius-lg)',
          background:   'var(--surface-card)',
          border:       '1px solid var(--hairline)',
        }}>
          <div style={{
            display:        'flex',
            justifyContent: 'space-between',
            alignItems:     'center',
            marginBottom:   8,
          }}>
            <span style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 700,
              fontSize:   13,
              color:      'var(--ink)',
              display:    'flex',
              alignItems: 'center',
              gap:        5,
            }}>
              <Zap size={13} color="var(--accent-gold)" />
              Level {user?.level ?? 1}
            </span>
            <span style={{ color: 'var(--muted)', fontSize: 11 }}>
              {xpProgress} / {XP_PER_LEVEL} XP
            </span>
          </div>

          <div className="xp-bar">
            <div className="xp-bar-fill" style={{ width: `${xpPercent}%` }} />
          </div>

          {user && (
            <div style={{
              marginTop:  10,
              display:    'flex',
              alignItems: 'center',
              gap:        8,
            }}>
              <span style={{ fontSize: 20 }}>{user.avatar ?? '🧙'}</span>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)' }}>
                  @{user.username}
                </div>
                <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                  {user.totalPoints.toLocaleString()} pts
                </div>
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* ── Main Content ── */}
      <main style={{
        flex:       1,
        overflow:   'auto',
        padding:    28,
        background: 'var(--surface-soft)',
        animation:  'fadeIn 200ms ease forwards',
      }}>
        {children}
      </main>
    </div>
  )
}
