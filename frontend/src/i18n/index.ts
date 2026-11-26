import { getLocales } from 'expo-localization';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './en.json';
import hi from './hi.json';

export type SupportedLanguage = 'en' | 'hi';

export function detectDeviceLanguage(): SupportedLanguage {
  try {
    const primary = getLocales()[0]?.languageCode;
    return primary === 'hi' ? 'hi' : 'en';
  } catch {
    return 'en';
  }
}

export function initI18n(initialLanguage?: SupportedLanguage): void {
  const lng = initialLanguage ?? detectDeviceLanguage();
  if (!i18n.isInitialized) {
    i18n.use(initReactI18next).init({
      resources: {
        en: { translation: en },
        hi: { translation: hi },
      },
      lng,
      fallbackLng: 'en',
      interpolation: {
        escapeValue: false,
      },
    });
  } else if (i18n.language !== lng) {
    void i18n.changeLanguage(lng);
  }
}

export default i18n;
