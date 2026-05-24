// prisma/seed_quests.ts
// Seeds all Quest rows.
// Run with: npx ts-node prisma/seed_quests.ts
//
// Condition keys (evaluated in questEngine.ts):
//   logs_today_N       → complete N habits today
//   logs_week_N        → total logs in current week >= N
//   logs_total_N       → all-time logs >= N
//   streak_N           → currentStreak >= N
//   perfect_day        → all habits done today
//   perfect_days_N     → perfect days in current week >= N
//   habits_N           → active habit count >= N
//   category_N         → complete habits in N different categories today
//   early_N            → log N habits before 09:00 this week
//   weekend_N          → log N habits on Sat or Sun this week
//   same_habit_N       → complete same habit N days in a row

import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  console.log('⚔️  Seeding HabitQuest Quests...')

  const quests = [
    // ═══════════════════════════════════════════════════════════
    // DAILY QUESTS  —  refresh every day, expire at midnight
    // ═══════════════════════════════════════════════════════════
    {
      key:         'daily_log1',
      title:       'First Blood',
      description: 'Complete at least 1 habit today.',
      flavour:     'Every great day starts with a single action.',
      tier:        'daily',
      icon:        '⚔️',
      starReward:  5,
      condition:   'logs_today_1',
      target:      1,
      sortOrder:   1,
    },
    {
      key:         'daily_log3',
      title:       'Triple Threat',
      description: 'Complete 3 habits today.',
      flavour:     'Three victories. Not bad for a Tuesday.',
      tier:        'daily',
      icon:        '🔱',
      starReward:  10,
      condition:   'logs_today_3',
      target:      3,
      sortOrder:   2,
    },
    {
      key:         'daily_perfect',
      title:       'Flawless',
      description: 'Complete every single habit today.',
      flavour:     'No excuses. No exceptions. Pure execution.',
      tier:        'daily',
      icon:        '✨',
      starReward:  20,
      condition:   'perfect_day',
      target:      1,
      sortOrder:   3,
    },
    {
      key:         'daily_variety',
      title:       'Renaissance',
      description: 'Complete habits from 2 different categories today.',
      flavour:     'Growth is never one-dimensional.',
      tier:        'daily',
      icon:        '🎨',
      starReward:  12,
      condition:   'category_2',
      target:      2,
      sortOrder:   4,
    },
    {
      key:         'daily_early',
      title:       'Dawn Raider',
      description: 'Log a habit before 9:00 AM today.',
      flavour:     'The early hero claims the XP.',
      tier:        'daily',
      icon:        '🌅',
      starReward:  8,
      condition:   'early_today_1',
      target:      1,
      sortOrder:   5,
    },

    // ═══════════════════════════════════════════════════════════
    // WEEKLY QUESTS  —  refresh every Monday, expire Sunday midnight
    // ═══════════════════════════════════════════════════════════
    {
      key:         'weekly_log15',
      title:       'On a Roll',
      description: 'Log 15 habit completions this week.',
      flavour:     'Consistency is a superpower. Prove it.',
      tier:        'weekly',
      icon:        '📈',
      starReward:  30,
      condition:   'logs_week_15',
      target:      15,
      sortOrder:   10,
    },
    {
      key:         'weekly_perfect3',
      title:       'Hat Trick',
      description: 'Have 3 perfect days this week.',
      flavour:     'A perfect day, three times over. That\'s mastery.',
      tier:        'weekly',
      icon:        '🎩',
      starReward:  50,
      condition:   'perfect_days_3',
      target:      3,
      sortOrder:   11,
    },
    {
      key:         'weekly_streak7',
      title:       'Chain Breaker',
      description: 'Reach or maintain a 7-day streak.',
      flavour:     'Build the chain. Then refuse to break it.',
      tier:        'weekly',
      icon:        '⛓️',
      starReward:  40,
      condition:   'streak_7',
      target:      7,
      sortOrder:   12,
    },
    {
      key:         'weekly_variety4',
      title:       'Four Corners',
      description: 'Complete habits in 4 different categories this week.',
      flavour:     'Health. Mind. Money. Spirit. Cover them all.',
      tier:        'weekly',
      icon:        '🧭',
      starReward:  35,
      condition:   'category_week_4',
      target:      4,
      sortOrder:   13,
    },
    {
      key:         'weekly_weekend',
      title:       'Weekend Warrior',
      description: 'Complete at least 3 habits on both Saturday and Sunday.',
      flavour:     'Others rest. You rise.',
      tier:        'weekly',
      icon:        '🏕️',
      starReward:  25,
      condition:   'weekend_3',
      target:      3,
      sortOrder:   14,
    },

    // ═══════════════════════════════════════════════════════════
    // EPIC QUESTS  —  one-time, no expiry, long-term milestones
    // ═══════════════════════════════════════════════════════════
    {
      key:         'epic_first50',
      title:       'Fifty Shades of Progress',
      description: 'Log 50 total habit completions.',
      flavour:     'Fifty acts of discipline. The journey is real now.',
      tier:        'epic',
      icon:        '🏅',
      starReward:  50,
      condition:   'logs_total_50',
      target:      50,
      sortOrder:   20,
    },
    {
      key:         'epic_first200',
      title:       'The Double Century',
      description: 'Log 200 total habit completions.',
      flavour:     'Two hundred. You\'ve officially crossed into dedicated territory.',
      tier:        'epic',
      icon:        '🎖️',
      starReward:  100,
      condition:   'logs_total_200',
      target:      200,
      sortOrder:   21,
    },
    {
      key:         'epic_streak30',
      title:       'The Iron Month',
      description: 'Reach a 30-day streak.',
      flavour:     'Thirty days of choosing yourself. Iron-willed.',
      tier:        'epic',
      icon:        '🏰',
      starReward:  150,
      condition:   'streak_30',
      target:      30,
      sortOrder:   22,
    },
    {
      key:         'epic_streak100',
      title:       'The Centurion',
      description: 'Reach a 100-day streak.',
      flavour:     '100 days without surrender. You are rare.',
      tier:        'epic',
      icon:        '💎',
      starReward:  300,
      condition:   'streak_100',
      target:      100,
      sortOrder:   23,
    },
    {
      key:         'epic_allhabits',
      title:       'Full Arsenal',
      description: 'Have 5 or more active habits at once.',
      flavour:     'You\'ve built a system. Now it builds you.',
      tier:        'epic',
      icon:        '⚙️',
      starReward:  60,
      condition:   'habits_5',
      target:      5,
      sortOrder:   24,
    },
    {
      key:         'epic_perfect_week',
      title:       'The Flawless Week',
      description: 'Complete all habits every day for 7 days straight.',
      flavour:     'Seven days. Zero excuses. Absolute perfection.',
      tier:        'epic',
      icon:        '🌟',
      starReward:  200,
      condition:   'perfect_days_7',
      target:      7,
      sortOrder:   25,
    },
    {
      key:         'epic_logs500',
      title:       'The Half-Millennium',
      description: 'Log 500 total habit completions.',
      flavour:     'Five hundred. This isn\'t a phase — this is you.',
      tier:        'epic',
      icon:        '👑',
      starReward:  250,
      condition:   'logs_total_500',
      target:      500,
      sortOrder:   26,
    },
  ]

  for (const quest of quests) {
    await prisma.quest.upsert({
      where:  { key: quest.key },
      update: quest,
      create: quest,
    })
  }

  console.log(`✅ ${quests.length} quests seeded`)
  console.log('🎉 Quest seed complete!')
}

main()
  .catch((e) => { console.error('❌ Quest seed failed:', e); process.exit(1) })
  .finally(async () => { await prisma.$disconnect() })