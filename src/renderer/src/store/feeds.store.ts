import { create } from 'zustand'
import type { Feed, Folder } from '../types'

interface FeedsState {
  feeds: Feed[]
  folders: Folder[]
  unreadCounts: Record<string, number>
  loading: boolean

  loadAll: () => Promise<void>
  addFeed: (url: string, folderId: string, customTitle?: string) => Promise<{ error?: string; feed?: Feed }>
  updateFeed: (id: string, changes: Partial<Feed>) => Promise<void>
  deleteFeed: (id: string) => Promise<void>
  addFolder: (name: string) => Promise<Folder>
  updateFolder: (id: string, name: string) => Promise<void>
  deleteFolder: (id: string) => Promise<void>
  reorderFolders: (ids: string[]) => Promise<void>
  refreshUnreadCounts: () => Promise<void>
  fetchFeed: (id: string) => Promise<void>
  fetchAll: () => Promise<void>
}

export const useFeedsStore = create<FeedsState>((set, get) => ({
  feeds: [],
  folders: [],
  unreadCounts: {},
  loading: false,

  loadAll: async () => {
    set({ loading: true })
    const [feeds, folders, unreadCounts] = await Promise.all([
      window.api.getFeeds(),
      window.api.getFolders(),
      window.api.getUnreadCounts()
    ])
    set({ feeds, folders, unreadCounts, loading: false })
  },

  addFeed: async (url, folderId, customTitle) => {
    const result = await window.api.addFeed(url, folderId, customTitle)
    if (!result.error) {
      const feeds = await window.api.getFeeds()
      set({ feeds })
      get().refreshUnreadCounts()
    }
    return result
  },

  updateFeed: async (id, changes) => {
    await window.api.updateFeed(id, changes)
    const feeds = await window.api.getFeeds()
    set({ feeds })
  },

  deleteFeed: async (id) => {
    await window.api.deleteFeed(id)
    set(s => ({ feeds: s.feeds.filter(f => f.id !== id) }))
    get().refreshUnreadCounts()
  },

  addFolder: async (name) => {
    const folder = await window.api.addFolder(name)
    set(s => ({ folders: [...s.folders, folder] }))
    return folder
  },

  updateFolder: async (id, name) => {
    await window.api.updateFolder(id, name)
    set(s => ({ folders: s.folders.map(f => f.id === id ? { ...f, name } : f) }))
  },

  deleteFolder: async (id) => {
    await window.api.deleteFolder(id)
    set(s => ({ folders: s.folders.filter(f => f.id !== id) }))
    const feeds = await window.api.getFeeds()
    set({ feeds })
  },

  reorderFolders: async (ids) => {
    await window.api.reorderFolders(ids)
    set(s => ({
      folders: [...s.folders].sort((a, b) => ids.indexOf(a.id) - ids.indexOf(b.id))
    }))
  },

  refreshUnreadCounts: async () => {
    const unreadCounts = await window.api.getUnreadCounts()
    set({ unreadCounts })
  },

  fetchFeed: async (id) => {
    await window.api.fetchFeed(id)
    get().refreshUnreadCounts()
  },

  fetchAll: async () => {
    await window.api.fetchAllFeeds()
    get().refreshUnreadCounts()
  }
}))
