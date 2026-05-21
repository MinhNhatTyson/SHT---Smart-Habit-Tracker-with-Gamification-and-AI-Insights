// src/renderer/components/shared/BadgeToast.tsx
// Real-time badge earned notification — slides in from bottom-right
// when a badge is awarded. Auto-dismisses after 5 seconds.
// Queues multiple badges and shows them one at a time.
//
// Design.md: dark navy surface, coral accent, Syne display

import { useEffect, useState, useRef } from 'react'
import { useStore, Badge, RARITY_COLOR } from '../../store/useStore'
import { Star, X } from 'lucide-react'

interface ToastItem {
  badge: Badge
  id:    number
}

let toastIdCounter = 0

export default function BadgeToast() {
  const { newlyEarnedBadges, clearNewBadges } = useStore()
  const [queue,   setQueue]   = useState<ToastItem[]>([])
  const [current, setCurrent] = useState<ToastItem | null>(null)
  const [visible, setVisible] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Push newly earned badges into queue
  useEffect(() => {
    if (newlyEarnedBadges.length === 0) return
    const items: ToastItem[] = newlyEarnedBadges.map(b => ({
      badge: b,
      id:    ++toastIdCounter,
    }))
    setQueue(prev => [...prev, ...items])
    clearNewBadges()
  }, [newlyEarnedBadges])

  // Consume queue one at a time
  useEffect(() => {
    if (current || queue.length === 0) return
    const [next, ...rest] = queue
    setQueue(rest)
    setCurrent(next)
    // Slight delay so animation triggers after mount
    requestAnimationFrame(() => setVisible(true))
  }, [queue, current])

  // Auto-dismiss after 5 s
  useEffect(() => {
    if (!current) return
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(dismiss, 5000)
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [current])

  const dismiss = () => {
    setVisible(false)
    setTimeout(() => setCurrent(null), 400) // wait for slide-out
  }

  if (!current) return null

  const { badge } = current
  const rarityColor = RARITY_COLOR[badge.rarity] ?? '#6b7280'

  return (
    <div
      style={{
        position:   'fixed',
        bottom:     32,
        right:      32,
        zIndex:     999,
        width:      340,
        background: 'var(--surface-dark)',
        border:     `1px solid ${rarityColor}50`,
        borderRadius: 'var(--radius-xl)',
        boxShadow:  `0 8px 40px rgba(20,20,19,0.40), 0 0 0 1px ${rarityColor}20`,
        overflow:   'hidden',
        transform:  visible ? 'translateY(0) scale(1)' : 'translateY(80px) scale(0.95)',
        opacity:    visible ? 1 : 0,
        transition: 'transform 380ms cubic-bezier(0.34, 1.56, 0.64, 1), opacity 300ms ease',
        pointerEvents: visible ? 'auto' : 'none',
      }}
    >
      {/* Rarity shimmer bar at top */}
      <div style={{
        height:     3,
        background: `linear-gradient(90deg, transparent, ${rarityColor}, transparent)`,
        backgroundSize: '200% 100%',
        animation:  'shimmer 2s linear infinite',
      }} />

      <div style={{ padding: '18px 20px' }}>
        {/* Header row */}
        <div style={{
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'space-between',
          marginBottom:   14,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: rarityColor, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              {badge.rarity} badge unlocked
            </span>
          </div>
          <button
            onClick={dismiss}
            style={{
              width: 24, height: 24, borderRadius: 'var(--radius-md)',
              border: '1px solid rgba(255,255,255,0.10)',
              background: 'transparent', color: 'var(--on-dark-soft)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <X size={12} />
          </button>
        </div>

        {/* Badge info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          {/* Icon with glow */}
          <div style={{
            width:          64,
            height:         64,
            borderRadius:   'var(--radius-lg)',
            background:     `${rarityColor}18`,
            border:         `2px solid ${rarityColor}40`,
            display:        'flex',
            alignItems:     'center',
            justifyContent: 'center',
            fontSize:       32,
            flexShrink:     0,
            boxShadow:      `0 0 20px ${rarityColor}30`,
            animation:      'animate-float 3s ease-in-out infinite',
          }}>
            {badge.icon}
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontFamily:    'var(--font-display)',
              fontWeight:    800,
              fontSize:      '1rem',
              color:         'var(--on-dark)',
              letterSpacing: '-0.02em',
              marginBottom:  4,
            }}>
              {badge.name}
            </div>
            <div style={{
              fontSize:   12,
              color:      'var(--on-dark-soft)',
              lineHeight: 1.5,
              display:    '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow:   'hidden',
            }}>
              {badge.description}
            </div>

            {/* Stars reward */}
            <div style={{
              display:      'inline-flex',
              alignItems:   'center',
              gap:          4,
              marginTop:    8,
              padding:      '3px 10px',
              borderRadius: 'var(--radius-full)',
              background:   'rgba(232,165,90,0.15)',
              border:       '1px solid rgba(232,165,90,0.30)',
            }}>
              <Star size={11} color="#e8a55a" fill="#e8a55a" />
              <span style={{ fontSize: 12, fontWeight: 700, color: '#e8a55a' }}>
                +{badge.starReward} Stars
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Auto-dismiss progress bar */}
      <div style={{
        height:     2,
        background: `${rarityColor}20`,
      }}>
        <div style={{
          height:     '100%',
          background: rarityColor,
          animation:  'badgeTimer 5s linear forwards',
          transformOrigin: 'left',
        }} />
      </div>

      <style>{`
        @keyframes badgeTimer {
          from { width: 100%; }
          to   { width: 0%; }
        }
      `}</style>
    </div>
  )
}