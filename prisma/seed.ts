// prisma/seed.ts
// Run with: npx ts-node prisma/seed.ts
// Seeds redesigned badges (with starReward + category) and a demo user

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding HabitQuest database...')

  // ── Redesigned Badges ────────────────────────────────────────
  // condition key format:
  //   "none"              → awarded immediately (special/welcome)
  //   "streak_N"          → currentStreak >= N
  //   "logs_N"            → total habit log count >= N
  //   "habits_N"          → active habit count >= N
  //   "perfect_day"       → all habits completed in one day
  //   "perfect_week"      → perfect_day achieved 7 days in a row
  //   "level_N"           → user level >= N
  //   "first_habit"       → first habit created
  //   "early_bird"        → any habit logged before 08:00
  //   "night_owl"         → any habit logged after 22:00
  //   "comeback_kid"      → completed a habit after a 7+ day gap
  //   "variety_N"         → completed habits in N different categories

  const badges = [
    // ── SPECIAL / WELCOME ──────────────────────────────────────
    {
      name:        'Welcome, Hero',
      description: 'You took the first step. Every legend starts somewhere — yours starts here.',
      icon:        '🌟',
      rarity:      'common',
      starReward:  5,
      condition:   'none',
      category:    'special',
    },
    {
      name:        'Quest Begins',
      description: 'Created your very first habit. The journey of a thousand miles begins with a single step.',
      icon:        '🗺️',
      rarity:      'common',
      starReward:  5,
      condition:   'first_habit',
      category:    'special',
    },
    {
      name:        'First Blood',
      description: 'Completed a habit for the very first time. The hardest part is always starting.',
      icon:        '⚔️',
      rarity:      'common',
      starReward:  5,
      condition:   'logs_1',
      category:    'special',
    },

    // ── STREAK BADGES ──────────────────────────────────────────
    {
      name:        'Spark Keeper',
      description: 'Maintained a 3-day streak. A small flame, but it burns bright.',
      icon:        '🔥',
      rarity:      'common',
      starReward:  5,
      condition:   'streak_3',
      category:    'streak',
    },
    {
      name:        'Week Warrior',
      description: 'Seven days without breaking. You\'ve built the foundation of a real habit.',
      icon:        '🛡️',
      rarity:      'common',
      starReward:  10,
      condition:   'streak_7',
      category:    'streak',
    },
    {
      name:        'Fortnight Fighter',
      description: 'Two full weeks of consistency. Most people quit before this point — not you.',
      icon:        '⚡',
      rarity:      'rare',
      starReward:  15,
      condition:   'streak_14',
      category:    'streak',
    },
    {
      name:        'Iron Will',
      description: 'A full month of daily commitment. Your discipline is becoming your identity.',
      icon:        '🏰',
      rarity:      'rare',
      starReward:  20,
      condition:   'streak_30',
      category:    'streak',
    },
    {
      name:        'Unbreakable',
      description: '100 days straight. You\'ve crossed the threshold from habit to lifestyle.',
      icon:        '💎',
      rarity:      'epic',
      starReward:  40,
      condition:   'streak_100',
      category:    'streak',
    },
    {
      name:        'Eternal Flame',
      description: '365 days. A full year of showing up. You are the rarest kind of person.',
      icon:        '🌞',
      rarity:      'legendary',
      starReward:  100,
      condition:   'streak_365',
      category:    'streak',
    },

    // ── VOLUME BADGES ───────────────────────────────────────────
    {
      name:        'First Steps',
      description: 'Logged 10 habit completions. You\'re past the first hill — keep climbing.',
      icon:        '👣',
      rarity:      'common',
      starReward:  5,
      condition:   'logs_10',
      category:    'volume',
    },
    {
      name:        'Momentum Builder',
      description: 'Logged 25 habit completions. Momentum is a force — you\'ve got it now.',
      icon:        '🎯',
      rarity:      'common',
      starReward:  8,
      condition:   'logs_25',
      category:    'volume',
    },
    {
      name:        'The Centurion',
      description: 'Logged 100 habit completions. A hundred victories under your belt.',
      icon:        '💯',
      rarity:      'rare',
      starReward:  15,
      condition:   'logs_100',
      category:    'volume',
    },
    {
      name:        'Half-Thousand',
      description: 'Logged 500 habit completions. This is not luck — this is mastery.',
      icon:        '🏆',
      rarity:      'epic',
      starReward:  40,
      condition:   'logs_500',
      category:    'volume',
    },
    {
      name:        'The Thousand',
      description: '1,000 habit completions. A thousand acts of self-discipline. Legendary.',
      icon:        '👑',
      rarity:      'legendary',
      starReward:  100,
      condition:   'logs_1000',
      category:    'volume',
    },

    // ── VARIETY BADGES ──────────────────────────────────────────
    {
      name:        'Jack of All Habits',
      description: 'Tracking 3 different habits at once. Balance is a skill, too.',
      icon:        '🎪',
      rarity:      'common',
      starReward:  5,
      condition:   'habits_3',
      category:    'variety',
    },
    {
      name:        'Life Optimizer',
      description: 'Tracking 5 different habits at once. You\'re building yourself from every angle.',
      icon:        '🧩',
      rarity:      'rare',
      starReward:  15,
      condition:   'habits_5',
      category:    'variety',
    },
    {
      name:        'Habit Architect',
      description: 'Tracking 7 or more habits simultaneously. You\'ve designed an entire lifestyle.',
      icon:        '🏛️',
      rarity:      'epic',
      starReward:  40,
      condition:   'habits_7',
      category:    'variety',
    },
    {
      name:        'Renaissance Soul',
      description: 'Completed habits in 4 different categories in a single week. True Renaissance spirit.',
      icon:        '🎨',
      rarity:      'rare',
      starReward:  20,
      condition:   'variety_4',
      category:    'variety',
    },

    // ── DEDICATION / PERFECT BADGES ─────────────────────────────
    {
      name:        'Perfect Day',
      description: 'Completed every single habit in one day. Flawless execution.',
      icon:        '✨',
      rarity:      'rare',
      starReward:  15,
      condition:   'perfect_day',
      category:    'dedication',
    },
    {
      name:        'Flawless Week',
      description: 'Perfect completion every day for an entire week. Absolute dedication.',
      icon:        '💫',
      rarity:      'epic',
      starReward:  40,
      condition:   'perfect_week',
      category:    'dedication',
    },
    {
      name:        'Early Bird',
      description: 'Logged a habit completion before 8:00 AM. The morning belongs to the disciplined.',
      icon:        '🌅',
      rarity:      'common',
      starReward:  5,
      condition:   'early_bird',
      category:    'dedication',
    },
    {
      name:        'Night Owl',
      description: 'Logged a habit after 10:00 PM. Burning the midnight oil for self-improvement.',
      icon:        '🦉',
      rarity:      'common',
      starReward:  5,
      condition:   'night_owl',
      category:    'dedication',
    },
    {
      name:        'Comeback Kid',
      description: 'Returned to your habits after a 7-day absence. Resilience defines a champion.',
      icon:        '🔄',
      rarity:      'rare',
      starReward:  20,
      condition:   'comeback_kid',
      category:    'dedication',
    },

    // ── LEVEL BADGES ────────────────────────────────────────────
    {
      name:        'Apprentice',
      description: 'Reached Level 5. Your journey has truly begun.',
      icon:        '📚',
      rarity:      'common',
      starReward:  8,
      condition:   'level_5',
      category:    'special',
    },
    {
      name:        'Adept',
      description: 'Reached Level 10. Half-way to mastery, and already ahead of most.',
      icon:        '🔮',
      rarity:      'rare',
      starReward:  15,
      condition:   'level_10',
      category:    'special',
    },
    {
      name:        'Champion',
      description: 'Reached Level 25. You have earned the title. Wear it with pride.',
      icon:        '🏅',
      rarity:      'epic',
      starReward:  40,
      condition:   'level_25',
      category:    'special',
    },
    {
      name:        'Grandmaster',
      description: 'Reached Level 50. The pinnacle of dedication. Truly legendary status.',
      icon:        '🌠',
      rarity:      'legendary',
      starReward:  100,
      condition:   'level_50',
      category:    'special',
    },
  ]

  for (const badge of badges) {
    await prisma.badge.upsert({
      where:  { name: badge.name },
      update: badge,
      create: badge,
    })
  }
  console.log(`✅ ${badges.length} badges seeded`)

  // ── Demo User ───────────────────────────────────────────────
  const user = await prisma.user.upsert({
    where:  { username: 'hero' },
    update: {},
    create: {
      username:      'hero',
      avatar:        '🧙',
      level:         1,
      totalPoints:   0,
      currentStreak: 0,
      longestStreak: 0,
      stars:         0,
    },
  })
  console.log(`✅ Demo user created: @${user.username}`)

  // ── Demo Habits ─────────────────────────────────────────────
  const habits = [
    { name: 'Morning Run',      category: 'Health',      icon: '🏃', color: '#ef4444', frequency: 'daily',  targetDaysPerWeek: 5, reminderTime: '07:00' },
    { name: 'Read 20 Pages',    category: 'Study',       icon: '📖', color: '#3b82f6', frequency: 'daily',  targetDaysPerWeek: 7, reminderTime: '21:00' },
    { name: 'Drink 2L Water',   category: 'Health',      icon: '💧', color: '#06b6d4', frequency: 'daily',  targetDaysPerWeek: 7, reminderTime: '09:00' },
    { name: 'Meditate 10 min',  category: 'Mindfulness', icon: '🧘', color: '#8b5cf6', frequency: 'daily',  targetDaysPerWeek: 7, reminderTime: '06:30' },
    { name: 'Save $5',          category: 'Finance',     icon: '💰', color: '#10b981', frequency: 'daily',  targetDaysPerWeek: 7, reminderTime: null    },
  ]

  for (const habit of habits) {
    await prisma.habit.upsert({
      where:  { id: habits.indexOf(habit) + 1 },
      update: {},
      create: { ...habit, userId: user.id },
    })
  }
  console.log(`✅ ${habits.length} demo habits seeded`)

  console.log('\n🎉 Database seeded successfully!')
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })