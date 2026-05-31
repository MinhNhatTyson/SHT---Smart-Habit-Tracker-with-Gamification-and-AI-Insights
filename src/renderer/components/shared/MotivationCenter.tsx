// src/renderer/components/shared/MotivationCenter.tsx
// Shows stacked motivation banners when the app opens.
// Each card is dismissible. They re-appear on next open unless condition resolves.
//
// Design: warm cream canvas system (Design.md), coral + category accent colors,
// slides in from top-right, stacks vertically with subtle offset.

import { useEffect, useState, useRef } from 'react'
import { X, ChevronRight, Flame, Target, Clock, Zap, Trophy, AlertTriangle } from 'lucide-react'
import { useStore } from '../../store/useStore'
import { evaluateMotivation, MotivationMessage } from '../../lib/motivationEngine'
import { useNavigate } from 'react-router-dom'

const DEMO_USER_ID = 1

// ── Icon map per kind ─────────────────────────────────────────
function KindIcon({ kind, size = 16 }: { kind: string; size?: number }) {
  switch (kind) {
    case 'inactivity':    return <Clock     size={size} />
    case 'streak_all':    return <Flame     size={size} />
    case 'streak_single': return <Zap       size={size} />
    case 'struggling':    return <AlertTriangle size={size} />
    case 'goal_habit':    return <Target    size={size} />
    case 'goal_deadline': return <Clock     size={size} />
    default:              return <Trophy    size={size} />
  }
}

// ── Label per kind ────────────────────────────────────────────
function kindLabel(kind: string): string {
  switch (kind) {
    case 'inactivity':    return 'Inactivity Reminder'
    case 'streak_all':    return 'Motivation'
    case 'streak_single': return 'Habit Streak'
    case 'struggling':    return 'Habit Reminder'
    case 'goal_habit':    return 'Goal Progress'
    case 'goal_deadline': return 'Goal Deadline'
    default:              return 'Reminder'
  }
}

// ── CTA destination per kind ──────────────────────────────────
function kindCTA(kind: string): { label: string; path: string } | null {
  switch (kind) {
    case 'inactivity':    return { label: 'Log a habit', path: '/dashboard' }
    case 'streak_all':    return { label: 'View rewards', path: '/gamification' }
    case 'streak_single': return { label: 'View rewards', path: '/gamification' }
    case 'struggling':    return { label: 'Open habits', path: '/habits' }
    case 'goal_habit':    return { label: 'View goals', path: '/goals' }
    case 'goal_deadline': return { label: 'View goals', path: '/goals' }
    default:              return null
  }
}

// ── Single card ───────────────────────────────────────────────
function MotivationCard({
  message,
  index,
  total,
  onDismiss,
  visible,
}: {
  message:   MotivationMessage
  index:     number
  total:     number
  onDismiss: (id: string) => void
  visible:   boolean
}) {
  const navigate   = useNavigate()
  const [exiting, setExiting] = useState(false)
  const cta        = kindCTA(message.kind)

  const handleDismiss = () => {
    setExiting(true)
    setTimeout(() => onDismiss(message.id), 320)
  }

  const handleCTA = () => {
    handleDismiss()
    if (cta) navigate(cta.path)
  }

  // Offset each card so they stack visually
  const stackOffset = index * 6

  return (
    <div
      style={{
        position:       'relative',
        background:     'var(--canvas)',
        border:         `1px solid ${message.color}40`,
        borderRadius:   'var(--radius-xl)',
        boxShadow:      `0 8px 32px rgba(20,20,19,0.12), 0 0 0 1px ${message.color}18`,
        overflow:       'hidden',
        transform:      visible && !exiting
          ? `translateY(${stackOffset}px) scale(${1 - index * 0.015})`
          : 'translateY(-120%) scale(0.95)',
        opacity:        visible && !exiting ? 1 - index * 0.08 : 0,
        transition:     `transform 380ms cubic-bezier(0.34, 1.56, 0.64, 1) ${index * 40}ms, opacity 300ms ease ${index * 40}ms`,
        pointerEvents:  index === 0 ? 'auto' : 'none', // only top card interactive
        marginBottom:   index < total - 1 ? -62 : 0,  // overlap cards below
        zIndex:         total - index,
        minWidth:       340,
        maxWidth:       400,
      }}
    >
      {/* Accent top bar */}
      <div style={{
        position:   'absolute',
        top: 0, left: 0, right: 0,
        height:     3,
        background: `linear-gradient(90deg, ${message.color}, ${message.color}60, transparent)`,
      }} />

      <div style={{ padding: '18px 20px 16px' }}>
        {/* Header row */}
        <div style={{
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'space-between',
          marginBottom:   12,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <div style={{
              width:          28, height: 28,
              borderRadius:   'var(--radius-md)',
              background:     `${message.color}18`,
              border:         `1px solid ${message.color}30`,
              display:        'flex',
              alignItems:     'center',
              justifyContent: 'center',
              color:          message.color,
            }}>
              <KindIcon kind={message.kind} size={13} />
            </div>
            <span style={{
              fontSize:      10,
              fontWeight:    700,
              color:         message.color,
              textTransform: 'uppercase',
              letterSpacing: '0.10em',
            }}>
              {kindLabel(message.kind)}
            </span>
          </div>

          <button
            onClick={handleDismiss}
            style={{
              width:          24, height: 24,
              borderRadius:   'var(--radius-sm)',
              border:         '1px solid var(--hairline)',
              background:     'transparent',
              color:          'var(--muted-soft)',
              display:        'flex',
              alignItems:     'center',
              justifyContent: 'center',
              cursor:         'pointer',
              transition:     'all var(--transition-fast)',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background    = 'var(--surface-card)'
              e.currentTarget.style.color         = 'var(--ink)'
              e.currentTarget.style.borderColor   = 'var(--hairline-soft)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background    = 'transparent'
              e.currentTarget.style.color         = 'var(--muted-soft)'
              e.currentTarget.style.borderColor   = 'var(--hairline)'
            }}
          >
            <X size={12} />
          </button>
        </div>

        {/* Icon + content */}
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          <div style={{
            width:          44, height: 44,
            borderRadius:   'var(--radius-lg)',
            background:     `${message.color}14`,
            border:         `1px solid ${message.color}25`,
            display:        'flex',
            alignItems:     'center',
            justifyContent: 'center',
            fontSize:       22,
            flexShrink:     0,
          }}>
            {message.icon}
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontFamily:    'var(--font-display)',
              fontWeight:    700,
              fontSize:      14,
              color:         'var(--ink)',
              letterSpacing: '-0.01em',
              lineHeight:    1.3,
              marginBottom:  5,
            }}>
              {message.title}
            </div>
            <div style={{
              fontSize:   12,
              color:      'var(--muted)',
              lineHeight: 1.55,
            }}>
              {message.body}
            </div>
          </div>
        </div>

        {/* CTA */}
        {cta && (
          <button
            onClick={handleCTA}
            style={{
              display:        'flex',
              alignItems:     'center',
              justifyContent: 'space-between',
              width:          '100%',
              marginTop:      14,
              padding:        '8px 12px',
              borderRadius:   'var(--radius-md)',
              border:         `1px solid ${message.color}30`,
              background:     `${message.color}10`,
              color:          message.color,
              fontFamily:     'var(--font-body)',
              fontSize:       12,
              fontWeight:     600,
              cursor:         'pointer',
              transition:     'all var(--transition-fast)',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background  = `${message.color}20`
              e.currentTarget.style.borderColor = `${message.color}50`
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background  = `${message.color}10`
              e.currentTarget.style.borderColor = `${message.color}30`
            }}
          >
            {cta.label}
            <ChevronRight size={13} />
          </button>
        )}
      </div>
    </div>
  )
}

// ── Collapsed indicator (when user stacks up) ─────────────────
function StackIndicator({
  count,
  topColor,
  onClick,
}: {
  count:    number
  topColor: string
  onClick:  () => void
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display:        'flex',
        alignItems:     'center',
        gap:            8,
        padding:        '7px 14px',
        borderRadius:   'var(--radius-full)',
        border:         `1px solid ${topColor}40`,
        background:     'var(--canvas)',
        color:          topColor,
        fontSize:       12,
        fontWeight:     700,
        cursor:         'pointer',
        boxShadow:      'var(--shadow-sm)',
        transition:     'all var(--transition-fast)',
        letterSpacing:  '0.02em',
      }}
      onMouseEnter={e => { e.currentTarget.style.background = `${topColor}12` }}
      onMouseLeave={e => { e.currentTarget.style.background = 'var(--canvas)' }}
    >
      <span style={{
        width:          18, height: 18,
        borderRadius:   '50%',
        background:     topColor,
        color:          '#fff',
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'center',
        fontSize:       10,
        fontWeight:     800,
      }}>
        {count}
      </span>
      notification{count !== 1 ? 's' : ''}
      <span style={{ fontSize: 10, opacity: 0.7 }}>· click to expand</span>
    </button>
  )
}

// ── Main component ─────────────────────────────────────────────
export default function MotivationCenter() {
  const { user, habits, logs, goals } = useStore() as any

  const [messages,   setMessages]   = useState<MotivationMessage[]>([])
  const [dismissed,  setDismissed]  = useState<Set<string>>(new Set())
  const [visible,    setVisible]    = useState(false)
  const [expanded,   setExpanded]   = useState(true)
  const evaluated    = useRef(false)

  // Evaluate once when store has loaded
  useEffect(() => {
    if (!user || !habits || !logs || evaluated.current) return
    evaluated.current = true

    const msgs = evaluateMotivation({
      habits: habits ?? [],
      logs:   logs   ?? [],
      goals:  goals  ?? [],
    })

    if (msgs.length > 0) {
      setMessages(msgs)
      // Slight delay so app shell renders first
      setTimeout(() => setVisible(true), 600)
    }
  }, [user, habits, logs, goals])

  const handleDismiss = (id: string) => {
    setDismissed(prev => new Set([...prev, id]))
  }

  const handleDismissAll = () => {
    setMessages([])
    setVisible(false)
  }

  const active = messages.filter(m => !dismissed.has(m.id))

  // When all dismissed, hide gracefully
  useEffect(() => {
    if (messages.length > 0 && active.length === 0) {
      setTimeout(() => setVisible(false), 350)
    }
  }, [active.length, messages.length])

  if (!visible || active.length === 0) return null

  const STACK_SHOW = 3 // how many cards to show stacked

  return (
    <div
      style={{
        position:      'fixed',
        top:           24,
        right:         24,
        zIndex:        800,
        display:       'flex',
        flexDirection: 'column',
        alignItems:    'flex-end',
        gap:           8,
        pointerEvents: 'none',
      }}
    >
      {/* Top controls row */}
      <div style={{
        display:       'flex',
        alignItems:    'center',
        gap:           8,
        pointerEvents: 'auto',
      }}>
        {/* Collapse/expand toggle when >1 message */}
        {active.length > 1 && expanded && (
          <button
            onClick={() => setExpanded(false)}
            style={{
              padding:        '5px 10px',
              borderRadius:   'var(--radius-full)',
              border:         '1px solid var(--hairline)',
              background:     'var(--canvas)',
              color:          'var(--muted)',
              fontSize:       11,
              fontWeight:     500,
              cursor:         'pointer',
              transition:     'all var(--transition-fast)',
            }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--ink)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--muted)'}
          >
            Collapse
          </button>
        )}
        {/* Dismiss all */}
        {active.length > 1 && expanded && (
          <button
            onClick={handleDismissAll}
            style={{
              padding:        '5px 10px',
              borderRadius:   'var(--radius-full)',
              border:         '1px solid var(--hairline)',
              background:     'var(--canvas)',
              color:          'var(--muted)',
              fontSize:       11,
              fontWeight:     500,
              cursor:         'pointer',
              transition:     'all var(--transition-fast)',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.color       = 'var(--accent-danger)'
              e.currentTarget.style.borderColor = 'rgba(239,68,68,0.30)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.color       = 'var(--muted)'
              e.currentTarget.style.borderColor = 'var(--hairline)'
            }}
          >
            Dismiss all
          </button>
        )}
      </div>

      {/* Collapsed indicator */}
      {!expanded && (
        <div style={{ pointerEvents: 'auto' }}>
          <StackIndicator
            count={active.length}
            topColor={active[0].color}
            onClick={() => setExpanded(true)}
          />
        </div>
      )}

      {/* Expanded card stack */}
      {expanded && (
        <div
          style={{
            position:      'relative',
            display:       'flex',
            flexDirection: 'column',
            alignItems:    'flex-end',
            pointerEvents: 'auto',
            // Height accommodates stacking offset
            paddingBottom: Math.min(active.length - 1, STACK_SHOW - 1) * 6,
          }}
        >
          {active.slice(0, STACK_SHOW).map((msg, idx) => (
            <MotivationCard
              key={msg.id}
              message={msg}
              index={idx}
              total={Math.min(active.length, STACK_SHOW)}
              onDismiss={handleDismiss}
              visible={visible}
            />
          ))}

          {/* Show count if more than STACK_SHOW */}
          {active.length > STACK_SHOW && (
            <div style={{
              marginTop:  8,
              fontSize:   11,
              color:      'var(--muted)',
              fontWeight: 500,
              textAlign:  'right',
              paddingRight: 4,
            }}>
              +{active.length - STACK_SHOW} more notification{active.length - STACK_SHOW !== 1 ? 's' : ''}
            </div>
          )}
        </div>
      )}
    </div>
  )
}