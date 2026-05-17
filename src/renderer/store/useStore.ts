// src/renderer/store/useStore.ts
// Global Zustand store — holds user, habits, logs, badges
// All pages read from here; data is fetched once and shared

import { create } from 'zustand'

// ── Types (mirror Prisma models for the renderer) ─────────────
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
export const XP_PER_LEVEL = 100
export const getXpForLevel  = (level: number) => level * XP_PER_LEVEL
export const getXpProgress  = (totalPoints: number) => totalPoints % XP_PER_LEVEL
export const getXpPercent   = (totalPoints: number) =>
  Math.round((getXpProgress(totalPoints) / XP_PER_LEVEL) * 100)

// ── Store ─────────────────────────────────────────────────────
interface AppState {
  // Data
  user:        User | null
  habits:      Habit[]
  logs:        HabitLog[]
  userBadges:  UserBadge[]

  // UI state
  loading:     boolean
  error:       string | null

  // Actions
  loadAll:          (userId: number) => Promise<void>
  logHabit:         (habitId: number, userId: number) => Promise<void>
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

  // ── Load everything for a user ──────────────────────────────
  loadAll: async (userId: number) => {
    set({ loading: true, error: null })
    try {
      const [user, habits, logs, userBadges] = await Promise.all([
        api.user.get(userId),
        api.habits.list(userId),
        api.logs.listByUser(userId),
        api.badges.userBadges(userId),
      ])
      set({ user, habits, logs, userBadges, loading: false })
    } catch (e: any) {
      set({ error: e.message ?? 'Failed to load data', loading: false })
    }
  },

  // ── Log a habit completion ──────────────────────────────────
  logHabit: async (habitId: number, userId: number) => {
    try {
      const newLog = await api.logs.create({ habitId, userId })
      // Optimistically add to logs
      set(state => ({ logs: [newLog, ...state.logs] }))

      // Award XP: +10 per completion, update user totalPoints
      const { user } = get()
      if (user) {
        const newPoints = user.totalPoints + 10
        const newLevel  = Math.floor(newPoints / XP_PER_LEVEL) + 1
        const updated   = await api.user.update(user.id, {
          totalPoints:   newPoints,
          level:         newLevel,
          currentStreak: user.currentStreak, // streak logic kept simple here
        })
        set({ user: updated })
      }
    } catch (e: any) {
      set({ error: e.message ?? 'Failed to log habit' })
    }
  },

  // ── Helpers ─────────────────────────────────────────────────
  isCompletedToday: (habitId: number) => {
    const today = new Date().toDateString()
    return get().logs.some(
      l => l.habitId === habitId &&
           new Date(l.completedAt).toDateString() === today
    )
  },

  getTodayLogs: () => {
    const today = new Date().toDateString()
    return get().logs.filter(
      l => new Date(l.completedAt).toDateString() === today
    )
  },

  getWeekLogs: () => {
    const now      = new Date()
    const weekAgo  = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    return get().logs.filter(
      l => new Date(l.completedAt) >= weekAgo
    )
  },
}))