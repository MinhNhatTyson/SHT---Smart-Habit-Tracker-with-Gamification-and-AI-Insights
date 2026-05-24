// src/renderer/store/questStore.ts
// Standalone quest slice — merged into useStore via createQuestSlice().
// IMPORTANT: No imports from useStore.ts to avoid circular dependencies.
// All shared types are defined inline here.

import { evaluateQuests, getDailyExpiry, getWeeklyExpiry, QuestDef } from '../lib/questEngine'

// ── Inline types (avoid importing from useStore to prevent circular deps) ──
interface UserLike {
  id: number
  currentStreak: number
  stars: number
}
interface HabitLike {
  id: number
  isArchived: boolean
  category?: string
}
interface LogLike {
  habitId: number
  completedAt: string
}

// ── Exported types (imported by pages) ───────────────────────
export interface QuestRow {
  id:          number
  key:         string
  title:       string
  description: string
  flavour:     string
  tier:        'daily' | 'weekly' | 'epic'
  icon:        string
  starReward:  number
  condition:   string
  target:      number
  sortOrder:   number
  isActive:    boolean
}

export interface UserQuestRow {
  id:         number
  userId:     number
  questId:    number
  assignedAt: string
  expiresAt:  string | null
  progress:   number
  completed:  boolean
  claimed:    boolean
  claimedAt:  string | null
  quest:      QuestRow
}

// ── Slice state interface ─────────────────────────────────────
export interface QuestSliceState {
  allQuests:    QuestRow[]
  userQuests:   UserQuestRow[]
  questsLoading: boolean

  loadQuests:              (userId: number) => Promise<void>
  refreshQuests:           (userId: number) => Promise<void>
  evaluateAndSyncQuests:   () => Promise<void>
  claimQuest:              (userQuestId: number) => Promise<{ success: boolean; stars: number }>
  getActiveUserQuests:     () => UserQuestRow[]
  getClaimableQuests:      () => UserQuestRow[]
}

// ── Date helpers ──────────────────────────────────────────────
function toLocalStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

function weekStartStr(): string {
  const d = new Date()
  d.setDate(d.getDate() - d.getDay())
  return toLocalStr(d)
}

// ── Factory ───────────────────────────────────────────────────
export function createQuestSlice(
  set: (partial: Partial<any>) => void,
  get: () => any,
): QuestSliceState {
  const api = (window as any).api

  return {
    allQuests:     [],
    userQuests:    [],
    questsLoading: false,

    // ── Load quest definitions + user's assigned quests ──────
    loadQuests: async (userId: number) => {
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

    // ── Assign missing daily / weekly / epic quests ──────────
    refreshQuests: async (userId: number) => {
      const state = get()
      const allQuests:  QuestRow[]     = state.allQuests  ?? []
      const userQuests: UserQuestRow[] = state.userQuests ?? []

      const now         = new Date()
      const todayStr    = toLocalStr(now)
      const thisWeekStr = weekStartStr()

      const toAssign: Array<{ questId: number; expiresAt: string | null }> = []

      for (const quest of allQuests.filter(q => q.isActive)) {
        if (quest.tier === 'epic') {
          const exists = userQuests.some(uq => uq.questId === quest.id)
          if (!exists) toAssign.push({ questId: quest.id, expiresAt: null })

        } else if (quest.tier === 'daily') {
          const exists = userQuests.some(uq =>
            uq.questId === quest.id &&
            uq.expiresAt != null &&
            toLocalStr(new Date(uq.expiresAt)) === todayStr
          )
          if (!exists) toAssign.push({ questId: quest.id, expiresAt: getDailyExpiry().toISOString() })

        } else if (quest.tier === 'weekly') {
          const weeklyExpiry = getWeeklyExpiry()
          const exists = userQuests.some(uq => {
            if (uq.questId !== quest.id || !uq.expiresAt) return false
            const exp = new Date(uq.expiresAt)
            const mon = new Date(exp)
            mon.setDate(exp.getDate() - ((exp.getDay() + 6) % 7))
            return toLocalStr(mon) >= thisWeekStr
          })
          if (!exists) toAssign.push({ questId: quest.id, expiresAt: weeklyExpiry.toISOString() })
        }
      }

      if (toAssign.length === 0) return

      try {
        const newRows: UserQuestRow[] = await api.quests.assignBatch(userId, toAssign)
        set((s: any) => ({ userQuests: [...s.userQuests, ...newRows] }))
      } catch (e) {
        console.warn('refreshQuests assignBatch failed:', e)
      }
    },

    // ── Evaluate progress and persist changes ────────────────
    evaluateAndSyncQuests: async () => {
      const state = get()
      const user:       UserLike        = state.user
      const habits:     HabitLike[]     = state.habits     ?? []
      const logs:       LogLike[]       = state.logs       ?? []
      const userQuests: UserQuestRow[]  = state.userQuests ?? []

      if (!user) return

      const now = new Date()

      const active = userQuests.filter(uq => {
        if (uq.claimed) return false
        if (uq.expiresAt && new Date(uq.expiresAt) < now) return false
        return true
      })
      if (active.length === 0) return

      const defs: QuestDef[] = active.map(uq => ({
        id:        uq.quest.id,
        key:       uq.quest.key,
        condition: uq.quest.condition,
        target:    uq.quest.target,
        tier:      uq.quest.tier,
      }))

      const results = evaluateQuests({
        quests:        defs,
        habits:        habits as any,
        logs:          logs   as any,
        currentStreak: user.currentStreak,
      })

      const updates: Array<{ userQuestId: number; progress: number; completed: boolean }> = []
      for (const result of results) {
        const uq = active.find(u => u.questId === result.questId)
        if (!uq) continue
        if (uq.progress !== result.progress || uq.completed !== result.completed) {
          updates.push({ userQuestId: uq.id, progress: result.progress, completed: result.completed })
        }
      }
      if (updates.length === 0) return

      try {
        const updated: UserQuestRow[] = await api.quests.updateProgress(updates)
        set((s: any) => ({
          userQuests: s.userQuests.map((uq: UserQuestRow) => {
            const u = updated.find(r => r.id === uq.id)
            return u ? { ...uq, progress: u.progress, completed: u.completed } : uq
          }),
        }))
      } catch (e) {
        console.warn('evaluateAndSyncQuests updateProgress failed:', e)
      }
    },

    // ── Claim a completed quest reward ───────────────────────
    claimQuest: async (userQuestId: number) => {
      const state = get()
      const user:       UserLike        = state.user
      const userQuests: UserQuestRow[]  = state.userQuests ?? []

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

        set((s: any) => ({
          user: updatedUser,
          userQuests: s.userQuests.map((q: UserQuestRow) =>
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

    // ── Helpers ──────────────────────────────────────────────
    getActiveUserQuests: () => {
      const { userQuests } = get() as { userQuests: UserQuestRow[] }
      const now = new Date()
      return (userQuests ?? []).filter(uq => {
        if (uq.claimed) return false
        if (uq.expiresAt && new Date(uq.expiresAt) < now) return false
        return true
      })
    },

    getClaimableQuests: () => {
      const { userQuests } = get() as { userQuests: UserQuestRow[] }
      const now = new Date()
      return (userQuests ?? []).filter(uq => {
        if (!uq.completed || uq.claimed) return false
        if (uq.expiresAt && new Date(uq.expiresAt) < now) return false
        return true
      })
    },
  }
}