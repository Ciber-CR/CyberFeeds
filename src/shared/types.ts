// Shared types — used by both main process and renderer
// This file intentionally has no Electron/Node imports

export interface Folder {
  id: string
  name: string
  sortOrder: number
}

export interface Feed {
  id: string
  title: string
  url: string
  link?: string
  folderId: string
  icon?: string
  lastFetched?: number
  errorCount: number
  disabled?: boolean
}

export interface Article {
  id: string
  feedId: string
  feedTitle?: string
  feedIcon?: string
  title: string
  link: string
  pubDate: number
  content: string
  snippet: string
  author?: string
  read: number // 0 | 1
  starred: number // 0 | 1
  guid: string
  thumbnail?: string
}

export interface NotificationHistoryItem {
  id: string
  title: string
  body: string
  link: string
  feedName: string
  icon?: string
  thumbnail?: string
  articleId?: string
  feedId?: string
  createdAt: number
}

export interface AppSettings {
  theme: 'dark' | 'light' | 'dracula' | 'nord' | 'hacker' | 'monokai'
  layout: 'three-panel' | 'two-panel' | 'one-panel'
  pollingInterval: number
  autoStart: boolean
  startMinimized: boolean
  minimizeToTray: boolean
  showArticleThumbnails: boolean
  customBrowserPath: string
  unreadOnly: boolean
  compactArticleList: boolean
  cleanupReadDays: number
  autoCleanup: boolean
  autoCleanup: boolean
  autoCleanup: boolean
  autoCleanup: boolean
  readerFallback: boolean
  readingFontSize: number
  readingLineHeight: number
  readingMaxWidth: number
  readingTheme: 'default' | 'sepia' | 'dark'
  sidebarFontSize: number   // px — controls sidebar items font size
  listFontSize: number       // px — controls article list font size
  notifications: NotificationSettings
  pollingEnabled: boolean
}

export interface NotificationSettings {
  enabled: boolean
  position: 'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right'
  displayId: number
  marginX: number
  marginY: number
  maxWidth: number
  maxHeight: number
  duration: number
  fontSize: number
  opacity: number
  soundFile: string | null
  maxStack: number
  feedFilters: string[]
  keywordFilters: string[]
  snoozedUntil: number | null
  openBehavior: 'browser' | 'app'
  showThumbnails: boolean
}

export interface WindowState {
  x?: number
  y?: number
  width: number
  height: number
  maximized: boolean
}

export interface NotifierPatch {
  add?: NotificationHistoryItem[]
  remove?: string[]
}

export const DEFAULT_SETTINGS: AppSettings = {
  theme: 'dark',
  layout: 'three-panel',
  pollingInterval: 15,
  autoStart: false,
  startMinimized: false,
  minimizeToTray: true,
  showArticleThumbnails: true,
  customBrowserPath: '',
  unreadOnly: false,
  compactArticleList: false,
  cleanupReadDays: 30,
  autoCleanup: false,
  readerFallback: true,
  readingFontSize: 16,
  readingLineHeight: 1.7,
  readingMaxWidth: 720,
  readingTheme: 'default',
  sidebarFontSize: 13,
  listFontSize: 13,
  notifications: {
    enabled: true,
    position: 'bottom-right',
    displayId: 0,
    marginX: 16,
    marginY: 16,
    maxWidth: 380,
    maxHeight: 120,
    duration: 6000,
    fontSize: 13,
    opacity: 0.97,
    soundFile: null,
    maxStack: 5,
    feedFilters: [],
    keywordFilters: [],
    snoozedUntil: null,
    openBehavior: 'app',
    showThumbnails: true
  },
  pollingEnabled: true
}
