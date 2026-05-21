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
// BADGE AWARDING
// ─────────────────────────────────────────────────────────────
// After every state-changing action (logHabit, addHabit, loadAll),
// the badge engine scans all unearned badges and awards any that
// now satisfy their condition. Awards stars to the user.
// Newly awarded badges are pushed to `newlyEarnedBadges` for
// the toast notification system to consume.

import { create } from 'zustand'
import { checkBadges } from '../lib/badgeEngine'

// ── Types ─────────────────────────────────────────────────────
export interface User {
  id:            number
  username:      string
  avatar:        string | null
  level:         number
  totalPoints:   number
  currentStreak: number
  longestStreak: number
  fullName:      string | null
  gender:        string | null
  bio:           string | null
  avatarUrl:     string | null
  stars:         number
  createdAt:     string
}

export interface Habit {
  id:                number
  userId:            number
  name:              string
  description:       string | null
  category:          string
  color:             string
  icon:              string
  frequency:         string
  targetDaysPerWeek: number
  reminderTime:      string | null
  isArchived:        boolean
  createdAt:         string
}

export interface HabitLog {
  id:              number
  habitId:         number
  userId:          number
  completedAt:     string
  note:            string | null
  moodRating:      number | null
  durationMinutes: number | null
}

export interface Badge {
  id:          number
  name:        string
  description: string
  icon:        string
  rarity:      string
  starReward:  number
  condition:   string
  category:    string
}

export interface UserBadge {
  id:       number
  userId:   number
  badgeId:  number
  earnedAt: string
  badge:    Badge
}

// ── XP / Level helpers ────────────────────────────────────────
export const XP_PER_LEVEL  = 100
export const getXpForLevel = (level: number) => level * XP_PER_LEVEL
export const getXpProgress = (totalPoints: number) => totalPoints % XP_PER_LEVEL
export const getXpPercent  = (totalPoints: number) =>
  Math.round((getXpProgress(totalPoints) / XP_PER_LEVEL) * 100)

// ── Rarity → star reward mapping (fallback) ──────────────────
export const RARITY_STAR_REWARD: Record<string, number> = {
  common:    5,
  rare:      15,
  epic:      40,
  legendary: 100,
}

export const RARITY_COLOR: Record<string, string> = {
  common:    '#6b7280',
  rare:      '#3b82f6',
  epic:      '#8b5cf6',
  legendary: '#e8a55a',
}

// ── Streak calculator ─────────────────────────────────────────
function toLocalDateStr(iso: string): string {
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

  const daySet = new Set(logs.map(l => toLocalDateStr(l.completedAt)))
  const days   = Array.from(daySet).sort()

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

  const todayStr     = toLocalDateStr(new Date().toISOString())
  const yesterdayStr = addDays(todayStr, -1)
  const mostRecent   = days[days.length - 1]
  let anchor: string

  if (mostRecent === todayStr) {
    anchor = todayStr
  } else if (mostRecent === yesterdayStr) {
    anchor = yesterdayStr
  } else {
    return { currentStreak: 0, longestStreak: longest }
  }

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
  user:              User | null
  habits:            Habit[]
  logs:              HabitLog[]
  allBadges:         Badge[]
  userBadges:        UserBadge[]
  loading:           boolean
  error:             string | null

  // Badge toast notifications — components consume and clear these
  newlyEarnedBadges: Badge[]
  clearNewBadges:    () => void

  loadAll:       (userId: number) => Promise<void>
  logHabit:      (habitId: number, userId: number) => Promise<void>
  addHabit:      (data: Omit<Habit, 'id' | 'createdAt' | 'isArchived'>) => Promise<void>
  editHabit:     (id: number, data: Partial<Habit>) => Promise<void>
  removeHabit:   (id: number) => Promise<void>
  updateProfile: (data: Partial<User>) => Promise<void>

  isCompletedToday: (habitId: number) => boolean
  getTodayLogs:     () => HabitLog[]
  getWeekLogs:      () => HabitLog[]
}

const api = (window as any).api

// ── Internal: run badge check and award any newly earned badges ─
async function runBadgeCheck(
  get: () => AppState,
  set: (partial: Partial<AppState>) => void,
  overrideState?: {
    habits?:       Habit[]
    logs?:         HabitLog[]
    userBadges?:   UserBadge[]
    currentStreak?: number
    level?:        number
  }
) {
  const state         = get()
  const user          = state.user
  if (!user) return

  const habits        = overrideState?.habits      ?? state.habits
  const logs          = overrideState?.logs        ?? state.logs
  const userBadges    = overrideState?.userBadges  ?? state.userBadges
  const currentStreak = overrideState?.currentStreak ?? user.currentStreak
  const level         = overrideState?.level         ?? user.level

  const toAward = checkBadges({
    allBadges:    state.allBadges,
    earnedBadges: userBadges,
    habits,
    logs,
    currentStreak,
    level,
  })

  if (toAward.length === 0) return

  // Award each badge sequentially
  const newUserBadges: UserBadge[] = []
  let totalStarsEarned = 0

  for (const badge of toAward) {
    try {
      const ub = await api.badges.award(user.id, badge.id)
      newUserBadges.push({ ...ub, badge })
      totalStarsEarned += badge.starReward ?? RARITY_STAR_REWARD[badge.rarity] ?? 5
    } catch {
      // Badge may already exist (race condition) — skip silently
    }
  }

  if (newUserBadges.length === 0) return

  // Update stars on user
  const newStars = (user.stars ?? 0) + totalStarsEarned
  const updatedUser = await api.user.update(user.id, { stars: newStars })

  set({
    user:              updatedUser,
    userBadges:        [...get().userBadges, ...newUserBadges],
    newlyEarnedBadges: [...get().newlyEarnedBadges, ...toAward],
  })
}

export const useStore = create<AppState>((set, get) => ({
  user:              null,
  habits:            [],
  logs:              [],
  allBadges:         [],
  userBadges:        [],
  loading:           false,
  error:             null,
  newlyEarnedBadges: [],

  clearNewBadges: () => set({ newlyEarnedBadges: [] }),

  // ── Load everything ─────────────────────────────────────────
  loadAll: async (userId) => {
    set({ loading: true, error: null })
    try {
      const [user, habits, logs, userBadges, allBadges] = await Promise.all([
        api.user.get(userId),
        api.habits.list(userId),
        api.logs.listByUser(userId),
        api.badges.userBadges(userId),
        api.badges.list(),
      ])

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

      set({
        user: freshUser, habits, logs,
        userBadges, allBadges, loading: false,
      })

      // Run badge check on load (catches welcome badges on first run)
      await runBadgeCheck(get, set, {
        habits, logs, userBadges,
        currentStreak: freshUser.currentStreak,
        level:         freshUser.level,
      })
    } catch (e: any) {
      set({ error: e.message ?? 'Failed to load data', loading: false })
    }
  },

  // ── Log a habit completion ──────────────────────────────────
  logHabit: async (habitId, userId) => {
    const alreadyDone = get().isCompletedToday(habitId)
    if (alreadyDone) return

    try {
      const newLog     = await api.logs.create({ habitId, userId })
      const updatedLogs = [newLog, ...get().logs]
      set({ logs: updatedLogs })

      const { currentStreak, longestStreak } = calculateStreaks(updatedLogs)
      const { user } = get()
      if (!user) return

      const newPoints  = user.totalPoints + 10
      const newLevel   = Math.floor(newPoints / XP_PER_LEVEL) + 1
      const newLongest = Math.max(longestStreak, user.longestStreak)

      const updated = await api.user.update(user.id, {
        totalPoints:   newPoints,
        level:         newLevel,
        currentStreak,
        longestStreak: newLongest,
      })

      set({ user: updated })

      // Check for newly earned badges
      await runBadgeCheck(get, set, {
        logs:          updatedLogs,
        currentStreak: updated.currentStreak,
        level:         updated.level,
      })
    } catch (e: any) {
      set({ error: e.message ?? 'Failed to log habit' })
    }
  },

  // ── Add habit ───────────────────────────────────────────────
  addHabit: async (data) => {
    try {
      const created    = await api.habits.create(data)
      const newHabits  = [...get().habits, created]
      set({ habits: newHabits })
      api.reminders.refresh().catch(() => {})

      // Check variety / habit-count badges
      await runBadgeCheck(get, set, { habits: newHabits })
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

  // ── Update user profile ──────────────────────────────────────
  updateProfile: async (data) => {
    const { user } = get()
    if (!user) return
    try {
      const updated = await api.user.update(user.id, data)
      set({ user: updated })
    } catch (e: any) {
      set({ error: e.message ?? 'Failed to update profile' })
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