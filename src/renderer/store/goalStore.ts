// src/renderer/store/goalStore.ts
// Goal slice for Zustand.
// Manages user-defined goals and progress calculation.

export interface GoalRow {
  id:           number
  userId:       number
  title:        string
  description:  string | null
  category:     string
  targetType:   string   // 'habit_count' | 'streak' | 'completion_rate' | 'total_logs'
  targetValue:  number
  currentValue: number
  unit:         string | null
  deadline:     string | null
  habitIds:     string   // JSON array
  status:       string   // 'active' | 'completed' | 'paused' | 'abandoned'
  priority:     string   // 'low' | 'medium' | 'high'
  createdAt:    string
  updatedAt:    string
}

export interface GoalSliceState {
  goals:        GoalRow[]
  goalsLoading: boolean

  loadGoals:    (userId: number) => Promise<void>
  addGoal:      (data: Omit<GoalRow, 'id' | 'createdAt' | 'updatedAt' | 'currentValue'>) => Promise<GoalRow | null>
  editGoal:     (id: number, data: Partial<GoalRow>) => Promise<void>
  removeGoal:   (id: number) => Promise<void>
  refreshGoalProgress: () => void
}

export const createGoalSlice = (set: any, get: any): GoalSliceState => {
  const api = (window as any).api

  return {
    goals:        [],
    goalsLoading: false,

    loadGoals: async (userId) => {
      set({ goalsLoading: true })
      try {
        const goals = await api.goals.list(userId)
        set({ goals, goalsLoading: false })
      } catch (e) {
        console.warn('loadGoals failed:', e)
        set({ goalsLoading: false })
      }
    },

    addGoal: async (data) => {
      try {
        const created = await api.goals.create(data)
        set((s: any) => ({ goals: [...s.goals, created] }))
        return created
      } catch (e) {
        console.warn('addGoal failed:', e)
        return null
      }
    },

    editGoal: async (id, data) => {
      try {
        const updated = await api.goals.update(id, data)
        set((s: any) => ({
          goals: s.goals.map((g: GoalRow) => g.id === id ? { ...g, ...updated } : g)
        }))
      } catch (e) {
        console.warn('editGoal failed:', e)
      }
    },

    removeGoal: async (id) => {
      try {
        await api.goals.delete(id)
        set((s: any) => ({ goals: s.goals.filter((g: GoalRow) => g.id !== id) }))
      } catch (e) {
        console.warn('removeGoal failed:', e)
      }
    },

    // Compute current progress values from live log/habit data and persist
    refreshGoalProgress: () => {
      const state = get()
      const { goals, habits, logs, user } = state
      if (!user || !goals.length) return

      const now        = new Date()
      const todayStr   = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`

      for (const goal of goals) {
        if (goal.status !== 'active') continue

        let currentValue = 0
        const linkedIds: number[] = (() => {
          try { return JSON.parse(goal.habitIds) as number[] }
          catch { return [] }
        })()

        const relevantHabits = linkedIds.length > 0
          ? habits.filter((h: any) => linkedIds.includes(h.id))
          : habits.filter((h: any) => h.category.toLowerCase() === goal.category.toLowerCase())

        const relevantHabitIds = new Set(relevantHabits.map((h: any) => h.id))

        if (goal.targetType === 'total_logs') {
          currentValue = logs.filter((l: any) => relevantHabitIds.has(l.habitId)).length

        } else if (goal.targetType === 'habit_count') {
          // How many unique habits in category are active
          currentValue = relevantHabits.filter((h: any) => !h.isArchived).length

        } else if (goal.targetType === 'streak') {
          currentValue = user.currentStreak

        } else if (goal.targetType === 'completion_rate') {
          // % of days in last 30 days where at least one relevant habit was completed
          const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
          const relevantLogs  = logs.filter((l: any) =>
            relevantHabitIds.has(l.habitId) && new Date(l.completedAt) >= thirtyDaysAgo
          )
          const daysWithLogs = new Set(relevantLogs.map((l: any) => {
            const d = new Date(l.completedAt)
            return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
          }))
          currentValue = Math.round((daysWithLogs.size / 30) * 100)
        }

        // Check if goal is now completed
        const newStatus = currentValue >= goal.targetValue && goal.status === 'active'
          ? 'completed'
          : goal.status

        if (currentValue !== goal.currentValue || newStatus !== goal.status) {
          api.goals.update(goal.id, { currentValue, status: newStatus }).catch(() => {})
          set((s: any) => ({
            goals: s.goals.map((g: GoalRow) =>
              g.id === goal.id ? { ...g, currentValue, status: newStatus } : g
            )
          }))
        }
      }
    },
  }
}