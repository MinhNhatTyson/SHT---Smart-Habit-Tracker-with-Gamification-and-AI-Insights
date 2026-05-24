// src/main/preload.ts
import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('api', {
  user: {
    get:    (id: number)            => ipcRenderer.invoke('user:get', id),
    create: (data: any)             => ipcRenderer.invoke('user:create', data),
    update: (id: number, data: any) => ipcRenderer.invoke('user:update', id, data),
  },
  habits: {
    list:   (userId: number)          => ipcRenderer.invoke('habits:list', userId),
    create: (data: any)               => ipcRenderer.invoke('habits:create', data),
    update: (id: number, data: any)   => ipcRenderer.invoke('habits:update', id, data),
    delete: (id: number)              => ipcRenderer.invoke('habits:delete', id),
  },
  logs: {
    create:     (data: any)           => ipcRenderer.invoke('logs:create', data),
    list:       (habitId: number)     => ipcRenderer.invoke('logs:list', habitId),
    listByUser: (userId: number)      => ipcRenderer.invoke('logs:listByUser', userId),
  },
  badges: {
    list:       ()                                    => ipcRenderer.invoke('badges:list'),
    userBadges: (userId: number)                      => ipcRenderer.invoke('badges:userBadges', userId),
    award:      (userId: number, badgeId: number)     => ipcRenderer.invoke('badges:award', userId, badgeId),
  },
  store: {
    listItems:     ()                                  => ipcRenderer.invoke('store:listItems'),
    userPurchases: (userId: number)                    => ipcRenderer.invoke('store:userPurchases', userId),
    purchase:      (userId: number, itemKey: string)   => ipcRenderer.invoke('store:purchase', userId, itemKey),
  },
  // ── Quests ────────────────────────────────────────────────
  quests: {
    list:           ()                                                    => ipcRenderer.invoke('quests:list'),
    userQuests:     (userId: number)                                      => ipcRenderer.invoke('quests:userQuests', userId),
    assignBatch:    (userId: number, items: any[])                        => ipcRenderer.invoke('quests:assignBatch', userId, items),
    updateProgress: (updates: any[])                                      => ipcRenderer.invoke('quests:updateProgress', updates),
    claim:          (userQuestId: number)                                 => ipcRenderer.invoke('quests:claim', userQuestId),
  },
  insights: {
    list:     (userId: number) => ipcRenderer.invoke('insights:list', userId),
    create:   (data: any)      => ipcRenderer.invoke('insights:create', data),
    markRead: (id: number)     => ipcRenderer.invoke('insights:markRead', id),
  },
  posts: {
    list:   ()          => ipcRenderer.invoke('posts:list'),
    create: (data: any) => ipcRenderer.invoke('posts:create', data),
  },
  challenges: {
    list: ()                                    => ipcRenderer.invoke('challenges:list'),
    join: (userId: number, challengeId: number) => ipcRenderer.invoke('challenges:join', userId, challengeId),
  },
  reminders: {
    refresh: () => ipcRenderer.invoke('reminders:refresh'),
  },
  dialog: {
    openImage: () => ipcRenderer.invoke('dialog:openImage'),
  },
})