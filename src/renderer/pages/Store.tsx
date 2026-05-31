// src/renderer/pages/Store.tsx
// HabitQuest Store — spend Stars on themes, sounds, avatars, titles, shields, slots, skins.
//
// Layout:
//   • Hero header with Stars balance
//   • Category filter tabs
//   • Scrollable item grid / list
//   • "Purchased Items" section at bottom
//
// Design.md: dark navy hero, cream canvas cards, coral CTAs, Syne display

import { useEffect, useState, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Star, ShoppingBag, Check, Volume2, Palette, Shield, Plus,
         Calendar, User, Sparkles, Play } from 'lucide-react'
import { useStore, StoreItem, UserPurchase } from '../store/useStore'
import { playNotes, SoundNote } from '../lib/soundEngine'

const DEMO_USER_ID = 1

// ── Category config ───────────────────────────────────────────
const CATEGORIES = [
  { key: 'all',           label: 'All Items',      icon: <Sparkles size={13} /> },
  { key: 'theme',         label: 'Themes',         icon: <Palette size={13} />  },
  { key: 'sound',         label: 'Sounds',         icon: <Volume2 size={13} />  },
  { key: 'avatar',        label: 'Avatars',        icon: <User size={13} />     },
  { key: 'title',         label: 'Titles',         icon: <Sparkles size={13} /> },
  { key: 'shield',        label: 'Streak Shield',  icon: <Shield size={13} />   },
  { key: 'slot',          label: 'Habit Slots',    icon: <Plus size={13} />     },
  { key: 'calendar_skin', label: 'Calendar Skins', icon: <Calendar size={13} /> },
]

// ── Toast notification (local) ────────────────────────────────
function PurchaseToast({ message, success, onDone }: { message: string; success: boolean; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 3000)
    return () => clearTimeout(t)
  }, [])
  return (
    <div style={{
      position:     'fixed',
      bottom:       100,
      left:         '50%',
      transform:    'translateX(-50%)',
      zIndex:       999,
      padding:      '12px 24px',
      borderRadius: 'var(--radius-full)',
      background:   success ? 'var(--accent-success)' : 'var(--accent-danger)',
      color:        '#fff',
      fontWeight:   600,
      fontSize:     14,
      boxShadow:    'var(--shadow-lg)',
      animation:    'fadeInUp 250ms ease forwards',
      whiteSpace:   'nowrap',
    }}>
      {success ? '✓' : '✕'} {message}
    </div>
  )
}

// ── Theme preview swatch ──────────────────────────────────────
function ThemePreview({ payload }: { payload: string }) {
  try {
    const vars = (JSON.parse(payload) as { vars?: Record<string,string> }).vars ?? {}
    const canvas  = vars['--canvas']       ?? '#faf9f5'
    const ink     = vars['--ink']          ?? '#141413'
    const coral   = vars['--coral']        ?? '#cc785c'
    const surface = vars['--surface-card'] ?? '#efe9de'
    return (
      <div style={{ display: 'flex', gap: 4, marginTop: 8 }}>
        {[canvas, surface, coral, ink].map((c, i) => (
          <div key={i} style={{ width: 20, height: 20, borderRadius: 4, background: c, border: '1px solid rgba(0,0,0,0.12)' }} />
        ))}
      </div>
    )
  } catch { return null }
}

// ── Sound preview button ──────────────────────────────────────
function SoundPreviewBtn({ payload }: { payload: string }) {
  const [playing, setPlaying] = useState(false)
  const preview = async () => {
    if (playing) return
    try {
      const notes = (JSON.parse(payload) as { notes?: SoundNote[] }).notes
      if (!notes) return
      setPlaying(true)
      await playNotes(notes)
      setTimeout(() => setPlaying(false), 1200)
    } catch { setPlaying(false) }
  }
  return (
    <button
      onClick={e => { e.stopPropagation(); preview() }}
      style={{
        display:      'inline-flex',
        alignItems:   'center',
        gap:          5,
        marginTop:    8,
        padding:      '4px 10px',
        borderRadius: 'var(--radius-full)',
        border:       '1px solid var(--hairline)',
        background:   playing ? 'var(--coral)' : 'var(--canvas)',
        color:        playing ? 'var(--on-primary)' : 'var(--muted)',
        fontSize:     11,
        fontWeight:   500,
        cursor:       'pointer',
        transition:   'all var(--transition-fast)',
      }}
    >
      <Play size={10} />
      {playing ? 'Playing…' : 'Preview'}
    </button>
  )
}

// ── Single store item card ─────────────────────────────────────
function StoreCard({
  item,
  owned,
  canAfford,
  onBuy,
  purchasing,
  purchase,
}: {
  item:       StoreItem
  owned:      boolean
  canAfford:  boolean
  onBuy:      (key: string) => void
  purchasing: string | null
  purchase:   UserPurchase | undefined
}) {
  const [hovered, setHovered] = useState(false)
  const isShield  = item.category === 'shield'
  const isSlot    = item.category === 'slot'
  const isBuying  = purchasing === item.key

  // Slots can always be bought; shields can always be bought if not armed
  const isOwned = isSlot ? false : (isShield ? false : owned)

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background:   isOwned ? 'var(--surface-soft)' : 'var(--canvas)',
        border:       `1px solid ${hovered && !isOwned ? 'var(--coral)' : 'var(--hairline)'}`,
        borderRadius: 'var(--radius-xl)',
        padding:      '20px',
        display:      'flex',
        flexDirection:'column',
        gap:          10,
        transition:   'all var(--transition-fast)',
        boxShadow:    hovered && !isOwned ? 'var(--shadow-md)' : 'var(--shadow-sm)',
        opacity:      isOwned ? 0.75 : 1,
        position:     'relative',
        overflow:     'hidden',
      }}
    >
      {/* Owned ribbon */}
      {isOwned && (
        <div style={{
          position:    'absolute',
          top:         10,
          right:       -20,
          background:  'var(--accent-success)',
          color:       '#fff',
          fontSize:    9,
          fontWeight:  700,
          padding:     '2px 28px',
          transform:   'rotate(35deg)',
          letterSpacing: '0.08em',
          textTransform:'uppercase',
        }}>
          Owned
        </div>
      )}

      {/* Icon + name row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{
          width:          48,
          height:         48,
          borderRadius:   'var(--radius-lg)',
          background:     isOwned ? 'var(--surface-card)' : 'rgba(204,120,92,0.10)',
          border:         `1px solid ${isOwned ? 'var(--hairline)' : 'rgba(204,120,92,0.25)'}`,
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'center',
          fontSize:       24,
          flexShrink:     0,
          transition:     'transform var(--transition-fast)',
          transform:      hovered && !isOwned ? 'scale(1.08)' : 'scale(1)',
        }}>
          {item.icon}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontFamily:    'var(--font-display)',
            fontWeight:    700,
            fontSize:      14,
            color:         'var(--ink)',
            letterSpacing: '-0.01em',
            marginBottom:  2,
          }}>
            {item.name}
          </div>
          <div style={{
            fontSize:      10,
            fontWeight:    700,
            color:         'var(--muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            background:    'var(--surface-card)',
            borderRadius:  'var(--radius-full)',
            padding:       '1px 7px',
            display:       'inline-block',
          }}>
            {item.category.replace('_', ' ')}
          </div>
        </div>
      </div>

      {/* Description */}
      <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.55 }}>
        {item.description}
      </div>

      {/* Category-specific extras */}
      {item.category === 'theme' && <ThemePreview payload={item.payload} />}
      {item.category === 'sound' && <SoundPreviewBtn payload={item.payload} />}
      {item.category === 'avatar' && (() => {
        try {
          const avatars = (JSON.parse(item.payload) as { avatars?: string[] }).avatars ?? []
          return (
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 4 }}>
              {avatars.map((a, i) => (
                <span key={i} style={{ fontSize: 18 }}>{a}</span>
              ))}
            </div>
          )
        } catch { return null }
      })()}

      {/* Slot quantity info */}
      {isSlot && purchase && (
        <div style={{ fontSize: 11, color: 'var(--coral)', fontWeight: 600 }}>
          You've bought {purchase.quantity} extra slot{purchase.quantity !== 1 ? 's' : ''}
        </div>
      )}

      {/* Buy button row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
        {/* Price */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <Star size={13} color="#e8a55a" fill="#e8a55a" />
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 15, color: '#e8a55a' }}>
            {item.starCost}
          </span>
          <span style={{ fontSize: 11, color: 'var(--muted)' }}>Stars</span>
        </div>

        {/* Button */}
        <button
          disabled={isOwned || !canAfford || isBuying}
          onClick={() => !isOwned && onBuy(item.key)}
          style={{
            display:      'flex',
            alignItems:   'center',
            gap:          6,
            padding:      '7px 16px',
            borderRadius: 'var(--radius-md)',
            border:       'none',
            background:   isOwned
              ? 'var(--surface-card)'
              : !canAfford
                ? 'var(--coral-disabled)'
                : isBuying
                  ? 'var(--coral-disabled)'
                  : 'var(--coral)',
            color:        isOwned ? 'var(--muted)' : 'var(--on-primary)',
            fontFamily:   'var(--font-body)',
            fontSize:     13,
            fontWeight:   600,
            cursor:       isOwned || !canAfford || isBuying ? 'not-allowed' : 'pointer',
            transition:   'all var(--transition-fast)',
            minWidth:     80,
            justifyContent: 'center',
          }}
        >
          {isOwned ? (
            <><Check size={12} /> Owned</>
          ) : isBuying ? (
            <div style={{ width: 12, height: 12, border: '2px solid rgba(255,255,255,0.4)', borderTop: '2px solid white', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
          ) : !canAfford ? (
            'Need more ⭐'
          ) : (
            <><ShoppingBag size={12} /> Buy</>
          )}
        </button>
      </div>
    </div>
  )
}

// ── Purchased items section ───────────────────────────────────
function PurchasedSection({ purchases, storeItems }: { purchases: UserPurchase[]; storeItems: StoreItem[] }) {
  if (purchases.length === 0) return null

  return (
    <section>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <div style={{
          width: 32, height: 32, borderRadius: 'var(--radius-md)',
          background: 'rgba(232,165,90,0.15)', border: '1px solid rgba(232,165,90,0.30)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Check size={15} color="#e8a55a" />
        </div>
        <div>
          <h2 style={{ margin: 0, fontSize: '1rem', color: 'var(--ink)' }}>Purchased Items</h2>
          <span style={{ fontSize: 12, color: 'var(--muted)' }}>{purchases.length} item{purchases.length !== 1 ? 's' : ''} in your collection</span>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {purchases.map(p => {
          const item = storeItems.find(s => s.key === p.itemKey)
          if (!item) return null
          const purchasedDate = new Date(p.purchasedAt)
          const dateStr = `${purchasedDate.getDate()} ${purchasedDate.toLocaleString('default', { month: 'short' })} ${purchasedDate.getFullYear()}`

          return (
            <div key={p.id} style={{
              display:      'flex',
              alignItems:   'center',
              gap:          14,
              padding:      '14px 18px',
              borderRadius: 'var(--radius-lg)',
              background:   'var(--canvas)',
              border:       '1px solid var(--hairline)',
              boxShadow:    'var(--shadow-sm)',
            }}>
              <span style={{ fontSize: 22, flexShrink: 0 }}>{item.icon}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>{item.name}</div>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                  {item.category === 'slot'
                    ? `${p.quantity} extra slot${p.quantity !== 1 ? 's' : ''} purchased`
                    : `Purchased ${dateStr}`}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                <Star size={11} color="#e8a55a" fill="#e8a55a" />
                <span style={{ fontSize: 12, fontWeight: 700, color: '#e8a55a' }}>{item.starCost * p.quantity}</span>
              </div>
              <div style={{
                padding:      '3px 10px',
                borderRadius: 'var(--radius-full)',
                background:   'rgba(93,184,114,0.12)',
                border:       '1px solid rgba(93,184,114,0.25)',
                fontSize:     11, fontWeight: 700, color: 'var(--accent-success)',
                flexShrink:   0,
              }}>
                ✓ Owned
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}

// ── Main Store Page ───────────────────────────────────────────
export default function Store() {
  const { user, storeItems, userPurchases, loading, loadAll, purchaseItem, hasPurchased, getPurchase } = useStore()
  useEffect(() => { if (!user) loadAll(DEMO_USER_ID) }, [])

  const [searchParams] = useSearchParams()
  const [activeCategory, setActiveCategory] = useState(() => searchParams.get('category') ?? 'all')
  const [purchasing, setPurchasing]         = useState<string | null>(null)
  const [toast, setToast]                   = useState<{ message: string; success: boolean } | null>(null)

  const filtered = useMemo(() =>
    activeCategory === 'all'
      ? storeItems
      : storeItems.filter(i => i.category === activeCategory),
    [storeItems, activeCategory]
  )

  const handleBuy = async (itemKey: string) => {
    setPurchasing(itemKey)
    const result = await purchaseItem(itemKey)
    setPurchasing(null)
    setToast({ message: result.message, success: result.success })
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', flexDirection: 'column', gap: 16 }}>
      <div style={{ width: 40, height: 40, border: '3px solid var(--hairline)', borderTop: '3px solid var(--coral)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <p style={{ color: 'var(--muted)', fontSize: 14 }}>Loading the store…</p>
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28, animation: 'fadeIn 220ms ease forwards' }}>

      {/* ── Hero ── */}
      <div style={{
        background:   'var(--surface-dark)',
        border:       '1px solid rgba(255,255,255,0.07)',
        borderRadius: 'var(--radius-xl)',
        padding:      '32px 36px',
        position:     'relative',
        overflow:     'hidden',
      }}>
        <div style={{ position: 'absolute', top: -80, right: -80, width: 280, height: 280, borderRadius: '50%', background: 'radial-gradient(circle, rgba(232,165,90,0.08), transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 24 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <ShoppingBag size={20} color="#e8a55a" />
              <h1 style={{ margin: 0, color: 'var(--on-dark)', fontSize: '1.5rem' }}>HabitQuest Store</h1>
            </div>
            <p style={{ margin: 0, color: 'var(--on-dark-soft)', fontSize: 14, maxWidth: 420 }}>
              Spend your Stars on themes, sounds, avatars, and more. Everything here is earned through consistent habits.
            </p>
            <div style={{ display: 'flex', gap: 16, marginTop: 16 }}>
              <div style={{ fontSize: 12, color: 'var(--on-dark-soft)' }}>
                <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.1rem', color: 'var(--on-dark)', marginRight: 4 }}>{storeItems.length}</span>
                items available
              </div>
              <div style={{ width: 1, background: 'rgba(255,255,255,0.1)' }} />
              <div style={{ fontSize: 12, color: 'var(--on-dark-soft)' }}>
                <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.1rem', color: 'var(--on-dark)', marginRight: 4 }}>{userPurchases.length}</span>
                owned
              </div>
            </div>
          </div>

          {/* Stars balance */}
          <div style={{
            background:   'rgba(232,165,90,0.12)',
            border:       '1px solid rgba(232,165,90,0.25)',
            borderRadius: 'var(--radius-xl)',
            padding:      '20px 28px',
            textAlign:    'center',
            flexShrink:   0,
            minWidth:     160,
          }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'rgba(232,165,90,0.7)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>
              Your Balance
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <Star size={24} color="#e8a55a" fill="#e8a55a" />
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '2.2rem', color: '#e8a55a', letterSpacing: '-0.04em', lineHeight: 1 }}>
                {user?.stars ?? 0}
              </span>
            </div>
            <div style={{ fontSize: 11, color: 'rgba(232,165,90,0.6)', marginTop: 6 }}>Stars</div>
          </div>
        </div>
      </div>

      {/* ── Category tabs ── */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {CATEGORIES.map(cat => {
          const isActive = activeCategory === cat.key
          return (
            <button
              key={cat.key}
              onClick={() => setActiveCategory(cat.key)}
              style={{
                display:      'flex',
                alignItems:   'center',
                gap:          5,
                padding:      '7px 14px',
                borderRadius: 'var(--radius-full)',
                border:       `1px solid ${isActive ? 'var(--coral)' : 'var(--hairline)'}`,
                background:   isActive ? 'rgba(204,120,92,0.10)' : 'var(--canvas)',
                color:        isActive ? 'var(--coral)' : 'var(--muted)',
                fontFamily:   'var(--font-body)',
                fontSize:     13,
                fontWeight:   isActive ? 600 : 400,
                cursor:       'pointer',
                transition:   'all var(--transition-fast)',
              }}
            >
              {cat.icon}
              {cat.label}
            </button>
          )
        })}
      </div>

      {/* ── Items grid ── */}
      {filtered.length > 0 ? (
        <div style={{
          display:             'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
          gap:                 16,
        }}>
          {filtered.map(item => (
            <StoreCard
              key={item.key}
              item={item}
              owned={hasPurchased(item.key)}
              canAfford={(user?.stars ?? 0) >= item.starCost}
              onBuy={handleBuy}
              purchasing={purchasing}
              purchase={getPurchase(item.key)}
            />
          ))}
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '48px', color: 'var(--muted)', fontSize: 14 }}>
          No items in this category yet.
        </div>
      )}

      {/* ── Purchased items ── */}
      <PurchasedSection purchases={userPurchases} storeItems={storeItems} />

      {/* ── Toast ── */}
      {toast && <PurchaseToast message={toast.message} success={toast.success} onDone={() => setToast(null)} />}
    </div>
  )
}