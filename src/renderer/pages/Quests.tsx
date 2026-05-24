// src/renderer/pages/Quests.tsx
// HabitQuest — Quests Page
// Accessible only via the Dashboard widget "View All Quests" button.
//
// Layout:
//   • Hero header with tier tabs (Daily / Weekly / Epic)
//   • Quest cards with progress bars, tier badge, countdown timer, claim button
//   • Claimed / expired section at bottom (collapsed by default)
//
// Design.md: cream canvas, coral CTAs, dark navy for epic tier, Syne display

import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Star, Sword, Calendar, Zap,
  CheckCircle2, Clock, Lock, ChevronDown,
} from 'lucide-react'
import { useStore } from '../store/useStore'
import { timeUntil } from '../lib/questEngine'
import { UserQuestRow } from '../store/questStore'

const DEMO_USER_ID = 1

// ── Tier config ───────────────────────────────────────────────
const TIERS = [
  { key: 'daily',  label: 'Daily',  icon: <Sword   size={14} />, color: '#ef4444', desc: 'Reset at midnight'        },
  { key: 'weekly', label: 'Weekly', icon: <Calendar size={14} />, color: '#3b82f6', desc: 'Reset every Monday'      },
  { key: 'epic',   label: 'Epic',   icon: <Zap      size={14} />, color: '#e8a55a', desc: 'One-time milestones'      },
] as const
type Tier = typeof TIERS[number]['key']

// ── Single quest card ─────────────────────────────────────────
function QuestCard({
  uq,
  onClaim,
  claiming,
}: {
  uq:       UserQuestRow
  onClaim:  (id: number) => void
  claiming: number | null
}) {
  const [hovered, setHovered] = useState(false)
  const now      = new Date()
  const expired  = uq.expiresAt ? new Date(uq.expiresAt) < now : false
  const isClaiming = claiming === uq.id

  const tierColor = uq.quest.tier === 'daily'  ? '#ef4444'
                  : uq.quest.tier === 'weekly' ? '#3b82f6'
                  : '#e8a55a'

  const pct = uq.quest.target > 0
    ? Math.round((uq.progress / uq.quest.target) * 100)
    : 0

  const statusColor = uq.claimed
    ? 'var(--accent-success)'
    : uq.completed
      ? 'var(--coral)'
      : 'var(--muted)'

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position:     'relative',
        background:   uq.claimed ? 'var(--surface-soft)' : 'var(--canvas)',
        border:       `1px solid ${hovered && !uq.claimed ? tierColor + '60' : 'var(--hairline)'}`,
        borderRadius: 'var(--radius-xl)',
        padding:      '22px 24px',
        opacity:      uq.claimed || expired ? 0.65 : 1,
        transition:   'all var(--transition-fast)',
        boxShadow:    hovered && !uq.claimed ? `0 4px 20px ${tierColor}12` : 'var(--shadow-sm)',
        overflow:     'hidden',
      }}
    >
      {/* Tier accent line */}
      <div style={{
        position:   'absolute',
        top: 0, left: 0, right: 0, height: 3,
        background: `linear-gradient(90deg, ${tierColor}, transparent)`,
        opacity:    uq.claimed ? 0.4 : 1,
      }} />

      {/* Claimed ribbon */}
      {uq.claimed && (
        <div style={{
          position:  'absolute',
          top: 10, right: -18,
          background: 'var(--accent-success)',
          color: '#fff', fontSize: 9, fontWeight: 700,
          padding: '2px 28px',
          transform: 'rotate(35deg)',
          letterSpacing: '0.08em', textTransform: 'uppercase',
        }}>
          Claimed
        </div>
      )}

      {/* Top row: icon + title + timer */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginTop: 4 }}>
        {/* Icon */}
        <div style={{
          width:          52, height: 52,
          borderRadius:   'var(--radius-lg)',
          background:     `${tierColor}14`,
          border:         `1px solid ${tierColor}30`,
          display:        'flex', alignItems: 'center', justifyContent: 'center',
          fontSize:       24, flexShrink: 0,
          transition:     'transform var(--transition-fast)',
          transform:      hovered && !uq.claimed ? 'scale(1.06)' : 'scale(1)',
        }}>
          {uq.quest.icon}
        </div>

        {/* Title + flavour */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 3 }}>
            <span style={{
              fontFamily:    'var(--font-display)',
              fontWeight:    700,
              fontSize:      15,
              color:         uq.claimed ? 'var(--muted)' : 'var(--ink)',
              letterSpacing: '-0.01em',
            }}>
              {uq.quest.title}
            </span>
            {/* Tier pill */}
            <span style={{
              fontSize:      10, fontWeight: 700, textTransform: 'uppercase',
              letterSpacing: '0.08em',
              color:         tierColor,
              background:    `${tierColor}14`,
              border:        `1px solid ${tierColor}30`,
              borderRadius:  'var(--radius-full)',
              padding:       '1px 8px',
              flexShrink:    0,
            }}>
              {uq.quest.tier}
            </span>
          </div>

          <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.5, marginBottom: 6 }}>
            {uq.quest.description}
          </div>

          {/* Flavour text */}
          {uq.quest.flavour && (
            <div style={{
              fontSize: 11, color: 'var(--muted-soft)',
              fontStyle: 'italic', lineHeight: 1.4,
            }}>
              "{uq.quest.flavour}"
            </div>
          )}
        </div>

        {/* Timer or status */}
        <div style={{
          flexShrink: 0,
          display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6,
        }}>
          {/* Star reward */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 4,
            padding: '4px 10px', borderRadius: 'var(--radius-full)',
            background: 'rgba(232,165,90,0.10)',
            border: '1px solid rgba(232,165,90,0.22)',
          }}>
            <Star size={11} color="#e8a55a" fill="#e8a55a" />
            <span style={{ fontSize: 12, fontWeight: 700, color: '#e8a55a' }}>
              {uq.quest.starReward}
            </span>
          </div>

          {/* Countdown */}
          {uq.expiresAt && !uq.claimed && !expired && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 4,
              fontSize: 11, color: 'var(--muted-soft)',
            }}>
              <Clock size={10} />
              {timeUntil(new Date(uq.expiresAt))}
            </div>
          )}
          {expired && !uq.claimed && (
            <div style={{ fontSize: 11, color: 'var(--accent-danger)', fontWeight: 600 }}>
              Expired
            </div>
          )}
          {uq.quest.tier === 'epic' && !uq.claimed && (
            <div style={{ fontSize: 11, color: 'var(--muted-soft)' }}>No expiry</div>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ marginTop: 18 }}>
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          marginBottom: 6,
        }}>
          <span style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600 }}>
            Progress
          </span>
          <span style={{ fontSize: 11, fontWeight: 700, color: statusColor }}>
            {uq.progress} / {uq.quest.target}
            {uq.completed && !uq.claimed && <span style={{ marginLeft: 6 }}>— Ready to claim!</span>}
          </span>
        </div>
        <div style={{
          height: 8, borderRadius: 'var(--radius-full)',
          background: 'var(--surface-card)',
          border: '1px solid var(--hairline-soft)',
          overflow: 'hidden',
        }}>
          <div style={{
            height:   '100%',
            width:    `${pct}%`,
            borderRadius: 'var(--radius-full)',
            background: uq.claimed
              ? 'var(--accent-success)'
              : uq.completed
                ? 'var(--coral)'
                : `linear-gradient(90deg, ${tierColor}, ${tierColor}aa)`,
            transition: 'width 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)',
            boxShadow:  uq.completed && !uq.claimed ? `0 0 8px ${tierColor}60` : 'none',
          }} />
        </div>
      </div>

      {/* Claim button */}
      {uq.completed && !uq.claimed && !expired && (
        <button
          onClick={() => onClaim(uq.id)}
          disabled={isClaiming}
          style={{
            marginTop:     14,
            width:         '100%',
            height:        42,
            borderRadius:  'var(--radius-md)',
            border:        'none',
            background:    isClaiming ? 'var(--coral-disabled)' : 'var(--coral)',
            color:         'var(--on-primary)',
            fontFamily:    'var(--font-body)',
            fontSize:      14,
            fontWeight:    600,
            cursor:        isClaiming ? 'not-allowed' : 'pointer',
            display:       'flex',
            alignItems:    'center',
            justifyContent:'center',
            gap:           8,
            transition:    'background var(--transition-fast)',
            boxShadow:     '0 2px 8px rgba(204,120,92,0.30)',
          }}
          onMouseEnter={e => { if (!isClaiming) e.currentTarget.style.background = 'var(--coral-active)' }}
          onMouseLeave={e => { if (!isClaiming) e.currentTarget.style.background = 'var(--coral)' }}
        >
          {isClaiming
            ? <div style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.4)', borderTop: '2px solid white', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
            : <Star size={14} fill="white" color="white" />
          }
          {isClaiming ? 'Claiming…' : `Claim ${uq.quest.starReward} Stars`}
        </button>
      )}

      {/* Claimed state */}
      {uq.claimed && (
        <div style={{
          marginTop:    14,
          display:      'flex',
          alignItems:   'center',
          justifyContent:'center',
          gap:          6,
          padding:      '10px',
          borderRadius: 'var(--radius-md)',
          background:   'rgba(93,184,114,0.08)',
          border:       '1px solid rgba(93,184,114,0.22)',
          fontSize:     13, fontWeight: 600, color: 'var(--accent-success)',
        }}>
          <CheckCircle2 size={14} />
          Reward claimed · +{uq.quest.starReward} Stars
        </div>
      )}
    </div>
  )
}

// ── Main Quests Page ───────────────────────────────────────────
export default function Quests() {
  const {
    user, loading, loadAll,
    loadQuests, refreshQuests, evaluateAndSyncQuests,
    claimQuest, getActiveUserQuests, userQuests,
  } = useStore() as any

  const navigate  = useNavigate()
  const [tier, setTier]         = useState<Tier>('daily')
  const [claiming, setClaiming] = useState<number | null>(null)
  const [claimToast, setClaimToast] = useState<{ stars: number } | null>(null)
  const [showClaimed, setShowClaimed] = useState(false)

  useEffect(() => {
    async function init() {
      if (!user) await loadAll(DEMO_USER_ID)
      await loadQuests(DEMO_USER_ID)
      await refreshQuests(DEMO_USER_ID)
      await evaluateAndSyncQuests()
    }
    init()
  }, [])

  // Re-evaluate whenever logs change
  useEffect(() => {
    if (user) evaluateAndSyncQuests()
  }, [user])

  const now     = new Date()
  const allUQs  = (userQuests as UserQuestRow[]) ?? []

  // Active quests for current tier
  const activeTierQuests = useMemo(() => {
    return allUQs
      .filter(uq => {
        if (uq.quest.tier !== tier) return false
        if (uq.claimed) return false
        if (uq.expiresAt && new Date(uq.expiresAt) < now) return false
        return true
      })
      .sort((a, b) => {
        // Completed first, then by sort order
        if (a.completed && !b.completed) return -1
        if (!a.completed && b.completed) return  1
        return (a.quest.sortOrder ?? 0) - (b.quest.sortOrder ?? 0)
      })
  }, [allUQs, tier])

  // Claimed quests for current tier
  const claimedTierQuests = useMemo(() => {
    return allUQs
      .filter(uq => uq.quest.tier === tier && uq.claimed)
      .sort((a, b) => new Date(b.claimedAt ?? 0).getTime() - new Date(a.claimedAt ?? 0).getTime())
  }, [allUQs, tier])

  // Count claimable across all tiers (for hero badge)
  const totalClaimable = useMemo(
    () => allUQs.filter(uq => uq.completed && !uq.claimed && (!uq.expiresAt || new Date(uq.expiresAt) >= now)).length,
    [allUQs]
  )

  const handleClaim = async (userQuestId: number) => {
    setClaiming(userQuestId)
    const result = await claimQuest(userQuestId)
    setClaiming(null)
    if (result.success) {
      setClaimToast({ stars: result.stars })
      setTimeout(() => setClaimToast(null), 3500)
    }
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', flexDirection: 'column', gap: 16 }}>
      <div style={{ width: 40, height: 40, border: '3px solid var(--hairline)', borderTop: '3px solid var(--coral)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <p style={{ color: 'var(--muted)', fontSize: 14 }}>Loading quests…</p>
    </div>
  )

  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24, animation: 'fadeIn 220ms ease forwards' }}>

        {/* ── Back button ── */}
        <button
          onClick={() => navigate('/dashboard')}
          style={{
            alignSelf:     'flex-start',
            display:       'flex',
            alignItems:    'center',
            gap:           6,
            padding:       '7px 14px',
            borderRadius:  'var(--radius-md)',
            border:        '1px solid var(--hairline)',
            background:    'var(--canvas)',
            color:         'var(--muted)',
            fontFamily:    'var(--font-body)',
            fontSize:      13,
            fontWeight:    500,
            cursor:        'pointer',
            transition:    'all var(--transition-fast)',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--coral)'; e.currentTarget.style.color = 'var(--ink)' }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--hairline)'; e.currentTarget.style.color = 'var(--muted)' }}
        >
          <ArrowLeft size={14} /> Back to Dashboard
        </button>

        {/* ── Hero ── */}
        <div style={{
          background:   'var(--surface-dark)',
          border:       '1px solid rgba(255,255,255,0.07)',
          borderRadius: 'var(--radius-xl)',
          padding:      '32px 36px',
          position:     'relative',
          overflow:     'hidden',
        }}>
          <div style={{ position: 'absolute', top: -80, right: -80, width: 280, height: 280, borderRadius: '50%', background: 'radial-gradient(circle, rgba(204,120,92,0.10), transparent 70%)', pointerEvents: 'none' }} />
          <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 24 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <Sword size={20} color="var(--coral)" />
                <h1 style={{ margin: 0, color: 'var(--on-dark)', fontSize: '1.5rem' }}>Quests</h1>
                {totalClaimable > 0 && (
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 5,
                    padding: '3px 10px', borderRadius: 'var(--radius-full)',
                    background: 'var(--coral)', color: 'var(--on-primary)',
                    fontSize: 11, fontWeight: 700,
                    animation: 'pulse-coral 2s ease-in-out infinite',
                  }}>
                    <Star size={10} fill="white" color="white" />
                    {totalClaimable} ready to claim
                  </div>
                )}
              </div>
              <p style={{ margin: 0, color: 'var(--on-dark-soft)', fontSize: 14, maxWidth: 440 }}>
                Complete quests to earn Stars — spend them in the Store on themes, sounds, and more.
              </p>
              <div style={{ display: 'flex', gap: 20, marginTop: 16 }}>
                {TIERS.map(t => {
                  const count = allUQs.filter(uq =>
                    uq.quest.tier === t.key && !uq.claimed &&
                    (!uq.expiresAt || new Date(uq.expiresAt) >= now)
                  ).length
                  return (
                    <div key={t.key} style={{ fontSize: 12, color: 'var(--on-dark-soft)' }}>
                      <span style={{ color: t.color, fontWeight: 700, marginRight: 4 }}>{count}</span>
                      {t.label}
                    </div>
                  )
                })}
              </div>
            </div>
            {/* Stars balance */}
            <div style={{
              background: 'rgba(232,165,90,0.12)', border: '1px solid rgba(232,165,90,0.25)',
              borderRadius: 'var(--radius-xl)', padding: '18px 24px',
              textAlign: 'center', flexShrink: 0, minWidth: 140,
            }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: 'rgba(232,165,90,0.7)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>Stars</div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
                <Star size={20} color="#e8a55a" fill="#e8a55a" />
                <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.9rem', color: '#e8a55a', letterSpacing: '-0.04em', lineHeight: 1 }}>
                  {user?.stars ?? 0}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Tier tabs ── */}
        <div style={{
          display: 'flex', gap: 4,
          background: 'var(--surface-card)', border: '1px solid var(--hairline)',
          borderRadius: 'var(--radius-lg)', padding: 4,
          alignSelf: 'flex-start',
        }}>
          {TIERS.map(t => {
            const claimable = allUQs.filter(uq =>
              uq.quest.tier === t.key && uq.completed && !uq.claimed &&
              (!uq.expiresAt || new Date(uq.expiresAt) >= now)
            ).length
            const isActive = tier === t.key
            return (
              <button
                key={t.key}
                onClick={() => setTier(t.key)}
                style={{
                  display:       'flex', alignItems: 'center', gap: 7,
                  padding:       '9px 18px',
                  borderRadius:  'var(--radius-md)',
                  border:        'none',
                  background:    isActive ? 'var(--canvas)' : 'transparent',
                  color:         isActive ? t.color : 'var(--muted)',
                  fontFamily:    'var(--font-body)',
                  fontSize:      14,
                  fontWeight:    isActive ? 600 : 400,
                  cursor:        'pointer',
                  transition:    'all var(--transition-fast)',
                  boxShadow:     isActive ? 'var(--shadow-sm)' : 'none',
                  position:      'relative',
                }}
              >
                {t.icon}{t.label}
                {claimable > 0 && (
                  <span style={{
                    position: 'absolute', top: 6, right: 6,
                    width: 8, height: 8, borderRadius: '50%',
                    background: 'var(--coral)',
                    border: '1px solid var(--canvas)',
                  }} />
                )}
              </button>
            )
          })}
        </div>

        {/* ── Tier description ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--muted)' }}>
          <Clock size={13} />
          {TIERS.find(t => t.key === tier)?.desc}
          {tier !== 'epic' && (
            <span style={{ color: 'var(--muted-soft)', fontSize: 11 }}>
              · {activeTierQuests.length} active quest{activeTierQuests.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {/* ── Quest list ── */}
        {activeTierQuests.length === 0 ? (
          <div style={{
            textAlign: 'center', padding: '56px 32px',
            background: 'var(--canvas)', border: '1px dashed var(--hairline)',
            borderRadius: 'var(--radius-xl)',
          }}>
            <div style={{ fontSize: 44, marginBottom: 14 }}>
              {tier === 'daily' ? '⚔️' : tier === 'weekly' ? '📅' : '🌟'}
            </div>
            <h3 style={{ margin: '0 0 8px', color: 'var(--ink)' }}>
              {claimedTierQuests.length > 0 ? 'All quests claimed!' : 'No quests yet'}
            </h3>
            <p style={{ margin: 0, color: 'var(--muted)', fontSize: 14 }}>
              {claimedTierQuests.length > 0
                ? `Check back ${tier === 'daily' ? 'tomorrow' : tier === 'weekly' ? 'next Monday' : 'for future updates'}.`
                : 'Quests are assigned automatically. Try logging some habits first!'}
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {activeTierQuests.map(uq => (
              <QuestCard key={uq.id} uq={uq} onClaim={handleClaim} claiming={claiming} />
            ))}
          </div>
        )}

        {/* ── Claimed section (collapsible) ── */}
        {claimedTierQuests.length > 0 && (
          <div>
            <button
              onClick={() => setShowClaimed(v => !v)}
              style={{
                display: 'flex', alignItems: 'center', gap: 7,
                padding: '8px 16px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--hairline)',
                background: 'var(--canvas)',
                color: 'var(--muted)',
                fontFamily: 'var(--font-body)',
                fontSize: 13, fontWeight: 500,
                cursor: 'pointer',
                marginBottom: showClaimed ? 14 : 0,
              }}
            >
              <Lock size={13} />
              {claimedTierQuests.length} claimed quest{claimedTierQuests.length !== 1 ? 's' : ''}
              <ChevronDown size={13} style={{ transform: showClaimed ? 'rotate(180deg)' : 'none', transition: 'transform var(--transition-normal)' }} />
            </button>

            {showClaimed && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {claimedTierQuests.map(uq => (
                  <QuestCard key={uq.id} uq={uq} onClaim={handleClaim} claiming={claiming} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Claim toast ── */}
      {claimToast && (
        <div style={{
          position: 'fixed', bottom: 40, left: '50%', transform: 'translateX(-50%)',
          zIndex: 999, padding: '12px 24px', borderRadius: 'var(--radius-full)',
          background: 'var(--accent-success)', color: '#fff',
          fontWeight: 600, fontSize: 15, boxShadow: 'var(--shadow-lg)',
          display: 'flex', alignItems: 'center', gap: 8,
          animation: 'fadeInUp 250ms ease forwards',
          whiteSpace: 'nowrap',
        }}>
          <Star size={15} fill="white" color="white" />
          +{claimToast.stars} Stars claimed!
        </div>
      )}
    </>
  )
}