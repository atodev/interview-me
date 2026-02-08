export const colors = {
  // Core palette — dark-first, bold gradients
  background: '#0A0A0F',
  surface: '#14141F',
  surfaceLight: '#1E1E2E',
  card: '#1A1A2E',

  // Brand gradient
  gradientStart: '#6C5CE7',
  gradientMid: '#A855F7',
  gradientEnd: '#EC4899',

  // Accent
  primary: '#A855F7',
  primaryMuted: 'rgba(168, 85, 247, 0.15)',
  secondary: '#6C5CE7',
  accent: '#EC4899',

  // Text
  textPrimary: '#F8F8FF',
  textSecondary: '#9CA3AF',
  textMuted: '#6B7280',

  // Semantic
  success: '#10B981',
  successMuted: 'rgba(16, 185, 129, 0.15)',
  warning: '#F59E0B',
  warningMuted: 'rgba(245, 158, 11, 0.15)',
  error: '#EF4444',
  errorMuted: 'rgba(239, 68, 68, 0.15)',

  // Score colors
  scoreExcellent: '#10B981',
  scoreGood: '#6C5CE7',
  scoreAverage: '#F59E0B',
  scoreNeedsWork: '#EF4444',

  // Borders
  border: 'rgba(255, 255, 255, 0.08)',
  borderLight: 'rgba(255, 255, 255, 0.15)',

  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const borderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 999,
} as const;

export const fontSize = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 24,
  xxl: 32,
  hero: 40,
} as const;

export const fontWeight = {
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
  black: '900' as const,
};
