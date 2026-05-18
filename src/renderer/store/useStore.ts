// src/renderer/store/useStore.ts
// Global Zustand store — holds user, habits, logs, badges
// All pages read from here; data is fetched once and shared

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

// ── Store interface ───────────────────────────────────────────
interface AppState {
  user:       User | null
  habits:     Habit[]
  logs:       HabitLog[]
  userBadges: UserBadge[]
  loading:    boolean
  error:      string | null

  // Data loading
  loadAll: (userId: number) => Promise<void>

  // Habit logging
  logHabit: (habitId: number, userId: number) => Promise<void>

  // Habit CRUD
  addHabit:    (data: Omit<Habit, 'id' | 'createdAt' | 'isArchived'>) => Promise<void>
  editHabit:   (id: number, data: Partial<Habit>) => Promise<void>
  removeHabit: (id: number) => Promise<void>

  // Computed helpers
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
      set({ user, habits, logs, userBadges, loading: false })
    } catch (e: any) {
      set({ error: e.message ?? 'Failed to load data', loading: false })
    }
  },

  // ── Log a habit completion ──────────────────────────────────
  logHabit: async (habitId, userId) => {
    try {
      const newLog = await api.logs.create({ habitId, userId })
      set(state => ({ logs: [newLog, ...state.logs] }))
      const { user } = get()
      if (user) {
        const newPoints = user.totalPoints + 10
        const newLevel  = Math.floor(newPoints / XP_PER_LEVEL) + 1
        const updated   = await api.user.update(user.id, {
          totalPoints: newPoints, level: newLevel,
          currentStreak: user.currentStreak,
        })
        set({ user: updated })
      }
    } catch (e: any) {
      set({ error: e.message ?? 'Failed to log habit' })
    }
  },

  // ── Add habit ───────────────────────────────────────────────
  addHabit: async (data) => {
    try {
      const created = await api.habits.create(data)
      set(state => ({ habits: [...state.habits, created] }))
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
    } catch (e: any) {
      set({ error: e.message ?? 'Failed to update habit' })
    }
  },

  // ── Remove (soft-archive) habit ─────────────────────────────
  removeHabit: async (id) => {
    try {
      await api.habits.delete(id)
      set(state => ({ habits: state.habits.filter(h => h.id !== id) }))
    } catch (e: any) {
      set({ error: e.message ?? 'Failed to delete habit' })
    }
  },

  // ── Helpers ─────────────────────────────────────────────────
  isCompletedToday: (habitId) => {
    const today = new Date().toDateString()
    return get().logs.some(
      l => l.habitId === habitId &&
           new Date(l.completedAt).toDateString() === today
    )
  },

  getTodayLogs: () => {
    const today = new Date().toDateString()
    return get().logs.filter(l => new Date(l.completedAt).toDateString() === today)
  },

  getWeekLogs: () => {
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    return get().logs.filter(l => new Date(l.completedAt) >= weekAgo)
  },
}))