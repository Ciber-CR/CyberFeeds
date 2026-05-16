import { create } from 'zustand'
import type { AppSettings } from '../types'
import { DEFAULT_SETTINGS } from '../types'

interface SettingsState {
  settings: AppSettings
  loaded: boolean

  load: () => Promise<void>
  save: (s: AppSettings) => Promise<void>
  update: (partial: Partial<AppSettings>) => void
  togglePolling: () => Promise<void>
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: DEFAULT_SETTINGS,
  loaded: false,

  load: async () => {
    const settings = await window.api.getSettings()
    set({ settings: { ...DEFAULT_SETTINGS, ...settings }, loaded: true })
  },

  save: async (s) => {
    set({ settings: s })
    await window.api.saveSettings(s)
  },

  update: (partial) => {
    const updated = { ...get().settings, ...partial }
    set({ settings: updated })
    window.api.saveSettings(updated)
  },

  togglePolling: async () => {
    await window.api.togglePolling()
    const settings = await window.api.getSettings()
    set({ settings: { ...get().settings, ...settings } })
  }
}))
