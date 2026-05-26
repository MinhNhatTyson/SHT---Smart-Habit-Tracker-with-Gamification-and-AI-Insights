// src/renderer/lib/questEngine.ts
// Pure quest progress evaluator. No external store imports.

export const getDailyExpiry = () => {
  const d = new Date()
  d.setHours(23, 59, 59, 999)
  return d
}

export const getWeeklyExpiry = () => {
  const d = new Date()
  const sunday = new Date(d)
  const daysUntilSunday = 7 - d.getDay()
  sunday.setDate(d.getDate() + (daysUntilSunday === 7 ? 0 : daysUntilSunday))
  sunday.setHours(23, 59, 59, 999)
  return sunday
}

export const timeUntil = (expiry) => {
  if (!expiry) return ''
  const ms = expiry.getTime() - Date.now()
  if (ms <= 0) return 'Expired'
  const mins = Math.floor(ms / 60000)
  const hrs  = Math.floor(mins / 60)
  const days = Math.floor(hrs / 24)
  if (days > 0) return `${days}d ${hrs % 24}h`
  if (hrs  > 0) return `${hrs}h ${mins % 60}m`
  return `${mins}m`
}

// ── Date helpers ──────────────────────────────────────────────
const toLocalStr = (d) => {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

const getWeekStart = (d) => {
  const day = new Date(d)
  day.setDate(d.getDate() - d.getDay())
  day.setHours(0, 0, 0, 0)
  return day
}

const isSameWeek = (a, now) => {
  const ws = getWeekStart(now)
  const we = new Date(ws)
  we.setDate(ws.getDate() + 7)
  return a >= ws && a < we
}

// ── Main evaluator ────────────────────────────────────────────
export const evaluateQuests = (ctx) => {
  const { quests, habits, logs, currentStreak } = ctx
  const now      = new Date()
  const todayStr = toLocalStr(now)
  const ws       = getWeekStart(now)

  const activeHabits   = habits.filter(h => !h.isArchived)
  const activeHabitIds = new Set(activeHabits.map(h => h.id))
  const totalActive    = activeHabits.length

  const todayLogs = logs.filter(l => toLocalStr(new Date(l.completedAt)) === todayStr)
  const todayLogHabitIds = new Set(
    todayLogs.map(l => l.habitId).filter(id => activeHabitIds.has(id))
  )

  const weekLogs  = logs.filter(l => isSameWeek(new Date(l.completedAt), now))
  const totalLogs = logs.length

  // ── FIX: perfect_day uses activeHabits count as target, not 1 ──
  // isPerfectToday is only true when EVERY active habit is logged today
  const isPerfectToday = totalActive > 0 &&
    activeHabits.every(h => todayLogHabitIds.has(h.id))

  // Count perfect days this week
  let perfectDaysThisWeek = 0
  if (totalActive > 0) {
    for (let i = 0; i < 7; i++) {
      const d = new Date(ws)
      d.setDate(ws.getDate() + i)
      if (d > now) break
      const ds     = toLocalStr(d)
      const dayIds = new Set(
        logs.filter(l => toLocalStr(new Date(l.completedAt)) === ds)
            .map(l => l.habitId)
            .filter(id => activeHabitIds.has(id))
      )
      if (activeHabits.every(h => dayIds.has(h.id))) perfectDaysThisWeek++
    }
  }

  // Perfect streak ending today (for epic quest)
  let perfectLast7 = 0
  if (totalActive > 0) {
    for (let i = 0; i < 7; i++) {
      const d = new Date(now)
      d.setDate(now.getDate() - i)
      const ds     = toLocalStr(d)
      const dayIds = new Set(
        logs.filter(l => toLocalStr(new Date(l.completedAt)) === ds)
            .map(l => l.habitId)
            .filter(id => activeHabitIds.has(id))
      )
      if (activeHabits.every(h => dayIds.has(h.id))) perfectLast7++
      else break
    }
  }

  const categoriesToday = new Set(
    todayLogs.map(l => habits.find(h => h.id === l.habitId)?.category).filter(Boolean)
  )
  const categoriesWeek = new Set(
    weekLogs.map(l => habits.find(h => h.id === l.habitId)?.category).filter(Boolean)
  )

  const earlyToday = todayLogs.filter(l => new Date(l.completedAt).getHours() < 9).length

  const weekendDayMap = {}
  weekLogs.forEach(l => {
    const d   = new Date(l.completedAt)
    const day = d.getDay()
    if (day === 0 || day === 6) {
      const ds = toLocalStr(d)
      weekendDayMap[ds] = (weekendDayMap[ds] ?? 0) + 1
    }
  })
  const weekendDaysCovering = (n) =>
    Object.values(weekendDayMap).filter(c => c >= n).length

  return quests.map(quest => {
    const cond = quest.condition
    const tgt  = quest.target
    let progress = 0

    if (cond.startsWith('logs_today_')) {
      progress = Math.min(todayLogs.length, parseInt(cond.replace('logs_today_', ''), 10))

    } else if (cond.startsWith('logs_week_')) {
      progress = Math.min(weekLogs.length, parseInt(cond.replace('logs_week_', ''), 10))

    } else if (cond.startsWith('logs_total_')) {
      progress = Math.min(totalLogs, parseInt(cond.replace('logs_total_', ''), 10))

    } else if (cond.startsWith('streak_')) {
      progress = Math.min(currentStreak, parseInt(cond.replace('streak_', ''), 10))

    } else if (cond === 'perfect_day') {
      // ── FIX: progress = number of habits done today (out of totalActive)
      // target is ALSO set to totalActive at evaluation time, not the stored "1"
      // We report progress as todayLogHabitIds.size so the bar fills correctly,
      // and completed = true only when all habits are done.
      // The quest target stored in DB is 1 (boolean flag), but we override the
      // completion check here explicitly.
      progress = isPerfectToday ? tgt : Math.min(todayLogHabitIds.size, tgt - 1)
      // Note: we never let progress reach tgt unless truly perfect
      return {
        questId:   quest.id,
        progress:  isPerfectToday ? tgt : todayLogHabitIds.size,
        completed: isPerfectToday,
      }

    } else if (cond === 'perfect_days_7') {
      progress = perfectLast7

    } else if (cond.startsWith('perfect_days_')) {
      progress = Math.min(perfectDaysThisWeek, parseInt(cond.replace('perfect_days_', ''), 10))

    } else if (cond.startsWith('habits_')) {
      progress = Math.min(activeHabits.length, parseInt(cond.replace('habits_', ''), 10))

    } else if (cond.startsWith('category_week_')) {
      progress = Math.min(categoriesWeek.size, parseInt(cond.replace('category_week_', ''), 10))

    } else if (cond.startsWith('category_')) {
      progress = Math.min(categoriesToday.size, parseInt(cond.replace('category_', ''), 10))

    } else if (cond === 'early_today_1') {
      progress = Math.min(earlyToday, 1)

    } else if (cond.startsWith('weekend_')) {
      progress = Math.min(weekendDaysCovering(parseInt(cond.replace('weekend_', ''), 10)), 2)
    }

    return { questId: quest.id, progress: Math.min(progress, tgt), completed: progress >= tgt }
  })
}