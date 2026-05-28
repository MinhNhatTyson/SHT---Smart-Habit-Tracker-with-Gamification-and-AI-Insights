// src/renderer/pages/Insights.tsx
// AI-powered Insights page.
// Generates personalised habit suggestions based on goals + progress.
//
// Design.md: cream canvas, dark navy hero, coral CTAs, Syne display

import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Sparkles, RefreshCw, CheckCircle2, AlertTriangle,
  TrendingUp, Lightbulb, Target, BookOpen, X, Clock,
} from 'lucide-react'
import { useStore } from '../store/useStore'
import {
  generateInsights,
  computeInsightStats,
  GeneratedInsight,
} from '../lib/insightEngine'

const DEMO_USER_ID = 1

// ── Insight type config ────────────────────────────────────────
const TYPE_CONFIG: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
  habit_suggestion: { icon: <Lightbulb size={15} />, color: '#e8a55a',            label: 'New Habit Idea'   },
  habit_adjustment: { icon: <RefreshCw  size={15} />, color: '#3b82f6',            label: 'Habit Adjustment' },
  goal_progress:    { icon: <Target     size={15} />, color: 'var(--coral)',        label: 'Goal Progress'    },
  motivation:       { icon: <Sparkles   size={15} />, color: 'var(--accent-success)', label: 'Motivation'    },
  warning:          { icon: <AlertTriangle size={15} />, color: '#ef4444',          label: 'Heads Up'        },
}

// ── Stored insight shape from DB ──────────────────────────────
interface StoredInsight {
  id:          number
  userId:      number
  habitId:     number | null
  type:        string
  content:     string
  generatedAt: string
  isRead:      boolean
}

// ── Single insight card ────────────────────────────────────────
function InsightCard({
  insight,
  habitName,
  onDismiss,
}: {
  insight:   StoredInsight
  habitName: string | null
  onDismiss: (id: number) => void
}) {
  const [hovered, setHovered] = useState(false)
  const cfg     = TYPE_CONFIG[insight.type] ?? TYPE_CONFIG.motivation
  const timeAgo = (() => {
    const ms   = Date.now() - new Date(insight.generatedAt).getTime()
    const mins = Math.floor(ms / 60000)
    const hrs  = Math.floor(mins / 60)
    const days = Math.floor(hrs / 24)
    if (days > 0) return `${days}d ago`
    if (hrs  > 0) return `${hrs}h ago`
    if (mins > 0) return `${mins}m ago`
    return 'Just now'
  })()

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position:     'relative',
        background:   insight.isRead ? 'var(--surface-soft)' : 'var(--canvas)',
        border:       `1px solid ${hovered && !insight.isRead ? cfg.color + '50' : 'var(--hairline)'}`,
        borderRadius: 'var(--radius-xl)',
        padding:      '20px 22px',
        transition:   'all var(--transition-fast)',
        boxShadow:    hovered && !insight.isRead ? `0 4px 20px ${cfg.color}12` : 'var(--shadow-sm)',
        opacity:      insight.isRead ? 0.7 : 1,
        overflow:     'hidden',
      }}
    >
      {/* Top accent line */}
      {!insight.isRead && (
        <div style={{
          position:   'absolute', top: 0, left: 0, right: 0, height: 3,
          background: `linear-gradient(90deg, ${cfg.color}, transparent)`,
          borderRadius: 'var(--radius-xl) var(--radius-xl) 0 0',
        }} />
      )}

      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
        {/* Icon badge */}
        <div style={{
          width:          42, height: 42,
          borderRadius:   'var(--radius-lg)',
          background:     `${cfg.color}15`,
          border:         `1px solid ${cfg.color}30`,
          display:        'flex', alignItems: 'center', justifyContent: 'center',
          color:          cfg.color,
          flexShrink:     0,
          transition:     'transform var(--transition-fast)',
          transform:      hovered && !insight.isRead ? 'scale(1.07)' : 'scale(1)',
        }}>
          {cfg.icon}
        </div>

        {/* Content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
            <span style={{
              fontSize:      10, fontWeight: 700, textTransform: 'uppercase',
              letterSpacing: '0.09em', color: cfg.color,
              background:    `${cfg.color}12`,
              border:        `1px solid ${cfg.color}25`,
              borderRadius:  'var(--radius-full)', padding: '1px 8px',
            }}>
              {cfg.label}
            </span>
            {habitName && (
              <span style={{ fontSize: 11, color: 'var(--muted)', background: 'var(--surface-card)', borderRadius: 'var(--radius-full)', padding: '1px 8px', border: '1px solid var(--hairline)' }}>
                {habitName}
              </span>
            )}
            {!insight.isRead && (
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: cfg.color, flexShrink: 0 }} />
            )}
          </div>

          <p style={{
            margin:     0,
            fontSize:   14,
            color:      insight.isRead ? 'var(--muted)' : 'var(--body)',
            lineHeight: 1.65,
          }}>
            {insight.content}
          </p>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 10, fontSize: 11, color: 'var(--muted-soft)' }}>
            <Clock size={10} />
            {timeAgo}
          </div>
        </div>

        {/* Dismiss button */}
        <button
          onClick={() => onDismiss(insight.id)}
          style={{
            width:      26, height: 26,
            borderRadius: 'var(--radius-md)',
            border:     '1px solid var(--hairline)',
            background: 'transparent',
            color:      'var(--muted-soft)',
            display:    'flex', alignItems: 'center', justifyContent: 'center',
            cursor:     'pointer', flexShrink: 0,
            opacity:    hovered ? 1 : 0,
            transition: 'opacity var(--transition-fast)',
          }}
          title="Dismiss"
        >
          <X size={11} />
        </button>
      </div>
    </div>
  )
}

// ── Stats strip ────────────────────────────────────────────────
function StatsStrip({ habits, logs }: { habits: any[]; logs: any[] }) {
  const stats = useMemo(() => computeInsightStats(habits, logs), [habits, logs])

  const items = [
    { label: 'This week',    value: `${stats.completionRateThisWeek}%`,   color: stats.completionRateThisWeek >= 70 ? 'var(--accent-success)' : stats.completionRateThisWeek >= 40 ? 'var(--accent-gold)' : 'var(--accent-danger)' },
    { label: 'Last 30 days', value: `${stats.completionRateLast30}%`,     color: stats.completionRateLast30 >= 60 ? 'var(--accent-success)' : 'var(--accent-gold)' },
    { label: 'Top category', value: stats.topCategory,                    color: 'var(--coral)' },
    { label: 'Needs work',   value: stats.weakCategory,                   color: '#ef4444' },
    { label: 'Perfect days', value: `${stats.perfectDaysThisWeek}/7`,     color: stats.perfectDaysThisWeek >= 5 ? 'var(--accent-success)' : 'var(--accent-gold)' },
  ]

  return (
    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
      {items.map(item => (
        <div key={item.label} style={{
          flex: '1 1 120px',
          padding: '14px 16px',
          borderRadius: 'var(--radius-lg)',
          background: 'var(--canvas)',
          border: '1px solid var(--hairline)',
          boxShadow: 'var(--shadow-sm)',
        }}>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.1rem', color: item.color, letterSpacing: '-0.03em', lineHeight: 1, marginBottom: 5 }}>
            {item.value}
          </div>
          <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 500 }}>{item.label}</div>
        </div>
      ))}
      {stats.streakAtRisk && (
        <div style={{
          flex: '1 1 120px',
          padding: '14px 16px',
          borderRadius: 'var(--radius-lg)',
          background: 'rgba(239,68,68,0.07)',
          border: '1px solid rgba(239,68,68,0.25)',
        }}>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.1rem', color: '#ef4444', letterSpacing: '-0.03em', lineHeight: 1, marginBottom: 5 }}>
            ⚠️ At risk
          </div>
          <div style={{ fontSize: 11, color: '#ef4444', fontWeight: 500 }}>Streak today</div>
        </div>
      )}
    </div>
  )
}

// ── Empty / No goals nudge ─────────────────────────────────────
function GoalsNudge() {
  const navigate = useNavigate()
  return (
    <div style={{
      padding: '32px', borderRadius: 'var(--radius-xl)',
      background: 'var(--canvas)', border: '1px dashed var(--hairline)',
      textAlign: 'center',
    }}>
      <div style={{ fontSize: 40, marginBottom: 12 }}>🎯</div>
      <h3 style={{ margin: '0 0 8px', color: 'var(--ink)' }}>Set goals to unlock smarter insights</h3>
      <p style={{ margin: '0 0 20px', fontSize: 13, color: 'var(--muted)', maxWidth: 380, marginLeft: 'auto', marginRight: 'auto' }}>
        The AI uses your goals to understand what you're working toward and generate targeted suggestions — not just generic advice.
      </p>
      <button
        onClick={() => navigate('/goals')}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 7,
          padding: '10px 20px', borderRadius: 'var(--radius-md)',
          background: 'var(--coral)', color: 'var(--on-primary)',
          fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 600,
          border: 'none', cursor: 'pointer',
        }}
      >
        <Target size={14} /> Go to Goals
      </button>
    </div>
  )
}

// ── Main Page ──────────────────────────────────────────────────
export default function Insights() {
  const { user, habits, logs, goals, loading, loadAll, loadGoals, refreshGoalProgress } = useStore() as any
  const api = (window as any).api

  const [storedInsights, setStoredInsights] = useState<StoredInsight[]>([])
  const [generating,     setGenerating]     = useState(false)
  const [loadingInsights, setLoadingInsights] = useState(false)
  const [error,          setError]          = useState<string | null>(null)
  const [filterType,     setFilterType]     = useState<string>('all')
  const [lastGenerated,  setLastGenerated]  = useState<string | null>(null)

  // Load everything
  useEffect(() => {
    async function init() {
      if (!user) await loadAll(DEMO_USER_ID)
    }
    init()
  }, [])

  useEffect(() => {
    if (!user) return
    loadGoals(user.id)
    refreshGoalProgress()
    fetchInsights()
  }, [user?.id])

  const fetchInsights = async () => {
    if (!user) return
    setLoadingInsights(true)
    try {
      const list: StoredInsight[] = await api.insights.list(user.id)
      // Sort newest first
      list.sort((a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime())
      setStoredInsights(list)
      if (list.length > 0) setLastGenerated(list[0].generatedAt)
    } catch (e) {
      console.warn('fetchInsights failed:', e)
    } finally {
      setLoadingInsights(false)
    }
  }

  const handleGenerate = async () => {
    if (!user || !habits || !logs) return
    setGenerating(true)
    setError(null)

    try {
      const stats = computeInsightStats(habits, logs)
      const req = {
        user: {
          level:         user.level,
          currentStreak: user.currentStreak,
          longestStreak: user.longestStreak,
          totalPoints:   user.totalPoints,
        },
        habits: habits.map((h: any) => ({
          id:                h.id,
          name:              h.name,
          category:          h.category,
          frequency:         h.frequency,
          targetDaysPerWeek: h.targetDaysPerWeek,
          isArchived:        h.isArchived,
        })),
        logs: logs.map((l: any) => ({
          habitId:     l.habitId,
          completedAt: l.completedAt,
        })),
        goals: (goals ?? []).map((g: any) => ({
          id:           g.id,
          title:        g.title,
          category:     g.category,
          targetType:   g.targetType,
          targetValue:  g.targetValue,
          currentValue: g.currentValue,
          unit:         g.unit,
          deadline:     g.deadline,
          status:       g.status,
          priority:     g.priority,
        })),
        recentStats: stats,
      }

      const generated: GeneratedInsight[] = await generateInsights(req)

      // Persist each insight to DB
      const saved: StoredInsight[] = []
      for (const insight of generated) {
        const record = await api.insights.create({
          userId:  user.id,
          habitId: insight.habitId ?? null,
          type:    insight.type,
          content: insight.content,
          isRead:  false,
        })
        saved.push(record)
      }

      // Prepend new insights
      setStoredInsights(prev => [...saved, ...prev])
      setLastGenerated(new Date().toISOString())
    } catch (e: any) {
      setError(e.message ?? 'Failed to generate insights')
    } finally {
      setGenerating(false)
    }
  }

  const handleDismiss = async (id: number) => {
    try {
      await api.insights.markRead(id)
      setStoredInsights(prev => prev.map(i => i.id === id ? { ...i, isRead: true } : i))
    } catch {}
  }

  const habitById = (id: number | null) => {
    if (!id || !habits) return null
    return (habits as any[]).find(h => h.id === id)?.name ?? null
  }

  // Filter
  const filtered = storedInsights.filter(i => filterType === 'all' || i.type === filterType)
  const unreadCount = storedInsights.filter(i => !i.isRead).length
  const activeGoals = (goals ?? []).filter((g: any) => g.status === 'active')
  const hasHabits   = (habits ?? []).filter((h: any) => !h.isArchived).length > 0

  const lastGenStr = lastGenerated
    ? (() => {
        const ms   = Date.now() - new Date(lastGenerated).getTime()
        const mins = Math.floor(ms / 60000)
        const hrs  = Math.floor(mins / 60)
        if (hrs >= 1) return `${hrs}h ago`
        if (mins >= 1) return `${mins}m ago`
        return 'Just now'
      })()
    : null

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', flexDirection: 'column', gap: 16 }}>
      <div style={{ width: 40, height: 40, border: '3px solid var(--hairline)', borderTop: '3px solid var(--coral)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <p style={{ color: 'var(--muted)', fontSize: 14 }}>Loading…</p>
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, animation: 'fadeIn 220ms ease forwards' }}>

      {/* ── Hero ── */}
      <div style={{
        background:   'var(--surface-dark)',
        border:       '1px solid rgba(255,255,255,0.07)',
        borderRadius: 'var(--radius-xl)',
        padding:      '28px 32px',
        position:     'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', top: -60, right: -60, width: 220, height: 220, borderRadius: '50%', background: 'radial-gradient(circle, rgba(232,165,90,0.09), transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 24, flexWrap: 'wrap' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 7 }}>
              <Sparkles size={18} color="#e8a55a" />
              <h1 style={{ margin: 0, color: 'var(--on-dark)', fontSize: '1.35rem' }}>AI Insights</h1>
              {unreadCount > 0 && (
                <span style={{ padding: '2px 9px', borderRadius: 'var(--radius-full)', background: 'var(--coral)', color: 'var(--on-primary)', fontSize: 11, fontWeight: 700 }}>
                  {unreadCount} new
                </span>
              )}
            </div>
            <p style={{ margin: 0, color: 'var(--on-dark-soft)', fontSize: 13, maxWidth: 420 }}>
              Claude analyses your habits, goals, and progress to suggest personalised adjustments and new habits.
            </p>
            {lastGenStr && (
              <div style={{ marginTop: 10, fontSize: 11, color: 'var(--on-dark-soft)', display: 'flex', alignItems: 'center', gap: 5 }}>
                <Clock size={10} /> Last generated {lastGenStr}
              </div>
            )}
          </div>

          {/* Generate button */}
          <button
            onClick={handleGenerate}
            disabled={generating || !hasHabits}
            style={{
              display:      'flex', alignItems: 'center', gap: 9,
              padding:      '0 24px', height: 46,
              borderRadius: 'var(--radius-md)', border: 'none',
              background:   generating || !hasHabits ? 'rgba(255,255,255,0.08)' : 'var(--coral)',
              color:        generating || !hasHabits ? 'var(--on-dark-soft)' : 'var(--on-primary)',
              fontFamily:   'var(--font-body)', fontSize: 14, fontWeight: 600,
              cursor:       generating || !hasHabits ? 'not-allowed' : 'pointer',
              transition:   'all var(--transition-fast)',
              flexShrink:   0,
              boxShadow:    generating || !hasHabits ? 'none' : '0 2px 12px rgba(204,120,92,0.35)',
            }}
            onMouseEnter={e => { if (!generating && hasHabits) e.currentTarget.style.background = 'var(--coral-active)' }}
            onMouseLeave={e => { if (!generating && hasHabits) e.currentTarget.style.background = 'var(--coral)' }}
          >
            {generating ? (
              <>
                <div style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTop: '2px solid white', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                Analysing…
              </>
            ) : (
              <>
                <Sparkles size={15} />
                {storedInsights.length === 0 ? 'Generate insights' : 'Refresh insights'}
              </>
            )}
          </button>
        </div>
      </div>

      {/* ── Error banner ── */}
      {error && (
        <div style={{ padding: '12px 16px', borderRadius: 'var(--radius-md)', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', color: 'var(--accent-danger)', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <AlertTriangle size={14} />
            {error}
          </div>
          <button onClick={() => setError(null)} style={{ background: 'none', border: 'none', color: 'var(--accent-danger)', cursor: 'pointer', padding: 0 }}><X size={14} /></button>
        </div>
      )}

      {/* ── Progress stats strip ── */}
      {hasHabits && <StatsStrip habits={habits ?? []} logs={logs ?? []} />}

      {/* ── No goals nudge ── */}
      {activeGoals.length === 0 && hasHabits && <GoalsNudge />}

      {/* ── No habits nudge ── */}
      {!hasHabits && (
        <div style={{ padding: '32px', borderRadius: 'var(--radius-xl)', background: 'var(--canvas)', border: '1px dashed var(--hairline)', textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🌱</div>
          <h3 style={{ margin: '0 0 8px', color: 'var(--ink)' }}>Add some habits first</h3>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--muted)' }}>The AI needs habit and log data to generate meaningful insights.</p>
        </div>
      )}

      {/* ── Insights section ── */}
      {storedInsights.length > 0 && (
        <>
          {/* Filter tabs */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <button onClick={() => setFilterType('all')} style={filterTabStyle(filterType === 'all', 'var(--coral)')}>
              All ({storedInsights.length})
            </button>
            {Object.entries(TYPE_CONFIG).map(([key, cfg]) => {
              const count = storedInsights.filter(i => i.type === key).length
              if (count === 0) return null
              return (
                <button key={key} onClick={() => setFilterType(key)} style={filterTabStyle(filterType === key, cfg.color)}>
                  {cfg.label} ({count})
                </button>
              )
            })}
          </div>

          {/* Cards */}
          {loadingInsights ? (
            <div style={{ textAlign: 'center', padding: '32px', color: 'var(--muted)', fontSize: 14 }}>Loading insights…</div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px', color: 'var(--muted)', fontSize: 14 }}>No {filterType} insights.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {filtered.map(insight => (
                <InsightCard
                  key={insight.id}
                  insight={insight}
                  habitName={habitById(insight.habitId)}
                  onDismiss={handleDismiss}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* ── Empty state (no insights yet, has habits) ── */}
      {storedInsights.length === 0 && hasHabits && !loadingInsights && (
        <div style={{
          padding: '48px 32px', borderRadius: 'var(--radius-xl)',
          background: 'var(--canvas)', border: '1px dashed var(--hairline)',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: 48, marginBottom: 14 }}>✨</div>
          <h3 style={{ margin: '0 0 8px', color: 'var(--ink)' }}>No insights generated yet</h3>
          <p style={{ margin: '0 0 24px', fontSize: 13, color: 'var(--muted)', maxWidth: 360, marginLeft: 'auto', marginRight: 'auto' }}>
            Hit "Generate insights" above — Claude will analyse your habits
            {activeGoals.length > 0 ? ', goals,' : ''} and progress to give you personalised suggestions.
          </p>
          <button
            onClick={handleGenerate}
            disabled={generating}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '0 24px', height: 44, borderRadius: 'var(--radius-md)', border: 'none', background: 'var(--coral)', color: 'var(--on-primary)', fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
          >
            <Sparkles size={14} />
            {generating ? 'Analysing…' : 'Generate now'}
          </button>
        </div>
      )}

      {/* ── How it works ── */}
      <div style={{
        padding: '22px 24px', borderRadius: 'var(--radius-xl)',
        background: 'var(--surface-card)', border: '1px solid var(--hairline)',
        boxShadow: 'var(--shadow-sm)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 12 }}>
          <BookOpen size={14} color="var(--muted)" />
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>How it works</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14 }}>
          {[
            { icon: '🎯', title: 'Goal-aware',       desc: 'Your goals tell Claude what you\'re working toward, so suggestions are relevant.' },
            { icon: '📊', title: 'Data-driven',      desc: 'Real completion rates and streaks — no guessing, just your actual patterns.' },
            { icon: '🔄', title: 'Always fresh',     desc: 'Generate new insights anytime your situation changes.' },
            { icon: '🔒', title: 'Private',          desc: 'Only your anonymised stats go to Claude — never personal identifiers.' },
          ].map(item => (
            <div key={item.title} style={{ display: 'flex', gap: 10 }}>
              <span style={{ fontSize: 18, flexShrink: 0 }}>{item.icon}</span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)', marginBottom: 3 }}>{item.title}</div>
                <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }}>{item.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Helpers ────────────────────────────────────────────────────
const filterTabStyle = (active: boolean, color: string): React.CSSProperties => ({
  padding:      '6px 13px',
  borderRadius: 'var(--radius-full)',
  border:       `1px solid ${active ? color : 'var(--hairline)'}`,
  background:   active ? `${color}15` : 'var(--canvas)',
  color:        active ? color : 'var(--muted)',
  fontFamily:   'var(--font-body)',
  fontSize:     13, fontWeight: active ? 600 : 400,
  cursor:       'pointer',
  transition:   'all var(--transition-fast)',
})