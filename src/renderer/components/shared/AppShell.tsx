// src/renderer/components/shared/AppShell.tsx
// Persistent sidebar + main content wrapper.
// Goals nav link added alongside Insights.

import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Flame, Trophy, Sparkles, Users, Settings, Zap, CalendarDays, ShoppingBag, Target } from 'lucide-react'
import { useStore, getXpPercent, getXpProgress, XP_PER_LEVEL } from '../../store/useStore'
import { useEffect, useRef } from 'react'
import BadgeToast from './BadgeToast'
import MotivationCenter from './MotivationCenter'
import { Star } from 'lucide-react'

const NAV = [
  { to: '/dashboard',    icon: LayoutDashboard, label: 'Dashboard'  },
  { to: '/habits',       icon: Flame,           label: 'Habits'     },
  { to: '/gamification', icon: Trophy,          label: 'Rewards'    },
  { to: '/store',        icon: ShoppingBag,     label: 'Store'      },
  { to: '/goals',        icon: Target,          label: 'Goals'      },
  { to: '/insights',     icon: Sparkles,        label: 'Insights'   },
  { to: '/social',       icon: Users,           label: 'Social'     },
  { to: '/calendar',     icon: CalendarDays,    label: 'Calendar'   },
  { to: '/settings',     icon: Settings,        label: 'Settings'   },
]

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { user, loadAll, updateProfile } = useStore()
  const shieldChecked = useRef(false)

  useEffect(() => { if (!user) loadAll(1) }, [])

  // ── Streak shield auto-consumption ───────────────────────────
  useEffect(() => {
    if (!user || shieldChecked.current) return
    shieldChecked.current = true
    if (user.streakShieldActive && user.currentStreak === 0) {
      updateProfile({ streakShieldActive: false, currentStreak: 1 }).catch(() => {})
    }
  }, [user?.id])

  const xpPercent  = user ? getXpPercent(user.totalPoints)  : 0
  const xpProgress = user ? getXpProgress(user.totalPoints) : 0

  return (
    <div style={{ display: 'flex', height: '100vh', background: 'var(--canvas)', fontFamily: 'var(--font-body)' }}>

      {/* ── Sidebar ── */}
      <aside style={{ width: 220, flexShrink: 0, background: 'var(--canvas)', borderRight: '1px solid var(--hairline)', display: 'flex', flexDirection: 'column', padding: '20px 12px', gap: 2 }}>

        {/* Wordmark */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 14px', marginBottom: 24 }}>
          <div style={{ width: 34, height: 34, borderRadius: 'var(--radius-md)', background: 'var(--coral)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17, flexShrink: 0, boxShadow: '0 2px 8px rgba(204,120,92,0.35)' }}>⚡</div>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 17, color: 'var(--ink)', letterSpacing: '-0.03em' }}>HabitQuest</span>
        </div>

        {/* Nav label */}
        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted-soft)', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '0 14px', marginBottom: 6 }}>Navigation</div>

        {/* Nav links */}
        {NAV.map(({ to, icon: Icon, label }) => (
          <NavLink key={to} to={to} style={({ isActive }) => ({
            display: 'flex', alignItems: 'center', gap: 10, padding: '9px 14px',
            borderRadius: 'var(--radius-md)', textDecoration: 'none',
            color:      isActive ? 'var(--ink)'          : 'var(--muted)',
            background: isActive ? 'var(--surface-card)' : 'transparent',
            fontWeight: isActive ? 600 : 400, fontSize: 14,
            transition: 'all var(--transition-fast)',
            borderLeft: isActive ? '2px solid var(--coral)' : '2px solid transparent',
          })}>
            <Icon size={16} />
            {label}
            {/* Shield indicator on Dashboard */}
            {to === '/dashboard' && user?.streakShieldActive && (
              <span title="Streak Shield armed" style={{ marginLeft: 'auto', fontSize: 13 }}>🛡️</span>
            )}
          </NavLink>
        ))}

        <div style={{ flex: 1 }} />

        {/* Stars balance chip */}
        {user && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 'var(--radius-md)', background: 'rgba(232,165,90,0.10)', border: '1px solid rgba(232,165,90,0.22)', marginBottom: 8 }}>
            <Star size={13} color="#e8a55a" fill="#e8a55a" />
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14, color: '#e8a55a', letterSpacing: '-0.01em' }}>{user.stars ?? 0}</span>
            <span style={{ fontSize: 11, color: 'rgba(232,165,90,0.65)', marginLeft: 2 }}>Stars</span>
          </div>
        )}

        {/* XP widget */}
        <div style={{ padding: '14px 16px', borderRadius: 'var(--radius-lg)', background: 'var(--surface-card)', border: '1px solid var(--hairline)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13, color: 'var(--ink)', display: 'flex', alignItems: 'center', gap: 5 }}>
              <Zap size={13} color="var(--accent-gold)" /> Level {user?.level ?? 1}
            </span>
            <span style={{ color: 'var(--muted)', fontSize: 11 }}>{xpProgress} / {XP_PER_LEVEL} XP</span>
          </div>
          <div className="xp-bar"><div className="xp-bar-fill" style={{ width: `${xpPercent}%` }} /></div>
          {user && (
            <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', overflow: 'hidden', flexShrink: 0, background: 'rgba(204,120,92,0.15)', border: '1px solid rgba(204,120,92,0.30)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>
                {user.avatarUrl
                  ? <img src={user.avatarUrl} alt={user.username} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : user.avatar ?? '🧙'}
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {user.fullName || `@${user.username}`}
                </div>
                {user.activeTitle && (
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--coral)', marginTop: 1 }}>{user.activeTitle}</div>
                )}
                <div style={{ fontSize: 11, color: 'var(--muted)' }}>{user.totalPoints.toLocaleString()} pts</div>
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* ── Main ── */}
      <main style={{ flex: 1, overflow: 'auto', padding: 28, background: 'var(--surface-soft)', animation: 'fadeIn 200ms ease forwards' }}>
        {children}
      </main>

      <BadgeToast />
      <MotivationCenter />
    </div>
  )
}