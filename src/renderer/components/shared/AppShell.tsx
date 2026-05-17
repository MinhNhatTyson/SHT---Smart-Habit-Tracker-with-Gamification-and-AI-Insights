// src/renderer/components/shared/AppShell.tsx
// The persistent sidebar + main content wrapper

import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, Flame, Trophy, Sparkles,
  Users, Settings, Zap
} from 'lucide-react'

const NAV = [
  { to: '/dashboard',    icon: LayoutDashboard, label: 'Dashboard'  },
  { to: '/habits',       icon: Flame,           label: 'Habits'     },
  { to: '/gamification', icon: Trophy,          label: 'Rewards'    },
  { to: '/insights',     icon: Sparkles,        label: 'Insights'   },
  { to: '/social',       icon: Users,           label: 'Social'     },
  { to: '/settings',     icon: Settings,        label: 'Settings'   },
]

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', height: '100vh', background: 'var(--bg-base)' }}>

      {/* ── Sidebar ── */}
      <aside style={{
        width: 220,
        flexShrink: 0,
        background: 'var(--bg-surface)',
        borderRight: '1px solid var(--border-subtle)',
        display: 'flex',
        flexDirection: 'column',
        padding: '20px 12px',
        gap: 4,
      }}>
        {/* Logo */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '8px 12px', marginBottom: 24,
        }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: 'linear-gradient(135deg, #7c3aed, #f59e0b)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 18,
          }}>⚡</div>
          <span style={{
            fontFamily: 'var(--font-display)', fontWeight: 800,
            fontSize: 18, color: 'var(--text-primary)',
          }}>HabitQuest</span>
        </div>

        {/* Nav links */}
        {NAV.map(({ to, icon: Icon, label }) => (
          <NavLink key={to} to={to} style={({ isActive }) => ({
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '10px 14px', borderRadius: 10, textDecoration: 'none',
            color:      isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
            background: isActive ? 'var(--bg-elevated)' : 'transparent',
            fontWeight: isActive ? 600 : 400,
            fontSize: 14,
            transition: 'all var(--transition-fast)',
            borderLeft: isActive ? '3px solid var(--accent-primary)' : '3px solid transparent',
          })}>
            <Icon size={17} />
            {label}
          </NavLink>
        ))}

        {/* Bottom XP widget placeholder */}
        <div style={{ marginTop: 'auto', padding: '12px 14px', borderRadius: 12, background: 'var(--bg-elevated)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 13 }}>
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
              <Zap size={13} color="var(--accent-secondary)" /> Level 1
            </span>
            <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>0 / 100 XP</span>
          </div>
          <div className="xp-bar">
            <div className="xp-bar-fill" style={{ width: '0%' }} />
          </div>
        </div>
      </aside>

      {/* ── Main Content ── */}
      <main style={{
        flex: 1,
        overflow: 'auto',
        padding: 28,
        animation: 'fadeIn 200ms ease forwards',
      }}>
        {children}
      </main>
    </div>
  )
}
