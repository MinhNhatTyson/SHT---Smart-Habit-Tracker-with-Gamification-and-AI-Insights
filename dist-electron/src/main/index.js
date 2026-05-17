"use strict";
// src/main/index.ts
// Electron Main Process — creates the app window and bridges the database
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const path_1 = __importDefault(require("path"));
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const isDev = process.env.NODE_ENV === 'development';
// ── Window Setup ──────────────────────────────────────────────
function createWindow() {
    const win = new electron_1.BrowserWindow({
        width: 1280,
        height: 800,
        minWidth: 900,
        minHeight: 600,
        titleBarStyle: 'hiddenInset',
        backgroundColor: '#0f0f1a',
        webPreferences: {
            preload: path_1.default.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
        },
        icon: path_1.default.join(__dirname, '../../resources/icon.png'),
    });
    if (isDev) {
        win.loadURL('http://localhost:5173');
        win.webContents.openDevTools();
    }
    else {
        win.loadFile(path_1.default.join(__dirname, '../../dist-renderer/index.html'));
    }
    // Open external links in browser, not Electron
    win.webContents.setWindowOpenHandler(({ url }) => {
        electron_1.shell.openExternal(url);
        return { action: 'deny' };
    });
}
electron_1.app.whenReady().then(() => {
    createWindow();
    electron_1.app.on('activate', () => {
        if (electron_1.BrowserWindow.getAllWindows().length === 0)
            createWindow();
    });
});
electron_1.app.on('window-all-closed', () => {
    if (process.platform !== 'darwin')
        electron_1.app.quit();
});
// ── IPC Handlers — Database Bridge ───────────────────────────
// The renderer (React) can't touch the DB directly.
// It sends IPC messages here, and we respond with data.
// USER
electron_1.ipcMain.handle('user:get', async (_, id) => {
    return prisma.user.findUnique({ where: { id } });
});
electron_1.ipcMain.handle('user:create', async (_, data) => {
    return prisma.user.create({ data });
});
electron_1.ipcMain.handle('user:update', async (_, id, data) => {
    return prisma.user.update({ where: { id }, data });
});
// HABITS
electron_1.ipcMain.handle('habits:list', async (_, userId) => {
    return prisma.habit.findMany({
        where: { userId, isArchived: false },
        orderBy: { createdAt: 'asc' },
    });
});
electron_1.ipcMain.handle('habits:create', async (_, data) => {
    return prisma.habit.create({ data });
});
electron_1.ipcMain.handle('habits:update', async (_, id, data) => {
    return prisma.habit.update({ where: { id }, data });
});
electron_1.ipcMain.handle('habits:delete', async (_, id) => {
    return prisma.habit.update({ where: { id }, data: { isArchived: true } });
});
// HABIT LOGS
electron_1.ipcMain.handle('logs:create', async (_, data) => {
    return prisma.habitLog.create({ data });
});
electron_1.ipcMain.handle('logs:list', async (_, habitId) => {
    return prisma.habitLog.findMany({
        where: { habitId },
        orderBy: { completedAt: 'desc' },
    });
});
electron_1.ipcMain.handle('logs:listByUser', async (_, userId) => {
    return prisma.habitLog.findMany({
        where: { userId },
        orderBy: { completedAt: 'desc' },
        take: 100,
    });
});
// BADGES
electron_1.ipcMain.handle('badges:list', async () => {
    return prisma.badge.findMany({ orderBy: { pointValue: 'asc' } });
});
electron_1.ipcMain.handle('badges:userBadges', async (_, userId) => {
    return prisma.userBadge.findMany({
        where: { userId },
        include: { badge: true },
        orderBy: { earnedAt: 'desc' },
    });
});
electron_1.ipcMain.handle('badges:award', async (_, userId, badgeId) => {
    return prisma.userBadge.create({ data: { userId, badgeId } });
});
// AI INSIGHTS
electron_1.ipcMain.handle('insights:list', async (_, userId) => {
    return prisma.aIInsight.findMany({
        where: { userId },
        orderBy: { generatedAt: 'desc' },
        take: 20,
    });
});
electron_1.ipcMain.handle('insights:create', async (_, data) => {
    return prisma.aIInsight.create({ data });
});
electron_1.ipcMain.handle('insights:markRead', async (_, id) => {
    return prisma.aIInsight.update({ where: { id }, data: { isRead: true } });
});
// SOCIAL FEED
electron_1.ipcMain.handle('posts:list', async () => {
    return prisma.socialPost.findMany({
        include: { user: true, badge: true, habit: true },
        orderBy: { createdAt: 'desc' },
        take: 50,
    });
});
electron_1.ipcMain.handle('posts:create', async (_, data) => {
    return prisma.socialPost.create({ data });
});
// CHALLENGES
electron_1.ipcMain.handle('challenges:list', async () => {
    return prisma.challenge.findMany({
        include: { participants: true },
        orderBy: { startDate: 'asc' },
    });
});
electron_1.ipcMain.handle('challenges:join', async (_, userId, challengeId) => {
    return prisma.userChallenge.create({ data: { userId, challengeId } });
});
