import { useSettingsStore } from '../store/settings.store'
import { translations } from '@shared/translations'

export function useTranslation() {
  const settings = useSettingsStore((state) => state.settings)
  const language = settings.language || 'en'
  const t = translations[language] || translations.en
  return { t, language }
}
