// src/renderer/components/shared/AppShell.tsx
// Persistent sidebar + main content wrapper
// Design.md: cream canvas, coral accent, hairline borders, Syne display

import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, Flame, Trophy, Sparkles,
  Users, Settings, Zap, CalendarDays,
} from 'lucide-react'
import { useStore, getXpPercent, getXpProgress, XP_PER_LEVEL } from '../../store/useStore'
import { useEffect } from 'react'

const NAV = [
  { to: '/dashboard',    icon: LayoutDashboard, label: 'Dashboard'  },
  { to: '/habits',       icon: Flame,           label: 'Habits'     },
  { to: '/gamification', icon: Trophy,          label: 'Rewards'    },
  { to: '/insights',     icon: Sparkles,        label: 'Insights'   },
  { to: '/social',       icon: Users,           label: 'Social'     },
  { to: '/calendar',     icon: CalendarDays,    label: 'Calendar'   },
  { to: '/settings',     icon: Settings,        label: 'Settings'   },
]

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { user, loadAll } = useStore()

  useEffect(() => {
    if (!user) loadAll(1)
  }, [])

  const xpPercent  = user ? getXpPercent(user.totalPoints)  : 0
  const xpProgress = user ? getXpProgress(user.totalPoints) : 0

  return (
    <div style={{
      display:         'flex',
      height:          '100vh',
      background:      'var(--canvas)',
      fontFamily:      'var(--font-body)',
    }}>

      {/* ── Sidebar ── */}
      <aside style={{
        width:          220,
        flexShrink:     0,
        background:     'var(--canvas)',
        borderRight:    '1px solid var(--hairline)',
        display:        'flex',
        flexDirection:  'column',
        padding:        '20px 12px',
        gap:            2,
      }}>

        {/* Wordmark / Logo */}
        <div style={{
          display:     'flex',
          alignItems:  'center',
          gap:         10,
          padding:     '8px 14px',
          marginBottom:24,
        }}>
          <div style={{
            width:           34,
            height:          34,
            borderRadius:    'var(--radius-md)',
            background:      'var(--coral)',
            display:         'flex',
            alignItems:      'center',
            justifyContent:  'center',
            fontSize:        17,
            flexShrink:      0,
            boxShadow:       '0 2px 8px rgba(204,120,92,0.35)',
          }}>
            ⚡
          </div>
          <span style={{
            fontFamily:  'var(--font-display)',
            fontWeight:  800,
            fontSize:    17,
            color:       'var(--ink)',
            letterSpacing: '-0.03em',
          }}>
            HabitQuest
          </span>
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
          {/* Level header */}
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
              gap:         5,
            }}>
              <Zap size={13} color="var(--accent-gold)" />
              Level {user?.level ?? 1}
            </span>
            <span style={{ color: 'var(--muted)', fontSize: 11 }}>
              {xpProgress} / {XP_PER_LEVEL} XP
            </span>
          </div>

          {/* XP bar */}
          <div className="xp-bar">
            <div className="xp-bar-fill" style={{ width: `${xpPercent}%` }} />
          </div>

          {/* User info */}
          {user && (
            <div style={{
              marginTop:   10,
              display:     'flex',
              alignItems:  'center',
              gap:         8,
            }}>
              <div style={{
                width:        28,
                height:       28,
                borderRadius: '50%',
                overflow:     'hidden',
                flexShrink:   0,
                background:   'rgba(204,120,92,0.15)',
                border:       '1px solid rgba(204,120,92,0.30)',
                display:      'flex',
                alignItems:   'center',
                justifyContent:'center',
                fontSize:     16,
              }}>
                {user.avatarUrl ? (
                  <img
                    src={user.avatarUrl}
                    alt={user.username}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  user.avatar ?? '🧙'
                )}
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{
                  fontSize: 12, fontWeight: 600, color: 'var(--ink)',
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>
                  {user.fullName ? user.fullName : `@${user.username}`}
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
