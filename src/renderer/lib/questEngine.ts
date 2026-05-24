// src/renderer/lib/questEngine.ts
// Evaluates quest progress for a given user state.
// Pure function — no side effects. Returns { progress, completed } per quest.
// No imports from useStore/questStore to avoid circular dependencies.
//
// Condition keys:
//   logs_today_N       → habits logged today >= N
//   logs_week_N        → habits logged this calendar week >= N
//   logs_total_N       → all-time total logs >= N
//   streak_N           → currentStreak >= N
//   perfect_day        → all active habits done today (boolean)
//   perfect_days_N     → number of perfect days this week >= N
//   perfect_days_7     → 7 perfect days in a row (epic)
//   habits_N           → active habit count >= N
//   category_N         → distinct categories completed today >= N
//   category_week_N    → distinct categories completed this week >= N
//   early_today_1      → any habit logged before 09:00 today
//   weekend_N          → both Sat + Sun have >= N completions this week

// ── Minimal inline types (no imports from store) ──────────────
interface HabitLike {
  id:         number
  isArchived: boolean
  category?:  string
}
interface LogLike {
  habitId:     number
  completedAt: string
}

export interface QuestDef {
  id:        number
  key:       string
  condition: string
  target:    number
  tier:      'daily' | 'weekly' | 'epic'
}

export interface QuestProgress {
  questId:   number
  progress:  number
  completed: boolean
}

export interface QuestCheckContext {
  quests:        QuestDef[]
  habits:        HabitLike[]
  logs:          LogLike[]
  currentStreak: number
}

// ── Date helpers ──────────────────────────────────────────────
function toLocalStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

function weekStart(d: Date): Date {
  const day = new Date(d)
  day.setDate(d.getDate() - d.getDay())
  day.setHours(0, 0, 0, 0)
  return day
}

function isSameWeek(a: Date, now: Date): boolean {
  const ws = weekStart(now)
  const we = new Date(ws)
  we.setDate(ws.getDate() + 7)
  return a >= ws && a < we
}

// ── Main evaluation function ──────────────────────────────────
export function evaluateQuests(ctx: QuestCheckContext): QuestProgress[] {
  const { quests, habits, logs, currentStreak } = ctx
  const now      = new Date()
  const todayStr = toLocalStr(now)
  const ws       = weekStart(now)

  const activeHabits   = habits.filter(h => !h.isArchived)
  const activeHabitIds = new Set(activeHabits.map(h => h.id))

  // Today's logs (active habits only)
  const todayLogs = logs.filter(l => toLocalStr(new Date(l.completedAt)) === todayStr)
  const todayLogHabitIds = new Set(
    todayLogs.map(l => l.habitId).filter(id => activeHabitIds.has(id))
  )

  // This week's logs
  const weekLogs = logs.filter(l => isSameWeek(new Date(l.completedAt), now))

  const totalLogs = logs.length

  // Perfect day today
  const isPerfectToday = activeHabits.length > 0 &&
    activeHabits.every(h => todayLogHabitIds.has(h.id))

  // Perfect days this week
  const perfectDaysThisWeek = (() => {
    if (activeHabits.length === 0) return 0
    let count = 0
    for (let i = 0; i < 7; i++) {
      const d = new Date(ws)
      d.setDate(ws.getDate() + i)
      if (d > now) break
      const ds = toLocalStr(d)
      const dayIds = new Set(
        logs.filter(l => toLocalStr(new Date(l.completedAt)) === ds)
            .map(l => l.habitId)
            .filter(id => activeHabitIds.has(id))
      )
      if (activeHabits.every(h => dayIds.has(h.id))) count++
    }
    return count
  })()

  // Perfect 7 consecutive days ending today
  const perfectLast7 = (() => {
    if (activeHabits.length === 0) return 0
    let streak = 0
    for (let i = 0; i < 7; i++) {
      const d = new Date(now)
      d.setDate(now.getDate() - i)
      const ds = toLocalStr(d)
      const dayIds = new Set(
        logs.filter(l => toLocalStr(new Date(l.completedAt)) === ds)
            .map(l => l.habitId)
            .filter(id => activeHabitIds.has(id))
      )
      if (activeHabits.every(h => dayIds.has(h.id))) streak++
      else break
    }
    return streak
  })()

  // Categories completed today
  const categoriesToday = new Set(
    todayLogs
      .map(l => habits.find(h => h.id === l.habitId)?.category)
      .filter(Boolean)
  )

  // Categories completed this week
  const categoriesWeek = new Set(
    weekLogs
      .map(l => habits.find(h => h.id === l.habitId)?.category)
      .filter(Boolean)
  )

  // Early logs today (before 09:00)
  const earlyToday = todayLogs.filter(l => new Date(l.completedAt).getHours() < 9).length

  // Weekend completions this week grouped by day
  const weekendDayMap: Record<string, number> = {}
  weekLogs.forEach(l => {
    const d   = new Date(l.completedAt)
    const day = d.getDay()
    if (day === 0 || day === 6) {
      const ds = toLocalStr(d)
      weekendDayMap[ds] = (weekendDayMap[ds] ?? 0) + 1
    }
  })
  const weekendDaysCovering = (minCount: number) =>
    Object.values(weekendDayMap).filter(c => c >= minCount).length

  // ── Evaluate each quest ───────────────────────────────────
  return quests.map(quest => {
    const cond = quest.condition
    const tgt  = quest.target
    let progress = 0

    if (cond.startsWith('logs_today_')) {
      const n  = parseInt(cond.replace('logs_today_', ''), 10)
      progress = Math.min(todayLogs.length, n)
    }
    else if (cond.startsWith('logs_week_')) {
      const n  = parseInt(cond.replace('logs_week_', ''), 10)
      progress = Math.min(weekLogs.length, n)
    }
    else if (cond.startsWith('logs_total_')) {
      const n  = parseInt(cond.replace('logs_total_', ''), 10)
      progress = Math.min(totalLogs, n)
    }
    else if (cond.startsWith('streak_')) {
      const n  = parseInt(cond.replace('streak_', ''), 10)
      progress = Math.min(currentStreak, n)
    }
    else if (cond === 'perfect_day') {
      progress = isPerfectToday
        ? 1
        : Math.min(todayLogHabitIds.size, activeHabits.length > 0 ? activeHabits.length : 1)
    }
    else if (cond === 'perfect_days_7') {
      progress = perfectLast7
    }
    else if (cond.startsWith('perfect_days_')) {
      const n  = parseInt(cond.replace('perfect_days_', ''), 10)
      progress = Math.min(perfectDaysThisWeek, n)
    }
    else if (cond.startsWith('habits_')) {
      const n  = parseInt(cond.replace('habits_', ''), 10)
      progress = Math.min(activeHabits.length, n)
    }
    else if (cond.startsWith('category_week_')) {
      const n  = parseInt(cond.replace('category_week_', ''), 10)
      progress = Math.min(categoriesWeek.size, n)
    }
    else if (cond.startsWith('category_')) {
      const n  = parseInt(cond.replace('category_', ''), 10)
      progress = Math.min(categoriesToday.size, n)
    }
    else if (cond === 'early_today_1') {
      progress = Math.min(earlyToday, 1)
    }
    else if (cond.startsWith('weekend_')) {
      const n  = parseInt(cond.replace('weekend_', ''), 10)
      progress = Math.min(weekendDaysCovering(n), 2)
    }

    return {
      questId:   quest.id,
      progress:  Math.min(progress, tgt),
      completed: progress >= tgt,
    }
  })
}

// ── Expiry date helpers ───────────────────────────────────────
export function getDailyExpiry(): Date {
  const d = new Date()
  d.setHours(23, 59, 59, 999)
  return d
}

export function getWeeklyExpiry(): Date {
  const d = new Date()
  const daysUntilSunday = 7 - d.getDay()
  const sunday = new Date(d)
  sunday.setDate(d.getDate() + (daysUntilSunday === 7 ? 0 : daysUntilSunday))
  sunday.setHours(23, 59, 59, 999)
  return sunday
}

export function timeUntil(expiry: Date | null): string {
  if (!expiry) return ''
  const ms = expiry.getTime() - Date.now()
  if (ms <= 0) return 'Expired'
  const mins = Math.floor(ms / 60000)
  const hrs  = Math.floor(mins / 60)
  const days = Math.floor(hrs / 24)
  if (days > 0)  return `${days}d ${hrs % 24}h`
  if (hrs > 0)   return `${hrs}h ${mins % 60}m`
  return `${mins}m`
}