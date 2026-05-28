// src/renderer/lib/insightEngine.ts
// Generates AI-powered habit suggestions by calling Claude via the Anthropic API.
// Called from the Insights page when user requests a refresh.
//
// Output: array of AIInsight-like objects ready to store in DB.

export interface InsightRequest {
  user: {
    level:         number
    currentStreak: number
    longestStreak: number
    totalPoints:   number
  }
  habits: Array<{
    id:                number
    name:              string
    category:          string
    frequency:         string
    targetDaysPerWeek: number
    isArchived:        boolean
  }>
  logs: Array<{
    habitId:     number
    completedAt: string
  }>
  goals: Array<{
    id:           number
    title:        string
    category:     string
    targetType:   string
    targetValue:  number
    currentValue: number
    unit:         string | null
    deadline:     string | null
    status:       string
    priority:     string
  }>
  recentStats: {
    completionRateThisWeek: number    // 0–100
    completionRateLast30:   number    // 0–100
    topCategory:            string
    weakCategory:           string
    streakAtRisk:           boolean
    perfectDaysThisWeek:    number
  }
}

export interface GeneratedInsight {
  type:     string  // 'habit_suggestion' | 'habit_adjustment' | 'goal_progress' | 'motivation' | 'warning'
  content:  string
  habitId?: number | null
}

// ── Stats computer ────────────────────────────────────────────
export function computeInsightStats(
  habits: InsightRequest['habits'],
  logs:   InsightRequest['logs']
): InsightRequest['recentStats'] {
  const now         = new Date()
  const todayStr    = now.toISOString().slice(0, 10)
  const weekAgo     = new Date(Date.now() - 7  * 24 * 60 * 60 * 1000)
  const thirtyAgo   = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

  const activeHabits     = habits.filter(h => !h.isArchived)
  const activeHabitIds   = new Set(activeHabits.map(h => h.id))

  // Week completion rate
  const weekLogs         = logs.filter(l => new Date(l.completedAt) >= weekAgo)
  const weekDaySet       = new Set(weekLogs.filter(l => activeHabitIds.has(l.habitId)).map(l => l.completedAt.slice(0, 10)))
  const completionRateThisWeek = Math.round((weekDaySet.size / 7) * 100)

  // 30-day completion rate
  const thirtyLogs       = logs.filter(l => new Date(l.completedAt) >= thirtyAgo)
  const thirtyDaySet     = new Set(thirtyLogs.filter(l => activeHabitIds.has(l.habitId)).map(l => l.completedAt.slice(0, 10)))
  const completionRateLast30 = Math.round((thirtyDaySet.size / 30) * 100)

  // Category analysis — last 30 days
  const categoryCounts: Record<string, number> = {}
  for (const log of thirtyLogs) {
    const habit = activeHabits.find(h => h.id === log.habitId)
    if (habit) categoryCounts[habit.category] = (categoryCounts[habit.category] ?? 0) + 1
  }
  const sortedCats = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1])
  const topCategory  = sortedCats[0]?.[0] ?? 'None'

  // Weak category — least logged among active habit categories
  const activeCats = [...new Set(activeHabits.map(h => h.category))]
  const weakCategory = activeCats.reduce((worst, cat) => {
    return (categoryCounts[cat] ?? 0) < (categoryCounts[worst] ?? 0) ? cat : worst
  }, activeCats[0] ?? 'None')

  // Streak at risk — no logs today
  const todayLogs    = logs.filter(l => l.completedAt.slice(0, 10) === todayStr)
  const streakAtRisk = todayLogs.length === 0

  // Perfect days this week
  let perfectDaysThisWeek = 0
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekAgo); d.setDate(d.getDate() + i + 1)
    const ds = d.toISOString().slice(0, 10)
    const dayIds = new Set(logs.filter(l => l.completedAt.slice(0, 10) === ds).map(l => l.habitId))
    if (activeHabits.length > 0 && activeHabits.every(h => dayIds.has(h.id))) perfectDaysThisWeek++
  }

  return {
    completionRateThisWeek,
    completionRateLast30,
    topCategory,
    weakCategory,
    streakAtRisk,
    perfectDaysThisWeek,
  }
}

// ── Main AI call ──────────────────────────────────────────────
export async function generateInsights(req: InsightRequest): Promise<GeneratedInsight[]> {
  const habitSummary = req.habits
    .filter(h => !h.isArchived)
    .map(h => {
      const logsForHabit = req.logs.filter(l => l.habitId === h.id)
      const last30       = logsForHabit.filter(l => new Date(l.completedAt) >= new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))
      const completions  = last30.length
      const rate         = Math.round((completions / 30) * 100)
      return `- ${h.name} (${h.category}, ${h.frequency}): ${completions} completions in last 30 days (~${rate}% rate)`
    }).join('\n')

  const goalSummary = req.goals.length === 0
    ? 'No goals set yet.'
    : req.goals.map(g => {
        const pct  = g.targetValue > 0 ? Math.round((g.currentValue / g.targetValue) * 100) : 0
        const dl   = g.deadline ? `deadline: ${g.deadline.slice(0, 10)}` : 'no deadline'
        return `- ${g.title} (${g.category}, ${g.priority} priority): ${g.currentValue}/${g.targetValue} ${g.unit ?? ''} — ${pct}% — ${dl} — status: ${g.status}`
      }).join('\n')

  const systemPrompt = `You are a personal habit coach AI inside a gamified habit tracker app called HabitQuest. 
Your role is to provide concise, actionable, encouraging insights based on the user's habits, goals, and progress data.

RESPONSE FORMAT: You MUST respond with ONLY a valid JSON array. No markdown, no explanation, no preamble.
Each element must have exactly these fields:
- "type": one of "habit_suggestion" | "habit_adjustment" | "goal_progress" | "motivation" | "warning"  
- "content": a clear, specific, actionable insight (2-4 sentences max, conversational and encouraging)
- "habitId": null, or the numeric ID of the habit this insight is about

Rules:
- Generate 4-6 insights total
- Be specific — mention actual habit names, goal titles, numbers
- "habit_suggestion": suggest a NEW habit the user should add based on their goals/gaps
- "habit_adjustment": suggest changing an EXISTING habit (frequency, time, target)
- "goal_progress": comment on progress toward a specific goal
- "motivation": a personalized encouragement based on their stats
- "warning": flag something that needs attention (streak at risk, goal falling behind, etc.)
- Never be generic. Every insight must reference the user's actual data.
- Keep tone warm, like a knowledgeable friend, not a corporate bot.`

  const userPrompt = `Here is my current HabitQuest data:

**User Stats:**
- Level: ${req.user.level}, Total Points: ${req.user.totalPoints}
- Current Streak: ${req.user.currentStreak} days, Longest: ${req.user.longestStreak} days

**Active Habits (last 30 days performance):**
${habitSummary || 'No active habits yet.'}

**My Goals:**
${goalSummary}

**Recent Performance:**
- Completion rate this week: ${req.recentStats.completionRateThisWeek}%
- Completion rate last 30 days: ${req.recentStats.completionRateLast30}%
- Strongest category: ${req.recentStats.topCategory}
- Weakest category: ${req.recentStats.weakCategory}
- Streak at risk today: ${req.recentStats.streakAtRisk ? 'YES — no habits logged yet today' : 'No'}
- Perfect days this week: ${req.recentStats.perfectDaysThisWeek}/7

Generate 4-6 personalised insights as a JSON array. Remember: ONLY the JSON array, nothing else.`

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model:      'claude-sonnet-4-20250514',
      max_tokens: 1000,
      system:     systemPrompt,
      messages:   [{ role: 'user', content: userPrompt }],
    }),
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(`Claude API error: ${(err as any)?.error?.message ?? response.status}`)
  }

  const data = await response.json()
  const rawText = (data.content as Array<{ type: string; text?: string }>)
    .filter(b => b.type === 'text')
    .map(b => b.text ?? '')
    .join('')

  // Strip any accidental markdown fences
  const clean = rawText.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim()

  try {
    const parsed = JSON.parse(clean) as GeneratedInsight[]
    return parsed.filter(i => i.type && i.content)
  } catch {
    throw new Error('Failed to parse AI response as JSON')
  }
}