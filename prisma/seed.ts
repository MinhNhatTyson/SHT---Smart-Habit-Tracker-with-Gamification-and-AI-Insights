// prisma/seed.ts
// Run with: npx ts-node prisma/seed.ts
// Seeds default badges and a demo user into the database

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding HabitQuest database...')

  // ── Default Badges ──────────────────────────────────────────
  const badges = [
    // Streak badges
    { name: 'First Step',      description: 'Complete your first habit',          icon: '👣', rarity: 'common',    pointValue: 10,  condition: 'logs_1'     },
    { name: '3-Day Spark',     description: 'Maintain a 3-day streak',            icon: '🔥', rarity: 'common',    pointValue: 25,  condition: 'streak_3'   },
    { name: '7-Day Warrior',   description: 'Maintain a 7-day streak',            icon: '⚔️', rarity: 'common',    pointValue: 50,  condition: 'streak_7'   },
    { name: '30-Day Legend',   description: 'Maintain a 30-day streak',           icon: '🏆', rarity: 'rare',      pointValue: 200, condition: 'streak_30'  },
    { name: '100-Day Master',  description: 'Maintain a 100-day streak',          icon: '💎', rarity: 'epic',      pointValue: 500, condition: 'streak_100' },
    { name: 'Eternal Flame',   description: 'Maintain a 365-day streak',          icon: '🌟', rarity: 'legendary', pointValue: 2000,condition: 'streak_365' },

    // Volume badges
    { name: 'Getting Started', description: 'Log 10 habit completions',           icon: '🌱', rarity: 'common',    pointValue: 20,  condition: 'logs_10'    },
    { name: 'Centurion',       description: 'Log 100 habit completions',          icon: '💯', rarity: 'rare',      pointValue: 150, condition: 'logs_100'   },
    { name: 'Unstoppable',     description: 'Log 500 habit completions',          icon: '🚀', rarity: 'epic',      pointValue: 400, condition: 'logs_500'   },

    // Level badges
    { name: 'Apprentice',      description: 'Reach Level 5',                      icon: '📚', rarity: 'common',    pointValue: 50,  condition: 'level_5'    },
    { name: 'Adept',           description: 'Reach Level 10',                     icon: '🎯', rarity: 'rare',      pointValue: 100, condition: 'level_10'   },
    { name: 'Champion',        description: 'Reach Level 25',                     icon: '👑', rarity: 'epic',      pointValue: 300, condition: 'level_25'   },

    // Variety badges
    { name: 'Multitasker',     description: 'Track 3 different habits at once',   icon: '🎪', rarity: 'common',    pointValue: 30,  condition: 'habits_3'   },
    { name: 'Habit Architect', description: 'Track 7 different habits at once',   icon: '🏛️', rarity: 'rare',      pointValue: 100, condition: 'habits_7'   },

    // Social badges
    { name: 'Social Butterfly','description': 'Add your first friend',             icon: '🦋', rarity: 'common',    pointValue: 20,  condition: 'friends_1'  },
    { name: 'Challenge Seeker','description': 'Join your first challenge',         icon: '🎮', rarity: 'common',    pointValue: 30,  condition: 'challenges_1'},
    { name: 'Challenge Conqueror','description':'Complete a group challenge',      icon: '🏅', rarity: 'rare',      pointValue: 200, condition: 'challenge_complete'},
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
  console.log('   Run "npm run prisma:studio" to browse your data visually.')
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
