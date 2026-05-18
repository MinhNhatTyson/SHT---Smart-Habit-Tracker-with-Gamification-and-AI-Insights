// src/main/index.ts
// Electron Main Process — creates the app window, bridges the database,
// and runs the habit reminder scheduler.

import { app, BrowserWindow, ipcMain, Notification, shell } from 'electron'
import path from 'path'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const isDev  = process.env.NODE_ENV === 'development'

// ── Window Setup ──────────────────────────────────────────────
function createWindow() {
  const win = new BrowserWindow({
    width:  1280,
    height: 800,
    minWidth:  900,
    minHeight: 600,
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#faf9f5',
    webPreferences: {
      preload:          path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration:  false,
    },
    icon: path.join(__dirname, '../../resources/icon.png'),
  })

  if (isDev) {
    win.loadURL('http://localhost:5173')
    win.webContents.openDevTools()
  } else {
    win.loadFile(path.join(__dirname, '../../dist-renderer/index.html'))
  }

  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })
}

app.whenReady().then(() => {
  createWindow()
  startReminderScheduler()        // ← kick off the scheduler
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

// ── Reminder Scheduler ────────────────────────────────────────
// Checks every 60 seconds whether any active habit has a
// reminderTime matching HH:MM of the current local time.
// Fires a native OS notification when matched — once per habit
// per day (tracked in firedToday).

let schedulerTimer: ReturnType<typeof setInterval> | null = null

// Key: `${habitId}-${YYYY-MM-DD}` → prevents double-firing same day
const firedToday = new Set<string>()

async function checkReminders() {
  const now    = new Date()
  const HH     = String(now.getHours()).padStart(2, '0')
  const MM     = String(now.getMinutes()).padStart(2, '0')
  const timeNow = `${HH}:${MM}`                         // "07:30"
  const dateKey = now.toISOString().slice(0, 10)        // "2026-05-16"

  // Fetch all non-archived habits that have a reminder set
  const habits = await prisma.habit.findMany({
    where: {
      isArchived:   false,
      reminderTime: { not: null },
    },
    select: {
      id:           true,
      name:         true,
      icon:         true,
      reminderTime: true,
    },
  })

  for (const habit of habits) {
    if (!habit.reminderTime) continue

    // Normalise stored time — strip seconds if present ("07:30:00" → "07:30")
    const stored = habit.reminderTime.slice(0, 5)
    if (stored !== timeNow) continue

    const fireKey = `${habit.id}-${dateKey}`
    if (firedToday.has(fireKey)) continue   // already fired today

    firedToday.add(fireKey)

    // Clean up old keys (keep set small — only today's entries matter)
    for (const key of firedToday) {
      if (!key.endsWith(dateKey)) firedToday.delete(key)
    }

    // Fire native notification
    if (Notification.isSupported()) {
      new Notification({
        title:  `${habit.icon}  Time for: ${habit.name}`,
        body:   "Don't forget your habit — keep that streak alive! 🔥",
        silent: false,
      }).show()
    }
  }
}

function startReminderScheduler() {
  // Run immediately on launch (catches any reminders set for "right now")
  checkReminders().catch(console.error)

  // Then poll every 60 seconds
  schedulerTimer = setInterval(() => {
    checkReminders().catch(console.error)
  }, 60_000)
}

// ── IPC: renderer tells main to refresh reminders immediately ──
// Called after the user adds / edits / deletes a habit so the
// next scheduler tick picks up the new state right away.
ipcMain.handle('reminders:refresh', async () => {
  await checkReminders()
  return { ok: true }
})

// ── IPC Handlers — Database Bridge ───────────────────────────

// USER
ipcMain.handle('user:get',    async (_, id: number)           => prisma.user.findUnique({ where: { id } }))
ipcMain.handle('user:create', async (_, data)                  => prisma.user.create({ data }))
ipcMain.handle('user:update', async (_, id: number, data)      => prisma.user.update({ where: { id }, data }))

// HABITS
ipcMain.handle('habits:list',   async (_, userId: number) =>
  prisma.habit.findMany({
    where:   { userId, isArchived: false },
    orderBy: { createdAt: 'asc' },
  })
)
ipcMain.handle('habits:create', async (_, data)                => prisma.habit.create({ data }))
ipcMain.handle('habits:update', async (_, id: number, data)    => prisma.habit.update({ where: { id }, data }))
ipcMain.handle('habits:delete', async (_, id: number)          =>
  prisma.habit.update({ where: { id }, data: { isArchived: true } })
)

// HABIT LOGS
ipcMain.handle('logs:create',     async (_, data)              => prisma.habitLog.create({ data }))
ipcMain.handle('logs:list',       async (_, habitId: number)   =>
  prisma.habitLog.findMany({ where: { habitId }, orderBy: { completedAt: 'desc' } })
)
ipcMain.handle('logs:listByUser', async (_, userId: number)    =>
  prisma.habitLog.findMany({
    where:   { userId },
    orderBy: { completedAt: 'desc' },
    take:    100,
  })
)

// BADGES
ipcMain.handle('badges:list',      async ()                              => prisma.badge.findMany({ orderBy: { pointValue: 'asc' } }))
ipcMain.handle('badges:userBadges',async (_, userId: number)             =>
  prisma.userBadge.findMany({
    where:   { userId },
    include: { badge: true },
    orderBy: { earnedAt: 'desc' },
  })
)
ipcMain.handle('badges:award',     async (_, userId: number, badgeId: number) =>
  prisma.userBadge.create({ data: { userId, badgeId } })
)

// AI INSIGHTS
ipcMain.handle('insights:list',    async (_, userId: number)  =>
  prisma.aIInsight.findMany({
    where:   { userId },
    orderBy: { generatedAt: 'desc' },
    take:    20,
  })
)
ipcMain.handle('insights:create',  async (_, data)            => prisma.aIInsight.create({ data }))
ipcMain.handle('insights:markRead',async (_, id: number)      =>
  prisma.aIInsight.update({ where: { id }, data: { isRead: true } })
)

// SOCIAL FEED
ipcMain.handle('posts:list',   async () =>
  prisma.socialPost.findMany({
    include: { user: true, badge: true, habit: true },
    orderBy: { createdAt: 'desc' },
    take:    50,
  })
)
ipcMain.handle('posts:create', async (_, data) => prisma.socialPost.create({ data }))

// CHALLENGES
ipcMain.handle('challenges:list', async () =>
  prisma.challenge.findMany({
    include: { participants: true },
    orderBy: { startDate: 'asc' },
  })
)
ipcMain.handle('challenges:join', async (_, userId: number, challengeId: number) =>
  prisma.userChallenge.create({ data: { userId, challengeId } })
)