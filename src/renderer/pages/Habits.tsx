// src/renderer/pages/Habits.tsx
// Habits management page — add, edit, delete habits
//
// Design.md principles:
//   • Cream canvas page floor, surface-card feature cards
//   • Coral accent used only on primary CTAs + active states
//   • Dark navy drawer panel (product-mockup-card-dark pattern)
//   • Syne 700-800 display headlines, DM Sans body
//   • Hairline borders, warm shadows
//   • Each habit card tinted by its own color — "quest card" aesthetic

import { useEffect, useState, useRef } from 'react'
import { Plus, Pencil, Trash2, X, Check, Flame, Target } from 'lucide-react'
import { useStore, Habit } from '../store/useStore'

const DEMO_USER_ID = 1

// ── Static data ───────────────────────────────────────────────
const CATEGORIES = [
  { label: 'Health',      color: '#ef4444' },
  { label: 'Study',       color: '#3b82f6' },
  { label: 'Mindfulness', color: '#8b5cf6' },
  { label: 'Finance',     color: '#10b981' },
  { label: 'Fitness',     color: '#f59e0b' },
  { label: 'Social',      color: '#ec4899' },
  { label: 'Creativity',  color: '#06b6d4' },
  { label: 'Other',       color: '#6b7280' },
]

const PALETTE = [
  '#ef4444', '#f97316', '#f59e0b', '#e8a55a',
  '#10b981', '#06b6d4', '#3b82f6', '#8b5cf6',
  '#ec4899', '#cc785c', '#6b7280', '#14b8a6',
]

const ICONS = [
  '🏃','💧','📖','🧘','💰','🏋️','🎯','✍️',
  '🎨','🍎','😴','🧹','💻','🎵','🌿','⚡',
  '🔥','💎','🌟','🏆','❤️','🧠','🦋','🚀',
]

const FREQUENCIES = [
  { value: 'daily',   label: 'Every day' },
  { value: 'weekdays',label: 'Weekdays only' },
  { value: 'weekly',  label: 'Custom days/week' },
]

// ── Blank form state ──────────────────────────────────────────
const blankForm = () => ({
  name:             '',
  description:      '',
  category:         'Health',
  color:            '#ef4444',
  icon:             '🏃',
  frequency:        'daily',
  targetDaysPerWeek: 7,
  reminderTime:     '',
})

type FormState = ReturnType<typeof blankForm>

// ─────────────────────────────────────────────────────────────
// Habit Card
// ─────────────────────────────────────────────────────────────
function HabitCard({
  habit,
  completedToday,
  totalLogs,
  onEdit,
  onDelete,
}: {
  habit: Habit
  completedToday: boolean
  totalLogs: number
  onEdit: (h: Habit) => void
  onDelete: (h: Habit) => void
}) {
  const [hovered, setHovered] = useState(false)

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position:     'relative',
        background:   'var(--canvas)',
        border:       `1px solid ${hovered ? habit.color + '80' : 'var(--hairline)'}`,
        borderRadius: 'var(--radius-xl)',
        padding:      '22px 24px',
        overflow:     'hidden',
        transition:   'border-color var(--transition-fast), box-shadow var(--transition-fast)',
        boxShadow:    hovered ? `0 4px 20px ${habit.color}18` : 'var(--shadow-sm)',
      }}
    >
      {/* Color tint strip on left edge */}
      <div style={{
        position:     'absolute',
        left:         0, top: 0, bottom: 0,
        width:        4,
        background:   habit.color,
        borderRadius: 'var(--radius-xl) 0 0 var(--radius-xl)',
      }} />

      {/* Faint color wash behind the card */}
      <div style={{
        position:     'absolute',
        inset:        0,
        background:   `${habit.color}06`,
        pointerEvents:'none',
        borderRadius: 'inherit',
      }} />

      <div style={{ position: 'relative', zIndex: 1 }}>
        {/* Top row: icon + name + actions */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
          {/* Icon */}
          <div style={{
            width:           48,
            height:          48,
            borderRadius:    'var(--radius-lg)',
            background:      `${habit.color}20`,
            border:          `1px solid ${habit.color}40`,
            display:         'flex',
            alignItems:      'center',
            justifyContent:  'center',
            fontSize:        22,
            flexShrink:      0,
          }}>
            {habit.icon}
          </div>

          {/* Name + category */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <h3 style={{
              margin:        0,
              fontSize:      15,
              fontWeight:    700,
              color:         'var(--ink)',
              letterSpacing: '-0.01em',
              whiteSpace:    'nowrap',
              overflow:      'hidden',
              textOverflow:  'ellipsis',
            }}>
              {habit.name}
            </h3>
            <div style={{ marginTop: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
              {/* Category chip */}
              <span style={{
                fontSize:      11,
                fontWeight:    600,
                color:         habit.color,
                background:    `${habit.color}15`,
                border:        `1px solid ${habit.color}30`,
                borderRadius:  'var(--radius-full)',
                padding:       '2px 8px',
                letterSpacing: '0.02em',
              }}>
                {habit.category}
              </span>
              {/* Frequency */}
              <span style={{ fontSize: 11, color: 'var(--muted)' }}>
                {habit.frequency === 'daily'
                  ? 'Daily'
                  : habit.frequency === 'weekdays'
                    ? 'Weekdays'
                    : `${habit.targetDaysPerWeek}×/week`}
              </span>
            </div>
          </div>

          {/* Action buttons — appear on hover */}
          <div style={{
            display:   'flex',
            gap:       6,
            opacity:   hovered ? 1 : 0,
            transform: hovered ? 'translateX(0)' : 'translateX(6px)',
            transition:'all var(--transition-fast)',
          }}>
            <button
              onClick={() => onEdit(habit)}
              title="Edit habit"
              style={{
                width:        32,
                height:       32,
                borderRadius: 'var(--radius-md)',
                border:       '1px solid var(--hairline)',
                background:   'var(--canvas)',
                color:        'var(--muted)',
                display:      'flex',
                alignItems:   'center',
                justifyContent:'center',
                cursor:       'pointer',
                transition:   'all var(--transition-fast)',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = 'var(--coral)'
                e.currentTarget.style.color       = 'var(--coral)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = 'var(--hairline)'
                e.currentTarget.style.color       = 'var(--muted)'
              }}
            >
              <Pencil size={13} />
            </button>
            <button
              onClick={() => onDelete(habit)}
              title="Delete habit"
              style={{
                width:        32,
                height:       32,
                borderRadius: 'var(--radius-md)',
                border:       '1px solid var(--hairline)',
                background:   'var(--canvas)',
                color:        'var(--muted)',
                display:      'flex',
                alignItems:   'center',
                justifyContent:'center',
                cursor:       'pointer',
                transition:   'all var(--transition-fast)',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = 'var(--accent-danger)'
                e.currentTarget.style.color       = 'var(--accent-danger)'
                e.currentTarget.style.background  = 'rgba(239,68,68,0.06)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = 'var(--hairline)'
                e.currentTarget.style.color       = 'var(--muted)'
                e.currentTarget.style.background  = 'var(--canvas)'
              }}
            >
              <Trash2 size={13} />
            </button>
          </div>
        </div>

        {/* Description */}
        {habit.description && (
          <p style={{
            margin:    '10px 0 0',
            fontSize:  13,
            color:     'var(--muted)',
            lineHeight: 1.5,
            overflow:  'hidden',
            display:   '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
          }}>
            {habit.description}
          </p>
        )}

        {/* Bottom row: stats */}
        <div style={{
          display:    'flex',
          alignItems: 'center',
          gap:        16,
          marginTop:  14,
          paddingTop: 14,
          borderTop:  '1px solid var(--hairline-soft)',
        }}>
          {/* Total completions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--muted)' }}>
            <Target size={12} color={habit.color} />
            <span><strong style={{ color: 'var(--ink)' }}>{totalLogs}</strong> completions</span>
          </div>

          {/* Reminder time */}
          {habit.reminderTime && (
            <div style={{ fontSize: 12, color: 'var(--muted)' }}>
              ⏰ {habit.reminderTime}
            </div>
          )}

          {/* Completed today badge */}
          {completedToday && (
            <div style={{
              marginLeft:    'auto',
              display:       'flex',
              alignItems:    'center',
              gap:           4,
              fontSize:      11,
              fontWeight:    700,
              color:         'var(--accent-success)',
              background:    'rgba(93,184,114,0.12)',
              border:        '1px solid rgba(93,184,114,0.3)',
              borderRadius:  'var(--radius-full)',
              padding:       '3px 10px',
            }}>
              <Check size={11} /> Done today
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Add / Edit Drawer
// ─────────────────────────────────────────────────────────────
function HabitDrawer({
  open,
  editTarget,
  onClose,
  onSave,
}: {
  open:       boolean
  editTarget: Habit | null
  onClose:    () => void
  onSave:     (data: FormState) => void
}) {
  const [form, setForm]               = useState<FormState>(blankForm())
  const [saving, setSaving]           = useState(false)
  const [iconSearch, setIconSearch]   = useState('')
  const nameRef                       = useRef<HTMLInputElement>(null)

  // Populate form when editing
  useEffect(() => {
    if (editTarget) {
      setForm({
        name:              editTarget.name,
        description:       editTarget.description ?? '',
        category:          editTarget.category,
        color:             editTarget.color,
        icon:              editTarget.icon,
        frequency:         editTarget.frequency,
        targetDaysPerWeek: editTarget.targetDaysPerWeek,
        reminderTime:      editTarget.reminderTime ?? '',
      })
    } else {
      setForm(blankForm())
    }
    setIconSearch('')
  }, [editTarget, open])

  // Focus name on open
  useEffect(() => {
    if (open) setTimeout(() => nameRef.current?.focus(), 120)
  }, [open])

  const set = (patch: Partial<FormState>) =>
    setForm(prev => ({ ...prev, ...patch }))

  const handleSave = async () => {
    if (!form.name.trim()) return
    setSaving(true)
    await onSave(form)
    setSaving(false)
  }

  const filteredIcons = iconSearch
    ? ICONS.filter(i => i.includes(iconSearch))
    : ICONS

  const isEdit = !!editTarget

  // ── Drawer shell ───────────────────────────────────────────
  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position:   'fixed',
          inset:      0,
          background: 'rgba(20,20,19,0.35)',
          zIndex:     40,
          opacity:    open ? 1 : 0,
          pointerEvents: open ? 'auto' : 'none',
          transition: 'opacity var(--transition-normal)',
          backdropFilter: 'blur(2px)',
        }}
      />

      {/* Drawer panel — dark navy (Design.md product-mockup-card-dark) */}
      <div style={{
        position:   'fixed',
        top:        0,
        right:      0,
        bottom:     0,
        width:      420,
        zIndex:     50,
        background: 'var(--surface-dark)',
        borderLeft: '1px solid rgba(255,255,255,0.08)',
        display:    'flex',
        flexDirection:'column',
        transform:  open ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform 280ms cubic-bezier(0.32, 0.72, 0, 1)',
        boxShadow:  '-8px 0 32px rgba(20,20,19,0.25)',
        overflow:   'hidden',
      }}>

        {/* Drawer header */}
        <div style={{
          padding:     '24px 28px 20px',
          borderBottom:'1px solid rgba(255,255,255,0.07)',
          display:     'flex',
          alignItems:  'center',
          justifyContent:'space-between',
          flexShrink:  0,
        }}>
          <div>
            <div style={{
              fontSize:      11,
              fontWeight:    600,
              color:         'var(--on-dark-soft)',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              marginBottom:  4,
            }}>
              {isEdit ? 'Edit habit' : 'New habit'}
            </div>
            <h2 style={{
              margin:        0,
              fontSize:      '1.25rem',
              color:         'var(--on-dark)',
              fontFamily:    'var(--font-display)',
              fontWeight:    800,
              letterSpacing: '-0.03em',
            }}>
              {isEdit ? editTarget!.name : 'Build a new quest'}
            </h2>
          </div>
          <button
            onClick={onClose}
            style={{
              width:        36,
              height:       36,
              borderRadius: 'var(--radius-md)',
              border:       '1px solid rgba(255,255,255,0.1)',
              background:   'var(--surface-dark-elevated)',
              color:        'var(--on-dark-soft)',
              display:      'flex',
              alignItems:   'center',
              justifyContent:'center',
              cursor:       'pointer',
            }}
          >
            <X size={15} />
          </button>
        </div>

        {/* Scrollable form body */}
        <div style={{
          flex:     1,
          overflowY:'auto',
          padding:  '24px 28px',
          display:  'flex',
          flexDirection:'column',
          gap:      24,
        }}>

          {/* ── Habit name ── */}
          <div>
            <label style={labelStyle}>Habit name *</label>
            <input
              ref={nameRef}
              value={form.name}
              onChange={e => set({ name: e.target.value })}
              placeholder="e.g. Morning Run"
              maxLength={60}
              style={inputStyle}
              onFocus={e => (e.target.style.borderColor = 'var(--coral)')}
              onBlur={e  => (e.target.style.borderColor = 'rgba(255,255,255,0.12)')}
            />
          </div>

          {/* ── Description ── */}
          <div>
            <label style={labelStyle}>Description <span style={{ color: 'var(--on-dark-soft)' }}>(optional)</span></label>
            <textarea
              value={form.description}
              onChange={e => set({ description: e.target.value })}
              placeholder="What's this habit about?"
              maxLength={200}
              rows={3}
              style={{
                ...inputStyle,
                height:    'auto',
                resize:    'none',
                lineHeight:'1.6',
              }}
              onFocus={e => (e.target.style.borderColor = 'var(--coral)')}
              onBlur={e  => (e.target.style.borderColor = 'rgba(255,255,255,0.12)')}
            />
          </div>

          {/* ── Icon picker ── */}
          <div>
            <label style={labelStyle}>Icon</label>
            <div style={{
              display:      'grid',
              gridTemplateColumns: 'repeat(8, 1fr)',
              gap:          6,
              padding:      '12px',
              background:   'var(--surface-dark-elevated)',
              borderRadius: 'var(--radius-lg)',
              border:       '1px solid rgba(255,255,255,0.07)',
            }}>
              {ICONS.map(icon => (
                <button
                  key={icon}
                  onClick={() => set({ icon })}
                  title={icon}
                  style={{
                    width:        36,
                    height:       36,
                    fontSize:     18,
                    borderRadius: 'var(--radius-md)',
                    border:       form.icon === icon
                      ? `2px solid ${form.color}`
                      : '2px solid transparent',
                    background:   form.icon === icon
                      ? `${form.color}25`
                      : 'transparent',
                    cursor:       'pointer',
                    display:      'flex',
                    alignItems:   'center',
                    justifyContent:'center',
                    transition:   'all var(--transition-fast)',
                  }}
                >
                  {icon}
                </button>
              ))}
            </div>
          </div>

          {/* ── Color picker ── */}
          <div>
            <label style={labelStyle}>Color</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {PALETTE.map(c => (
                <button
                  key={c}
                  onClick={() => set({ color: c })}
                  style={{
                    width:        28,
                    height:       28,
                    borderRadius: '50%',
                    background:   c,
                    border:       form.color === c
                      ? '3px solid var(--on-dark)'
                      : '3px solid transparent',
                    outline:      form.color === c ? `2px solid ${c}` : 'none',
                    outlineOffset:'2px',
                    cursor:       'pointer',
                    transition:   'all var(--transition-fast)',
                  }}
                />
              ))}
            </div>
          </div>

          {/* ── Category ── */}
          <div>
            <label style={labelStyle}>Category</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {CATEGORIES.map(cat => (
                <button
                  key={cat.label}
                  onClick={() => set({ category: cat.label, color: cat.color })}
                  style={{
                    padding:      '5px 14px',
                    borderRadius: 'var(--radius-full)',
                    border:       `1px solid ${form.category === cat.label ? cat.color : 'rgba(255,255,255,0.12)'}`,
                    background:   form.category === cat.label ? `${cat.color}25` : 'transparent',
                    color:        form.category === cat.label ? cat.color : 'var(--on-dark-soft)',
                    fontSize:     13,
                    fontWeight:   500,
                    cursor:       'pointer',
                    transition:   'all var(--transition-fast)',
                  }}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* ── Frequency ── */}
          <div>
            <label style={labelStyle}>Frequency</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {FREQUENCIES.map(f => (
                <button
                  key={f.value}
                  onClick={() => set({
                    frequency: f.value,
                    targetDaysPerWeek: f.value === 'daily' ? 7 : f.value === 'weekdays' ? 5 : form.targetDaysPerWeek,
                  })}
                  style={{
                    padding:      '11px 16px',
                    borderRadius: 'var(--radius-md)',
                    border:       `1px solid ${form.frequency === f.value ? 'var(--coral)' : 'rgba(255,255,255,0.1)'}`,
                    background:   form.frequency === f.value ? 'rgba(204,120,92,0.15)' : 'var(--surface-dark-elevated)',
                    color:        form.frequency === f.value ? 'var(--coral)' : 'var(--on-dark-soft)',
                    fontSize:     13,
                    fontWeight:   500,
                    textAlign:    'left',
                    cursor:       'pointer',
                    transition:   'all var(--transition-fast)',
                    display:      'flex',
                    alignItems:   'center',
                    justifyContent:'space-between',
                  }}
                >
                  {f.label}
                  {form.frequency === f.value && <Check size={14} />}
                </button>
              ))}

              {/* Days per week slider — only when 'weekly' */}
              {form.frequency === 'weekly' && (
                <div style={{
                  padding:      '14px 16px',
                  background:   'var(--surface-dark-elevated)',
                  borderRadius: 'var(--radius-md)',
                  border:       '1px solid rgba(255,255,255,0.08)',
                }}>
                  <div style={{
                    display:        'flex',
                    justifyContent: 'space-between',
                    marginBottom:   10,
                    fontSize:       13,
                    color:          'var(--on-dark-soft)',
                  }}>
                    <span>Days per week</span>
                    <span style={{ color: 'var(--coral)', fontWeight: 700 }}>
                      {form.targetDaysPerWeek}×
                    </span>
                  </div>
                  <input
                    type="range"
                    min={1} max={7}
                    value={form.targetDaysPerWeek}
                    onChange={e => set({ targetDaysPerWeek: Number(e.target.value) })}
                    style={{ width: '100%', accentColor: 'var(--coral)' }}
                  />
                </div>
              )}
            </div>
          </div>

          {/* ── Reminder time ── */}
          <div>
            <label style={labelStyle}>
              Reminder time
              <span style={{ color: 'var(--on-dark-soft)', fontWeight: 400, marginLeft: 6 }}>(optional)</span>
            </label>
            <input
              type="time"
              value={form.reminderTime}
              onChange={e => set({ reminderTime: e.target.value })}
              style={{
                ...inputStyle,
                colorScheme: 'dark',
              }}
              onFocus={e => (e.target.style.borderColor = 'var(--coral)')}
              onBlur={e  => (e.target.style.borderColor = 'rgba(255,255,255,0.12)')}
            />
          </div>

          {/* Preview */}
          <div style={{
            padding:      '16px',
            background:   'var(--surface-dark-elevated)',
            borderRadius: 'var(--radius-lg)',
            border:       '1px solid rgba(255,255,255,0.07)',
          }}>
            <div style={{ fontSize: 11, color: 'var(--on-dark-soft)', marginBottom: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Preview
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width:           44,
                height:          44,
                borderRadius:    'var(--radius-md)',
                background:      `${form.color}25`,
                border:          `1px solid ${form.color}50`,
                display:         'flex',
                alignItems:      'center',
                justifyContent:  'center',
                fontSize:        22,
              }}>
                {form.icon}
              </div>
              <div>
                <div style={{
                  fontFamily:    'var(--font-display)',
                  fontWeight:    700,
                  fontSize:      14,
                  color:         'var(--on-dark)',
                  letterSpacing: '-0.01em',
                }}>
                  {form.name || 'Your habit name'}
                </div>
                <div style={{ marginTop: 4, display: 'flex', gap: 6 }}>
                  <span style={{
                    fontSize: 11, fontWeight: 600,
                    color: form.color,
                    background: `${form.color}15`,
                    borderRadius: 'var(--radius-full)',
                    padding: '1px 7px',
                  }}>
                    {form.category}
                  </span>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Drawer footer — save button */}
        <div style={{
          padding:     '20px 28px',
          borderTop:   '1px solid rgba(255,255,255,0.07)',
          display:     'flex',
          gap:         12,
          flexShrink:  0,
          background:  'var(--surface-dark)',
        }}>
          <button
            onClick={onClose}
            style={{
              flex:         1,
              height:       44,
              borderRadius: 'var(--radius-md)',
              border:       '1px solid rgba(255,255,255,0.12)',
              background:   'var(--surface-dark-elevated)',
              color:        'var(--on-dark-soft)',
              fontFamily:   'var(--font-body)',
              fontSize:     14,
              fontWeight:   500,
              cursor:       'pointer',
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!form.name.trim() || saving}
            style={{
              flex:         2,
              height:       44,
              borderRadius: 'var(--radius-md)',
              border:       'none',
              background:   form.name.trim() ? 'var(--coral)' : 'var(--coral-disabled)',
              color:        'var(--on-primary)',
              fontFamily:   'var(--font-body)',
              fontSize:     14,
              fontWeight:   600,
              cursor:       form.name.trim() ? 'pointer' : 'not-allowed',
              display:      'flex',
              alignItems:   'center',
              justifyContent:'center',
              gap:          8,
              transition:   'background var(--transition-fast)',
              opacity:      saving ? 0.7 : 1,
            }}
          >
            {saving ? (
              <div style={{
                width: 16, height: 16,
                border: '2px solid rgba(255,255,255,0.4)',
                borderTop: '2px solid white',
                borderRadius: '50%',
                animation: 'spin 0.7s linear infinite',
              }} />
            ) : (
              <Check size={16} />
            )}
            {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Add habit'}
          </button>
        </div>
      </div>
    </>
  )
}

// ─────────────────────────────────────────────────────────────
// Delete confirmation modal
// ─────────────────────────────────────────────────────────────
function DeleteModal({
  habit,
  onConfirm,
  onCancel,
}: {
  habit: Habit | null
  onConfirm: () => void
  onCancel:  () => void
}) {
  if (!habit) return null
  return (
    <>
      <div
        onClick={onCancel}
        style={{
          position:  'fixed', inset: 0,
          background:'rgba(20,20,19,0.45)',
          zIndex:    60,
          backdropFilter: 'blur(2px)',
        }}
      />
      <div style={{
        position:     'fixed',
        top:          '50%',
        left:         '50%',
        transform:    'translate(-50%, -50%)',
        zIndex:       70,
        width:        360,
        background:   'var(--canvas)',
        border:       '1px solid var(--hairline)',
        borderRadius: 'var(--radius-xl)',
        padding:      '32px',
        boxShadow:    'var(--shadow-lg)',
        animation:    'fadeIn 150ms ease forwards',
      }}>
        {/* Icon */}
        <div style={{
          width:          52,
          height:         52,
          borderRadius:   'var(--radius-lg)',
          background:     'rgba(239,68,68,0.10)',
          border:         '1px solid rgba(239,68,68,0.20)',
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'center',
          fontSize:       24,
          marginBottom:   16,
        }}>
          {habit.icon}
        </div>

        <h2 style={{ margin: '0 0 8px', fontSize: '1.15rem', color: 'var(--ink)' }}>
          Archive "{habit.name}"?
        </h2>
        <p style={{ margin: '0 0 24px', fontSize: 14, color: 'var(--muted)', lineHeight: 1.6 }}>
          This habit will be archived and removed from your daily list.
          Your completion history will be kept safe.
        </p>

        <div style={{ display: 'flex', gap: 12 }}>
          <button
            onClick={onCancel}
            style={{
              flex: 1, height: 42,
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--hairline)',
              background: 'var(--canvas)',
              color: 'var(--ink)',
              fontFamily: 'var(--font-body)',
              fontSize: 14, fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            Keep it
          </button>
          <button
            onClick={onConfirm}
            style={{
              flex: 1, height: 42,
              borderRadius: 'var(--radius-md)',
              border: 'none',
              background: '#ef4444',
              color: '#fff',
              fontFamily: 'var(--font-body)',
              fontSize: 14, fontWeight: 600,
              cursor: 'pointer',
              display: 'flex', alignItems: 'center',
              justifyContent: 'center', gap: 6,
            }}
          >
            <Trash2 size={14} /> Archive
          </button>
        </div>
      </div>
    </>
  )
}

// ── Shared input / label styles ───────────────────────────────
const labelStyle: React.CSSProperties = {
  display:       'block',
  fontSize:      12,
  fontWeight:    600,
  color:         'var(--on-dark-soft)',
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  marginBottom:  8,
}

const inputStyle: React.CSSProperties = {
  width:        '100%',
  height:       44,
  padding:      '0 14px',
  borderRadius: 'var(--radius-md)',
  border:       '1px solid rgba(255,255,255,0.12)',
  background:   'var(--surface-dark-elevated)',
  color:        'var(--on-dark)',
  fontFamily:   'var(--font-body)',
  fontSize:     14,
  outline:      'none',
  transition:   'border-color var(--transition-fast)',
  boxSizing:    'border-box',
}

// ─────────────────────────────────────────────────────────────
// Main Habits Page
// ─────────────────────────────────────────────────────────────
export default function Habits() {
  const {
    user, habits, logs, loading,
    loadAll, addHabit, editHabit, removeHabit,
    isCompletedToday,
  } = useStore()

  const [drawerOpen, setDrawerOpen]     = useState(false)
  const [editTarget, setEditTarget]     = useState<Habit | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Habit | null>(null)
  const [filter, setFilter]             = useState<string>('All')

  useEffect(() => { if (!user) loadAll(DEMO_USER_ID) }, [])

  // Category counts for filter chips
  const categories = ['All', ...CATEGORIES.map(c => c.label)]
  const filtered = filter === 'All'
    ? habits
    : habits.filter(h => h.category === filter)

  // Log count per habit
  const logCountFor = (id: number) =>
    logs.filter(l => l.habitId === id).length

  // ── Open add drawer ─────────────────────────────────────────
  const openAdd = () => {
    setEditTarget(null)
    setDrawerOpen(true)
  }

  // ── Open edit drawer ────────────────────────────────────────
  const openEdit = (h: Habit) => {
    setEditTarget(h)
    setDrawerOpen(true)
  }

  // ── Save (add or edit) ──────────────────────────────────────
  const handleSave = async (form: FormState) => {
    if (!user) return
    if (editTarget) {
      await editHabit(editTarget.id, {
        name:              form.name.trim(),
        description:       form.description.trim() || null,
        category:          form.category,
        color:             form.color,
        icon:              form.icon,
        frequency:         form.frequency,
        targetDaysPerWeek: form.targetDaysPerWeek,
        reminderTime:      form.reminderTime || null,
      })
    } else {
      await addHabit({
        userId:            user.id,
        name:              form.name.trim(),
        description:       form.description.trim() || null,
        category:          form.category,
        color:             form.color,
        icon:              form.icon,
        frequency:         form.frequency,
        targetDaysPerWeek: form.targetDaysPerWeek,
        reminderTime:      form.reminderTime || null,
      })
    }
    setDrawerOpen(false)
    setEditTarget(null)
  }

  // ── Delete ──────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!deleteTarget) return
    await removeHabit(deleteTarget.id)
    setDeleteTarget(null)
  }

  // ── Loading ─────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', flexDirection: 'column', gap: 16 }}>
        <div style={{ width: 40, height: 40, border: '3px solid var(--hairline)', borderTop: '3px solid var(--coral)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <p style={{ color: 'var(--muted)', fontSize: 14 }}>Loading habits…</p>
      </div>
    )
  }

  // ── Render ──────────────────────────────────────────────────
  return (
    <>
      <div style={{
        display:       'flex',
        flexDirection: 'column',
        gap:           24,
        animation:     'fadeIn 220ms ease forwards',
      }}>

        {/* ── Page header ── */}
        <div style={{
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'space-between',
          gap:            16,
        }}>
          <div>
            <h1 style={{ margin: 0, color: 'var(--ink)' }}>My Habits</h1>
            <p style={{ margin: '6px 0 0', color: 'var(--muted)', fontSize: 14 }}>
              {habits.length === 0
                ? 'Start building your first habit'
                : `${habits.length} habit${habits.length !== 1 ? 's' : ''} · ${habits.filter(h => isCompletedToday(h.id)).length} done today`}
            </p>
          </div>

          {/* Add button — coral primary (Design.md button-primary) */}
          <button
            onClick={openAdd}
            style={{
              display:      'flex',
              alignItems:   'center',
              gap:          8,
              padding:      '0 20px',
              height:       44,
              borderRadius: 'var(--radius-md)',
              border:       'none',
              background:   'var(--coral)',
              color:        'var(--on-primary)',
              fontFamily:   'var(--font-body)',
              fontSize:     14,
              fontWeight:   600,
              cursor:       'pointer',
              boxShadow:    '0 2px 8px rgba(204,120,92,0.30)',
              transition:   'all var(--transition-fast)',
              flexShrink:   0,
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--coral-active)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'var(--coral)')}
          >
            <Plus size={16} />
            Add habit
          </button>
        </div>

        {/* ── Category filter row ── */}
        {habits.length > 0 && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {categories.map(cat => {
              const catData = CATEGORIES.find(c => c.label === cat)
              const isActive = filter === cat
              return (
                <button
                  key={cat}
                  onClick={() => setFilter(cat)}
                  style={{
                    padding:      '6px 14px',
                    borderRadius: 'var(--radius-full)',
                    border:       `1px solid ${isActive
                      ? (catData?.color ?? 'var(--coral)')
                      : 'var(--hairline)'}`,
                    background:   isActive
                      ? `${catData?.color ?? 'var(--coral)'}15`
                      : 'var(--canvas)',
                    color:        isActive
                      ? (catData?.color ?? 'var(--coral)')
                      : 'var(--muted)',
                    fontSize:     13,
                    fontWeight:   isActive ? 600 : 400,
                    cursor:       'pointer',
                    transition:   'all var(--transition-fast)',
                  }}
                >
                  {cat}
                  {cat !== 'All' && (
                    <span style={{
                      marginLeft: 5,
                      fontSize: 11,
                      opacity: 0.7,
                    }}>
                      {habits.filter(h => h.category === cat).length}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        )}

        {/* ── Empty state ── */}
        {habits.length === 0 && (
          <div style={{
            background:    'var(--canvas)',
            border:        '1px dashed var(--hairline)',
            borderRadius:  'var(--radius-xl)',
            padding:       '64px 32px',
            textAlign:     'center',
            boxShadow:     'var(--shadow-sm)',
          }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🌱</div>
            <h2 style={{ margin: '0 0 8px', color: 'var(--ink)', fontSize: '1.2rem' }}>
              No habits yet
            </h2>
            <p style={{ margin: '0 0 24px', color: 'var(--muted)', fontSize: 14 }}>
              Every great journey starts with a single habit. Add yours now.
            </p>
            <button
              onClick={openAdd}
              className="btn-primary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
            >
              <Plus size={15} />
              Add your first habit
            </button>
          </div>
        )}

        {/* ── Habit grid ── */}
        {filtered.length > 0 && (
          <div style={{
            display:             'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap:                 16,
          }}>
            {filtered.map(habit => (
              <HabitCard
                key={habit.id}
                habit={habit}
                completedToday={isCompletedToday(habit.id)}
                totalLogs={logCountFor(habit.id)}
                onEdit={openEdit}
                onDelete={setDeleteTarget}
              />
            ))}
          </div>
        )}

        {/* No results for filter */}
        {filtered.length === 0 && habits.length > 0 && (
          <div style={{
            textAlign: 'center', padding: '48px',
            color: 'var(--muted)', fontSize: 14,
          }}>
            No habits in "{filter}" yet.
          </div>
        )}
      </div>

      {/* ── Drawer ── */}
      <HabitDrawer
        open={drawerOpen}
        editTarget={editTarget}
        onClose={() => { setDrawerOpen(false); setEditTarget(null) }}
        onSave={handleSave}
      />

      {/* ── Delete modal ── */}
      <DeleteModal
        habit={deleteTarget}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </>
  )
}
