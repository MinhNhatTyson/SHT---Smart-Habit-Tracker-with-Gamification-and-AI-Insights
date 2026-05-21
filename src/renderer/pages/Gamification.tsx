// src/renderer/pages/Gamification.tsx
// Badges & Rewards — Trophy Room
//
// Three sections:
//   1. Hero strip — stars balance + stats
//   2. Earned badges — glowing trophy shelf
//   3. In Progress — badges with % completion bars
//   4. Locked — grayed out with requirement shown
//
// Design.md:
//   • Dark navy hero (product-mockup-card-dark)
//   • Cream canvas cards for earned badges
//   • Coral only on primary CTAs / selected states
//   • Syne 700-800 display, DM Sans body
//   • Rarity colors: common(gray) rare(blue) epic(violet) legendary(gold)

import { useEffect, useState, useMemo } from 'react'
import {
  Star, Trophy, Lock, TrendingUp,
  Sparkles, Filter,
} from 'lucide-react'
import { useStore, RARITY_COLOR, Badge, UserBadge } from '../store/useStore'

const DEMO_USER_ID = 1

// ── Rarity rank (for sorting) ─────────────────────────────────
const RARITY_RANK: Record<string, number> = {
  common: 0, rare: 1, epic: 2, legendary: 3,
}

// ── Category labels ───────────────────────────────────────────
const CATEGORY_LABELS: Record<string, string> = {
  special:    '⭐ Special',
  streak:     '🔥 Streak',
  volume:     '📊 Volume',
  variety:    '🎨 Variety',
  dedication: '💪 Dedication',
}

// ── Progress label for each condition ────────────────────────
function getProgressInfo(
  condition: string,
  logs: Array<{ habitId: number; completedAt: string }>,
  habits: Array<{ id: number; isArchived?: boolean; category?: string }>,
  currentStreak: number,
  level: number,
): { current: number; target: number; label: string } {
  const totalLogs    = logs.length
  const activeHabits = habits.filter(h => !h.isArchived).length

  const todayStr = (() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  })()

  if (condition === 'none')        return { current: 1, target: 1, label: 'Awarded on signup' }
  if (condition === 'first_habit') return { current: Math.min(habits.length, 1), target: 1, label: 'Create your first habit' }
  if (condition === 'logs_1')      return { current: Math.min(totalLogs, 1),     target: 1,    label: `${totalLogs} / 1 completions` }
  if (condition === 'logs_10')     return { current: Math.min(totalLogs, 10),    target: 10,   label: `${totalLogs} / 10 completions` }
  if (condition === 'logs_25')     return { current: Math.min(totalLogs, 25),    target: 25,   label: `${totalLogs} / 25 completions` }
  if (condition === 'logs_100')    return { current: Math.min(totalLogs, 100),   target: 100,  label: `${totalLogs} / 100 completions` }
  if (condition === 'logs_500')    return { current: Math.min(totalLogs, 500),   target: 500,  label: `${totalLogs} / 500 completions` }
  if (condition === 'logs_1000')   return { current: Math.min(totalLogs, 1000),  target: 1000, label: `${totalLogs} / 1,000 completions` }
  if (condition === 'streak_3')    return { current: Math.min(currentStreak, 3),   target: 3,   label: `${currentStreak} / 3 day streak` }
  if (condition === 'streak_7')    return { current: Math.min(currentStreak, 7),   target: 7,   label: `${currentStreak} / 7 day streak` }
  if (condition === 'streak_14')   return { current: Math.min(currentStreak, 14),  target: 14,  label: `${currentStreak} / 14 day streak` }
  if (condition === 'streak_30')   return { current: Math.min(currentStreak, 30),  target: 30,  label: `${currentStreak} / 30 day streak` }
  if (condition === 'streak_100')  return { current: Math.min(currentStreak, 100), target: 100, label: `${currentStreak} / 100 day streak` }
  if (condition === 'streak_365')  return { current: Math.min(currentStreak, 365), target: 365, label: `${currentStreak} / 365 day streak` }
  if (condition === 'habits_3')    return { current: Math.min(activeHabits, 3), target: 3, label: `${activeHabits} / 3 active habits` }
  if (condition === 'habits_5')    return { current: Math.min(activeHabits, 5), target: 5, label: `${activeHabits} / 5 active habits` }
  if (condition === 'habits_7')    return { current: Math.min(activeHabits, 7), target: 7, label: `${activeHabits} / 7 active habits` }
  if (condition === 'level_5')     return { current: Math.min(level, 5),  target: 5,  label: `Level ${level} / 5` }
  if (condition === 'level_10')    return { current: Math.min(level, 10), target: 10, label: `Level ${level} / 10` }
  if (condition === 'level_25')    return { current: Math.min(level, 25), target: 25, label: `Level ${level} / 25` }
  if (condition === 'level_50')    return { current: Math.min(level, 50), target: 50, label: `Level ${level} / 50` }
  if (condition === 'perfect_day') return { current: 0, target: 1, label: 'Complete all habits in one day' }
  if (condition === 'perfect_week')return { current: 0, target: 7, label: 'Perfect completion 7 days in a row' }
  if (condition === 'early_bird')  return { current: 0, target: 1, label: 'Log a habit before 8:00 AM' }
  if (condition === 'night_owl')   return { current: 0, target: 1, label: 'Log a habit after 10:00 PM' }
  if (condition === 'comeback_kid')return { current: 0, target: 1, label: 'Return after a 7+ day gap' }
  if (condition === 'variety_4')   return { current: 0, target: 4, label: 'Complete habits in 4 categories this week' }

  return { current: 0, target: 1, label: condition }
}

// ── Single badge card (earned) ────────────────────────────────
function EarnedBadgeCard({ ub }: { ub: UserBadge }) {
  const [hovered, setHovered] = useState(false)
  const rarityColor = RARITY_COLOR[ub.badge.rarity] ?? '#6b7280'
  const earned = new Date(ub.earnedAt)
  const dateStr = `${earned.getDate()} ${earned.toLocaleString('default', { month: 'short' })} ${earned.getFullYear()}`

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position:     'relative',
        background:   'var(--canvas)',
        border:       `1px solid ${hovered ? rarityColor + '60' : 'var(--hairline)'}`,
        borderRadius: 'var(--radius-xl)',
        padding:      '20px',
        display:      'flex',
        flexDirection:'column',
        alignItems:   'center',
        gap:          12,
        textAlign:    'center',
        transition:   'all var(--transition-normal)',
        boxShadow:    hovered
          ? `0 4px 24px ${rarityColor}20, var(--shadow-sm)`
          : 'var(--shadow-sm)',
        overflow:     'hidden',
        cursor:       'default',
      }}
    >
      {/* Subtle rarity glow in the background */}
      <div style={{
        position:     'absolute',
        top:          -40,
        left:         '50%',
        transform:    'translateX(-50%)',
        width:        120,
        height:       120,
        borderRadius: '50%',
        background:   `radial-gradient(circle, ${rarityColor}15, transparent 70%)`,
        pointerEvents:'none',
        transition:   'opacity var(--transition-normal)',
        opacity:      hovered ? 1 : 0.5,
      }} />

      {/* Rarity accent line */}
      <div style={{
        position:     'absolute',
        top:          0, left: 0, right: 0,
        height:       3,
        background:   `linear-gradient(90deg, transparent, ${rarityColor}, transparent)`,
        borderRadius: 'var(--radius-xl) var(--radius-xl) 0 0',
      }} />

      {/* Icon */}
      <div style={{
        width:          64,
        height:         64,
        borderRadius:   'var(--radius-lg)',
        background:     `${rarityColor}15`,
        border:         `2px solid ${rarityColor}35`,
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'center',
        fontSize:       30,
        position:       'relative',
        zIndex:         1,
        boxShadow:      hovered ? `0 0 16px ${rarityColor}30` : 'none',
        transition:     'box-shadow var(--transition-normal)',
        transform:      hovered ? 'scale(1.08)' : 'scale(1)',
      }}>
        {ub.badge.icon}
      </div>

      {/* Name */}
      <div style={{ position: 'relative', zIndex: 1 }}>
        <div style={{
          fontFamily:    'var(--font-display)',
          fontWeight:    700,
          fontSize:      13,
          color:         'var(--ink)',
          letterSpacing: '-0.01em',
          marginBottom:  4,
          lineHeight:    1.3,
        }}>
          {ub.badge.name}
        </div>
        <div style={{
          fontSize:      10,
          fontWeight:    700,
          color:         rarityColor,
          textTransform: 'uppercase',
          letterSpacing: '0.10em',
          marginBottom:  6,
        }}>
          {ub.badge.rarity}
        </div>
        <div style={{
          fontSize:   11,
          color:      'var(--muted)',
          lineHeight: 1.4,
        }}>
          {ub.badge.description}
        </div>
      </div>

      {/* Stars earned */}
      <div style={{
        display:      'inline-flex',
        alignItems:   'center',
        gap:          4,
        padding:      '4px 10px',
        borderRadius: 'var(--radius-full)',
        background:   'rgba(232,165,90,0.12)',
        border:       '1px solid rgba(232,165,90,0.25)',
      }}>
        <Star size={10} color="#e8a55a" fill="#e8a55a" />
        <span style={{ fontSize: 11, fontWeight: 700, color: '#e8a55a' }}>
          +{ub.badge.starReward} Stars
        </span>
      </div>

      {/* Date earned */}
      <div style={{ fontSize: 10, color: 'var(--muted-soft)' }}>
        Earned {dateStr}
      </div>
    </div>
  )
}

// ── In-progress badge card ─────────────────────────────────────
function InProgressCard({
  badge, progressInfo,
}: {
  badge: Badge
  progressInfo: { current: number; target: number; label: string }
}) {
  const [hovered, setHovered] = useState(false)
  const rarityColor = RARITY_COLOR[badge.rarity] ?? '#6b7280'
  const pct = progressInfo.target > 0
    ? Math.round((progressInfo.current / progressInfo.target) * 100)
    : 0

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background:   'var(--canvas)',
        border:       `1px solid ${hovered ? rarityColor + '50' : 'var(--hairline)'}`,
        borderRadius: 'var(--radius-xl)',
        padding:      '18px 20px',
        display:      'flex',
        alignItems:   'center',
        gap:          16,
        transition:   'all var(--transition-fast)',
        boxShadow:    hovered ? 'var(--shadow-md)' : 'var(--shadow-sm)',
      }}
    >
      {/* Icon */}
      <div style={{
        width:          52,
        height:         52,
        borderRadius:   'var(--radius-lg)',
        background:     `${rarityColor}12`,
        border:         `1px solid ${rarityColor}30`,
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'center',
        fontSize:       24,
        flexShrink:     0,
        transition:     'transform var(--transition-fast)',
        transform:      hovered ? 'scale(1.05)' : 'scale(1)',
      }}>
        {badge.icon}
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <span style={{
            fontFamily:    'var(--font-display)',
            fontWeight:    700,
            fontSize:      14,
            color:         'var(--ink)',
            letterSpacing: '-0.01em',
          }}>
            {badge.name}
          </span>
          <span style={{
            fontSize:      10,
            fontWeight:    700,
            color:         rarityColor,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            background:    `${rarityColor}12`,
            border:        `1px solid ${rarityColor}25`,
            borderRadius:  'var(--radius-full)',
            padding:       '1px 7px',
            flexShrink:    0,
          }}>
            {badge.rarity}
          </span>
        </div>

        {/* Progress label */}
        <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 8 }}>
          {progressInfo.label}
        </div>

        {/* Progress bar */}
        <div style={{
          height:       6,
          borderRadius: 'var(--radius-full)',
          background:   'var(--surface-card)',
          overflow:     'hidden',
          border:       '1px solid var(--hairline-soft)',
        }}>
          <div style={{
            height:          '100%',
            width:           `${pct}%`,
            borderRadius:    'var(--radius-full)',
            background:      pct >= 75
              ? `linear-gradient(90deg, ${rarityColor}, var(--accent-gold))`
              : rarityColor,
            transition:      'width 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)',
            boxShadow:       pct > 0 ? `0 0 6px ${rarityColor}50` : 'none',
          }} />
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
          <span style={{ fontSize: 10, color: 'var(--muted-soft)' }}>
            {progressInfo.current} / {progressInfo.target}
          </span>
          <span style={{
            fontSize:   10,
            fontWeight: 700,
            color:      pct >= 75 ? rarityColor : 'var(--muted)',
          }}>
            {pct}%
          </span>
        </div>
      </div>

      {/* Star reward preview */}
      <div style={{
        display:      'flex',
        flexDirection:'column',
        alignItems:   'center',
        gap:          3,
        flexShrink:   0,
        padding:      '8px 12px',
        borderRadius: 'var(--radius-md)',
        background:   'rgba(232,165,90,0.08)',
        border:       '1px solid rgba(232,165,90,0.20)',
      }}>
        <Star size={14} color="#e8a55a" fill="#e8a55a" />
        <span style={{ fontSize: 11, fontWeight: 700, color: '#e8a55a' }}>
          {badge.starReward}
        </span>
        <span style={{ fontSize: 9, color: 'var(--muted-soft)' }}>Stars</span>
      </div>
    </div>
  )
}

// ── Locked badge card ──────────────────────────────────────────
function LockedCard({
  badge, progressInfo,
}: {
  badge: Badge
  progressInfo: { current: number; target: number; label: string }
}) {
  const [hovered, setHovered] = useState(false)

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background:   hovered ? 'var(--surface-soft)' : 'var(--canvas)',
        border:       '1px solid var(--hairline)',
        borderRadius: 'var(--radius-xl)',
        padding:      '18px 20px',
        display:      'flex',
        alignItems:   'center',
        gap:          16,
        transition:   'all var(--transition-fast)',
        opacity:      hovered ? 0.9 : 0.65,
      }}
    >
      {/* Icon (grayscale + lock overlay) */}
      <div style={{ position: 'relative', flexShrink: 0 }}>
        <div style={{
          width:          52,
          height:         52,
          borderRadius:   'var(--radius-lg)',
          background:     'var(--surface-card)',
          border:         '1px solid var(--hairline)',
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'center',
          fontSize:       24,
          filter:         'grayscale(1) opacity(0.5)',
        }}>
          {badge.icon}
        </div>
        <div style={{
          position:       'absolute',
          bottom:         -4,
          right:          -4,
          width:          18,
          height:         18,
          borderRadius:   '50%',
          background:     'var(--surface-cream-strong)',
          border:         '1px solid var(--hairline)',
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'center',
        }}>
          <Lock size={9} color="var(--muted)" />
        </div>
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
          <span style={{
            fontFamily:    'var(--font-display)',
            fontWeight:    700,
            fontSize:      14,
            color:         'var(--muted)',
            letterSpacing: '-0.01em',
          }}>
            {badge.name}
          </span>
          <span style={{
            fontSize:      10,
            fontWeight:    700,
            color:         'var(--muted-soft)',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            background:    'var(--surface-card)',
            border:        '1px solid var(--hairline)',
            borderRadius:  'var(--radius-full)',
            padding:       '1px 7px',
            flexShrink:    0,
          }}>
            {badge.rarity}
          </span>
        </div>

        {/* Requirement */}
        <div style={{
          fontSize:   12,
          color:      'var(--muted-soft)',
          marginBottom: 4,
          display:    'flex',
          alignItems: 'center',
          gap:        5,
        }}>
          <Lock size={10} />
          {progressInfo.label}
        </div>

        <div style={{
          fontSize:   11,
          color:      'var(--muted-soft)',
          lineHeight: 1.4,
          display:    '-webkit-box',
          WebkitLineClamp: 1,
          WebkitBoxOrient: 'vertical',
          overflow:   'hidden',
        }}>
          {badge.description}
        </div>
      </div>

      {/* Locked star reward */}
      <div style={{
        display:      'flex',
        flexDirection:'column',
        alignItems:   'center',
        gap:          3,
        flexShrink:   0,
        padding:      '8px 12px',
        borderRadius: 'var(--radius-md)',
        background:   'var(--surface-soft)',
        border:       '1px solid var(--hairline)',
        opacity:      0.6,
      }}>
        <Star size={14} color="var(--muted)" />
        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)' }}>
          {badge.starReward}
        </span>
        <span style={{ fontSize: 9, color: 'var(--muted-soft)' }}>Stars</span>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────────
export default function Gamification() {
  const { user, habits, logs, allBadges, userBadges, loading, loadAll } = useStore()
  useEffect(() => { if (!user) loadAll(DEMO_USER_ID) }, [])

  const [categoryFilter, setCategoryFilter] = useState<string>('all')

  // ── Partition badges ───────────────────────────────────────
  const earnedIds = useMemo(
    () => new Set(userBadges.map(ub => ub.badgeId)),
    [userBadges]
  )

  const earnedList = useMemo(
    () => [...userBadges].sort(
      (a, b) => new Date(b.earnedAt).getTime() - new Date(a.earnedAt).getTime()
    ),
    [userBadges]
  )

  // Unearned badges split into in-progress vs locked
  const unearnedBadges = useMemo(
    () => allBadges.filter(b => !earnedIds.has(b.id)),
    [allBadges, earnedIds]
  )

  const streak   = user?.currentStreak ?? 0
  const level    = user?.level ?? 1
  const totalLogs = logs.length

  const inProgressBadges = useMemo(() => {
    return unearnedBadges.filter(b => {
      const info = getProgressInfo(b.condition, logs, habits, streak, level)
      return info.current > 0 && info.current < info.target
    }).sort((a, b) => {
      const pa = getProgressInfo(a.condition, logs, habits, streak, level)
      const pb = getProgressInfo(b.condition, logs, habits, streak, level)
      const ra = pa.target > 0 ? pa.current / pa.target : 0
      const rb = pb.target > 0 ? pb.current / pb.target : 0
      return rb - ra // highest % first
    })
  }, [unearnedBadges, logs, habits, streak, level])

  const lockedBadges = useMemo(
    () => unearnedBadges
      .filter(b => {
        const info = getProgressInfo(b.condition, logs, habits, streak, level)
        return info.current === 0 || info.target === 1
      })
      .sort((a, b) => (RARITY_RANK[a.rarity] ?? 0) - (RARITY_RANK[b.rarity] ?? 0)),
    [unearnedBadges, logs, habits, streak, level]
  )

  // Categories present in allBadges
  const categories = useMemo(() => {
    const cats = new Set(allBadges.map(b => b.category))
    return ['all', ...Array.from(cats)]
  }, [allBadges])

  // Apply category filter
  const filterBadges = <T extends { badge?: Badge } & Partial<Badge>>(
    list: T[],
    getBadge: (item: T) => Badge
  ) => categoryFilter === 'all'
    ? list
    : list.filter(item => getBadge(item).category === categoryFilter)

  const filteredEarned     = filterBadges(earnedList,      ub => (ub as UserBadge).badge)
  const filteredInProgress = filterBadges(inProgressBadges, b => b as Badge)
  const filteredLocked     = filterBadges(lockedBadges,     b => b as Badge)

  const totalStarsEarned = useMemo(
    () => userBadges.reduce((sum, ub) => sum + (ub.badge?.starReward ?? 0), 0),
    [userBadges]
  )

  // ── Loading ──────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', flexDirection: 'column', gap: 16 }}>
        <div style={{ width: 40, height: 40, border: '3px solid var(--hairline)', borderTop: '3px solid var(--coral)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <p style={{ color: 'var(--muted)', fontSize: 14 }}>Loading your trophies…</p>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28, animation: 'fadeIn 220ms ease forwards' }}>

      {/* ── Hero / Stars Header ── */}
      <div style={{
        background:   'var(--surface-dark)',
        border:       '1px solid rgba(255,255,255,0.07)',
        borderRadius: 'var(--radius-xl)',
        padding:      '32px 36px',
        position:     'relative',
        overflow:     'hidden',
      }}>
        {/* Background decoration */}
        <div style={{
          position:     'absolute', top: -80, right: -80,
          width:        280, height: 280,
          borderRadius: '50%',
          background:   'radial-gradient(circle, rgba(232,165,90,0.08), transparent 70%)',
          pointerEvents:'none',
        }} />
        <div style={{
          position:     'absolute', bottom: -60, left: -60,
          width:        200, height: 200,
          borderRadius: '50%',
          background:   'radial-gradient(circle, rgba(204,120,92,0.07), transparent 70%)',
          pointerEvents:'none',
        }} />

        <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 24 }}>
          {/* Left: title + description */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <Trophy size={20} color="#e8a55a" />
              <h1 style={{ margin: 0, color: 'var(--on-dark)', fontSize: '1.5rem' }}>
                Badges & Rewards
              </h1>
            </div>
            <p style={{ margin: 0, color: 'var(--on-dark-soft)', fontSize: 14, maxWidth: 420 }}>
              Complete habits consistently to earn badges and collect Stars — your currency for the HabitQuest store.
            </p>
            <div style={{ display: 'flex', gap: 16, marginTop: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 12, color: 'var(--on-dark-soft)' }}>Earned</span>
                <span style={{
                  fontFamily: 'var(--font-display)', fontWeight: 800,
                  fontSize: '1.1rem', color: 'var(--on-dark)',
                }}>
                  {earnedList.length}
                </span>
                <span style={{ fontSize: 12, color: 'var(--on-dark-soft)' }}>/ {allBadges.length} badges</span>
              </div>
              <div style={{ width: 1, background: 'rgba(255,255,255,0.1)' }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 12, color: 'var(--on-dark-soft)' }}>In Progress</span>
                <span style={{
                  fontFamily: 'var(--font-display)', fontWeight: 800,
                  fontSize: '1.1rem', color: '#e8a55a',
                }}>
                  {inProgressBadges.length}
                </span>
              </div>
            </div>
          </div>

          {/* Right: Stars balance */}
          <div style={{
            background:   'rgba(232,165,90,0.12)',
            border:       '1px solid rgba(232,165,90,0.25)',
            borderRadius: 'var(--radius-xl)',
            padding:      '20px 28px',
            textAlign:    'center',
            flexShrink:   0,
            minWidth:     160,
          }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'rgba(232,165,90,0.7)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>
              Your Stars
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <Star size={24} color="#e8a55a" fill="#e8a55a" />
              <span style={{
                fontFamily:    'var(--font-display)',
                fontWeight:    800,
                fontSize:      '2.2rem',
                color:         '#e8a55a',
                letterSpacing: '-0.04em',
                lineHeight:    1,
              }}>
                {user?.stars ?? 0}
              </span>
            </div>
            <div style={{ fontSize: 11, color: 'rgba(232,165,90,0.6)', marginTop: 8 }}>
              {totalStarsEarned} earned all time
            </div>
          </div>
        </div>
      </div>

      {/* ── Category filter ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--muted)', marginRight: 4 }}>
          <Filter size={13} />
          <span style={{ fontSize: 12, fontWeight: 500 }}>Filter</span>
        </div>
        {categories.map(cat => {
          const isActive = categoryFilter === cat
          return (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              style={{
                padding:      '6px 14px',
                borderRadius: 'var(--radius-full)',
                border:       `1px solid ${isActive ? 'var(--coral)' : 'var(--hairline)'}`,
                background:   isActive ? 'rgba(204,120,92,0.10)' : 'var(--canvas)',
                color:        isActive ? 'var(--coral)' : 'var(--muted)',
                fontFamily:   'var(--font-body)',
                fontSize:     13,
                fontWeight:   isActive ? 600 : 400,
                cursor:       'pointer',
                transition:   'all var(--transition-fast)',
                textTransform:'capitalize',
              }}
            >
              {cat === 'all' ? '✦ All' : CATEGORY_LABELS[cat] ?? cat}
            </button>
          )
        })}
      </div>

      {/* ── Earned Badges ── */}
      {filteredEarned.length > 0 && (
        <section>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 'var(--radius-md)',
              background: 'rgba(232,165,90,0.15)',
              border: '1px solid rgba(232,165,90,0.30)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Trophy size={15} color="#e8a55a" />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '1rem', color: 'var(--ink)' }}>
                Earned Badges
              </h2>
              <span style={{ fontSize: 12, color: 'var(--muted)' }}>
                {filteredEarned.length} badge{filteredEarned.length !== 1 ? 's' : ''} unlocked
              </span>
            </div>
          </div>

          <div style={{
            display:             'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
            gap:                 14,
          }}>
            {filteredEarned.map(ub => (
              <EarnedBadgeCard key={ub.id} ub={ub} />
            ))}
          </div>
        </section>
      )}

      {/* ── In Progress ── */}
      {filteredInProgress.length > 0 && (
        <section>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 'var(--radius-md)',
              background: 'rgba(59,130,246,0.12)',
              border: '1px solid rgba(59,130,246,0.25)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <TrendingUp size={15} color="#3b82f6" />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '1rem', color: 'var(--ink)' }}>
                In Progress
              </h2>
              <span style={{ fontSize: 12, color: 'var(--muted)' }}>
                {filteredInProgress.length} badge{filteredInProgress.length !== 1 ? 's' : ''} within reach
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {filteredInProgress.map(badge => (
              <InProgressCard
                key={badge.id}
                badge={badge}
                progressInfo={getProgressInfo(badge.condition, logs, habits, streak, level)}
              />
            ))}
          </div>
        </section>
      )}

      {/* ── Locked Badges ── */}
      {filteredLocked.length > 0 && (
        <section>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 'var(--radius-md)',
              background: 'var(--surface-card)',
              border: '1px solid var(--hairline)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Lock size={15} color="var(--muted)" />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '1rem', color: 'var(--ink)' }}>
                Locked
              </h2>
              <span style={{ fontSize: 12, color: 'var(--muted)' }}>
                {filteredLocked.length} badge{filteredLocked.length !== 1 ? 's' : ''} yet to unlock
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {filteredLocked.map(badge => (
              <LockedCard
                key={badge.id}
                badge={badge}
                progressInfo={getProgressInfo(badge.condition, logs, habits, streak, level)}
              />
            ))}
          </div>
        </section>
      )}

      {/* Empty state (no badges at all) */}
      {allBadges.length === 0 && (
        <div style={{
          textAlign: 'center', padding: '64px 32px',
          background: 'var(--canvas)', border: '1px dashed var(--hairline)',
          borderRadius: 'var(--radius-xl)',
        }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🏆</div>
          <h2 style={{ margin: '0 0 8px', color: 'var(--ink)' }}>No badges yet</h2>
          <p style={{ color: 'var(--muted)', fontSize: 14 }}>
            Run the database seed to populate badges.
          </p>
        </div>
      )}

    </div>
  )
}