// src/renderer/pages/Goals.tsx
// User Goals management page.
// Users define goals that drive AI insight suggestions.
//
// Design.md: cream canvas cards, coral CTAs, dark navy stats panel

import { useEffect, useState } from 'react'
import { Plus, Target, Trash2, Pencil, X, Check, ChevronDown, Clock, TrendingUp } from 'lucide-react'
import { useStore } from '../store/useStore'
import { GoalRow } from '../store/goalStore'

const DEMO_USER_ID = 1

const GOAL_CATEGORIES = [
  { label: 'Health',      color: '#ef4444', icon: '❤️' },
  { label: 'Fitness',     color: '#f59e0b', icon: '🏋️' },
  { label: 'Mindfulness', color: '#8b5cf6', icon: '🧘' },
  { label: 'Study',       color: '#3b82f6', icon: '📖' },
  { label: 'Finance',     color: '#10b981', icon: '💰' },
  { label: 'Social',      color: '#ec4899', icon: '👥' },
  { label: 'Creativity',  color: '#06b6d4', icon: '🎨' },
  { label: 'Other',       color: '#6b7280', icon: '⭐' },
]

const TARGET_TYPES = [
  { value: 'total_logs',       label: 'Total completions',  unit: 'times',  example: 'Log this habit 100 times total' },
  { value: 'streak',           label: 'Streak length',      unit: 'days',   example: 'Maintain a 30-day streak' },
  { value: 'completion_rate',  label: 'Completion rate',    unit: '%',      example: 'Hit 80% completion rate in 30 days' },
  { value: 'habit_count',      label: 'Active habits',      unit: 'habits', example: 'Track 5 habits simultaneously' },
]

const PRIORITIES = [
  { value: 'low',    label: 'Low',    color: '#6b7280' },
  { value: 'medium', label: 'Medium', color: '#e8a55a' },
  { value: 'high',   label: 'High',   color: '#ef4444' },
]

const STATUS_COLORS: Record<string, string> = {
  active:    'var(--coral)',
  completed: 'var(--accent-success)',
  paused:    'var(--accent-gold)',
  abandoned: 'var(--muted)',
}

const blankForm = () => ({
  title:       '',
  description: '',
  category:    'Health',
  targetType:  'total_logs',
  targetValue: 30,
  unit:        'times',
  deadline:    '',
  habitIds:    '[]',
  status:      'active',
  priority:    'medium',
})

type FormState = ReturnType<typeof blankForm>

// ── Goal Card ─────────────────────────────────────────────────
function GoalCard({
  goal,
  onEdit,
  onDelete,
  onStatusChange,
}: {
  goal:           GoalRow
  onEdit:         (g: GoalRow) => void
  onDelete:       (g: GoalRow) => void
  onStatusChange: (id: number, status: string) => void
}) {
  const [hovered, setHovered]   = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const catData = GOAL_CATEGORIES.find(c => c.label === goal.category)
  const color   = catData?.color ?? 'var(--coral)'
  const pct     = goal.targetValue > 0
    ? Math.min(100, Math.round((goal.currentValue / goal.targetValue) * 100))
    : 0

  const daysLeft = goal.deadline
    ? Math.ceil((new Date(goal.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null

  const targetTypeLabel = TARGET_TYPES.find(t => t.value === goal.targetType)?.label ?? goal.targetType

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setMenuOpen(false) }}
      style={{
        position:     'relative',
        background:   goal.status === 'completed' ? 'var(--surface-soft)' : 'var(--canvas)',
        border:       `1px solid ${hovered && goal.status !== 'completed' ? color + '60' : 'var(--hairline)'}`,
        borderRadius: 'var(--radius-xl)',
        padding:      '22px 24px',
        overflow:     'hidden',
        transition:   'all var(--transition-fast)',
        boxShadow:    hovered && goal.status !== 'completed' ? `0 4px 20px ${color}10` : 'var(--shadow-sm)',
        opacity:      goal.status === 'abandoned' ? 0.55 : 1,
      }}
    >
      {/* Color accent bar */}
      <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, background: color, borderRadius: 'var(--radius-xl) 0 0 var(--radius-xl)', opacity: goal.status !== 'active' ? 0.4 : 1 }} />

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginLeft: 8 }}>
        <div style={{ fontSize: 28, lineHeight: 1 }}>{catData?.icon ?? '⭐'}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--ink)', letterSpacing: '-0.01em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {goal.title}
            </h3>
            {/* Status pill */}
            <span style={{
              fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em',
              color: STATUS_COLORS[goal.status] ?? 'var(--muted)',
              background: `${STATUS_COLORS[goal.status] ?? 'var(--muted)'}18`,
              border: `1px solid ${STATUS_COLORS[goal.status] ?? 'var(--muted)'}35`,
              borderRadius: 'var(--radius-full)', padding: '1px 8px', flexShrink: 0,
            }}>
              {goal.status}
            </span>
            {/* Priority dot */}
            <div style={{
              width: 7, height: 7, borderRadius: '50%',
              background: PRIORITIES.find(p => p.value === goal.priority)?.color ?? 'var(--muted)',
              flexShrink: 0,
            }} title={`${goal.priority} priority`} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12, color: 'var(--muted)' }}>
            <span style={{ color, fontWeight: 600 }}>{goal.category}</span>
            <span>·</span>
            <span>{targetTypeLabel}</span>
            {daysLeft !== null && (
              <>
                <span>·</span>
                <span style={{ color: daysLeft < 7 ? 'var(--accent-danger)' : daysLeft < 30 ? 'var(--accent-gold)' : 'var(--muted)', display: 'flex', alignItems: 'center', gap: 3 }}>
                  <Clock size={10} />
                  {daysLeft < 0 ? 'Overdue' : `${daysLeft}d left`}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: 6, opacity: hovered ? 1 : 0, transition: 'opacity var(--transition-fast)', flexShrink: 0 }}>
          <button onClick={() => onEdit(goal)} style={iconBtn}>
            <Pencil size={12} />
          </button>
          {/* Status dropdown */}
          <div style={{ position: 'relative' }}>
            <button onClick={() => setMenuOpen(v => !v)} style={iconBtn}>
              <ChevronDown size={12} />
            </button>
            {menuOpen && (
              <div style={{
                position: 'absolute', top: '100%', right: 0, zIndex: 20,
                background: 'var(--canvas)', border: '1px solid var(--hairline)',
                borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-md)',
                padding: '4px', minWidth: 130, marginTop: 4,
              }}>
                {['active', 'paused', 'completed', 'abandoned'].map(s => (
                  <button key={s} onClick={() => { onStatusChange(goal.id, s); setMenuOpen(false) }}
                    style={{ display: 'block', width: '100%', padding: '6px 10px', border: 'none', background: goal.status === s ? 'var(--surface-card)' : 'transparent', color: STATUS_COLORS[s] ?? 'var(--muted)', fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: goal.status === s ? 600 : 400, textAlign: 'left', cursor: 'pointer', borderRadius: 'var(--radius-sm)', textTransform: 'capitalize' }}>
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button onClick={() => onDelete(goal)} style={{ ...iconBtn, color: 'var(--accent-danger)' }}>
            <Trash2 size={12} />
          </button>
        </div>
      </div>

      {/* Description */}
      {goal.description && (
        <p style={{ margin: '10px 0 0 44px', fontSize: 13, color: 'var(--muted)', lineHeight: 1.5 }}>
          {goal.description}
        </p>
      )}

      {/* Progress */}
      <div style={{ marginTop: 16, marginLeft: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <span style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 500 }}>Progress</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: pct >= 100 ? 'var(--accent-success)' : color }}>
            {goal.currentValue} / {goal.targetValue} {goal.unit ?? ''}
            <span style={{ marginLeft: 6, fontSize: 11, opacity: 0.8 }}>({pct}%)</span>
          </span>
        </div>
        <div style={{ height: 8, borderRadius: 'var(--radius-full)', background: 'var(--surface-card)', overflow: 'hidden', border: '1px solid var(--hairline-soft)' }}>
          <div style={{
            height: '100%', width: `${pct}%`, borderRadius: 'var(--radius-full)',
            background: pct >= 100
              ? 'var(--accent-success)'
              : pct >= 75
                ? `linear-gradient(90deg, ${color}, var(--accent-gold))`
                : color,
            transition: 'width 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)',
          }} />
        </div>
      </div>
    </div>
  )
}

// ── Goal Drawer ───────────────────────────────────────────────
function GoalDrawer({
  open,
  editTarget,
  habits,
  onClose,
  onSave,
}: {
  open:       boolean
  editTarget: GoalRow | null
  habits:     any[]
  onClose:    () => void
  onSave:     (data: FormState) => void
}) {
  const [form, setForm]     = useState<FormState>(blankForm())
  const [saving, setSaving] = useState(false)
  const set = (patch: Partial<FormState>) => setForm(prev => ({ ...prev, ...patch }))

  useEffect(() => {
    if (editTarget) {
      setForm({
        title:       editTarget.title,
        description: editTarget.description ?? '',
        category:    editTarget.category,
        targetType:  editTarget.targetType,
        targetValue: editTarget.targetValue,
        unit:        editTarget.unit ?? '',
        deadline:    editTarget.deadline ? editTarget.deadline.slice(0, 10) : '',
        habitIds:    editTarget.habitIds,
        status:      editTarget.status,
        priority:    editTarget.priority,
      })
    } else {
      setForm(blankForm())
    }
  }, [editTarget, open])

  const selectedHabitIds: number[] = (() => {
    try { return JSON.parse(form.habitIds) as number[] }
    catch { return [] }
  })()

  const toggleHabit = (id: number) => {
    const current = selectedHabitIds
    const next    = current.includes(id) ? current.filter(i => i !== id) : [...current, id]
    set({ habitIds: JSON.stringify(next) })
  }

  const handleSave = async () => {
    if (!form.title.trim()) return
    setSaving(true)
    const tt = TARGET_TYPES.find(t => t.value === form.targetType)
    await onSave({ ...form, unit: form.unit || (tt?.unit ?? '') })
    setSaving(false)
  }

  const activeHabits = habits.filter(h => !h.isArchived)

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(20,20,19,0.35)', zIndex: 40, opacity: open ? 1 : 0, pointerEvents: open ? 'auto' : 'none', transition: 'opacity var(--transition-normal)', backdropFilter: 'blur(2px)' }} />
      <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: 440, zIndex: 50, background: 'var(--surface-dark)', borderLeft: '1px solid rgba(255,255,255,0.08)', display: 'flex', flexDirection: 'column', transform: open ? 'translateX(0)' : 'translateX(100%)', transition: 'transform 280ms cubic-bezier(0.32, 0.72, 0, 1)', boxShadow: '-8px 0 32px rgba(20,20,19,0.25)', overflow: 'hidden' }}>

        {/* Header */}
        <div style={{ padding: '24px 28px 20px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--on-dark-soft)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4 }}>
              {editTarget ? 'Edit goal' : 'New goal'}
            </div>
            <h2 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--on-dark)', fontFamily: 'var(--font-display)', fontWeight: 800, letterSpacing: '-0.03em' }}>
              {editTarget ? editTarget.title : 'Set a new quest'}
            </h2>
          </div>
          <button onClick={onClose} style={{ width: 36, height: 36, borderRadius: 'var(--radius-md)', border: '1px solid rgba(255,255,255,0.1)', background: 'var(--surface-dark-elevated)', color: 'var(--on-dark-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <X size={15} />
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: 22 }}>

          <div>
            <label style={drawerLabel}>Goal title *</label>
            <input value={form.title} onChange={e => set({ title: e.target.value })} placeholder="e.g. Build a meditation habit" maxLength={80} style={drawerInput} onFocus={e => (e.target.style.borderColor = 'var(--coral)')} onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.12)')} />
          </div>

          <div>
            <label style={drawerLabel}>Description <span style={{ color: 'var(--on-dark-soft)', fontWeight: 400 }}>(optional)</span></label>
            <textarea value={form.description} onChange={e => set({ description: e.target.value })} placeholder="Why is this goal important to you?" maxLength={200} rows={2} style={{ ...drawerInput, height: 'auto', resize: 'none', lineHeight: 1.5 }} onFocus={e => (e.target.style.borderColor = 'var(--coral)')} onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.12)')} />
          </div>

          <div>
            <label style={drawerLabel}>Category</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
              {GOAL_CATEGORIES.map(cat => (
                <button key={cat.label} onClick={() => set({ category: cat.label })} style={{ padding: '5px 12px', borderRadius: 'var(--radius-full)', border: `1px solid ${form.category === cat.label ? cat.color : 'rgba(255,255,255,0.12)'}`, background: form.category === cat.label ? `${cat.color}25` : 'transparent', color: form.category === cat.label ? cat.color : 'var(--on-dark-soft)', fontSize: 12, fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
                  {cat.icon} {cat.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label style={drawerLabel}>Goal type</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              {TARGET_TYPES.map(tt => (
                <button key={tt.value} onClick={() => set({ targetType: tt.value, unit: tt.unit })} style={{ padding: '10px 14px', borderRadius: 'var(--radius-md)', border: `1px solid ${form.targetType === tt.value ? 'var(--coral)' : 'rgba(255,255,255,0.10)'}`, background: form.targetType === tt.value ? 'rgba(204,120,92,0.15)' : 'var(--surface-dark-elevated)', color: form.targetType === tt.value ? 'var(--coral)' : 'var(--on-dark-soft)', fontSize: 13, textAlign: 'left', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>{tt.label}</span>
                  {form.targetType === tt.value && <Check size={13} />}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={drawerLabel}>Target value</label>
              <input type="number" value={form.targetValue} min={1} onChange={e => set({ targetValue: Math.max(1, Number(e.target.value)) })} style={drawerInput} onFocus={e => (e.target.style.borderColor = 'var(--coral)')} onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.12)')} />
            </div>
            <div>
              <label style={drawerLabel}>Unit</label>
              <input value={form.unit} onChange={e => set({ unit: e.target.value })} placeholder="times / days / %" maxLength={20} style={drawerInput} onFocus={e => (e.target.style.borderColor = 'var(--coral)')} onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.12)')} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={drawerLabel}>Deadline <span style={{ color: 'var(--on-dark-soft)', fontWeight: 400 }}>(optional)</span></label>
              <input type="date" value={form.deadline} onChange={e => set({ deadline: e.target.value })} style={{ ...drawerInput, colorScheme: 'dark' }} onFocus={e => (e.target.style.borderColor = 'var(--coral)')} onBlur={e => (e.target.style.borderColor = 'rgba(255,255,255,0.12)')} />
            </div>
            <div>
              <label style={drawerLabel}>Priority</label>
              <div style={{ display: 'flex', gap: 7 }}>
                {PRIORITIES.map(p => (
                  <button key={p.value} onClick={() => set({ priority: p.value })} style={{ flex: 1, padding: '9px 4px', borderRadius: 'var(--radius-md)', border: `1px solid ${form.priority === p.value ? p.color : 'rgba(255,255,255,0.10)'}`, background: form.priority === p.value ? `${p.color}20` : 'transparent', color: form.priority === p.value ? p.color : 'var(--on-dark-soft)', fontSize: 12, fontWeight: 500, cursor: 'pointer', textAlign: 'center' }}>
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Link to habits */}
          {activeHabits.length > 0 && (
            <div>
              <label style={drawerLabel}>
                Link habits <span style={{ color: 'var(--on-dark-soft)', fontWeight: 400 }}>(optional — auto-detects by category if none selected)</span>
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {activeHabits.map(h => {
                  const linked = selectedHabitIds.includes(h.id)
                  return (
                    <button key={h.id} onClick={() => toggleHabit(h.id)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 10px', borderRadius: 'var(--radius-md)', border: `1px solid ${linked ? h.color : 'rgba(255,255,255,0.10)'}`, background: linked ? `${h.color}20` : 'transparent', color: linked ? h.color : 'var(--on-dark-soft)', fontSize: 12, fontWeight: 500, cursor: 'pointer' }}>
                      {h.icon} {h.name} {linked && <Check size={10} />}
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '20px 28px', borderTop: '1px solid rgba(255,255,255,0.07)', display: 'flex', gap: 12, flexShrink: 0 }}>
          <button onClick={onClose} style={{ flex: 1, height: 44, borderRadius: 'var(--radius-md)', border: '1px solid rgba(255,255,255,0.12)', background: 'var(--surface-dark-elevated)', color: 'var(--on-dark-soft)', fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 500, cursor: 'pointer' }}>
            Cancel
          </button>
          <button onClick={handleSave} disabled={!form.title.trim() || saving} style={{ flex: 2, height: 44, borderRadius: 'var(--radius-md)', border: 'none', background: form.title.trim() ? 'var(--coral)' : 'var(--coral-disabled)', color: 'var(--on-primary)', fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 600, cursor: form.title.trim() ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            {saving ? <div style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.4)', borderTop: '2px solid white', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} /> : <Check size={16} />}
            {saving ? 'Saving…' : editTarget ? 'Save changes' : 'Add goal'}
          </button>
        </div>
      </div>
    </>
  )
}

// ── Goals Page ─────────────────────────────────────────────────
const drawerLabel: React.CSSProperties = { display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--on-dark-soft)', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 8 }
const drawerInput: React.CSSProperties = { width: '100%', height: 42, padding: '0 14px', borderRadius: 'var(--radius-md)', border: '1px solid rgba(255,255,255,0.12)', background: 'var(--surface-dark-elevated)', color: 'var(--on-dark)', fontFamily: 'var(--font-body)', fontSize: 14, outline: 'none', transition: 'border-color var(--transition-fast)', boxSizing: 'border-box' }
const iconBtn: React.CSSProperties = { width: 28, height: 28, borderRadius: 'var(--radius-sm)', border: '1px solid var(--hairline)', background: 'var(--canvas)', color: 'var(--muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 12 }

export default function Goals() {
  const { user, habits, goals, goalsLoading, loadAll, loadGoals, addGoal, editGoal, removeGoal, refreshGoalProgress } = useStore() as any
  const [drawerOpen,   setDrawerOpen]   = useState(false)
  const [editTarget,   setEditTarget]   = useState<GoalRow | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<GoalRow | null>(null)
  const [filterStatus, setFilterStatus] = useState<string>('active')

  useEffect(() => {
    if (!user) loadAll(DEMO_USER_ID)
    else { loadGoals(user.id); refreshGoalProgress() }
  }, [user?.id])

  // Refresh progress when habits/logs change
  useEffect(() => { refreshGoalProgress() }, [habits?.length])

  const activeGoals    = (goals ?? []).filter((g: GoalRow) => g.status === filterStatus)
  const completedCount = (goals ?? []).filter((g: GoalRow) => g.status === 'completed').length

  const handleSave = async (form: FormState) => {
    if (!user) return
    if (editTarget) {
      await editGoal(editTarget.id, form)
    } else {
      await addGoal({ ...form, userId: user.id, currentValue: 0 })
    }
    setDrawerOpen(false); setEditTarget(null)
  }

  const handleStatusChange = async (id: number, status: string) => {
    await editGoal(id, { status })
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    await removeGoal(deleteTarget.id)
    setDeleteTarget(null)
  }

  const statuses = ['active', 'paused', 'completed', 'abandoned']

  if (goalsLoading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', flexDirection: 'column', gap: 16 }}>
      <div style={{ width: 40, height: 40, border: '3px solid var(--hairline)', borderTop: '3px solid var(--coral)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <p style={{ color: 'var(--muted)', fontSize: 14 }}>Loading goals…</p>
    </div>
  )

  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24, animation: 'fadeIn 220ms ease forwards' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
          <div>
            <h1 style={{ margin: 0, color: 'var(--ink)' }}>My Goals</h1>
            <p style={{ margin: '6px 0 0', color: 'var(--muted)', fontSize: 14 }}>
              {(goals ?? []).length === 0
                ? 'Set goals to unlock AI-powered habit suggestions'
                : `${(goals ?? []).filter((g: GoalRow) => g.status === 'active').length} active · ${completedCount} completed`}
            </p>
          </div>
          <button
            onClick={() => { setEditTarget(null); setDrawerOpen(true) }}
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 20px', height: 44, borderRadius: 'var(--radius-md)', border: 'none', background: 'var(--coral)', color: 'var(--on-primary)', fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 600, cursor: 'pointer', boxShadow: '0 2px 8px rgba(204,120,92,0.30)', flexShrink: 0 }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--coral-active)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'var(--coral)')}
          >
            <Plus size={16} /> Add goal
          </button>
        </div>

        {/* Stats row */}
        {(goals ?? []).length > 0 && (
          <div style={{ display: 'flex', gap: 12 }}>
            {[
              { label: 'Active',    value: (goals ?? []).filter((g: GoalRow) => g.status === 'active').length,    color: 'var(--coral)' },
              { label: 'Completed', value: completedCount,                                                         color: 'var(--accent-success)' },
              { label: 'Paused',    value: (goals ?? []).filter((g: GoalRow) => g.status === 'paused').length,    color: 'var(--accent-gold)' },
            ].map(s => (
              <div key={s.label} style={{ flex: 1, padding: '16px', borderRadius: 'var(--radius-lg)', background: 'var(--canvas)', border: '1px solid var(--hairline)', textAlign: 'center', boxShadow: 'var(--shadow-sm)' }}>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.5rem', color: s.color, letterSpacing: '-0.04em' }}>{s.value}</div>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>{s.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Status filter */}
        {(goals ?? []).length > 0 && (
          <div style={{ display: 'flex', gap: 6 }}>
            {statuses.map(s => (
              <button key={s} onClick={() => setFilterStatus(s)} style={{ padding: '6px 14px', borderRadius: 'var(--radius-full)', border: `1px solid ${filterStatus === s ? STATUS_COLORS[s] : 'var(--hairline)'}`, background: filterStatus === s ? `${STATUS_COLORS[s]}15` : 'var(--canvas)', color: filterStatus === s ? STATUS_COLORS[s] : 'var(--muted)', fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: filterStatus === s ? 600 : 400, cursor: 'pointer', textTransform: 'capitalize', transition: 'all var(--transition-fast)' }}>
                {s}
              </button>
            ))}
          </div>
        )}

        {/* Empty state */}
        {(goals ?? []).length === 0 && (
          <div style={{ background: 'var(--canvas)', border: '1px dashed var(--hairline)', borderRadius: 'var(--radius-xl)', padding: '64px 32px', textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🎯</div>
            <h2 style={{ margin: '0 0 8px', color: 'var(--ink)' }}>No goals yet</h2>
            <p style={{ margin: '0 0 24px', color: 'var(--muted)', fontSize: 14, maxWidth: 380, marginLeft: 'auto', marginRight: 'auto' }}>
              Goals help the AI understand what you're working toward and generate personalized habit suggestions.
            </p>
            <button onClick={() => setDrawerOpen(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '0 24px', height: 44, borderRadius: 'var(--radius-md)', border: 'none', background: 'var(--coral)', color: 'var(--on-primary)', fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
              <Plus size={15} /> Set your first goal
            </button>
          </div>
        )}

        {/* Goals grid */}
        {activeGoals.length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
            {activeGoals.map((goal: GoalRow) => (
              <GoalCard
                key={goal.id}
                goal={goal}
                onEdit={g => { setEditTarget(g); setDrawerOpen(true) }}
                onDelete={setDeleteTarget}
                onStatusChange={handleStatusChange}
              />
            ))}
          </div>
        ) : (goals ?? []).length > 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--muted)', fontSize: 14 }}>
            No {filterStatus} goals.
          </div>
        ) : null}

        {/* AI Insight nudge */}
        {(goals ?? []).filter((g: GoalRow) => g.status === 'active').length > 0 && (
          <div style={{ padding: '16px 20px', borderRadius: 'var(--radius-lg)', background: 'rgba(204,120,92,0.06)', border: '1px solid rgba(204,120,92,0.20)', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ fontSize: 20 }}>✨</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)', marginBottom: 2 }}>AI Insights available</div>
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>Go to the Insights page to get personalized habit suggestions based on your goals.</div>
            </div>
            <TrendingUp size={16} color="var(--coral)" />
          </div>
        )}
      </div>

      <GoalDrawer
        open={drawerOpen}
        editTarget={editTarget}
        habits={habits ?? []}
        onClose={() => { setDrawerOpen(false); setEditTarget(null) }}
        onSave={handleSave}
      />

      {/* Delete confirm */}
      {deleteTarget && (
        <>
          <div onClick={() => setDeleteTarget(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(20,20,19,0.45)', zIndex: 60, backdropFilter: 'blur(2px)' }} />
          <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 70, width: 360, background: 'var(--canvas)', border: '1px solid var(--hairline)', borderRadius: 'var(--radius-xl)', padding: '32px', boxShadow: 'var(--shadow-lg)', animation: 'fadeIn 150ms ease forwards' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🎯</div>
            <h2 style={{ margin: '0 0 8px', fontSize: '1.1rem', color: 'var(--ink)' }}>Delete "{deleteTarget.title}"?</h2>
            <p style={{ margin: '0 0 24px', fontSize: 14, color: 'var(--muted)' }}>This goal will be permanently removed. AI insights linked to it may still appear.</p>
            <div style={{ display: 'flex', gap: 12 }}>
              <button onClick={() => setDeleteTarget(null)} style={{ flex: 1, height: 42, borderRadius: 'var(--radius-md)', border: '1px solid var(--hairline)', background: 'var(--canvas)', color: 'var(--ink)', fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 500, cursor: 'pointer' }}>
                Cancel
              </button>
              <button onClick={handleDelete} style={{ flex: 1, height: 42, borderRadius: 'var(--radius-md)', border: 'none', background: '#ef4444', color: '#fff', fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <Trash2 size={14} /> Delete
              </button>
            </div>
          </div>
        </>
      )}
    </>
  )
}