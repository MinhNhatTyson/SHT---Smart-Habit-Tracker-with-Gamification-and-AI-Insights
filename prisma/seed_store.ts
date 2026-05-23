// prisma/seed_store.ts
// Seeds all StoreItem rows.
// Run with: npx ts-node prisma/seed_store.ts

import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  console.log('🛒 Seeding HabitQuest Store items...')

  const items = [
    // ── THEMES ────────────────────────────────────────────────
    {
      key:         'theme_dark',
      name:        'Dark Mode',
      description: 'Transform the app into a sleek dark experience. Easy on the eyes during late-night sessions.',
      category:    'theme',
      icon:        '🌙',
      starCost:    50,
      itemType:    'permanent',
      sortOrder:   1,
      payload:     JSON.stringify({
        vars: {
          '--canvas':               '#0f0f1a',
          '--surface-soft':         '#13131f',
          '--surface-card':         '#1a1a2e',
          '--surface-cream-strong': '#22223a',
          '--hairline':             '#2a2a3e',
          '--hairline-soft':        '#242436',
          '--ink':                  '#e8e6f0',
          '--body-strong':          '#d0cde8',
          '--body':                 '#a8a4c0',
          '--muted':                '#6b6880',
          '--muted-soft':           '#4e4b60',
          '--on-dark':              '#e8e6f0',
        },
      }),
    },
    {
      key:         'theme_book',
      name:        'Book Reading Mode',
      description: 'Warm sepia tones inspired by aged paper. Calm, focused, distraction-free.',
      category:    'theme',
      icon:        '📖',
      starCost:    50,
      itemType:    'permanent',
      sortOrder:   2,
      payload:     JSON.stringify({
        vars: {
          '--canvas':               '#f5efe0',
          '--surface-soft':         '#ede4cf',
          '--surface-card':         '#e8ddc4',
          '--surface-cream-strong': '#ddd0b0',
          '--hairline':             '#d4c49a',
          '--hairline-soft':        '#ddd0b8',
          '--ink':                  '#2c1e0f',
          '--body-strong':          '#3d2b14',
          '--body':                 '#5a3e20',
          '--muted':                '#8a6a40',
          '--muted-soft':           '#a88050',
          '--coral':                '#c0602a',
          '--coral-active':         '#9e4a1e',
        },
      }),
    },
    {
      key:         'theme_nostalgia',
      name:        'Nostalgia Mode',
      description: 'Retro terminal vibes. Muted phosphor greens on deep charcoal. Old school cool.',
      category:    'theme',
      icon:        '🕹️',
      starCost:    50,
      itemType:    'permanent',
      sortOrder:   3,
      payload:     JSON.stringify({
        vars: {
          '--canvas':               '#0d1a0d',
          '--surface-soft':         '#111f11',
          '--surface-card':         '#162516',
          '--surface-cream-strong': '#1c2e1c',
          '--hairline':             '#2a3d2a',
          '--hairline-soft':        '#243224',
          '--ink':                  '#a8e6a8',
          '--body-strong':          '#90d490',
          '--body':                 '#6db86d',
          '--muted':                '#4a824a',
          '--muted-soft':           '#366036',
          '--coral':                '#e8a55a',
          '--coral-active':         '#c8853a',
          '--accent-gold':          '#d4b866',
          '--font-display':         '"Courier New", Courier, monospace',
        },
      }),
    },

    // ── HABIT LOG SOUNDS ───────────────────────────────────────
    {
      key:         'sound_habit_chime',
      name:        'Habit Sound: Chime',
      description: 'A soft, pleasant bell chime plays each time you complete a habit.',
      category:    'sound',
      icon:        '🔔',
      starCost:    20,
      itemType:    'permanent',
      sortOrder:   10,
      payload:     JSON.stringify({
        soundType: 'habit',
        soundKey:  'chime',
        // Web Audio params: sequence of [frequency, duration, type]
        notes: [
          { freq: 880,  dur: 0.12, type: 'sine', gain: 0.4 },
          { freq: 1108, dur: 0.12, type: 'sine', gain: 0.35 },
          { freq: 1318, dur: 0.25, type: 'sine', gain: 0.3 },
        ],
      }),
    },
    {
      key:         'sound_habit_levelup',
      name:        'Habit Sound: Level Up',
      description: 'A punchy 8-bit rising arpeggio fires every time you log a habit completion.',
      category:    'sound',
      icon:        '🎮',
      starCost:    20,
      itemType:    'permanent',
      sortOrder:   11,
      payload:     JSON.stringify({
        soundType: 'habit',
        soundKey:  'levelup',
        notes: [
          { freq: 330, dur: 0.08, type: 'square', gain: 0.3 },
          { freq: 415, dur: 0.08, type: 'square', gain: 0.3 },
          { freq: 523, dur: 0.08, type: 'square', gain: 0.3 },
          { freq: 659, dur: 0.18, type: 'square', gain: 0.25 },
        ],
      }),
    },
    {
      key:         'sound_habit_drop',
      name:        'Habit Sound: Soft Drop',
      description: 'A gentle descending tone — subtle and satisfying.',
      category:    'sound',
      icon:        '💧',
      starCost:    20,
      itemType:    'permanent',
      sortOrder:   12,
      payload:     JSON.stringify({
        soundType: 'habit',
        soundKey:  'drop',
        notes: [
          { freq: 600, dur: 0.08, type: 'sine', gain: 0.35 },
          { freq: 480, dur: 0.15, type: 'sine', gain: 0.28 },
        ],
      }),
    },

    // ── BADGE EARNED SOUNDS ────────────────────────────────────
    {
      key:         'sound_badge_fanfare',
      name:        'Badge Sound: Fanfare',
      description: 'A triumphant little fanfare announces every badge you earn.',
      category:    'sound',
      icon:        '🎺',
      starCost:    20,
      itemType:    'permanent',
      sortOrder:   20,
      payload:     JSON.stringify({
        soundType: 'badge',
        soundKey:  'fanfare',
        notes: [
          { freq: 523, dur: 0.10, type: 'triangle', gain: 0.4 },
          { freq: 659, dur: 0.10, type: 'triangle', gain: 0.4 },
          { freq: 784, dur: 0.10, type: 'triangle', gain: 0.4 },
          { freq: 1047,dur: 0.30, type: 'triangle', gain: 0.35 },
        ],
      }),
    },
    {
      key:         'sound_badge_powerup',
      name:        'Badge Sound: Power Up',
      description: 'A retro power-up sweep signals every new badge achievement.',
      category:    'sound',
      icon:        '⚡',
      starCost:    20,
      itemType:    'permanent',
      sortOrder:   21,
      payload:     JSON.stringify({
        soundType: 'badge',
        soundKey:  'powerup',
        notes: [
          { freq: 220, dur: 0.07, type: 'sawtooth', gain: 0.25 },
          { freq: 330, dur: 0.07, type: 'sawtooth', gain: 0.25 },
          { freq: 440, dur: 0.07, type: 'sawtooth', gain: 0.25 },
          { freq: 550, dur: 0.07, type: 'sawtooth', gain: 0.25 },
          { freq: 660, dur: 0.15, type: 'sawtooth', gain: 0.2  },
        ],
      }),
    },
    {
      key:         'sound_badge_sparkle',
      name:        'Badge Sound: Sparkle',
      description: 'A magical twinkling sound when you unlock a new badge.',
      category:    'sound',
      icon:        '✨',
      starCost:    20,
      itemType:    'permanent',
      sortOrder:   22,
      payload:     JSON.stringify({
        soundType: 'badge',
        soundKey:  'sparkle',
        notes: [
          { freq: 1200, dur: 0.06, type: 'sine', gain: 0.3 },
          { freq: 1500, dur: 0.06, type: 'sine', gain: 0.25 },
          { freq: 1800, dur: 0.06, type: 'sine', gain: 0.2 },
          { freq: 2100, dur: 0.12, type: 'sine', gain: 0.15 },
        ],
      }),
    },

    // ── EXTRA AVATARS ──────────────────────────────────────────
    {
      key:         'avatar_pack_warriors',
      name:        'Avatar Pack: Warriors',
      description: 'Unlock 6 warrior-themed avatars: ⚔️ 🛡️ 🏹 🗡️ 🪃 🔱',
      category:    'avatar',
      icon:        '⚔️',
      starCost:    15,
      itemType:    'permanent',
      sortOrder:   30,
      payload:     JSON.stringify({ avatars: ['⚔️', '🛡️', '🏹', '🗡️', '🪃', '🔱'] }),
    },
    {
      key:         'avatar_pack_nature',
      name:        'Avatar Pack: Nature',
      description: 'Unlock 6 nature avatars: 🌿 🌸 🍀 🌊 🔥 ⛰️',
      category:    'avatar',
      icon:        '🌿',
      starCost:    15,
      itemType:    'permanent',
      sortOrder:   31,
      payload:     JSON.stringify({ avatars: ['🌿', '🌸', '🍀', '🌊', '🔥', '⛰️'] }),
    },
    {
      key:         'avatar_pack_cosmic',
      name:        'Avatar Pack: Cosmic',
      description: 'Unlock 6 cosmic avatars: 🌙 ⭐ 🌠 🪐 🌌 ☄️',
      category:    'avatar',
      icon:        '🌙',
      starCost:    15,
      itemType:    'permanent',
      sortOrder:   32,
      payload:     JSON.stringify({ avatars: ['🌙', '⭐', '🌠', '🪐', '🌌', '☄️'] }),
    },
    {
      key:         'avatar_pack_creatures',
      name:        'Avatar Pack: Creatures',
      description: 'Unlock 6 mystical creature avatars: 🐉 🦅 🦁 🐺 🦊 🦋',
      category:    'avatar',
      icon:        '🐉',
      starCost:    15,
      itemType:    'permanent',
      sortOrder:   33,
      payload:     JSON.stringify({ avatars: ['🐉', '🦅', '🦁', '🐺', '🦊', '🦋'] }),
    },

    // ── PROFILE TITLES ─────────────────────────────────────────
    {
      key:         'title_iron_mind',
      name:        'Title: Iron Mind',
      description: 'Display "Iron Mind" beneath your username. Earned by those with unbreakable focus.',
      category:    'title',
      icon:        '🧠',
      starCost:    25,
      itemType:    'permanent',
      sortOrder:   40,
      payload:     JSON.stringify({ title: 'Iron Mind', color: '#8b5cf6' }),
    },
    {
      key:         'title_early_riser',
      name:        'Title: Early Riser',
      description: 'Display "Early Riser" beneath your username. The morning belongs to you.',
      category:    'title',
      icon:        '🌅',
      starCost:    25,
      itemType:    'permanent',
      sortOrder:   41,
      payload:     JSON.stringify({ title: 'Early Riser', color: '#f59e0b' }),
    },
    {
      key:         'title_streak_lord',
      name:        'Title: Streak Lord',
      description: 'Display "Streak Lord" beneath your username. For those who never break the chain.',
      category:    'title',
      icon:        '🔥',
      starCost:    25,
      itemType:    'permanent',
      sortOrder:   42,
      payload:     JSON.stringify({ title: 'Streak Lord', color: '#ef4444' }),
    },
    {
      key:         'title_legend',
      name:        'Title: Legend',
      description: 'Display "Legend" beneath your username. Simply, undeniably, legendary.',
      category:    'title',
      icon:        '👑',
      starCost:    25,
      itemType:    'permanent',
      sortOrder:   43,
      payload:     JSON.stringify({ title: 'Legend', color: '#e8a55a' }),
    },
    {
      key:         'title_veteran',
      name:        'Title: Veteran',
      description: 'Display "Veteran" beneath your username. You\'ve been through it all and kept going.',
      category:    'title',
      icon:        '🏅',
      starCost:    25,
      itemType:    'permanent',
      sortOrder:   44,
      payload:     JSON.stringify({ title: 'Veteran', color: '#3b82f6' }),
    },

    // ── STREAK SHIELD ──────────────────────────────────────────
    {
      key:         'streak_shield',
      name:        'Streak Shield',
      description: 'Arms a protective shield on your streak. If you miss a day, the shield absorbs the hit — your streak survives. One-time use.',
      category:    'shield',
      icon:        '🛡️',
      starCost:    40,
      itemType:    'consumable',
      sortOrder:   50,
      payload:     JSON.stringify({}),
    },

    // ── HABIT SLOT ─────────────────────────────────────────────
    {
      key:         'habit_slot',
      name:        'Habit Slot +1',
      description: 'Unlock one additional habit slot. Default cap is 5 — keep expanding your potential.',
      category:    'slot',
      icon:        '➕',
      starCost:    30,
      itemType:    'stackable',
      sortOrder:   60,
      payload:     JSON.stringify({}),
    },

    // ── CALENDAR SKINS ─────────────────────────────────────────
    {
      key:         'cal_skin_ocean',
      name:        'Calendar Skin: Ocean',
      description: 'Cool ocean blues and teals replace the default heatmap colors.',
      category:    'calendar_skin',
      icon:        '🌊',
      starCost:    30,
      itemType:    'permanent',
      sortOrder:   70,
      payload:     JSON.stringify({
        skinKey: 'ocean',
        colors: {
          low:    'rgba(14,165,233,0.20)',
          mid:    'rgba(14,165,233,0.45)',
          high:   'rgba(14,165,233,0.70)',
          full:   'rgba(14,165,233,0.90)',
        },
      }),
    },
    {
      key:         'cal_skin_forest',
      name:        'Calendar Skin: Forest',
      description: 'Deep forest greens for your completion heatmap. Growth, every day.',
      category:    'calendar_skin',
      icon:        '🌲',
      starCost:    30,
      itemType:    'permanent',
      sortOrder:   71,
      payload:     JSON.stringify({
        skinKey: 'forest',
        colors: {
          low:    'rgba(34,197,94,0.18)',
          mid:    'rgba(34,197,94,0.40)',
          high:   'rgba(34,197,94,0.65)',
          full:   'rgba(34,197,94,0.88)',
        },
      }),
    },
    {
      key:         'cal_skin_sunset',
      name:        'Calendar Skin: Sunset',
      description: 'Warm amber-to-crimson gradients paint your habit history like a sunset.',
      category:    'calendar_skin',
      icon:        '🌇',
      starCost:    30,
      itemType:    'permanent',
      sortOrder:   72,
      payload:     JSON.stringify({
        skinKey: 'sunset',
        colors: {
          low:    'rgba(251,146,60,0.20)',
          mid:    'rgba(239,68,68,0.40)',
          high:   'rgba(220,38,38,0.65)',
          full:   'rgba(185,28,28,0.88)',
        },
      }),
    },
    {
      key:         'cal_skin_mono',
      name:        'Calendar Skin: Monochrome',
      description: 'Clean grayscale heatmap. No color, pure data.',
      category:    'calendar_skin',
      icon:        '⬛',
      starCost:    30,
      itemType:    'permanent',
      sortOrder:   73,
      payload:     JSON.stringify({
        skinKey: 'mono',
        colors: {
          low:    'rgba(100,100,100,0.20)',
          mid:    'rgba(100,100,100,0.45)',
          high:   'rgba(100,100,100,0.70)',
          full:   'rgba(100,100,100,0.90)',
        },
      }),
    },
  ]

  for (const item of items) {
    await prisma.storeItem.upsert({
      where:  { key: item.key },
      update: item,
      create: item,
    })
  }

  console.log(`✅ ${items.length} store items seeded`)
  console.log('🎉 Store seeded successfully!')
}

main()
  .catch((e) => { console.error('❌ Store seed failed:', e); process.exit(1) })
  .finally(async () => { await prisma.$disconnect() })