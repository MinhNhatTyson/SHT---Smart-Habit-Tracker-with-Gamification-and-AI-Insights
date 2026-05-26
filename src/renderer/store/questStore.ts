// src/renderer/store/questStore.ts
// Quest slice for Zustand. No TypeScript-only syntax at top level.
// No imports from useStore.ts (prevents circular dependency).

import { evaluateQuests, getDailyExpiry, getWeeklyExpiry } from '../lib/questEngine'

export const createQuestSlice = (set, get) => {
  const api = (window as any).api

  // Guard: prevent refreshQuests running concurrently
  let refreshing = false

  const toLocalStr = (d) => {
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
  }

  const weekStartStr = () => {
    const d = new Date()
    d.setDate(d.getDate() - d.getDay())
    return toLocalStr(d)
  }

  return {
    allQuests:     [],
    userQuests:    [],
    questsLoading: false,

    // ── Load quest definitions + user's existing UserQuest rows ──
    loadQuests: async (userId) => {
      set({ questsLoading: true })
      try {
        const [allQuests, userQuests] = await Promise.all([
          api.quests.list(),
          api.quests.userQuests(userId),
        ])
        set({ allQuests, userQuests, questsLoading: false })
      } catch (e) {
        console.warn('loadQuests failed:', e)
        set({ questsLoading: false })
      }
    },

    // ── Assign missing quests for the current period ─────────────
    // FIX: reads fresh DB rows (passed in) instead of possibly-stale get() state,
    //      and uses a concurrency guard so double-calls don't duplicate rows.
    refreshQuests: async (userId) => {
      if (refreshing) return
      refreshing = true

      try {
        // Always fetch fresh from DB so we don't rely on timing of set()
        const [allQuests, freshUserQuests] = await Promise.all([
          api.quests.list(),
          api.quests.userQuests(userId),
        ])

        // Update local state with fresh data first
        set({ allQuests, userQuests: freshUserQuests })

        const now         = new Date()
        const todayStr    = toLocalStr(now)
        const thisWeekStr = weekStartStr()
        const toAssign    = []

        for (const quest of allQuests.filter(q => q.isActive)) {
          if (quest.tier === 'epic') {
            // Epic: only ever one row, ever
            const exists = freshUserQuests.some(uq => uq.questId === quest.id)
            if (!exists) toAssign.push({ questId: quest.id, expiresAt: null })

          } else if (quest.tier === 'daily') {
            // Daily: need exactly one row whose expiry date is today
            const exists = freshUserQuests.some(uq =>
              uq.questId === quest.id &&
              uq.expiresAt != null &&
              toLocalStr(new Date(uq.expiresAt)) === todayStr
            )
            if (!exists) toAssign.push({ questId: quest.id, expiresAt: getDailyExpiry().toISOString() })

          } else if (quest.tier === 'weekly') {
            // Weekly: need one row whose expiry falls in the current week (Mon–Sun)
            const exists = freshUserQuests.some(uq => {
              if (uq.questId !== quest.id || !uq.expiresAt) return false
              const exp = new Date(uq.expiresAt)
              // Find the Monday of the week this expiry belongs to
              const mon = new Date(exp)
              mon.setDate(exp.getDate() - ((exp.getDay() + 6) % 7))
              mon.setHours(0, 0, 0, 0)
              return toLocalStr(mon) >= thisWeekStr
            })
            if (!exists) toAssign.push({ questId: quest.id, expiresAt: getWeeklyExpiry().toISOString() })
          }
        }

        if (toAssign.length === 0) return

        const newRows = await api.quests.assignBatch(userId, toAssign)

        // Merge new rows — but guard against duplicates in case of race
        set((s) => {
          const existingIds = new Set(s.userQuests.map(uq => uq.id))
          const truly_new   = newRows.filter(r => !existingIds.has(r.id))
          return { userQuests: [...s.userQuests, ...truly_new] }
        })
      } catch (e) {
        console.warn('refreshQuests failed:', e)
      } finally {
        refreshing = false
      }
    },

    // ── Evaluate and persist progress for all active quests ──────
    evaluateAndSyncQuests: async () => {
      const state      = get()
      const user       = state.user
      const habits     = state.habits     ?? []
      const logs       = state.logs       ?? []
      const userQuests = state.userQuests ?? []

      if (!user) return

      const now    = new Date()
      const active = userQuests.filter(uq => {
        if (uq.claimed) return false
        if (uq.expiresAt && new Date(uq.expiresAt) < now) return false
        return true
      })
      if (active.length === 0) return

      const defs = active.map(uq => ({
        id:        uq.quest.id,
        key:       uq.quest.key,
        condition: uq.quest.condition,
        target:    uq.quest.target,
        tier:      uq.quest.tier,
      }))

      const results = evaluateQuests({ quests: defs, habits, logs, currentStreak: user.currentStreak })

      const updates = []
      for (const result of results) {
        const uq = active.find(u => u.questId === result.questId)
        if (!uq) continue
        if (uq.progress !== result.progress || uq.completed !== result.completed) {
          updates.push({ userQuestId: uq.id, progress: result.progress, completed: result.completed })
        }
      }
      if (updates.length === 0) return

      try {
        const updated = await api.quests.updateProgress(updates)
        set((s) => ({
          userQuests: s.userQuests.map(uq => {
            const u = updated.find(r => r.id === uq.id)
            return u ? { ...uq, progress: u.progress, completed: u.completed } : uq
          }),
        }))
      } catch (e) {
        console.warn('evaluateAndSyncQuests failed:', e)
      }
    },

    // ── Claim reward for a completed quest ───────────────────────
    claimQuest: async (userQuestId) => {
      const state      = get()
      const user       = state.user
      const userQuests = state.userQuests ?? []

      if (!user) return { success: false, stars: 0 }

      const uq = userQuests.find(q => q.id === userQuestId)
      if (!uq || !uq.completed || uq.claimed) return { success: false, stars: 0 }

      try {
        const stars    = uq.quest.starReward
        const newStars = (user.stars ?? 0) + stars

        const [, updatedUser] = await Promise.all([
          api.quests.claim(userQuestId),
          api.user.update(user.id, { stars: newStars }),
        ])

        set((s) => ({
          user: updatedUser,
          userQuests: s.userQuests.map(q =>
            q.id === userQuestId
              ? { ...q, claimed: true, claimedAt: new Date().toISOString() }
              : q
          ),
        }))

        return { success: true, stars }
      } catch (e) {
        console.warn('claimQuest failed:', e)
        return { success: false, stars: 0 }
      }
    },

    getActiveUserQuests: () => {
      const { userQuests } = get()
      const now = new Date()
      return (userQuests ?? []).filter(uq => {
        if (uq.claimed) return false
        if (uq.expiresAt && new Date(uq.expiresAt) < now) return false
        return true
      })
    },

    getClaimableQuests: () => {
      const { userQuests } = get()
      const now = new Date()
      return (userQuests ?? []).filter(uq => {
        if (!uq.completed || uq.claimed) return false
        if (uq.expiresAt && new Date(uq.expiresAt) < now) return false
        return true
      })
    },
  }
}

// ── Type exports ──────────────────────────────────────────────
export type QuestRow = {
  id: number; key: string; title: string; description: string; flavour: string
  tier: 'daily' | 'weekly' | 'epic'; icon: string; starReward: number
  condition: string; target: number; sortOrder: number; isActive: boolean
}

export type UserQuestRow = {
  id: number; userId: number; questId: number; assignedAt: string
  expiresAt: string | null; progress: number; completed: boolean
  claimed: boolean; claimedAt: string | null; quest: QuestRow
}

export type QuestSliceState = {
  allQuests: QuestRow[]; userQuests: UserQuestRow[]; questsLoading: boolean
  loadQuests: (userId: number) => Promise<void>
  refreshQuests: (userId: number) => Promise<void>
  evaluateAndSyncQuests: () => Promise<void>
  claimQuest: (userQuestId: number) => Promise<{ success: boolean; stars: number }>
  getActiveUserQuests: () => UserQuestRow[]
  getClaimableQuests: () => UserQuestRow[]
}