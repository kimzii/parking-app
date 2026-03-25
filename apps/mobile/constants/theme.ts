/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import { Platform } from 'react-native';

const tintColorLight = '#0a7ea4';
const tintColorDark = '#fff';

export const Colors = {
  light: {
    text: '#11181C',
    background: '#fff',
    tint: tintColorLight,
    icon: '#687076',
    tabIconDefault: '#687076',
    tabIconSelected: tintColorLight,
  },
  dark: {
    text: '#ECEDEE',
    background: '#151718',
    tint: tintColorDark,
    icon: '#9BA1A6',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: tintColorDark,
  },
};

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});

/** Spacing scale (multiples of 4) */
export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

/** Border radius scale */
export const Radius = {
  xs: 6,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  pill: 999,
} as const;

/** Typography presets */
export const Typography = {
  heading:    { fontSize: 24, fontWeight: '800' as const, letterSpacing: -0.3 },
  subheading: { fontSize: 20, fontWeight: '800' as const },
  title:      { fontSize: 16, fontWeight: '700' as const },
  subtitle:   { fontSize: 15, fontWeight: '700' as const },
  body:       { fontSize: 14, fontWeight: '400' as const },
  bodyMed:    { fontSize: 14, fontWeight: '600' as const },
  caption:    { fontSize: 12, fontWeight: '400' as const },
  label:      { fontSize: 13, fontWeight: '700' as const, textTransform: 'uppercase' as const, letterSpacing: 0.5 },
} as const;

/** Shadow / elevation presets */
export const Shadows = {
  subtle: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  strong: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 4,
  },
} as const;

/** Unified reservation status config — use this in every host screen */
export const StatusColors = {
  PENDING: {
    color: '#D4501E',
    bg: '#FFF0EC',
    label: 'Pending Approval',
    icon: 'hourglass-top',
  },
  CONFIRMED: {
    color: '#D4501E',
    bg: '#FFF0EC',
    label: 'Confirmed',
    icon: 'directions-car',
  },
  ACTIVE: {
    color: '#4CAF50',
    bg: '#F0FBF1',
    label: 'Active',
    icon: 'directions-car',
  },
  COMPLETED: {
    color: '#A09A94',
    bg: '#F5F5F5',
    label: 'Completed',
    icon: 'done-all',
  },
  CANCELLED: {
    color: '#E53935',
    bg: '#FFEBEE',
    label: 'Cancelled',
    icon: 'cancel',
  },
  EXPIRED: {
    color: '#9E9E9E',
    bg: '#F5F5F5',
    label: 'Expired',
    icon: 'timer-off',
  },
} as const;
