import { create } from 'zustand'
import type { Article } from '../types'
import { useFeedsStore } from './feeds.store'

interface ArticleQuery {
  feedId?: string
  unreadOnly?: boolean
  starredOnly?: boolean
  search?: string
  limit?: number
  offset?: number
}

interface ArticlesState {
  articles: Article[]
  totalCount: number
  loading: boolean
  loadingMore: boolean
  currentQuery: ArticleQuery

  load: (query: ArticleQuery) => Promise<void>
  loadMore: () => Promise<void>
  markRead: (id: string, read: boolean) => Promise<void>
  markAllRead: (feedId?: string) => Promise<void>
  markMultipleRead: (ids: string[], read: boolean) => Promise<void>
  starArticle: (id: string, starred: boolean) => Promise<void>
  deleteArticle: (id: string) => Promise<void>
  deleteMultiple: (ids: string[]) => Promise<void>
  removeArticleFromList: (id: string) => void
  refresh: () => Promise<void>
}

const PAGE_SIZE = 60

export const useArticlesStore = create<ArticlesState>((set, get) => ({
  articles: [],
  totalCount: 0,
  loading: false,
  loadingMore: false,
  currentQuery: {},

  load: async (query) => {
    set({ loading: true, currentQuery: query, articles: [], totalCount: 0 })
    const q = { ...query, limit: PAGE_SIZE, offset: 0 }
    const [articles, totalCount] = await Promise.all([
      window.api.getArticles(q),
      window.api.getArticleCount(query)
    ])
    set({ articles, totalCount, loading: false })
  },

  loadMore: async () => {
    const { articles, totalCount, loadingMore, currentQuery } = get()
    if (loadingMore || articles.length >= totalCount) return
    set({ loadingMore: true })
    const more = await window.api.getArticles({ ...currentQuery, limit: PAGE_SIZE, offset: articles.length })
    set(s => ({ articles: [...s.articles, ...more], loadingMore: false }))
  },

  markRead: async (id, read) => {
    // Optimistic update
    set(s => ({ articles: s.articles.map(a => a.id === id ? { ...a, read: read ? 1 : 0 } : a) }))
    await window.api.markRead(id, read)
    useFeedsStore.getState().refreshUnreadCounts()
  },

  markAllRead: async (feedId) => {
    set(s => ({
      articles: s.articles.map(a => (!feedId || a.feedId === feedId) ? { ...a, read: 1 } : a)
    }))
    await window.api.markAllRead(feedId)
    useFeedsStore.getState().refreshUnreadCounts()
  },

  starArticle: async (id, starred) => {
    set(s => ({ articles: s.articles.map(a => a.id === id ? { ...a, starred: starred ? 1 : 0 } : a) }))
    await window.api.starArticle(id, starred)
    useFeedsStore.getState().refreshUnreadCounts()
  },

  deleteArticle: async (id) => {
    await window.api.deleteArticle(id)
    set(s => ({
      articles: s.articles.filter(a => a.id !== id),
      totalCount: Math.max(0, s.totalCount - 1)
    }))
    useFeedsStore.getState().refreshUnreadCounts()
  },

  removeArticleFromList: (id) => {
    set(s => {
      const exists = s.articles.some(a => a.id === id)
      if (!exists) return s
      return {
        articles: s.articles.filter(a => a.id !== id),
        totalCount: Math.max(0, s.totalCount - 1)
      }
    })
  },

  deleteMultiple: async (ids) => {
    set(s => ({
      articles: s.articles.filter(a => !ids.includes(a.id)),
      totalCount: Math.max(0, s.totalCount - ids.length)
    }))
    await Promise.all(ids.map(id => window.api.deleteArticle(id)))
    useFeedsStore.getState().refreshUnreadCounts()
  },

  markMultipleRead: async (ids, read) => {
    set(s => ({
      articles: s.articles.map(a => ids.includes(a.id) ? { ...a, read: read ? 1 : 0 } : a)
    }))
    await Promise.all(ids.map(id => window.api.markRead(id, read)))
    useFeedsStore.getState().refreshUnreadCounts()
  },

  refresh: async () => {
    const { currentQuery } = get()
    if (Object.keys(currentQuery).length === 0) return
    get().load(currentQuery)
  }
}))
