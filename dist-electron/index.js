"use strict";
// src/main/index.ts
// Electron Main Process — window, database bridge, reminder scheduler,
// store IPC, quests IPC, goals IPC.
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
// ── Window ────────────────────────────────────────────────────
function createWindow() {
    const win = new electron_1.BrowserWindow({
        width: 1280, height: 800, minWidth: 900, minHeight: 600,
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
    else
        win.loadFile(path_1.default.join(__dirname, '../../dist-renderer/index.html'));
    win.webContents.setWindowOpenHandler(({ url }) => { electron_1.shell.openExternal(url); return { action: 'deny' }; });
}
electron_1.app.whenReady().then(() => {
    createWindow();
    startReminderScheduler();
    electron_1.app.on('activate', () => { if (electron_1.BrowserWindow.getAllWindows().length === 0)
        createWindow(); });
});
electron_1.app.on('window-all-closed', () => { if (process.platform !== 'darwin')
    electron_1.app.quit(); });
// ── Reminder Scheduler ────────────────────────────────────────
let schedulerTimer = null;
const firedToday = new Set();
async function checkReminders() {
    const now = new Date();
    const timeNow = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const dateKey = now.toISOString().slice(0, 10);
    const habits = await prisma.habit.findMany({
        where: { isArchived: false, reminderTime: { not: null } },
        select: { id: true, name: true, icon: true, reminderTime: true },
    });
    for (const habit of habits) {
        if (!habit.reminderTime)
            continue;
        if (habit.reminderTime.slice(0, 5) !== timeNow)
            continue;
        const fireKey = `${habit.id}-${dateKey}`;
        if (firedToday.has(fireKey))
            continue;
        firedToday.add(fireKey);
        for (const key of firedToday) {
            if (!key.endsWith(dateKey))
                firedToday.delete(key);
        }
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
    checkReminders().catch(console.error);
    schedulerTimer = setInterval(() => checkReminders().catch(console.error), 60_000);
}
electron_1.ipcMain.handle('reminders:refresh', async () => { await checkReminders(); return { ok: true }; });
// ── USER ──────────────────────────────────────────────────────
electron_1.ipcMain.handle('user:get', async (_, id) => prisma.user.findUnique({ where: { id } }));
electron_1.ipcMain.handle('user:create', async (_, data) => prisma.user.create({ data }));
electron_1.ipcMain.handle('user:update', async (_, id, data) => prisma.user.update({ where: { id }, data }));
// ── HABITS ────────────────────────────────────────────────────
electron_1.ipcMain.handle('habits:list', async (_, userId) => prisma.habit.findMany({ where: { userId, isArchived: false }, orderBy: { createdAt: 'asc' } }));
electron_1.ipcMain.handle('habits:create', async (_, data) => prisma.habit.create({ data }));
electron_1.ipcMain.handle('habits:update', async (_, id, data) => prisma.habit.update({ where: { id }, data }));
electron_1.ipcMain.handle('habits:delete', async (_, id) => prisma.habit.update({ where: { id }, data: { isArchived: true } }));
// ── LOGS ──────────────────────────────────────────────────────
electron_1.ipcMain.handle('logs:create', async (_, data) => prisma.habitLog.create({ data }));
electron_1.ipcMain.handle('logs:list', async (_, habitId) => prisma.habitLog.findMany({ where: { habitId }, orderBy: { completedAt: 'desc' } }));
electron_1.ipcMain.handle('logs:listByUser', async (_, userId) => prisma.habitLog.findMany({ where: { userId }, orderBy: { completedAt: 'desc' }, take: 100 }));
// ── BADGES ────────────────────────────────────────────────────
electron_1.ipcMain.handle('badges:list', async () => prisma.badge.findMany({ orderBy: { starReward: 'asc' } }));
electron_1.ipcMain.handle('badges:userBadges', async (_, userId) => prisma.userBadge.findMany({ where: { userId }, include: { badge: true }, orderBy: { earnedAt: 'desc' } }));
electron_1.ipcMain.handle('badges:award', async (_, userId, badgeId) => prisma.userBadge.upsert({
    where: { userId_badgeId: { userId, badgeId } }, update: {}, create: { userId, badgeId },
}));
// ── STORE ─────────────────────────────────────────────────────
electron_1.ipcMain.handle('store:listItems', async () => prisma.storeItem.findMany({ where: { isActive: true }, orderBy: { sortOrder: 'asc' } }));
electron_1.ipcMain.handle('store:userPurchases', async (_, userId) => prisma.userPurchase.findMany({ where: { userId }, orderBy: { purchasedAt: 'desc' } }));
electron_1.ipcMain.handle('store:purchase', async (_, userId, itemKey) => {
    const item = await prisma.storeItem.findUnique({ where: { key: itemKey } });
    if (!item)
        throw new Error(`Store item not found: ${itemKey}`);
    if (item.itemType === 'stackable') {
        const existing = await prisma.userPurchase.findUnique({ where: { userId_itemKey: { userId, itemKey } } });
        if (existing)
            return prisma.userPurchase.update({ where: { userId_itemKey: { userId, itemKey } }, data: { quantity: { increment: 1 } } });
    }
    return prisma.userPurchase.upsert({
        where: { userId_itemKey: { userId, itemKey } },
        update: { quantity: { increment: 1 } },
        create: { userId, itemKey, quantity: 1 },
    });
});
// ── GOALS ─────────────────────────────────────────────────────
electron_1.ipcMain.handle('goals:list', async (_, userId) => prisma.goal.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
}));
electron_1.ipcMain.handle('goals:create', async (_, data) => {
    const sanitized = {
        ...data,
        deadline: data.deadline && data.deadline !== '' ? new Date(data.deadline) : null,
        description: data.description && data.description !== '' ? data.description : null,
    };
    return prisma.goal.create({ data: sanitized });
});
electron_1.ipcMain.handle('goals:update', async (_, id, data) => {
    const sanitized = { ...data, updatedAt: new Date() };
    if ('deadline' in sanitized) {
        sanitized.deadline = sanitized.deadline && sanitized.deadline !== ''
            ? new Date(sanitized.deadline)
            : null;
    }
    if ('description' in sanitized && sanitized.description === '') {
        sanitized.description = null;
    }
    return prisma.goal.update({ where: { id }, data: sanitized });
});
electron_1.ipcMain.handle('goals:delete', async (_, id) => prisma.goal.delete({ where: { id } }));
// ── QUESTS ────────────────────────────────────────────────────
electron_1.ipcMain.handle('quests:list', async () => prisma.quest.findMany({ where: { isActive: true }, orderBy: { sortOrder: 'asc' } }));
electron_1.ipcMain.handle('quests:userQuests', async (_, userId) => prisma.userQuest.findMany({
    where: { userId },
    include: { quest: true },
    orderBy: { assignedAt: 'desc' },
}));
electron_1.ipcMain.handle('quests:assignBatch', async (_, userId, items) => {
    const results = [];
    for (const item of items) {
        const quest = await prisma.quest.findUnique({ where: { id: item.questId } });
        if (!quest)
            continue;
        if (quest.tier === 'epic') {
            const exists = await prisma.userQuest.findFirst({ where: { userId, questId: item.questId } });
            if (exists)
                continue;
        }
        else if (quest.tier === 'daily') {
            const expiryDate = item.expiresAt ? new Date(item.expiresAt) : null;
            if (expiryDate) {
                const startOfDay = new Date(expiryDate);
                startOfDay.setHours(0, 0, 0, 0);
                const exists = await prisma.userQuest.findFirst({
                    where: { userId, questId: item.questId, expiresAt: { gte: startOfDay, lte: expiryDate } },
                });
                if (exists)
                    continue;
            }
        }
        else if (quest.tier === 'weekly') {
            const expiryDate = item.expiresAt ? new Date(item.expiresAt) : null;
            if (expiryDate) {
                const weekStart = new Date(expiryDate);
                weekStart.setDate(expiryDate.getDate() - expiryDate.getDay());
                weekStart.setHours(0, 0, 0, 0);
                const exists = await prisma.userQuest.findFirst({
                    where: { userId, questId: item.questId, expiresAt: { gte: weekStart, lte: expiryDate } },
                });
                if (exists)
                    continue;
            }
        }
        const created = await prisma.userQuest.create({
            data: {
                userId,
                questId: item.questId,
                expiresAt: item.expiresAt ? new Date(item.expiresAt) : null,
                progress: 0,
                completed: false,
                claimed: false,
            },
            include: { quest: true },
        });
        results.push(created);
    }
    return results;
});
electron_1.ipcMain.handle('quests:updateProgress', async (_, updates) => {
    const results = [];
    for (const u of updates) {
        const updated = await prisma.userQuest.update({
            where: { id: u.userQuestId },
            data: { progress: u.progress, completed: u.completed },
            include: { quest: true },
        });
        results.push(updated);
    }
    return results;
});
electron_1.ipcMain.handle('quests:claim', async (_, userQuestId) => prisma.userQuest.update({
    where: { id: userQuestId },
    data: { claimed: true, claimedAt: new Date() },
    include: { quest: true },
}));
// ── AI INSIGHTS ───────────────────────────────────────────────
electron_1.ipcMain.handle('insights:list', async (_, userId) => prisma.aIInsight.findMany({ where: { userId }, orderBy: { generatedAt: 'desc' }, take: 50 }));
electron_1.ipcMain.handle('insights:create', async (_, data) => prisma.aIInsight.create({ data }));
electron_1.ipcMain.handle('insights:markRead', async (_, id) => prisma.aIInsight.update({ where: { id }, data: { isRead: true } }));
// ── SOCIAL ────────────────────────────────────────────────────
electron_1.ipcMain.handle('posts:list', async () => prisma.socialPost.findMany({ include: { user: true, badge: true, habit: true }, orderBy: { createdAt: 'desc' }, take: 50 }));
electron_1.ipcMain.handle('posts:create', async (_, data) => prisma.socialPost.create({ data }));
// ── CHALLENGES ────────────────────────────────────────────────
electron_1.ipcMain.handle('challenges:list', async () => prisma.challenge.findMany({ include: { participants: true }, orderBy: { startDate: 'asc' } }));
electron_1.ipcMain.handle('challenges:join', async (_, userId, challengeId) => prisma.userChallenge.create({ data: { userId, challengeId } }));
// ── DIALOG ────────────────────────────────────────────────────
electron_1.ipcMain.handle('dialog:openImage', async () => {
    const { canceled, filePaths } = await electron_1.dialog.showOpenDialog({
        title: 'Choose profile photo', buttonLabel: 'Select',
        filters: [{ name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'webp', 'gif'] }],
        properties: ['openFile'],
    });
    if (canceled || filePaths.length === 0)
        return null;
    const filePath = filePaths[0];
    const buffer = fs_1.default.readFileSync(filePath);
    const ext = path_1.default.extname(filePath).toLowerCase().replace('.', '');
    const mime = ext === 'png' ? 'image/png' : ext === 'gif' ? 'image/gif' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
    return `data:${mime};base64,${buffer.toString('base64')}`;
});
