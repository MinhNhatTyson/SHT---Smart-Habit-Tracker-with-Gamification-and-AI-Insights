"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// src/main/preload.ts
const electron_1 = require("electron");
electron_1.contextBridge.exposeInMainWorld('api', {
    user: {
        get: (id) => electron_1.ipcRenderer.invoke('user:get', id),
        create: (data) => electron_1.ipcRenderer.invoke('user:create', data),
        update: (id, data) => electron_1.ipcRenderer.invoke('user:update', id, data),
    },
    habits: {
        list: (userId) => electron_1.ipcRenderer.invoke('habits:list', userId),
        create: (data) => electron_1.ipcRenderer.invoke('habits:create', data),
        update: (id, data) => electron_1.ipcRenderer.invoke('habits:update', id, data),
        delete: (id) => electron_1.ipcRenderer.invoke('habits:delete', id),
    },
    logs: {
        create: (data) => electron_1.ipcRenderer.invoke('logs:create', data),
        list: (habitId) => electron_1.ipcRenderer.invoke('logs:list', habitId),
        listByUser: (userId) => electron_1.ipcRenderer.invoke('logs:listByUser', userId),
    },
    badges: {
        list: () => electron_1.ipcRenderer.invoke('badges:list'),
        userBadges: (userId) => electron_1.ipcRenderer.invoke('badges:userBadges', userId),
        award: (userId, badgeId) => electron_1.ipcRenderer.invoke('badges:award', userId, badgeId),
    },
    store: {
        listItems: () => electron_1.ipcRenderer.invoke('store:listItems'),
        userPurchases: (userId) => electron_1.ipcRenderer.invoke('store:userPurchases', userId),
        purchase: (userId, itemKey) => electron_1.ipcRenderer.invoke('store:purchase', userId, itemKey),
    },
    // ── Goals ─────────────────────────────────────────────────
    goals: {
        list: (userId) => electron_1.ipcRenderer.invoke('goals:list', userId),
        create: (data) => electron_1.ipcRenderer.invoke('goals:create', data),
        update: (id, data) => electron_1.ipcRenderer.invoke('goals:update', id, data),
        delete: (id) => electron_1.ipcRenderer.invoke('goals:delete', id),
    },
    // ── Quests ────────────────────────────────────────────────
    quests: {
        list: () => electron_1.ipcRenderer.invoke('quests:list'),
        userQuests: (userId) => electron_1.ipcRenderer.invoke('quests:userQuests', userId),
        assignBatch: (userId, items) => electron_1.ipcRenderer.invoke('quests:assignBatch', userId, items),
        updateProgress: (updates) => electron_1.ipcRenderer.invoke('quests:updateProgress', updates),
        claim: (userQuestId) => electron_1.ipcRenderer.invoke('quests:claim', userQuestId),
    },
    insights: {
        list: (userId) => electron_1.ipcRenderer.invoke('insights:list', userId),
        create: (data) => electron_1.ipcRenderer.invoke('insights:create', data),
        markRead: (id) => electron_1.ipcRenderer.invoke('insights:markRead', id),
    },
    posts: {
        list: () => electron_1.ipcRenderer.invoke('posts:list'),
        create: (data) => electron_1.ipcRenderer.invoke('posts:create', data),
    },
    challenges: {
        list: () => electron_1.ipcRenderer.invoke('challenges:list'),
        join: (userId, challengeId) => electron_1.ipcRenderer.invoke('challenges:join', userId, challengeId),
    },
    reminders: {
        refresh: () => electron_1.ipcRenderer.invoke('reminders:refresh'),
    },
    dialog: {
        openImage: () => electron_1.ipcRenderer.invoke('dialog:openImage'),
    },
});
