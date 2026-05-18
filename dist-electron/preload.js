"use strict";
// src/main/preload.ts
// Preload runs in a sandboxed context between Electron and React.
// It exposes ONLY the functions React is allowed to call.
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
electron_1.contextBridge.exposeInMainWorld('api', {
    // User
    user: {
        get: (id) => electron_1.ipcRenderer.invoke('user:get', id),
        create: (data) => electron_1.ipcRenderer.invoke('user:create', data),
        update: (id, data) => electron_1.ipcRenderer.invoke('user:update', id, data),
    },
    // Habits
    habits: {
        list: (userId) => electron_1.ipcRenderer.invoke('habits:list', userId),
        create: (data) => electron_1.ipcRenderer.invoke('habits:create', data),
        update: (id, data) => electron_1.ipcRenderer.invoke('habits:update', id, data),
        delete: (id) => electron_1.ipcRenderer.invoke('habits:delete', id),
    },
    // Logs
    logs: {
        create: (data) => electron_1.ipcRenderer.invoke('logs:create', data),
        list: (habitId) => electron_1.ipcRenderer.invoke('logs:list', habitId),
        listByUser: (userId) => electron_1.ipcRenderer.invoke('logs:listByUser', userId),
    },
    // Badges
    badges: {
        list: () => electron_1.ipcRenderer.invoke('badges:list'),
        userBadges: (userId) => electron_1.ipcRenderer.invoke('badges:userBadges', userId),
        award: (userId, badgeId) => electron_1.ipcRenderer.invoke('badges:award', userId, badgeId),
    },
    // AI Insights
    insights: {
        list: (userId) => electron_1.ipcRenderer.invoke('insights:list', userId),
        create: (data) => electron_1.ipcRenderer.invoke('insights:create', data),
        markRead: (id) => electron_1.ipcRenderer.invoke('insights:markRead', id),
    },
    // Social
    posts: {
        list: () => electron_1.ipcRenderer.invoke('posts:list'),
        create: (data) => electron_1.ipcRenderer.invoke('posts:create', data),
    },
    // Challenges
    challenges: {
        list: () => electron_1.ipcRenderer.invoke('challenges:list'),
        join: (userId, challengeId) => electron_1.ipcRenderer.invoke('challenges:join', userId, challengeId),
    },
    // Reminders — tell main to re-check schedules immediately
    reminders: {
        refresh: () => electron_1.ipcRenderer.invoke('reminders:refresh'),
    },
});
