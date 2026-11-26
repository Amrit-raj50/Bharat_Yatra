import type { BufferRating } from '@/domain/types';

export const COLORS = {
  primary: '#0D47A1',
  primaryDark: '#08306B',
  primarySoft: '#E8F0FE',
  accent: '#F57C00',
  accentSoft: '#FFF3E0',
  surface: '#FFFFFF',
  background: '#F2F5FA',
  text: '#1A1F2B',
  muted: '#6B7685',
  divider: '#E3E8EF',
  white: '#FFFFFF',
  badgeBg: '#EEF1F5',
} as const;

export interface StatusStyle {
  text: string;
  bg: string;
  border: string;
  icon: 'alert-circle' | 'check-circle-outline' | 'check-decagram' | 'clock-outline' | 'help-circle-outline';
}

export const STATUS_COLORS: Record<BufferRating, StatusStyle> = {
  TIGHT: {
    text: '#C62828',
    bg: '#FDECEA',
    border: '#F5C2C0',
    icon: 'alert-circle',
  },
  OK: {
    text: '#B26A00',
    bg: '#FFF4DB',
    border: '#F7D99C',
    icon: 'check-circle-outline',
  },
  COMFORTABLE: {
    text: '#1B7F3B',
    bg: '#E6F6EC',
    border: '#A7DFB9',
    icon: 'check-decagram',
  },
  TOO_LONG: {
    text: '#5F6B7A',
    bg: '#EEF1F5',
    border: '#D5DCE4',
    icon: 'clock-outline',
  },
  TRANSFER_UNKNOWN: {
    text: '#6A3FB5',
    bg: '#F1EBFA',
    border: '#D4C2F0',
    icon: 'help-circle-outline',
  },
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
} as const;

export const RADII = {
  sm: 8,
  md: 10,
  card: 14,
  pill: 999,
} as const;

export const TYPOGRAPHY = {
  screenTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: COLORS.text,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: COLORS.text,
  },
  body: {
    fontSize: 14,
    fontWeight: '400' as const,
    color: COLORS.text,
  },
  caption: {
    fontSize: 12,
    fontWeight: '400' as const,
    color: COLORS.muted,
  },
  bigTime: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: COLORS.text,
    fontVariant: ['tabular-nums' as const],
  },
} as const;

export const TOUCH_MIN = 48;

export const ELEVATION = {
  card: {
    shadowColor: '#0D47A1',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  subtle: {
    shadowColor: '#1A1F2B',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
} as const;
