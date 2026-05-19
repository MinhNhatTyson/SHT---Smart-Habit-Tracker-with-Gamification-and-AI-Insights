// src/main/preload.ts
// Preload runs in a sandboxed context between Electron and React.
// It exposes ONLY the functions React is allowed to call.

import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('api', {
  // User
  user: {
    get:    (id: number)              => ipcRenderer.invoke('user:get', id),
    create: (data: any)               => ipcRenderer.invoke('user:create', data),
    update: (id: number, data: any)   => ipcRenderer.invoke('user:update', id, data),
  },

  // Habits
  habits: {
    list:   (userId: number)          => ipcRenderer.invoke('habits:list', userId),
    create: (data: any)               => ipcRenderer.invoke('habits:create', data),
    update: (id: number, data: any)   => ipcRenderer.invoke('habits:update', id, data),
    delete: (id: number)              => ipcRenderer.invoke('habits:delete', id),
  },

  // Logs
  logs: {
    create:     (data: any)           => ipcRenderer.invoke('logs:create', data),
    list:       (habitId: number)     => ipcRenderer.invoke('logs:list', habitId),
    listByUser: (userId: number)      => ipcRenderer.invoke('logs:listByUser', userId),
  },

  // Badges
  badges: {
    list:       ()                              => ipcRenderer.invoke('badges:list'),
    userBadges: (userId: number)               => ipcRenderer.invoke('badges:userBadges', userId),
    award:      (userId: number, badgeId: number) => ipcRenderer.invoke('badges:award', userId, badgeId),
  },

  // AI Insights
  insights: {
    list:     (userId: number)        => ipcRenderer.invoke('insights:list', userId),
    create:   (data: any)             => ipcRenderer.invoke('insights:create', data),
    markRead: (id: number)            => ipcRenderer.invoke('insights:markRead', id),
  },

  // Social
  posts: {
    list:   ()                        => ipcRenderer.invoke('posts:list'),
    create: (data: any)               => ipcRenderer.invoke('posts:create', data),
  },

  // Challenges
  challenges: {
    list: ()                                      => ipcRenderer.invoke('challenges:list'),
    join: (userId: number, challengeId: number)   => ipcRenderer.invoke('challenges:join', userId, challengeId),
  },

  // Reminders — tell main to re-check schedules immediately
  reminders: {
    refresh: () => ipcRenderer.invoke('reminders:refresh'),
  },

  // Dialog — native OS file picker
  // Returns a base64 data URI string, or null if cancelled
  dialog: {
    openImage: () => ipcRenderer.invoke('dialog:openImage'),
  },
})