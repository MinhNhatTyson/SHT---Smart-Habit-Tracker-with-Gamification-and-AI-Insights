// src/renderer/lib/motivationEngine.ts
// Pure motivation/reminder rule evaluator.
// Takes current app state and returns a list of MotivationMessage objects.
// All rules self-resolve — they only fire when the condition is currently true.

export type MotivationKind =
  | 'inactivity'          // No habit logged in past 24h
  | 'streak_all'          // All habits done for 5+ consecutive days
  | 'streak_single'       // A single habit done 10+ times in a row
  | 'struggling'          // A specific habit not done in N days
  | 'goal_habit'          // Goal-linked habits not completed recently
  | 'goal_deadline'       // Goal deadline approaching (≤7 days)

export interface MotivationMessage {
  id:       string           // stable key used for dedup / dismiss
  kind:     MotivationKind
  title:    string
  body:     string
  icon:     string
  color:    string           // accent color for the card
  habitId?: number           // for habit-specific messages
  goalId?:  number           // for goal-specific messages
}

// ── Thresholds (tweak here) ────────────────────────────────────
const INACTIVITY_HOURS          = 24
const ALL_HABITS_STREAK_DAYS    = 5    // consecutive perfect days to trigger motivation
const SINGLE_HABIT_STREAK_COUNT = 10   // consecutive completions of same habit
const STRUGGLING_DAYS           = 3    // days with 0 completions of a habit
const GOAL_DEADLINE_WARNING_DAYS = 7   // days before deadline to warn
const GOAL_HABIT_INACTIVE_DAYS  = 2    // days goal-linked habit must be absent

// ── Helpers ───────────────────────────────────────────────────
function toLocalStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function daysAgo(n: number): Date {
  const d = new Date()
  d.setDate(d.getDate() - n)
  d.setHours(0, 0, 0, 0)
  return d
}

function hoursAgo(n: number): Date {
  return new Date(Date.now() - n * 60 * 60 * 1000)
}

// ── Context passed in from the store ──────────────────────────
export interface MotivationContext {
  habits: Array<{
    id:        number
    name:      string
    icon:      string
    color:     string
    category:  string
    isArchived: boolean
  }>
  logs: Array<{
    habitId:     number
    completedAt: string
  }>
  goals: Array<{
    id:          number
    title:       string
    category:    string
    habitIds:    string   // JSON array of habit IDs
    deadline:    string | null
    status:      string
    targetValue: number
    currentValue: number
  }>
}

// ─────────────────────────────────────────────────────────────
// Main evaluator
// ─────────────────────────────────────────────────────────────
export function evaluateMotivation(ctx: MotivationContext): MotivationMessage[] {
  const { habits, logs, goals } = ctx
  const messages: MotivationMessage[] = []
  const now = new Date()
  const todayStr = toLocalStr(now)

  const activeHabits    = habits.filter(h => !h.isArchived)
  const activeHabitIds  = new Set(activeHabits.map(h => h.id))

  // ── 1. INACTIVITY: no habit logged in past 24h ────────────
  const cutoff24h = hoursAgo(INACTIVITY_HOURS)
  const recentLog = logs.find(l => new Date(l.completedAt) >= cutoff24h)

  if (!recentLog && activeHabits.length > 0) {
    // Find how many hours/days since last log
    const lastLog  = logs
      .filter(l => activeHabitIds.has(l.habitId))
      .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime())[0]

    let sinceText = 'a while'
    if (lastLog) {
      const ms   = now.getTime() - new Date(lastLog.completedAt).getTime()
      const days = Math.floor(ms / (1000 * 60 * 60 * 24))
      const hrs  = Math.floor(ms / (1000 * 60 * 60))
      sinceText  = days >= 2 ? `${days} days` : hrs >= 24 ? 'yesterday' : `${hrs} hours`
    }

    messages.push({
      id:    'inactivity',
      kind:  'inactivity',
      title: "Your habits miss you 👀",
      body:  lastLog
        ? `You haven't logged any habits in ${sinceText}. A small win today keeps the streak alive!`
        : `You haven't logged any habits yet. Start small — even one counts!`,
      icon:  '⏰',
      color: '#e8a55a',
    })
  }

  // ── 2a. STREAK ALL: all habits done for 5+ consecutive days ─
  if (activeHabits.length > 0) {
    let consecutivePerfectDays = 0
    for (let i = 0; i < 30; i++) {
      const d  = new Date(now)
      d.setDate(d.getDate() - i)
      const ds = toLocalStr(d)
      const dayIds = new Set(
        logs
          .filter(l => toLocalStr(new Date(l.completedAt)) === ds && activeHabitIds.has(l.habitId))
          .map(l => l.habitId)
      )
      const perfect = activeHabits.every(h => dayIds.has(h.id))
      if (perfect) consecutivePerfectDays++
      else break
    }

    if (consecutivePerfectDays >= ALL_HABITS_STREAK_DAYS) {
      messages.push({
        id:    `streak_all_${consecutivePerfectDays}`,
        kind:  'streak_all',
        title: `${consecutivePerfectDays}-day perfect streak! 🔥`,
        body:  `You've completed ALL your habits for ${consecutivePerfectDays} days straight. You're in rare territory — keep going!`,
        icon:  '🏆',
        color: '#ef4444',
      })
    }
  }

  // ── 2b. STREAK SINGLE: one habit done 10+ times in a row ────
  // "In a row" = on consecutive calendar days where the habit was completed
  for (const habit of activeHabits) {
    const habitLogs = logs
      .filter(l => l.habitId === habit.id)
      .map(l => toLocalStr(new Date(l.completedAt)))

    const uniqueDays = [...new Set(habitLogs)].sort().reverse() // newest first

    let consecutiveDays = 0
    let prevDay: string | null = null

    for (const day of uniqueDays) {
      if (prevDay === null) {
        consecutiveDays = 1
        prevDay = day
      } else {
        // Check if this day is exactly 1 before prevDay
        const prev  = new Date(prevDay + 'T00:00:00')
        const curr  = new Date(day     + 'T00:00:00')
        const diff  = (prev.getTime() - curr.getTime()) / (1000 * 60 * 60 * 24)
        if (diff === 1) {
          consecutiveDays++
          prevDay = day
        } else {
          break
        }
      }
    }

    if (consecutiveDays >= SINGLE_HABIT_STREAK_COUNT) {
      messages.push({
        id:      `streak_single_${habit.id}`,
        kind:    'streak_single',
        title:   `${habit.icon} ${habit.name}: ${consecutiveDays}-day run!`,
        body:    `You've completed "${habit.name}" for ${consecutiveDays} consecutive days. That's serious dedication — don't stop now!`,
        icon:    '⚡',
        color:   habit.color,
        habitId: habit.id,
      })
    }
  }

  // ── 3. STRUGGLING: a habit not done in STRUGGLING_DAYS ──────
  const struggleCutoff = daysAgo(STRUGGLING_DAYS)

  for (const habit of activeHabits) {
    const recentHabitLog = logs.find(
      l => l.habitId === habit.id && new Date(l.completedAt) >= struggleCutoff
    )
    if (!recentHabitLog) {
      // Find how long it's been
      const lastHabitLog = logs
        .filter(l => l.habitId === habit.id)
        .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime())[0]

      let sinceText = 'several days'
      if (lastHabitLog) {
        const ms   = now.getTime() - new Date(lastHabitLog.completedAt).getTime()
        const days = Math.floor(ms / (1000 * 60 * 60 * 24))
        sinceText  = days === 1 ? '1 day' : `${days} days`
      }

      messages.push({
        id:      `struggling_${habit.id}`,
        kind:    'struggling',
        title:   `${habit.icon} "${habit.name}" needs attention`,
        body:    lastHabitLog
          ? `You haven't completed "${habit.name}" in ${sinceText}. It only takes a moment to get back on track.`
          : `You haven't started "${habit.name}" yet. Today is a great day to begin!`,
        icon:    '💪',
        color:   habit.color,
        habitId: habit.id,
      })
    }
  }

  // ── 4. GOALS ─────────────────────────────────────────────────
  const activeGoals = goals.filter(g => g.status === 'active')

  for (const goal of activeGoals) {
    const linkedIds: number[] = (() => {
      try { return JSON.parse(goal.habitIds) as number[] } catch { return [] }
    })()

    // Resolve which habits are relevant (linked or by category)
    const relevantHabits = linkedIds.length > 0
      ? activeHabits.filter(h => linkedIds.includes(h.id))
      : activeHabits.filter(h => h.category.toLowerCase() === goal.category.toLowerCase())

    if (relevantHabits.length === 0) continue

    // 4a. Goal-linked habit not completed recently
    const goalHabitCutoff = daysAgo(GOAL_HABIT_INACTIVE_DAYS)
    const anyRecentLog    = logs.find(
      l => relevantHabits.some(h => h.id === l.habitId) &&
           new Date(l.completedAt) >= goalHabitCutoff
    )

    if (!anyRecentLog) {
      const habitNames = relevantHabits.slice(0, 2).map(h => `"${h.name}"`).join(', ')
      const extra      = relevantHabits.length > 2 ? ` +${relevantHabits.length - 2} more` : ''

      messages.push({
        id:     `goal_habit_${goal.id}`,
        kind:   'goal_habit',
        title:  `🎯 Goal "${goal.title}" is falling behind`,
        body:   `The habits supporting this goal (${habitNames}${extra}) haven't been completed recently. Log them to keep your goal on track.`,
        icon:   '🎯',
        color:  'var(--coral)',
        goalId: goal.id,
      })
    }

    // 4b. Deadline approaching
    if (goal.deadline) {
      const deadline  = new Date(goal.deadline)
      const daysLeft  = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

      if (daysLeft >= 0 && daysLeft <= GOAL_DEADLINE_WARNING_DAYS) {
        const pct = goal.targetValue > 0
          ? Math.round((goal.currentValue / goal.targetValue) * 100)
          : 0

        messages.push({
          id:     `goal_deadline_${goal.id}`,
          kind:   'goal_deadline',
          title:  daysLeft === 0
            ? `⏰ Goal "${goal.title}" deadline is TODAY`
            : `⏰ Goal "${goal.title}" — ${daysLeft} day${daysLeft !== 1 ? 's' : ''} left`,
          body:   `You're at ${pct}% of your goal with ${daysLeft === 0 ? 'today' : `${daysLeft} days`} remaining. ${pct >= 80 ? "You're almost there — finish strong!" : "Time to push harder to reach your target!"}`,
          icon:   '⏰',
          color:  daysLeft <= 2 ? '#ef4444' : '#e8a55a',
          goalId: goal.id,
        })
      }
    }
  }

  // Deduplicate by id (safety net)
  const seen = new Set<string>()
  return messages.filter(m => {
    if (seen.has(m.id)) return false
    seen.add(m.id)
    return true
  })
}