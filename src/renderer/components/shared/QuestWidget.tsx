// src/renderer/components/shared/QuestWidget.tsx
// Compact quest strip shown on the Dashboard.
// Shows top 3 active quests (prioritising claimable ones).
// "View All Quests" navigates to /quests.
//
// Design.md: cream canvas card, coral accent, dark navy for completed state

import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Sword, Star, ChevronRight, Clock } from 'lucide-react'
import { useStore } from '../../store/useStore'
import { timeUntil } from '../../lib/questEngine'
import { UserQuestRow } from '../../store/questStore'

const TIER_COLOR: Record<string, string> = {
  daily:  '#ef4444',
  weekly: '#3b82f6',
  epic:   '#e8a55a',
}

export default function QuestWidget() {
  const navigate    = useNavigate()
  const { userQuests } = useStore() as any
  const allUQs = (userQuests ?? []) as UserQuestRow[]
  const now    = new Date()

  // Top quests to show: completed (unclaimed) first, then in-progress
  const featured = useMemo(() => {
    const active = allUQs.filter(uq => {
      if (uq.claimed) return false
      if (uq.expiresAt && new Date(uq.expiresAt) < now) return false
      return true
    })
    const claimable   = active.filter(uq => uq.completed)
    const inProgress  = active.filter(uq => !uq.completed)
    // Show up to 3: all claimable first, then fill with in-progress
    return [...claimable, ...inProgress].slice(0, 3)
  }, [allUQs])

  const claimableCount = useMemo(
    () => allUQs.filter(uq => uq.completed && !uq.claimed && (!uq.expiresAt || new Date(uq.expiresAt) >= now)).length,
    [allUQs]
  )

  if (allUQs.length === 0) return null

  return (
    <div style={{
      background:   'var(--canvas)',
      border:       '1px solid var(--hairline)',
      borderRadius: 'var(--radius-xl)',
      overflow:     'hidden',
      boxShadow:    'var(--shadow-sm)',
    }}>
      {/* Header */}
      <div style={{
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'space-between',
        padding:        '18px 22px 14px',
        borderBottom:   '1px solid var(--hairline-soft)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Sword size={15} color="var(--coral)" />
          <span style={{
            fontFamily:    'var(--font-display)',
            fontWeight:    700,
            fontSize:      '0.95rem',
            color:         'var(--ink)',
            letterSpacing: '-0.01em',
          }}>
            Active Quests
          </span>
          {claimableCount > 0 && (
            <div style={{
              display:     'flex', alignItems: 'center', gap: 4,
              padding:     '2px 8px', borderRadius: 'var(--radius-full)',
              background:  'var(--coral)', color: 'var(--on-primary)',
              fontSize:    10, fontWeight: 700,
            }}>
              <Star size={9} fill="white" color="white" />
              {claimableCount} ready
            </div>
          )}
        </div>
        <button
          onClick={() => navigate('/quests')}
          style={{
            display:     'flex', alignItems: 'center', gap: 4,
            padding:     '5px 12px',
            borderRadius:'var(--radius-full)',
            border:      '1px solid var(--hairline)',
            background:  'var(--canvas)',
            color:       'var(--muted)',
            fontFamily:  'var(--font-body)',
            fontSize:    12, fontWeight: 500,
            cursor:      'pointer',
            transition:  'all var(--transition-fast)',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--coral)'; e.currentTarget.style.color = 'var(--coral)' }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--hairline)'; e.currentTarget.style.color = 'var(--muted)' }}
        >
          View All <ChevronRight size={12} />
        </button>
      </div>

      {/* Quest rows */}
      <div style={{ padding: '8px 0' }}>
        {featured.length === 0 ? (
          <div style={{
            padding: '20px 22px', textAlign: 'center',
            fontSize: 13, color: 'var(--muted)',
          }}>
            All quests claimed for now — well done!
          </div>
        ) : (
          featured.map((uq, idx) => {
            const color = TIER_COLOR[uq.quest.tier] ?? 'var(--coral)'
            const pct   = uq.quest.target > 0
              ? Math.round((uq.progress / uq.quest.target) * 100)
              : 0
            const isLast = idx === featured.length - 1

            return (
              <div
                key={uq.id}
                style={{
                  display:     'flex', alignItems: 'center', gap: 12,
                  padding:     '12px 22px',
                  borderBottom: isLast ? 'none' : '1px solid var(--hairline-soft)',
                  cursor:      'pointer',
                  transition:  'background var(--transition-fast)',
                }}
                onClick={() => navigate('/quests')}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-soft)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                {/* Icon */}
                <div style={{
                  width:          36, height: 36,
                  borderRadius:   'var(--radius-md)',
                  background:     `${color}14`,
                  border:         `1px solid ${color}28`,
                  display:        'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize:       18, flexShrink: 0,
                }}>
                  {uq.quest.icon}
                </div>

                {/* Title + bar */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    display: 'flex', alignItems: 'center',
                    justifyContent: 'space-between', marginBottom: 5,
                  }}>
                    <span style={{
                      fontSize: 13, fontWeight: 600,
                      color: 'var(--ink)',
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                      maxWidth: '55%',
                    }}>
                      {uq.quest.title}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                      {uq.completed ? (
                        <span style={{
                          fontSize: 10, fontWeight: 700, color: 'var(--on-primary)',
                          background: 'var(--coral)', borderRadius: 'var(--radius-full)',
                          padding: '1px 8px',
                        }}>
                          Claim!
                        </span>
                      ) : (
                        <span style={{ fontSize: 11, color: 'var(--muted-soft)' }}>
                          {uq.progress}/{uq.quest.target}
                        </span>
                      )}
                      {uq.expiresAt && !uq.completed && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 10, color: 'var(--muted-soft)' }}>
                          <Clock size={9} />
                          {timeUntil(new Date(uq.expiresAt))}
                        </div>
                      )}
                    </div>
                  </div>
                  {/* Progress bar */}
                  <div style={{
                    height: 4, borderRadius: 'var(--radius-full)',
                    background: 'var(--surface-card)',
                    overflow: 'hidden',
                  }}>
                    <div style={{
                      height:   '100%',
                      width:    `${pct}%`,
                      borderRadius: 'var(--radius-full)',
                      background: uq.completed
                        ? 'var(--coral)'
                        : `linear-gradient(90deg, ${color}, ${color}bb)`,
                      transition: 'width 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)',
                    }} />
                  </div>
                </div>

                {/* Star reward */}
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 3,
                  flexShrink: 0, fontSize: 11, fontWeight: 700, color: '#e8a55a',
                }}>
                  <Star size={10} color="#e8a55a" fill="#e8a55a" />
                  {uq.quest.starReward}
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Footer: if more quests beyond shown */}
      {allUQs.filter(uq => !uq.claimed && (!uq.expiresAt || new Date(uq.expiresAt) >= now)).length > 3 && (
        <div
          onClick={() => navigate('/quests')}
          style={{
            padding:      '10px 22px',
            borderTop:    '1px solid var(--hairline-soft)',
            fontSize:     12, color: 'var(--muted)',
            cursor:       'pointer',
            textAlign:    'center',
            transition:   'color var(--transition-fast)',
          }}
          onMouseEnter={e => ((e.target as HTMLElement).style.color = 'var(--coral)')}
          onMouseLeave={e => ((e.target as HTMLElement).style.color = 'var(--muted)')}
        >
          +{allUQs.filter(uq => !uq.claimed && (!uq.expiresAt || new Date(uq.expiresAt) >= now)).length - 3} more quests →
        </div>
      )}
    </div>
  )
}