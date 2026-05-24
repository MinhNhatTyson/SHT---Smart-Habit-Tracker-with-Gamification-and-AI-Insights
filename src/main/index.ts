// src/main/index.ts
// Electron Main Process — window, database bridge, reminder scheduler, store IPC, quests IPC.

import { app, BrowserWindow, ipcMain, Notification, shell, dialog } from 'electron'
import path from 'path'
import fs   from 'fs'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const isDev  = process.env.NODE_ENV === 'development'

// ── Window ────────────────────────────────────────────────────
function createWindow() {
  const win = new BrowserWindow({
    width: 1280, height: 800, minWidth: 900, minHeight: 600,
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#faf9f5',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration:  false,
    },
    icon: path.join(__dirname, '../../resources/icon.png'),
  })
  if (isDev) { win.loadURL('http://localhost:5173'); win.webContents.openDevTools() }
  else win.loadFile(path.join(__dirname, '../../dist-renderer/index.html'))
  win.webContents.setWindowOpenHandler(({ url }) => { shell.openExternal(url); return { action: 'deny' } })
}

app.whenReady().then(() => {
  createWindow()
  startReminderScheduler()
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow() })
})
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit() })

// ── Reminder Scheduler ────────────────────────────────────────
let schedulerTimer: ReturnType<typeof setInterval> | null = null
const firedToday = new Set<string>()

async function checkReminders() {
  const now     = new Date()
  const timeNow = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`
  const dateKey = now.toISOString().slice(0, 10)
  const habits  = await prisma.habit.findMany({
    where: { isArchived: false, reminderTime: { not: null } },
    select: { id: true, name: true, icon: true, reminderTime: true },
  })
  for (const habit of habits) {
    if (!habit.reminderTime) continue
    if (habit.reminderTime.slice(0, 5) !== timeNow) continue
    const fireKey = `${habit.id}-${dateKey}`
    if (firedToday.has(fireKey)) continue
    firedToday.add(fireKey)
    for (const key of firedToday) { if (!key.endsWith(dateKey)) firedToday.delete(key) }
    if (Notification.isSupported()) {
      new Notification({
        title: `${habit.icon}  Time for: ${habit.name}`,
        body:  "Don't forget your habit — keep that streak alive! 🔥",
        silent: false,
      }).show()
    }
  }
}
function startReminderScheduler() {
  checkReminders().catch(console.error)
  schedulerTimer = setInterval(() => checkReminders().catch(console.error), 60_000)
}
ipcMain.handle('reminders:refresh', async () => { await checkReminders(); return { ok: true } })

// ── USER ──────────────────────────────────────────────────────
ipcMain.handle('user:get',    async (_, id: number)       => prisma.user.findUnique({ where: { id } }))
ipcMain.handle('user:create', async (_, data)              => prisma.user.create({ data }))
ipcMain.handle('user:update', async (_, id: number, data)  => prisma.user.update({ where: { id }, data }))

// ── HABITS ────────────────────────────────────────────────────
ipcMain.handle('habits:list',   async (_, userId: number)  => prisma.habit.findMany({ where: { userId, isArchived: false }, orderBy: { createdAt: 'asc' } }))
ipcMain.handle('habits:create', async (_, data)             => prisma.habit.create({ data }))
ipcMain.handle('habits:update', async (_, id: number, data) => prisma.habit.update({ where: { id }, data }))
ipcMain.handle('habits:delete', async (_, id: number)       => prisma.habit.update({ where: { id }, data: { isArchived: true } }))

// ── LOGS ──────────────────────────────────────────────────────
ipcMain.handle('logs:create',     async (_, data)            => prisma.habitLog.create({ data }))
ipcMain.handle('logs:list',       async (_, habitId: number) => prisma.habitLog.findMany({ where: { habitId }, orderBy: { completedAt: 'desc' } }))
ipcMain.handle('logs:listByUser', async (_, userId: number)  => prisma.habitLog.findMany({ where: { userId }, orderBy: { completedAt: 'desc' }, take: 100 }))

// ── BADGES ────────────────────────────────────────────────────
ipcMain.handle('badges:list',       async ()                                   => prisma.badge.findMany({ orderBy: { starReward: 'asc' } }))
ipcMain.handle('badges:userBadges', async (_, userId: number)                  => prisma.userBadge.findMany({ where: { userId }, include: { badge: true }, orderBy: { earnedAt: 'desc' } }))
ipcMain.handle('badges:award',      async (_, userId: number, badgeId: number) => prisma.userBadge.upsert({
  where: { userId_badgeId: { userId, badgeId } }, update: {}, create: { userId, badgeId },
}))

// ── STORE ─────────────────────────────────────────────────────
ipcMain.handle('store:listItems',     async ()                                   => prisma.storeItem.findMany({ where: { isActive: true }, orderBy: { sortOrder: 'asc' } }))
ipcMain.handle('store:userPurchases', async (_, userId: number)                  => prisma.userPurchase.findMany({ where: { userId }, orderBy: { purchasedAt: 'desc' } }))
ipcMain.handle('store:purchase',      async (_, userId: number, itemKey: string) => {
  const item = await prisma.storeItem.findUnique({ where: { key: itemKey } })
  if (!item) throw new Error(`Store item not found: ${itemKey}`)
  if (item.itemType === 'stackable') {
    const existing = await prisma.userPurchase.findUnique({ where: { userId_itemKey: { userId, itemKey } } })
    if (existing) return prisma.userPurchase.update({ where: { userId_itemKey: { userId, itemKey } }, data: { quantity: { increment: 1 } } })
  }
  return prisma.userPurchase.upsert({
    where:  { userId_itemKey: { userId, itemKey } },
    update: { quantity: { increment: 1 } },
    create: { userId, itemKey, quantity: 1 },
  })
})

// ── QUESTS ────────────────────────────────────────────────────

// List all active quest definitions
ipcMain.handle('quests:list', async () =>
  prisma.quest.findMany({ where: { isActive: true }, orderBy: { sortOrder: 'asc' } })
)

// Get all UserQuest rows for a user, with the quest definition included
ipcMain.handle('quests:userQuests', async (_, userId: number) =>
  prisma.userQuest.findMany({
    where:   { userId },
    include: { quest: true },
    orderBy: { assignedAt: 'desc' },
  })
)

// Batch-assign quests to a user (called on refresh)
ipcMain.handle('quests:assignBatch', async (_, userId: number, items: Array<{ questId: number; expiresAt: string | null }>) => {
  const results = []
  for (const item of items) {
    // For epic quests: only create if not already existing
    const existing = await prisma.userQuest.findFirst({
      where: {
        userId,
        questId: item.questId,
        // For epic (no expiry): check any record; for daily/weekly: allow duplicates across periods
        ...(item.expiresAt === null ? {} : {}),
      },
    })
    // Always create a new row for daily/weekly; for epic only if none exists
    const quest = await prisma.quest.findUnique({ where: { id: item.questId } })
    if (!quest) continue
    if (quest.tier === 'epic' && existing) continue  // Epic: only one ever

    const created = await prisma.userQuest.create({
      data: {
        userId,
        questId:    item.questId,
        expiresAt:  item.expiresAt ? new Date(item.expiresAt) : null,
        progress:   0,
        completed:  false,
        claimed:    false,
      },
      include: { quest: true },
    })
    results.push(created)
  }
  return results
})

// Batch-update progress on multiple UserQuest rows
ipcMain.handle('quests:updateProgress', async (_, updates: Array<{ userQuestId: number; progress: number; completed: boolean }>) => {
  const results = []
  for (const u of updates) {
    const updated = await prisma.userQuest.update({
      where: { id: u.userQuestId },
      data:  { progress: u.progress, completed: u.completed },
      include: { quest: true },
    })
    results.push(updated)
  }
  return results
})

// Mark a UserQuest as claimed
ipcMain.handle('quests:claim', async (_, userQuestId: number) =>
  prisma.userQuest.update({
    where: { id: userQuestId },
    data:  { claimed: true, claimedAt: new Date() },
    include: { quest: true },
  })
)

// ── AI INSIGHTS ───────────────────────────────────────────────
ipcMain.handle('insights:list',     async (_, userId: number) => prisma.aIInsight.findMany({ where: { userId }, orderBy: { generatedAt: 'desc' }, take: 20 }))
ipcMain.handle('insights:create',   async (_, data)           => prisma.aIInsight.create({ data }))
ipcMain.handle('insights:markRead', async (_, id: number)     => prisma.aIInsight.update({ where: { id }, data: { isRead: true } }))

// ── SOCIAL ────────────────────────────────────────────────────
ipcMain.handle('posts:list',   async () => prisma.socialPost.findMany({ include: { user: true, badge: true, habit: true }, orderBy: { createdAt: 'desc' }, take: 50 }))
ipcMain.handle('posts:create', async (_, data) => prisma.socialPost.create({ data }))

// ── CHALLENGES ────────────────────────────────────────────────
ipcMain.handle('challenges:list', async () => prisma.challenge.findMany({ include: { participants: true }, orderBy: { startDate: 'asc' } }))
ipcMain.handle('challenges:join', async (_, userId: number, challengeId: number) => prisma.userChallenge.create({ data: { userId, challengeId } }))

// ── DIALOG ────────────────────────────────────────────────────
ipcMain.handle('dialog:openImage', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    title: 'Choose profile photo', buttonLabel: 'Select',
    filters: [{ name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'webp', 'gif'] }],
    properties: ['openFile'],
  })
  if (canceled || filePaths.length === 0) return null
  const filePath = filePaths[0]
  const buffer   = fs.readFileSync(filePath)
  const ext      = path.extname(filePath).toLowerCase().replace('.', '')
  const mime     = ext === 'png' ? 'image/png' : ext === 'gif' ? 'image/gif' : ext === 'webp' ? 'image/webp' : 'image/jpeg'
  return `data:${mime};base64,${buffer.toString('base64')}`
})