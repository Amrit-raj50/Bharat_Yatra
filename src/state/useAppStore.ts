import { create } from 'zustand';
import { getDatabase } from '@/db/client';
import { SqliteTimetableRepository } from '@/db/queries';
import { searchConnections } from '@/domain/searchConnections';
import { getTodayIsoDateLocal } from '@/domain/time';
import type { ConnectionOption, DatasetMeta, Station } from '@/domain/types';
import i18n, { detectDeviceLanguage, initI18n, type SupportedLanguage } from '@/i18n';

interface AppState {
  isReady: boolean;
  initError: string | null;
  datasetMeta: DatasetMeta;
  language: SupportedLanguage;
  sourceStation: Station | null;
  destinationStation: Station | null;
  travelDate: string;
  results: ConnectionOption[];
  hasSearched: boolean;
  bootstrap: () => void;
  setLanguage: (lang: SupportedLanguage) => void;
  setSourceStation: (station: Station | null) => void;
  setDestinationStation: (station: Station | null) => void;
  swapStations: () => void;
  setTravelDate: (isoDate: string) => void;
  searchStations: (query: string) => Station[];
  selectSampleRoute: (fromCode: string, toCode: string) => void;
  runSearch: () => void;
  getConnectionById: (id: string) => ConnectionOption | undefined;
}

const DEFAULT_META: DatasetMeta = {
  datasetKind: 'SAMPLE',
  dataVersion: '0.1.0-SAMPLE',
  lastUpdated: '2026-11-24',
};

function getRepo(): SqliteTimetableRepository {
  return new SqliteTimetableRepository(getDatabase());
}

export const useAppStore = create<AppState>((set, get) => ({
  isReady: false,
  initError: null,
  datasetMeta: DEFAULT_META,
  language: detectDeviceLanguage(),
  sourceStation: null,
  destinationStation: null,
  travelDate: getTodayIsoDateLocal(),
  results: [],
  hasSearched: false,

  bootstrap: () => {
    if (get().isReady) {
      return;
    }
    try {
      const repo = getRepo();
      const meta = repo.getDatasetMeta();
      const savedLang = repo.getPreference('language');
      const language: SupportedLanguage =
        savedLang === 'hi' || savedLang === 'en' ? savedLang : detectDeviceLanguage();

      initI18n(language);

      // Pre-select a default SAMPLE route only when empty so first launch isn't blank
      const defaultFrom = repo.getStationByCode('LKO');
      const defaultTo = repo.getStationByCode('JP');

      set({
        isReady: true,
        initError: null,
        datasetMeta: meta,
        language,
        sourceStation: get().sourceStation ?? defaultFrom,
        destinationStation: get().destinationStation ?? defaultTo,
      });
    } catch (error) {
      initI18n();
      set({
        isReady: false,
        initError: error instanceof Error ? error.message : String(error),
      });
    }
  },

  setLanguage: (lang) => {
    try {
      getRepo().setPreference('language', lang);
    } catch {
      // Ignore persistence failure if DB unavailable; still switch UI language
    }
    void i18n.changeLanguage(lang);
    set({ language: lang });
  },

  setSourceStation: (station) => set({ sourceStation: station }),

  setDestinationStation: (station) => set({ destinationStation: station }),

  swapStations: () =>
    set((state) => ({
      sourceStation: state.destinationStation,
      destinationStation: state.sourceStation,
    })),

  setTravelDate: (isoDate) => set({ travelDate: isoDate }),

  searchStations: (query) => {
    try {
      return getRepo().searchStations(query, 25);
    } catch {
      return [];
    }
  },

  selectSampleRoute: (fromCode, toCode) => {
    try {
      const repo = getRepo();
      const from = repo.getStationByCode(fromCode);
      const to = repo.getStationByCode(toCode);
      if (from && to) {
        set({ sourceStation: from, destinationStation: to });
      }
    } catch {
      // Ignore if DB not initialized
    }
  },

  runSearch: () => {
    const { sourceStation, destinationStation, travelDate } = get();
    if (!sourceStation || !destinationStation || sourceStation.code === destinationStation.code) {
      set({ results: [], hasSearched: true });
      return;
    }
    const repo = getRepo();
    const results = searchConnections(repo, {
      sourceCode: sourceStation.code,
      destinationCode: destinationStation.code,
      travelDate,
    });
    set({ results, hasSearched: true });
  },

  getConnectionById: (id) => get().results.find((item) => item.id === id),
}));
