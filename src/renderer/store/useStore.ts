// src/renderer/store/useStore.ts
// Global Zustand store — user, habits, logs, badges, store, quests, goals.

import { create } from 'zustand'
import { checkBadges } from '../lib/badgeEngine'
import { applyThemeFromPayload, resetTheme } from '../lib/themeEngine'
import { playHabitSound, playBadgeSound, SoundNote } from '../lib/soundEngine'
import { createQuestSlice, QuestSliceState, QuestRow, UserQuestRow } from './questStore'
import { createGoalSlice, GoalSliceState, GoalRow } from './goalStore'

// ── Types ─────────────────────────────────────────────────────
export interface User {
  id:                number
  username:          string
  avatar:            string | null
  level:             number
  totalPoints:       number
  currentStreak:     number
  longestStreak:     number
  fullName:          string | null
  gender:            string | null
  bio:               string | null
  avatarUrl:         string | null
  stars:             number
  createdAt:         string
  habitSlots:        number
  activeTheme:       string
  activeHabitSound:  string
  activeBadgeSound:  string
  streakShieldActive:boolean
  activeTitle:       string | null
  unlockedTitles:    string
  unlockedAvatars:   string
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

export interface StoreItem {
  id:          number
  key:         string
  name:        string
  description: string
  category:    string
  icon:        string
  starCost:    number
  itemType:    string
  payload:     string
  sortOrder:   number
  isActive:    boolean
}

export interface UserPurchase {
  id:          number
  userId:      number
  itemKey:     string
  purchasedAt: string
  quantity:    number
}

// Re-export types
export type { QuestRow, UserQuestRow, GoalRow }

// ── XP / Level helpers ────────────────────────────────────────
export const XP_PER_LEVEL  = 100
export const getXpForLevel = (level: number) => level * XP_PER_LEVEL
export const getXpProgress = (totalPoints: number) => totalPoints % XP_PER_LEVEL
export const getXpPercent  = (totalPoints: number) =>
  Math.round((getXpProgress(totalPoints) / XP_PER_LEVEL) * 100)

export const RARITY_STAR_REWARD: Record<string, number> = {
  common: 5, rare: 15, epic: 40, legendary: 100,
}
export const RARITY_COLOR: Record<string, string> = {
  common: '#6b7280', rare: '#3b82f6', epic: '#8b5cf6', legendary: '#e8a55a',
}

// ── Streak helpers ────────────────────────────────────────────
function toLocalDateStr(iso: string): string {
  const d = new Date(iso)
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}
function addDaysStr(dateStr: string, n: number): string {
  const d = new Date(dateStr + 'T00:00:00')
  d.setDate(d.getDate() + n)
  return toLocalDateStr(d.toISOString())
}

export function calculateStreaks(logs: HabitLog[]): { currentStreak: number; longestStreak: number } {
  if (logs.length === 0) return { currentStreak: 0, longestStreak: 0 }
  const daySet = new Set(logs.map(l => toLocalDateStr(l.completedAt)))
  const days   = Array.from(daySet).sort()
  let longest = 1, run = 1
  for (let i = 1; i < days.length; i++) {
    if (days[i] === addDaysStr(days[i-1], 1)) { run++; if (run > longest) longest = run }
    else run = 1
  }
  const todayStr     = toLocalDateStr(new Date().toISOString())
  const yesterdayStr = addDaysStr(todayStr, -1)
  const mostRecent   = days[days.length - 1]
  let anchor: string
  if (mostRecent === todayStr)          anchor = todayStr
  else if (mostRecent === yesterdayStr) anchor = yesterdayStr
  else return { currentStreak: 0, longestStreak: longest }
  let current = 1, cursor = anchor
  for (let i = days.length - 2; i >= 0; i--) {
    if (days[i] === addDaysStr(cursor, -1)) { current++; cursor = days[i] }
    else break
  }
  return { currentStreak: current, longestStreak: Math.max(longest, current) }
}

// ── Store interface ───────────────────────────────────────────
interface AppState extends QuestSliceState, GoalSliceState {
  user:              User | null
  habits:            Habit[]
  logs:              HabitLog[]
  allBadges:         Badge[]
  userBadges:        UserBadge[]
  storeItems:        StoreItem[]
  userPurchases:     UserPurchase[]
  loading:           boolean
  error:             string | null
  newlyEarnedBadges: Badge[]

  clearNewBadges:  () => void
  loadAll:         (userId: number) => Promise<void>
  logHabit:        (habitId: number, userId: number) => Promise<void>
  addHabit:        (data: Omit<Habit, 'id'|'createdAt'|'isArchived'>) => Promise<void>
  editHabit:       (id: number, data: Partial<Habit>) => Promise<void>
  removeHabit:     (id: number) => Promise<void>
  updateProfile:   (data: Partial<User>) => Promise<void>

  // Store actions
  purchaseItem:    (itemKey: string) => Promise<{ success: boolean; message: string }>
  equipTheme:      (itemKey: string) => Promise<void>
  equipHabitSound: (soundKey: string) => Promise<void>
  equipBadgeSound: (soundKey: string) => Promise<void>
  equipTitle:      (title: string | null) => Promise<void>
  activateShield:  () => Promise<void>
  equipCalSkin:    (skinKey: string) => Promise<void>

  // Helpers
  isCompletedToday:    (habitId: number) => boolean
  getTodayLogs:        () => HabitLog[]
  getWeekLogs:         () => HabitLog[]
  hasPurchased:        (itemKey: string) => boolean
  getPurchase:         (itemKey: string) => UserPurchase | undefined
  getUnlockedTitles:   () => string[]
  getUnlockedAvatars:  () => string[]
  getActiveSkinColors: () => Record<string, string> | null
  activeCalSkin:       string
}

const api = (window as any).api

// ── Badge check helper ────────────────────────────────────────
async function runBadgeCheck(
  get: () => AppState,
  set: (p: Partial<AppState>) => void,
  override?: { habits?: Habit[]; logs?: HabitLog[]; userBadges?: UserBadge[]; currentStreak?: number; level?: number },
  showToast = true,
) {
  const state  = get()
  const user   = state.user
  if (!user) return
  const habits        = override?.habits        ?? state.habits
  const logs          = override?.logs          ?? state.logs
  const userBadges    = override?.userBadges    ?? state.userBadges
  const currentStreak = override?.currentStreak ?? user.currentStreak
  const level         = override?.level         ?? user.level

  const toAward = checkBadges({ allBadges: state.allBadges, earnedBadges: userBadges, habits, logs, currentStreak, level })
  if (toAward.length === 0) return

  const newUBs: UserBadge[] = []
  let starsEarned = 0

  for (const badge of toAward) {
    try {
      const ub             = await api.badges.award(user.id, badge.id)
      const alreadyInStore = userBadges.some(e => e.badgeId === badge.id)
      if (!alreadyInStore) {
        newUBs.push({ ...ub, badge })
        starsEarned += badge.starReward ?? RARITY_STAR_REWARD[badge.rarity] ?? 5
      }
    } catch {}
  }
  if (newUBs.length === 0) return

  const updatedUser = await api.user.update(user.id, { stars: (get().user?.stars ?? 0) + starsEarned })
  set({
    user:       updatedUser,
    userBadges: [...get().userBadges, ...newUBs],
    ...(showToast ? { newlyEarnedBadges: [...get().newlyEarnedBadges, ...newUBs.map(u => u.badge)] } : {}),
  })

  if (showToast) {
    const currentUser = get().user
    if (currentUser) {
      const soundKey = currentUser.activeBadgeSound
      if (soundKey && soundKey !== 'default') {
        const item = get().storeItems.find(s => s.key === soundKey)
        if (item) {
          try {
            const notes = (JSON.parse(item.payload) as { notes?: SoundNote[] }).notes
            playBadgeSound(notes)
          } catch { playBadgeSound() }
        }
      } else {
        playBadgeSound()
      }
    }
  }
}

function getHabitSoundNotes(state: AppState): SoundNote[] | null {
  const soundKey = state.user?.activeHabitSound
  if (!soundKey || soundKey === 'default') return null
  const item = state.storeItems.find(s => s.key === soundKey)
  if (!item) return null
  try { return (JSON.parse(item.payload) as { notes?: SoundNote[] }).notes ?? null }
  catch { return null }
}

export const useStore = create<AppState>((set, get) => ({
  // ── Core state ────────────────────────────────────────────
  user:              null,
  habits:            [],
  logs:              [],
  allBadges:         [],
  userBadges:        [],
  storeItems:        [],
  userPurchases:     [],
  loading:           false,
  error:             null,
  newlyEarnedBadges: [],
  activeCalSkin:     'default',

  // ── Slices (spread in) ────────────────────────────────────
  ...createQuestSlice(set as any, get as any),
  ...createGoalSlice(set as any, get as any),

  clearNewBadges: () => set({ newlyEarnedBadges: [] }),

  // ── Load everything ──────────────────────────────────────
  loadAll: async (userId) => {
    set({ loading: true, error: null })
    try {
      const [user, habits, logs, userBadges, allBadges, storeItems, userPurchases] = await Promise.all([
        api.user.get(userId),
        api.habits.list(userId),
        api.logs.listByUser(userId),
        api.badges.userBadges(userId),
        api.badges.list(),
        api.store.listItems(),
        api.store.userPurchases(userId),
      ])

      const { currentStreak, longestStreak } = calculateStreaks(logs)
      const streakChanged = user.currentStreak !== currentStreak || user.longestStreak !== longestStreak
      let freshUser = user
      if (streakChanged) {
        freshUser = await api.user.update(user.id, {
          currentStreak,
          longestStreak: Math.max(longestStreak, user.longestStreak),
        })
      }

      const activeCalSkin = (freshUser as any).activeCalSkin ?? 'default'

      set({
        user: freshUser, habits, logs,
        userBadges, allBadges, storeItems, userPurchases,
        activeCalSkin,
        loading: false,
      })

      if (freshUser.activeTheme && freshUser.activeTheme !== 'default') {
        const themeItem = storeItems.find((s: StoreItem) => s.key === freshUser.activeTheme)
        if (themeItem) applyThemeFromPayload(themeItem.key, themeItem.payload)
      } else {
        resetTheme()
      }

      await runBadgeCheck(get, set, { habits, logs, userBadges, currentStreak: freshUser.currentStreak, level: freshUser.level }, false)

      // Load goals
      try {
        await (get() as AppState).loadGoals(userId)
        ;(get() as AppState).refreshGoalProgress()
      } catch (ge) {
        console.warn('Goal load failed (non-critical):', ge)
      }

      // Load + refresh quests after main data is ready
      try {
        await (get() as AppState).loadQuests(userId)
        await (get() as AppState).refreshQuests(userId)
        await (get() as AppState).evaluateAndSyncQuests()
      } catch (qe) {
        console.warn('Quest load failed (non-critical):', qe)
      }
    } catch (e: any) {
      set({ error: e.message ?? 'Failed to load data', loading: false })
    }
  },

  // ── Log a habit ──────────────────────────────────────────
  logHabit: async (habitId, userId) => {
    if (get().isCompletedToday(habitId)) return
    try {
      const newLog      = await api.logs.create({ habitId, userId })
      const updatedLogs = [newLog, ...get().logs]
      set({ logs: updatedLogs })

      const { currentStreak, longestStreak } = calculateStreaks(updatedLogs)
      const { user } = get()
      if (!user) return

      const newPoints  = user.totalPoints + 10
      const newLevel   = Math.floor(newPoints / XP_PER_LEVEL) + 1
      const newLongest = Math.max(longestStreak, user.longestStreak)
      const updated    = await api.user.update(user.id, { totalPoints: newPoints, level: newLevel, currentStreak, longestStreak: newLongest })
      set({ user: updated })

      playHabitSound(getHabitSoundNotes(get()))

      await runBadgeCheck(get, set, { logs: updatedLogs, currentStreak: updated.currentStreak, level: updated.level }, true)

      // Re-evaluate quests + goals after logging
      try { await (get() as AppState).evaluateAndSyncQuests() } catch {}
      try { (get() as AppState).refreshGoalProgress() } catch {}
    } catch (e: any) { set({ error: e.message ?? 'Failed to log habit' }) }
  },

  // ── Add habit ────────────────────────────────────────────
  addHabit: async (data) => {
    const { user, habits } = get()
    const slots = user?.habitSlots ?? 5
    if (habits.length >= slots) {
      set({ error: `Habit slot limit reached (${slots}). Purchase more slots in the Store!` })
      return
    }
    try {
      const created   = await api.habits.create(data)
      const newHabits = [...habits, created]
      set({ habits: newHabits })
      api.reminders.refresh().catch(() => {})
      await runBadgeCheck(get, set, { habits: newHabits }, true)
      try { await (get() as AppState).evaluateAndSyncQuests() } catch {}
      try { (get() as AppState).refreshGoalProgress() } catch {}
    } catch (e: any) { set({ error: e.message ?? 'Failed to create habit' }) }
  },

  editHabit: async (id, data) => {
    try {
      const updated = await api.habits.update(id, data)
      set(s => ({ habits: s.habits.map(h => h.id === id ? { ...h, ...updated } : h) }))
      api.reminders.refresh().catch(() => {})
    } catch (e: any) { set({ error: e.message ?? 'Failed to update habit' }) }
  },

  removeHabit: async (id) => {
    try {
      await api.habits.delete(id)
      set(s => ({ habits: s.habits.filter(h => h.id !== id) }))
      api.reminders.refresh().catch(() => {})
    } catch (e: any) { set({ error: e.message ?? 'Failed to delete habit' }) }
  },

  updateProfile: async (data) => {
    const { user } = get()
    if (!user) return
    try {
      const updated = await api.user.update(user.id, data)
      set({ user: updated })
    } catch (e: any) { set({ error: e.message ?? 'Failed to update profile' }) }
  },

  // ── STORE ACTIONS ────────────────────────────────────────
  purchaseItem: async (itemKey) => {
    const { user, storeItems, userPurchases } = get()
    if (!user) return { success: false, message: 'Not logged in' }
    const item = storeItems.find(s => s.key === itemKey)
    if (!item) return { success: false, message: 'Item not found' }
    if (user.stars < item.starCost) {
      return { success: false, message: `Not enough Stars. Need ${item.starCost}⭐, you have ${user.stars}⭐` }
    }
    if (item.itemType === 'permanent') {
      const existing = userPurchases.find(p => p.itemKey === itemKey)
      if (existing) return { success: false, message: 'Already owned' }
    }
    try {
      const newStars    = user.stars - item.starCost
      const updatedUser = await api.user.update(user.id, { stars: newStars })
      const purchase    = await api.store.purchase(user.id, itemKey)
      let finalUser = updatedUser
      if (item.category === 'slot') {
        finalUser = await api.user.update(user.id, { habitSlots: updatedUser.habitSlots + 1 })
      } else if (item.category === 'shield') {
        finalUser = await api.user.update(user.id, { streakShieldActive: true })
      } else if (item.category === 'avatar') {
        const payload  = JSON.parse(item.payload) as { avatars: string[] }
        const existing = JSON.parse(updatedUser.unlockedAvatars || '[]') as string[]
        const merged   = [...new Set([...existing, ...payload.avatars])]
        finalUser = await api.user.update(user.id, { unlockedAvatars: JSON.stringify(merged) })
      } else if (item.category === 'title') {
        const payload  = JSON.parse(item.payload) as { title: string }
        const existing = JSON.parse(updatedUser.unlockedTitles || '[]') as string[]
        if (!existing.includes(payload.title)) {
          finalUser = await api.user.update(user.id, { unlockedTitles: JSON.stringify([...existing, payload.title]) })
        }
      }
      const existingPurchase = userPurchases.find(p => p.itemKey === itemKey)
      const newPurchases = existingPurchase
        ? userPurchases.map(p => p.itemKey === itemKey ? { ...p, quantity: p.quantity + 1 } : p)
        : [...userPurchases, purchase]
      set({ user: finalUser, userPurchases: newPurchases })
      return { success: true, message: `${item.name} purchased!` }
    } catch (e: any) {
      return { success: false, message: e.message ?? 'Purchase failed' }
    }
  },

  equipTheme: async (itemKey) => {
    const { user, storeItems } = get()
    if (!user) return
    const updated = await api.user.update(user.id, { activeTheme: itemKey })
    set({ user: updated })
    if (itemKey === 'default') { resetTheme() }
    else {
      const item = storeItems.find(s => s.key === itemKey)
      if (item) applyThemeFromPayload(item.key, item.payload)
    }
  },

  equipHabitSound: async (soundKey) => {
    const { user } = get()
    if (!user) return
    const updated = await api.user.update(user.id, { activeHabitSound: soundKey })
    set({ user: updated })
  },

  equipBadgeSound: async (soundKey) => {
    const { user } = get()
    if (!user) return
    const updated = await api.user.update(user.id, { activeBadgeSound: soundKey })
    set({ user: updated })
  },

  equipTitle: async (title) => {
    const { user } = get()
    if (!user) return
    const updated = await api.user.update(user.id, { activeTitle: title })
    set({ user: updated })
  },

  activateShield: async () => {
    const { user } = get()
    if (!user) return
    const updated = await api.user.update(user.id, { streakShieldActive: true })
    set({ user: updated })
  },

  equipCalSkin: async (skinKey) => {
    const { user } = get()
    if (!user) return
    await api.user.update(user.id, { activeCalSkin: skinKey } as any)
    set({ activeCalSkin: skinKey })
  },

  // ── Helpers ───────────────────────────────────────────────
  isCompletedToday: (habitId) => {
    const today = toLocalDateStr(new Date().toISOString())
    return get().logs.some(l => l.habitId === habitId && toLocalDateStr(l.completedAt) === today)
  },
  getTodayLogs: () => {
    const today = toLocalDateStr(new Date().toISOString())
    return get().logs.filter(l => toLocalDateStr(l.completedAt) === today)
  },
  getWeekLogs: () => {
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    return get().logs.filter(l => new Date(l.completedAt) >= weekAgo)
  },
  hasPurchased:  (itemKey) => get().userPurchases.some(p => p.itemKey === itemKey),
  getPurchase:   (itemKey) => get().userPurchases.find(p => p.itemKey === itemKey),
  getUnlockedTitles: () => {
    try { return JSON.parse(get().user?.unlockedTitles ?? '[]') as string[] }
    catch { return [] }
  },
  getUnlockedAvatars: () => {
    try { return JSON.parse(get().user?.unlockedAvatars ?? '[]') as string[] }
    catch { return [] }
  },
  getActiveSkinColors: () => {
    const { activeCalSkin, storeItems } = get()
    if (!activeCalSkin || activeCalSkin === 'default') return null
    const item = storeItems.find(s => s.key === `cal_skin_${activeCalSkin}` || s.key === activeCalSkin)
    if (!item) return null
    try {
      const payload = JSON.parse(item.payload) as { colors?: Record<string, string> }
      return payload.colors ?? null
    } catch { return null }
  },
}))