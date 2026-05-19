"use strict";
// src/main/index.ts
// Electron Main Process — creates the app window, bridges the database,
// and runs the habit reminder scheduler.
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
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
        backgroundColor: '#faf9f5',
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
    win.webContents.setWindowOpenHandler(({ url }) => {
        electron_1.shell.openExternal(url);
        return { action: 'deny' };
    });
}
electron_1.app.whenReady().then(() => {
    createWindow();
    startReminderScheduler(); // ← kick off the scheduler
    electron_1.app.on('activate', () => {
        if (electron_1.BrowserWindow.getAllWindows().length === 0)
            createWindow();
    });
});
electron_1.app.on('window-all-closed', () => {
    if (process.platform !== 'darwin')
        electron_1.app.quit();
});
// ── Reminder Scheduler ────────────────────────────────────────
// Checks every 60 seconds whether any active habit has a
// reminderTime matching HH:MM of the current local time.
// Fires a native OS notification when matched — once per habit
// per day (tracked in firedToday).
let schedulerTimer = null;
// Key: `${habitId}-${YYYY-MM-DD}` → prevents double-firing same day
const firedToday = new Set();
async function checkReminders() {
    const now = new Date();
    const HH = String(now.getHours()).padStart(2, '0');
    const MM = String(now.getMinutes()).padStart(2, '0');
    const timeNow = `${HH}:${MM}`; // "07:30"
    const dateKey = now.toISOString().slice(0, 10); // "2026-05-16"
    // Fetch all non-archived habits that have a reminder set
    const habits = await prisma.habit.findMany({
        where: {
            isArchived: false,
            reminderTime: { not: null },
        },
        select: {
            id: true,
            name: true,
            icon: true,
            reminderTime: true,
        },
    });
    for (const habit of habits) {
        if (!habit.reminderTime)
            continue;
        // Normalise stored time — strip seconds if present ("07:30:00" → "07:30")
        const stored = habit.reminderTime.slice(0, 5);
        if (stored !== timeNow)
            continue;
        const fireKey = `${habit.id}-${dateKey}`;
        if (firedToday.has(fireKey))
            continue; // already fired today
        firedToday.add(fireKey);
        // Clean up old keys (keep set small — only today's entries matter)
        for (const key of firedToday) {
            if (!key.endsWith(dateKey))
                firedToday.delete(key);
        }
        // Fire native notification
        if (electron_1.Notification.isSupported()) {
            new electron_1.Notification({
                title: `${habit.icon}  Time for: ${habit.name}`,
                body: "Don't forget your habit — keep that streak alive! 🔥",
                silent: false,
            }).show();
        }
    }
}
function startReminderScheduler() {
    // Run immediately on launch (catches any reminders set for "right now")
    checkReminders().catch(console.error);
    // Then poll every 60 seconds
    schedulerTimer = setInterval(() => {
        checkReminders().catch(console.error);
    }, 60_000);
}
// ── IPC: renderer tells main to refresh reminders immediately ──
// Called after the user adds / edits / deletes a habit so the
// next scheduler tick picks up the new state right away.
electron_1.ipcMain.handle('reminders:refresh', async () => {
    await checkReminders();
    return { ok: true };
});
// ── IPC Handlers — Database Bridge ───────────────────────────
// USER
electron_1.ipcMain.handle('user:get', async (_, id) => prisma.user.findUnique({ where: { id } }));
electron_1.ipcMain.handle('user:create', async (_, data) => prisma.user.create({ data }));
electron_1.ipcMain.handle('user:update', async (_, id, data) => prisma.user.update({ where: { id }, data }));
// HABITS
electron_1.ipcMain.handle('habits:list', async (_, userId) => prisma.habit.findMany({
    where: { userId, isArchived: false },
    orderBy: { createdAt: 'asc' },
}));
electron_1.ipcMain.handle('habits:create', async (_, data) => prisma.habit.create({ data }));
electron_1.ipcMain.handle('habits:update', async (_, id, data) => prisma.habit.update({ where: { id }, data }));
electron_1.ipcMain.handle('habits:delete', async (_, id) => prisma.habit.update({ where: { id }, data: { isArchived: true } }));
// HABIT LOGS
electron_1.ipcMain.handle('logs:create', async (_, data) => prisma.habitLog.create({ data }));
electron_1.ipcMain.handle('logs:list', async (_, habitId) => prisma.habitLog.findMany({ where: { habitId }, orderBy: { completedAt: 'desc' } }));
electron_1.ipcMain.handle('logs:listByUser', async (_, userId) => prisma.habitLog.findMany({
    where: { userId },
    orderBy: { completedAt: 'desc' },
    take: 100,
}));
// BADGES
electron_1.ipcMain.handle('badges:list', async () => prisma.badge.findMany({ orderBy: { pointValue: 'asc' } }));
electron_1.ipcMain.handle('badges:userBadges', async (_, userId) => prisma.userBadge.findMany({
    where: { userId },
    include: { badge: true },
    orderBy: { earnedAt: 'desc' },
}));
electron_1.ipcMain.handle('badges:award', async (_, userId, badgeId) => prisma.userBadge.create({ data: { userId, badgeId } }));
// AI INSIGHTS
electron_1.ipcMain.handle('insights:list', async (_, userId) => prisma.aIInsight.findMany({
    where: { userId },
    orderBy: { generatedAt: 'desc' },
    take: 20,
}));
electron_1.ipcMain.handle('insights:create', async (_, data) => prisma.aIInsight.create({ data }));
electron_1.ipcMain.handle('insights:markRead', async (_, id) => prisma.aIInsight.update({ where: { id }, data: { isRead: true } }));
// SOCIAL FEED
electron_1.ipcMain.handle('posts:list', async () => prisma.socialPost.findMany({
    include: { user: true, badge: true, habit: true },
    orderBy: { createdAt: 'desc' },
    take: 50,
}));
electron_1.ipcMain.handle('posts:create', async (_, data) => prisma.socialPost.create({ data }));
// CHALLENGES
electron_1.ipcMain.handle('challenges:list', async () => prisma.challenge.findMany({
    include: { participants: true },
    orderBy: { startDate: 'asc' },
}));
electron_1.ipcMain.handle('challenges:join', async (_, userId, challengeId) => prisma.userChallenge.create({ data: { userId, challengeId } }));
// DIALOG — open native file picker for image selection
// Returns the file as a base64 data URI so the renderer can
// upload it to Cloudinary without needing Node fs access.
electron_1.ipcMain.handle('dialog:openImage', async () => {
    const { canceled, filePaths } = await electron_1.dialog.showOpenDialog({
        title: 'Choose profile photo',
        buttonLabel: 'Select',
        filters: [{ name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'webp', 'gif'] }],
        properties: ['openFile'],
    });
    if (canceled || filePaths.length === 0)
        return null;
    const filePath = filePaths[0];
    const buffer = fs_1.default.readFileSync(filePath);
    const ext = path_1.default.extname(filePath).toLowerCase().replace('.', '');
    const mime = ext === 'png' ? 'image/png'
        : ext === 'gif' ? 'image/gif'
            : ext === 'webp' ? 'image/webp'
                : 'image/jpeg';
    return `data:${mime};base64,${buffer.toString('base64')}`;
});
