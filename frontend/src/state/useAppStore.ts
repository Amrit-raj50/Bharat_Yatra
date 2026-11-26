import { create } from 'zustand';
import {
  fetchBackendConnections,
  fetchBackendHealth,
  fetchBackendStations,
  getDefaultApiBaseUrl,
} from '@/config/api';
import {
  BUFFER_PROFILE_EXTRA_MINUTES,
  type BufferProfile,
} from '@/config/ratingThresholds';
import { getDatabase } from '@/db/client';
import {
  importTimetableIntoDb,
  resetToBuiltInDataset,
  validateTimetablePayload,
  type ImportResult,
} from '@/db/importer';
import { SqliteTimetableRepository } from '@/db/queries';
import { findDirectTrains, searchConnections } from '@/domain/searchConnections';
import { getTodayIsoDateLocal } from '@/domain/time';
import type { ConnectionOption, DatasetMeta, DirectTrainOption, Station } from '@/domain/types';
import i18n, { detectDeviceLanguage, initI18n, type SupportedLanguage } from '@/i18n';

export interface DatabaseStats {
  stations: number;
  trains: number;
  stops: number;
  clusters: number;
  transfers: number;
}

export interface SuggestedRoute {
  fromCode: string;
  toCode: string;
  label: string;
}

export interface RecentSearch {
  fromCode: string;
  toCode: string;
}

interface AppState {
  isReady: boolean;
  initError: string | null;
  datasetMeta: DatasetMeta;
  datasetStats: DatabaseStats;
  suggestedRoutes: SuggestedRoute[];
  recentSearches: RecentSearch[];
  syncStatus: 'idle' | 'loading' | 'success' | 'error';
  syncMessage: string | null;
  language: SupportedLanguage;
  bufferProfile: BufferProfile;
  apiBaseUrl: string;
  dataSource: 'ONLINE_API' | 'LOCAL_SQLITE';
  isSearching: boolean;
  sourceStation: Station | null;
  destinationStation: Station | null;
  travelDate: string;
  results: ConnectionOption[];
  directTrains: DirectTrainOption[];
  savedConnections: ConnectionOption[];
  howItWorksDismissed: boolean;
  issueReportsCount: number;
  hasSearched: boolean;
  bootstrap: () => void;
  refreshRemoteMeta: () => Promise<boolean>;
  dismissHowItWorks: () => void;
  clearRecentSearches: () => void;
  submitIssueReport: (report: {
    trainNumber: string;
    stationCode: string;
    date: string;
    comment: string;
  }) => void;
  setApiBaseUrl: (url: string) => void;
  setLanguage: (lang: SupportedLanguage) => void;
  setBufferProfile: (profile: BufferProfile) => void;
  setSourceStation: (station: Station | null) => void;
  setDestinationStation: (station: Station | null) => void;
  swapStations: () => void;
  setTravelDate: (isoDate: string) => void;
  setTravelDateAndSearch: (isoDate: string) => void;
  searchStations: (query: string) => Station[];
  searchStationsAsync: (query: string) => Promise<Station[]>;
  selectSampleRoute: (fromCode: string, toCode: string) => void;
  runSearch: () => Promise<void>;
  getConnectionById: (id: string) => ConnectionOption | undefined;
  toggleSaveConnection: (option: ConnectionOption) => void;
  removeSavedConnection: (id: string) => void;
  isConnectionSaved: (id: string) => boolean;
  importFromUrl: (url: string) => Promise<boolean>;
  importFromJsonText: (jsonText: string) => boolean;
  resetToDefaultDataset: () => void;
  clearSyncStatus: () => void;
}

const DEFAULT_META: DatasetMeta = {
  datasetKind: 'SAMPLE',
  dataVersion: '2026.11-IN-REF',
  lastUpdated: '2026-11-25',
};

const EMPTY_STATS: DatabaseStats = {
  stations: 0,
  trains: 0,
  stops: 0,
  clusters: 0,
  transfers: 0,
};

function getRepo(): SqliteTimetableRepository {
  return new SqliteTimetableRepository(getDatabase());
}

function getRepoOrNull(): SqliteTimetableRepository | null {
  try {
    return getRepo();
  } catch {
    return null;
  }
}

function refreshDatasetState(repo: SqliteTimetableRepository) {
  const datasetMeta = repo.getDatasetMeta();
  const datasetStats = repo.getDatabaseStats();
  const suggestedRoutes = repo.getSuggestedRoutes(6);
  const recentSearches = repo.getRecentSearches();
  return { datasetMeta, datasetStats, suggestedRoutes, recentSearches };
}

function applyImportResult(
  set: (partial: Partial<AppState>) => void,
  get: () => AppState,
  result: ImportResult
): void {
  const repo = getRepo();
  const refreshed = refreshDatasetState(repo);
  const curFrom = get().sourceStation
    ? repo.getStationByCode(get().sourceStation!.code)
    : null;
  const curTo = get().destinationStation
    ? repo.getStationByCode(get().destinationStation!.code)
    : null;

  const fallbackFrom = refreshed.suggestedRoutes[0]
    ? repo.getStationByCode(refreshed.suggestedRoutes[0].fromCode)
    : null;
  const fallbackTo = refreshed.suggestedRoutes[0]
    ? repo.getStationByCode(refreshed.suggestedRoutes[0].toCode)
    : null;

  set({
    ...refreshed,
    sourceStation: curFrom ?? fallbackFrom,
    destinationStation: curTo ?? fallbackTo,
    results: [],
    directTrains: [],
    hasSearched: false,
    syncStatus: 'success',
    syncMessage: `${result.stations} stations, ${result.trains} trains, ${result.stops} stops (${result.dataVersion})`,
  });
}

export const useAppStore = create<AppState>((set, get) => ({
  isReady: false,
  initError: null,
  datasetMeta: DEFAULT_META,
  datasetStats: EMPTY_STATS,
  suggestedRoutes: [],
  recentSearches: [],
  syncStatus: 'idle',
  syncMessage: null,
  language: detectDeviceLanguage(),
  bufferProfile: 'SOLO',
  apiBaseUrl: getDefaultApiBaseUrl(),
  dataSource: 'LOCAL_SQLITE',
  isSearching: false,
  sourceStation: null,
  destinationStation: null,
  travelDate: getTodayIsoDateLocal(),
  results: [],
  directTrains: [],
  savedConnections: [],
  howItWorksDismissed: false,
  issueReportsCount: 0,
  hasSearched: false,

  bootstrap: () => {
    if (get().isReady) {
      return;
    }
    try {
      const repo = getRepo();
      const refreshed = refreshDatasetState(repo);
      const savedLang = repo.getPreference('language');
      const language: SupportedLanguage =
        savedLang === 'hi' || savedLang === 'en' ? savedLang : detectDeviceLanguage();

      const savedProfile = repo.getPreference('buffer_profile');
      const bufferProfile: BufferProfile =
        savedProfile === 'FAMILY' || savedProfile === 'EXTRA_SAFE' ? savedProfile : 'SOLO';

      const savedConnections = repo.getSavedConnections();
      const savedApiUrl = repo.getPreference('api_base_url');
      const apiBaseUrl = savedApiUrl?.trim() || getDefaultApiBaseUrl();
      const howItWorksDismissed = repo.getPreference('how_it_works_dismissed') === '1';
      let issueReportsCount = 0;
      try {
        const rawReports = repo.getPreference('issue_reports');
        if (rawReports) {
          const parsed = JSON.parse(rawReports);
          if (Array.isArray(parsed)) issueReportsCount = parsed.length;
        }
      } catch {
        issueReportsCount = 0;
      }

      initI18n(language);

      const defaultFrom =
        repo.getStationByCode('LKO') ??
        (refreshed.suggestedRoutes[0]
          ? repo.getStationByCode(refreshed.suggestedRoutes[0].fromCode)
          : null);
      const defaultTo =
        repo.getStationByCode('JP') ??
        (refreshed.suggestedRoutes[0]
          ? repo.getStationByCode(refreshed.suggestedRoutes[0].toCode)
          : null);

      set({
        isReady: true,
        initError: null,
        ...refreshed,
        language,
        bufferProfile,
        apiBaseUrl,
        savedConnections,
        howItWorksDismissed,
        issueReportsCount,
        sourceStation: get().sourceStation ?? defaultFrom,
        destinationStation: get().destinationStation ?? defaultTo,
      });
      void get().refreshRemoteMeta();
    } catch {
      const language = detectDeviceLanguage();
      initI18n(language);
      set({
        isReady: true,
        initError: null,
        language,
        sourceStation: get().sourceStation ?? {
          code: 'LKO',
          name: 'Lucknow Charbagh',
          city: 'Lucknow',
          lat: 0,
          lng: 0,
          cityClusterId: null,
        },
        destinationStation: get().destinationStation ?? {
          code: 'JP',
          name: 'Jaipur Jn',
          city: 'Jaipur',
          lat: 0,
          lng: 0,
          cityClusterId: null,
        },
      });
      void get().refreshRemoteMeta();
    }
  },

  refreshRemoteMeta: async () => {
    try {
      const health = await fetchBackendHealth(get().apiBaseUrl);
      if (health?.meta && health?.stats) {
        set({
          datasetMeta: health.meta,
          datasetStats: health.stats,
          dataSource: 'ONLINE_API',
        });
        return true;
      }
      return false;
    } catch {
      return false;
    }
  },

  dismissHowItWorks: () => {
    try {
      getRepoOrNull()?.setPreference('how_it_works_dismissed', '1');
    } catch {
      // Ignore persistence failure
    }
    set({ howItWorksDismissed: true });
  },

  clearRecentSearches: () => {
    try {
      getRepoOrNull()?.setPreference('recentSearches', '[]');
    } catch {
      // Ignore persistence failure
    }
    set({ recentSearches: [] });
  },

  submitIssueReport: (report) => {
    const entry = { ...report, createdAt: new Date().toISOString() };
    let nextCount = get().issueReportsCount + 1;
    try {
      const repo = getRepoOrNull();
      if (repo) {
        const raw = repo.getPreference('issue_reports');
        const list = raw ? (JSON.parse(raw) as unknown[]) : [];
        const updated = Array.isArray(list) ? [entry, ...list] : [entry];
        repo.setPreference('issue_reports', JSON.stringify(updated));
        nextCount = updated.length;
      }
    } catch {
      // Keep in-memory count
    }
    set({ issueReportsCount: nextCount });
  },

  setApiBaseUrl: (url) => {
    const clean = url.trim().replace(/\/+$/, '') || getDefaultApiBaseUrl();
    try {
      getRepo().setPreference('api_base_url', clean);
    } catch {
      // Ignore persistence failure
    }
    set({ apiBaseUrl: clean });
    void get().refreshRemoteMeta();
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

  setBufferProfile: (profile) => {
    try {
      getRepo().setPreference('buffer_profile', profile);
    } catch {
      // Ignore persistence failure
    }
    set({ bufferProfile: profile });
    if (get().hasSearched) {
      void get().runSearch();
    }
  },

  setSourceStation: (station) => set({ sourceStation: station }),

  setDestinationStation: (station) => set({ destinationStation: station }),

  swapStations: () =>
    set((state) => ({
      sourceStation: state.destinationStation,
      destinationStation: state.sourceStation,
    })),

  setTravelDate: (isoDate) => set({ travelDate: isoDate }),

  setTravelDateAndSearch: (isoDate) => {
    set({ travelDate: isoDate });
    void get().runSearch();
  },

  searchStations: (query) => {
    try {
      return getRepo().searchStations(query, 30);
    } catch {
      return [];
    }
  },

  searchStationsAsync: async (query) => {
    try {
      const remote = await fetchBackendStations(get().apiBaseUrl, query, 30);
      return remote;
    } catch {
      return get().searchStations(query);
    }
  },

  selectSampleRoute: (fromCode, toCode) => {
    const repo = getRepoOrNull();
    const from = repo?.getStationByCode(fromCode) ?? {
      code: fromCode,
      name: fromCode,
      city: fromCode,
      lat: 0,
      lng: 0,
      cityClusterId: null,
    };
    const to = repo?.getStationByCode(toCode) ?? {
      code: toCode,
      name: toCode,
      city: toCode,
      lat: 0,
      lng: 0,
      cityClusterId: null,
    };
    set({ sourceStation: from, destinationStation: to });
  },

  runSearch: async () => {
    const { sourceStation, destinationStation, travelDate, bufferProfile, apiBaseUrl } = get();
    if (!sourceStation || !destinationStation || sourceStation.code === destinationStation.code) {
      set({ results: [], directTrains: [], hasSearched: true, isSearching: false });
      return;
    }

    const repo = getRepoOrNull();
    const extraBufferMinutes = BUFFER_PROFILE_EXTRA_MINUTES[bufferProfile];
    if (repo) {
      try {
        repo.addRecentSearch(sourceStation.code, destinationStation.code);
      } catch {
        // Non-fatal if preference write fails
      }
    }

    set({
      isSearching: true,
      hasSearched: true,
      recentSearches: repo ? repo.getRecentSearches() : get().recentSearches,
    });

    try {
      const remote = await fetchBackendConnections(apiBaseUrl, {
        from: sourceStation.code,
        to: destinationStation.code,
        date: travelDate,
        extraBuffer: extraBufferMinutes,
      });
      set({
        results: remote.connections,
        directTrains: remote.directTrains ?? [],
        dataSource: 'ONLINE_API',
        isSearching: false,
      });
    } catch {
      if (!repo) {
        set({
          results: [],
          directTrains: [],
          dataSource: 'ONLINE_API',
          isSearching: false,
        });
        return;
      }
      const results = searchConnections(repo, {
        sourceCode: sourceStation.code,
        destinationCode: destinationStation.code,
        travelDate,
        extraBufferMinutes,
      });
      const directTrains = findDirectTrains(repo, {
        sourceCode: sourceStation.code,
        destinationCode: destinationStation.code,
        travelDate,
      });
      set({
        results,
        directTrains,
        dataSource: 'LOCAL_SQLITE',
        isSearching: false,
      });
    }
  },

  getConnectionById: (id) =>
    get().results.find((item) => item.id === id) ??
    get().savedConnections.find((item) => item.id === id),

  toggleSaveConnection: (option) => {
    const current = get().savedConnections;
    const exists = current.some((item) => item.id === option.id);
    const updated = exists
      ? current.filter((item) => item.id !== option.id)
      : [option, ...current].slice(0, 15);
    try {
      getRepo().setSavedConnections(updated);
    } catch {
      // Ignore persistence failure
    }
    set({ savedConnections: updated });
  },

  removeSavedConnection: (id) => {
    const updated = get().savedConnections.filter((item) => item.id !== id);
    try {
      getRepo().setSavedConnections(updated);
    } catch {
      // Ignore persistence failure
    }
    set({ savedConnections: updated });
  },

  isConnectionSaved: (id) => get().savedConnections.some((item) => item.id === id),

  importFromUrl: async (url) => {
    const trimmed = url.trim();
    if (!trimmed) {
      set({ syncStatus: 'error', syncMessage: 'Please enter a valid JSON URL.' });
      return false;
    }
    set({ syncStatus: 'loading', syncMessage: null });
    try {
      const response = await fetch(trimmed);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status} ${response.statusText}`);
      }
      const raw: unknown = await response.json();
      const payload = validateTimetablePayload(raw);
      const result = importTimetableIntoDb(getDatabase(), payload);
      applyImportResult(set, get, result);
      return true;
    } catch (error) {
      set({
        syncStatus: 'error',
        syncMessage: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  },

  importFromJsonText: (jsonText) => {
    set({ syncStatus: 'loading', syncMessage: null });
    try {
      const raw: unknown = JSON.parse(jsonText);
      const payload = validateTimetablePayload(raw);
      const result = importTimetableIntoDb(getDatabase(), payload);
      applyImportResult(set, get, result);
      return true;
    } catch (error) {
      set({
        syncStatus: 'error',
        syncMessage: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  },

  resetToDefaultDataset: () => {
    set({ syncStatus: 'loading', syncMessage: null });
    try {
      const result = resetToBuiltInDataset(getDatabase());
      applyImportResult(set, get, result);
    } catch (error) {
      set({
        syncStatus: 'error',
        syncMessage: error instanceof Error ? error.message : String(error),
      });
    }
  },

  clearSyncStatus: () => set({ syncStatus: 'idle', syncMessage: null }),
}));
