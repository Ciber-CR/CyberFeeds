import { create } from 'zustand'

export type Panel = 'settings' | 'inbox' | 'history' | 'addFeed' | 'editFeed' | 'addFolder' | 'editFolder' | 'about' | 'doctor' | null

interface UIState {
  selectedFeedId: string | null    // null = All Feeds
  selectedArticleId: string | null
  activePanel: Panel
  editFeedId: string | null
  editFolderId: string | null
  unseenNotificationsCount: number
  unreadOnly: boolean
  search: string
  layout: 'three-panel' | 'two-panel' | 'one-panel'
  isFetching: boolean

  selectFeed: (id: string | null) => void
  selectArticle: (id: string | null) => void
  openPanel: (panel: Panel, id?: string) => void
  closePanel: () => void
  setUnreadOnly: (v: boolean) => void
  setSearch: (v: string) => void
  setLayout: (v: 'three-panel' | 'two-panel' | 'one-panel') => void
  setFetching: (v: boolean) => void
}

export const useUIStore = create<UIState>((set) => ({
  selectedFeedId: null,
  selectedArticleId: null,
  activePanel: null,
  editFeedId: null,
  editFolderId: null,
  unseenNotificationsCount: 0,
  unreadOnly: false,
  search: '',
  layout: 'three-panel',
  isFetching: false,

  selectFeed: (id) => set({ selectedFeedId: id, selectedArticleId: null, search: '' }),
  selectArticle: (id) => set({ selectedArticleId: id }),
  openPanel: (panel, id) => set(() => ({
    activePanel: panel,
    editFeedId: panel === 'editFeed' ? (id || null) : null,
    editFolderId: panel === 'editFolder' ? (id || null) : null
  })),
  closePanel: () => set({ activePanel: null, editFeedId: null, editFolderId: null }),
  setUnreadOnly: (v) => set({ unreadOnly: v }),
  setSearch: (v) => set({ search: v }),
  setLayout: (v) => set({ layout: v }),
  setFetching: (v) => set({ isFetching: v })
}))
