// src/main/index.ts
// Electron Main Process — creates the app window and bridges the database

import { app, BrowserWindow, ipcMain, shell } from 'electron'
import path from 'path'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const isDev = process.env.NODE_ENV === 'development'

// ── Window Setup ──────────────────────────────────────────────
function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#0f0f1a',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    icon: path.join(__dirname, '../../resources/icon.png'),
  })

  if (isDev) {
    win.loadURL('http://localhost:5173')
    win.webContents.openDevTools()
  } else {
    win.loadFile(path.join(__dirname, '../../dist-renderer/index.html'))
  }

  // Open external links in browser, not Electron
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })
}

app.whenReady().then(() => {
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

// ── IPC Handlers — Database Bridge ───────────────────────────
// The renderer (React) can't touch the DB directly.
// It sends IPC messages here, and we respond with data.

// USER
ipcMain.handle('user:get', async (_, id: number) => {
  return prisma.user.findUnique({ where: { id } })
})

ipcMain.handle('user:create', async (_, data) => {
  return prisma.user.create({ data })
})

ipcMain.handle('user:update', async (_, id: number, data) => {
  return prisma.user.update({ where: { id }, data })
})

// HABITS
ipcMain.handle('habits:list', async (_, userId: number) => {
  return prisma.habit.findMany({
    where: { userId, isArchived: false },
    orderBy: { createdAt: 'asc' },
  })
})

ipcMain.handle('habits:create', async (_, data) => {
  return prisma.habit.create({ data })
})

ipcMain.handle('habits:update', async (_, id: number, data) => {
  return prisma.habit.update({ where: { id }, data })
})

ipcMain.handle('habits:delete', async (_, id: number) => {
  return prisma.habit.update({ where: { id }, data: { isArchived: true } })
})

// HABIT LOGS
ipcMain.handle('logs:create', async (_, data) => {
  return prisma.habitLog.create({ data })
})

ipcMain.handle('logs:list', async (_, habitId: number) => {
  return prisma.habitLog.findMany({
    where: { habitId },
    orderBy: { completedAt: 'desc' },
  })
})

ipcMain.handle('logs:listByUser', async (_, userId: number) => {
  return prisma.habitLog.findMany({
    where: { userId },
    orderBy: { completedAt: 'desc' },
    take: 100,
  })
})

// BADGES
ipcMain.handle('badges:list', async () => {
  return prisma.badge.findMany({ orderBy: { pointValue: 'asc' } })
})

ipcMain.handle('badges:userBadges', async (_, userId: number) => {
  return prisma.userBadge.findMany({
    where: { userId },
    include: { badge: true },
    orderBy: { earnedAt: 'desc' },
  })
})

ipcMain.handle('badges:award', async (_, userId: number, badgeId: number) => {
  return prisma.userBadge.create({ data: { userId, badgeId } })
})

// AI INSIGHTS
ipcMain.handle('insights:list', async (_, userId: number) => {
  return prisma.aIInsight.findMany({
    where: { userId },
    orderBy: { generatedAt: 'desc' },
    take: 20,
  })
})

ipcMain.handle('insights:create', async (_, data) => {
  return prisma.aIInsight.create({ data })
})

ipcMain.handle('insights:markRead', async (_, id: number) => {
  return prisma.aIInsight.update({ where: { id }, data: { isRead: true } })
})

// SOCIAL FEED
ipcMain.handle('posts:list', async () => {
  return prisma.socialPost.findMany({
    include: { user: true, badge: true, habit: true },
    orderBy: { createdAt: 'desc' },
    take: 50,
  })
})

ipcMain.handle('posts:create', async (_, data) => {
  return prisma.socialPost.create({ data })
})

// CHALLENGES
ipcMain.handle('challenges:list', async () => {
  return prisma.challenge.findMany({
    include: { participants: true },
    orderBy: { startDate: 'asc' },
  })
})

ipcMain.handle('challenges:join', async (_, userId: number, challengeId: number) => {
  return prisma.userChallenge.create({ data: { userId, challengeId } })
})
