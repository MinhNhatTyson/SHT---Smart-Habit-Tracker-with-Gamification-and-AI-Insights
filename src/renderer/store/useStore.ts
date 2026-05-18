// src/renderer/store/useStore.ts
// Global Zustand store — user, habits, logs, badges.
//
// STREAK LOGIC
// ─────────────────────────────────────────────────────────────
// Streaks are recalculated from scratch on every habit log using
// the full log history. This is the only reliable approach —
// incremental updates break when the user skips days or reopens
// the app after a long absence.
//
// Rules:
//   • A "day" is a local-timezone calendar date (YYYY-MM-DD).
//   • A day "counts" if the user completed at least one habit.
//   • currentStreak = consecutive days ending today (or yesterday
//     if the user hasn't logged anything yet today).
//   • longestStreak  = highest currentStreak ever reached.
//   • Missing even one full calendar day resets currentStreak to 0.

import { create } from 'zustand'

// ── Types ─────────────────────────────────────────────────────
export interface User {
  id: number
  username: string
  avatar: string | null
  level: number
  totalPoints: number
  currentStreak: number
  longestStreak: number
  createdAt: string
}

export interface Habit {
  id: number
  userId: number
  name: string
  description: string | null
  category: string
  color: string
  icon: string
  frequency: string
  targetDaysPerWeek: number
  reminderTime: string | null
  isArchived: boolean
  createdAt: string
}

export interface HabitLog {
  id: number
  habitId: number
  userId: number
  completedAt: string
  note: string | null
  moodRating: number | null
  durationMinutes: number | null
}

export interface Badge {
  id: number
  name: string
  description: string
  icon: string
  rarity: string
  pointValue: number
  condition: string
}

export interface UserBadge {
  id: number
  userId: number
  badgeId: number
  earnedAt: string
  badge: Badge
}

// ── XP / Level helpers ────────────────────────────────────────
export const XP_PER_LEVEL  = 100
export const getXpForLevel = (level: number) => level * XP_PER_LEVEL
export const getXpProgress = (totalPoints: number) => totalPoints % XP_PER_LEVEL
export const getXpPercent  = (totalPoints: number) =>
  Math.round((getXpProgress(totalPoints) / XP_PER_LEVEL) * 100)

// ── Streak calculator ─────────────────────────────────────────
// Takes the full list of HabitLogs and returns
// { currentStreak, longestStreak } recalculated from scratch.
//
// Steps:
//   1. Convert every log's completedAt to a local YYYY-MM-DD string.
//   2. Deduplicate → one entry per day.
//   3. Sort descending (most recent first).
//   4. Walk the sorted list:
//        - Start from today. If today has no log, start from yesterday
//          (the streak is still "alive" until midnight passes).
//        - Each step back must be exactly 1 calendar day earlier.
//          Any gap > 1 day breaks the current streak.
//   5. Simultaneously scan the full history for the longest
//      consecutive run (longestStreak).

function toLocalDateStr(iso: string): string {
  // Parse the ISO string in local time so timezone doesn't shift the date
  const d = new Date(iso)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr + 'T00:00:00')
  d.setDate(d.getDate() + n)
  return toLocalDateStr(d.toISOString())
}

export function calculateStreaks(logs: HabitLog[]): {
  currentStreak: number
  longestStreak: number
} {
  if (logs.length === 0) return { currentStreak: 0, longestStreak: 0 }

  // Step 1 & 2: unique sorted days (ascending)
  const daySet = new Set(logs.map(l => toLocalDateStr(l.completedAt)))
  const days   = Array.from(daySet).sort()           // ascending: oldest → newest

  // Step 3: calculate longestStreak by scanning the full sorted list
  let longest = 1
  let run     = 1
  for (let i = 1; i < days.length; i++) {
    const expected = addDays(days[i - 1], 1)
    if (days[i] === expected) {
      run++
      if (run > longest) longest = run
    } else {
      run = 1
    }
  }

  // Step 4: calculate currentStreak — walk backwards from today
  const todayStr     = toLocalDateStr(new Date().toISOString())
  const yesterdayStr = addDays(todayStr, -1)

  // The streak anchor: today if the user has already logged today,
  // yesterday if they haven't yet (streak still alive until midnight)
  const mostRecent = days[days.length - 1]
  let anchor: string

  if (mostRecent === todayStr) {
    anchor = todayStr
  } else if (mostRecent === yesterdayStr) {
    // Logged yesterday but not yet today — streak is still alive
    anchor = yesterdayStr
  } else {
    // Last log was before yesterday → streak is broken
    return { currentStreak: 0, longestStreak: longest }
  }

  // Walk backwards from anchor counting consecutive days
  let current = 1
  let cursor  = anchor
  for (let i = days.length - 2; i >= 0; i--) {
    const expected = addDays(cursor, -1)
    if (days[i] === expected) {
      current++
      cursor = days[i]
    } else {
      break
    }
  }

  return {
    currentStreak: current,
    longestStreak: Math.max(longest, current),
  }
}

// ── Store interface ───────────────────────────────────────────
interface AppState {
  user:       User | null
  habits:     Habit[]
  logs:       HabitLog[]
  userBadges: UserBadge[]
  loading:    boolean
  error:      string | null

  loadAll:     (userId: number) => Promise<void>
  logHabit:    (habitId: number, userId: number) => Promise<void>
  addHabit:    (data: Omit<Habit, 'id' | 'createdAt' | 'isArchived'>) => Promise<void>
  editHabit:   (id: number, data: Partial<Habit>) => Promise<void>
  removeHabit: (id: number) => Promise<void>

  isCompletedToday: (habitId: number) => boolean
  getTodayLogs:     () => HabitLog[]
  getWeekLogs:      () => HabitLog[]
}

const api = (window as any).api

export const useStore = create<AppState>((set, get) => ({
  user:       null,
  habits:     [],
  logs:       [],
  userBadges: [],
  loading:    false,
  error:      null,

  // ── Load everything ─────────────────────────────────────────
  loadAll: async (userId) => {
    set({ loading: true, error: null })
    try {
      const [user, habits, logs, userBadges] = await Promise.all([
        api.user.get(userId),
        api.habits.list(userId),
        api.logs.listByUser(userId),
        api.badges.userBadges(userId),
      ])

      // Recalculate streaks from full log history on every app load.
      // This self-heals any stale DB values from previous sessions.
      const { currentStreak, longestStreak } = calculateStreaks(logs)
      const streakChanged =
        user.currentStreak !== currentStreak ||
        user.longestStreak !== longestStreak

      let freshUser = user
      if (streakChanged) {
        freshUser = await api.user.update(user.id, {
          currentStreak,
          longestStreak: Math.max(longestStreak, user.longestStreak),
        })
      }

      set({ user: freshUser, habits, logs, userBadges, loading: false })
    } catch (e: any) {
      set({ error: e.message ?? 'Failed to load data', loading: false })
    }
  },

  // ── Log a habit completion ──────────────────────────────────
  logHabit: async (habitId, userId) => {
    // Guard: don't double-log the same habit on the same day
    const alreadyDone = get().isCompletedToday(habitId)
    if (alreadyDone) return

    try {
      // 1. Write the log
      const newLog = await api.logs.create({ habitId, userId })

      // 2. Update local logs state
      const updatedLogs = [newLog, ...get().logs]
      set({ logs: updatedLogs })

      // 3. Recalculate streaks from the full updated log list
      const { currentStreak, longestStreak } = calculateStreaks(updatedLogs)

      // 4. Award XP (+10 per completion)
      const { user } = get()
      if (!user) return

      const newPoints      = user.totalPoints + 10
      const newLevel       = Math.floor(newPoints / XP_PER_LEVEL) + 1
      const newLongest     = Math.max(longestStreak, user.longestStreak)

      const updated = await api.user.update(user.id, {
        totalPoints:   newPoints,
        level:         newLevel,
        currentStreak,
        longestStreak: newLongest,
      })

      set({ user: updated })
    } catch (e: any) {
      set({ error: e.message ?? 'Failed to log habit' })
    }
  },

  // ── Add habit ───────────────────────────────────────────────
  addHabit: async (data) => {
    try {
      const created = await api.habits.create(data)
      set(state => ({ habits: [...state.habits, created] }))
      api.reminders.refresh().catch(() => {})
    } catch (e: any) {
      set({ error: e.message ?? 'Failed to create habit' })
    }
  },

  // ── Edit habit ──────────────────────────────────────────────
  editHabit: async (id, data) => {
    try {
      const updated = await api.habits.update(id, data)
      set(state => ({
        habits: state.habits.map(h => h.id === id ? { ...h, ...updated } : h),
      }))
      api.reminders.refresh().catch(() => {})
    } catch (e: any) {
      set({ error: e.message ?? 'Failed to update habit' })
    }
  },

  // ── Remove (soft-archive) habit ─────────────────────────────
  removeHabit: async (id) => {
    try {
      await api.habits.delete(id)
      set(state => ({ habits: state.habits.filter(h => h.id !== id) }))
      api.reminders.refresh().catch(() => {})
    } catch (e: any) {
      set({ error: e.message ?? 'Failed to delete habit' })
    }
  },

  // ── Helpers ─────────────────────────────────────────────────
  isCompletedToday: (habitId) => {
    const today = toLocalDateStr(new Date().toISOString())
    return get().logs.some(
      l => l.habitId === habitId &&
           toLocalDateStr(l.completedAt) === today
    )
  },

  getTodayLogs: () => {
    const today = toLocalDateStr(new Date().toISOString())
    return get().logs.filter(
      l => toLocalDateStr(l.completedAt) === today
    )
  },

  getWeekLogs: () => {
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    return get().logs.filter(l => new Date(l.completedAt) >= weekAgo)
  },
}))