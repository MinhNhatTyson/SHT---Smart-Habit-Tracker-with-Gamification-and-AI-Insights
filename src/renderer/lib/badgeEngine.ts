// src/renderer/lib/badgeEngine.ts
// Badge awarding engine — evaluates all unearned badge conditions
// and returns newly earned badges to the caller.
//
// This is a PURE function — it takes state as input and returns
// a list of badges to award. The store handles the actual DB writes.
//
// Condition keys:
//   "none"         → always award (welcome / special badges)
//   "first_habit"  → habits.length >= 1
//   "logs_N"       → totalLogs >= N
//   "streak_N"     → currentStreak >= N
//   "habits_N"     → activeHabits >= N
//   "level_N"      → level >= N
//   "perfect_day"  → all habits completed today
//   "perfect_week" → perfect_day for 7 consecutive days
//   "early_bird"   → any log before 08:00
//   "night_owl"    → any log after 22:00
//   "comeback_kid" → logged after 7+ day gap
//   "variety_N"    → completions in N different categories this week

import { Badge, Habit, HabitLog, UserBadge } from '../store/useStore'

export interface BadgeCheckContext {
  allBadges:    Badge[]
  earnedBadges: UserBadge[]
  habits:       Habit[]
  logs:         HabitLog[]
  currentStreak: number
  level:        number
}

function toLocalStr(iso: string): string {
  const d = new Date(iso)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function getHour(iso: string): number {
  return new Date(iso).getHours()
}

/**
 * Returns the list of badges that SHOULD be newly awarded
 * given the current application state.
 */
export function checkBadges(ctx: BadgeCheckContext): Badge[] {
  const {
    allBadges, earnedBadges, habits, logs,
    currentStreak, level,
  } = ctx

  const earnedIds = new Set(earnedBadges.map(ub => ub.badgeId))
  const unearnedBadges = allBadges.filter(b => !earnedIds.has(b.id))
  if (unearnedBadges.length === 0) return []

  const todayStr   = toLocalStr(new Date().toISOString())
  const totalLogs  = logs.length
  const activeHabits = habits.filter(h => !h.isArchived).length

  // ── Perfect day check ─────────────────────────────────────
  const todayLogHabitIds = new Set(
    logs
      .filter(l => toLocalStr(l.completedAt) === todayStr)
      .map(l => l.habitId)
  )
  const isPerfectDay = activeHabits > 0 &&
    habits.every(h => h.isArchived || todayLogHabitIds.has(h.id))

  // ── Perfect week check ────────────────────────────────────
  // All 7 of the last 7 days must be perfect days
  const isPerfectWeek = (() => {
    if (activeHabits === 0) return false
    for (let i = 0; i < 7; i++) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const ds = toLocalStr(d.toISOString())
      const dayIds = new Set(
        logs
          .filter(l => toLocalStr(l.completedAt) === ds)
          .map(l => l.habitId)
      )
      const allDone = habits.every(h => h.isArchived || dayIds.has(h.id))
      if (!allDone) return false
    }
    return true
  })()

  // ── Early bird / Night owl ─────────────────────────────────
  const hasEarlyLog = logs.some(l => getHour(l.completedAt) < 8)
  const hasLateLog  = logs.some(l => getHour(l.completedAt) >= 22)

  // ── Comeback kid: completed habit after 7+ day gap ────────
  const isComeback = (() => {
    if (logs.length < 2) return false
    const sorted = [...logs].sort(
      (a, b) => new Date(a.completedAt).getTime() - new Date(b.completedAt).getTime()
    )
    for (let i = 1; i < sorted.length; i++) {
      const prev = new Date(sorted[i - 1].completedAt)
      const curr = new Date(sorted[i].completedAt)
      const diffDays = (curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24)
      if (diffDays >= 7) return true
    }
    return false
  })()

  // ── Variety: distinct categories completed this week ──────
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  const weekLogs = logs.filter(l => new Date(l.completedAt) >= weekAgo)
  const categoriesThisWeek = new Set(
    weekLogs
      .map(l => habits.find(h => h.id === l.habitId)?.category)
      .filter(Boolean)
  )
  const varietyCount = categoriesThisWeek.size

  // ── Evaluate each unearned badge ──────────────────────────
  const toAward: Badge[] = []

  for (const badge of unearnedBadges) {
    const cond = badge.condition

    let earned = false

    if (cond === 'none')           earned = true
    else if (cond === 'first_habit') earned = habits.length >= 1
    else if (cond === 'logs_1')    earned = totalLogs >= 1
    else if (cond === 'logs_10')   earned = totalLogs >= 10
    else if (cond === 'logs_25')   earned = totalLogs >= 25
    else if (cond === 'logs_100')  earned = totalLogs >= 100
    else if (cond === 'logs_500')  earned = totalLogs >= 500
    else if (cond === 'logs_1000') earned = totalLogs >= 1000
    else if (cond === 'streak_3')  earned = currentStreak >= 3
    else if (cond === 'streak_7')  earned = currentStreak >= 7
    else if (cond === 'streak_14') earned = currentStreak >= 14
    else if (cond === 'streak_30') earned = currentStreak >= 30
    else if (cond === 'streak_100')earned = currentStreak >= 100
    else if (cond === 'streak_365')earned = currentStreak >= 365
    else if (cond === 'habits_3')  earned = activeHabits >= 3
    else if (cond === 'habits_5')  earned = activeHabits >= 5
    else if (cond === 'habits_7')  earned = activeHabits >= 7
    else if (cond === 'level_5')   earned = level >= 5
    else if (cond === 'level_10')  earned = level >= 10
    else if (cond === 'level_25')  earned = level >= 25
    else if (cond === 'level_50')  earned = level >= 50
    else if (cond === 'perfect_day')  earned = isPerfectDay
    else if (cond === 'perfect_week') earned = isPerfectWeek
    else if (cond === 'early_bird')   earned = hasEarlyLog
    else if (cond === 'night_owl')    earned = hasLateLog
    else if (cond === 'comeback_kid') earned = isComeback
    else if (cond === 'variety_4')    earned = varietyCount >= 4

    if (earned) toAward.push(badge)
  }

  return toAward
}