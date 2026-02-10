'use client';

import { create } from 'zustand';
import { useEffect } from 'react';

// ============================================================
// THEME DEFINITIONS
// ============================================================

export const themes = {
  'midnight-modern': {
    name: 'Midnight Modern',
    dark: {
      '--bg': '#080C15',
      '--surface': '#111827',
      '--surface-alt': '#1A2236',
      '--surface-hover': '#1F2A40',
      '--primary': '#10B981',
      '--primary-hover': '#059669',
      '--primary-muted': '#064E3B',
      '--primary-glow': 'rgba(16, 185, 129, 0.15)',
      '--accent': '#8B5CF6',
      '--accent-muted': '#4C1D95',
      '--text': '#F1F5F9',
      '--text-secondary': '#CBD5E1',
      '--text-muted': '#64748B',
      '--text-faint': '#475569',
      '--border': '#1E293B',
      '--border-light': '#334155',
      '--error': '#EF4444',
      '--error-bg': 'rgba(127, 29, 29, 0.13)',
      '--success': '#10B981',
      '--warning': '#F59E0B',
      '--input-bg': 'rgba(26, 34, 54, 0.5)',
      '--input-border': '#334155',
      '--input-focus': '#10B981',
      '--card-shadow': '0 8px 32px rgba(0, 0, 0, 0.4)',
      '--glow-shadow': '0 0 40px rgba(16, 185, 129, 0.08)',
      '--gradient-bg': 'radial-gradient(ellipse at 20% 0%, rgba(16, 185, 129, 0.06) 0%, transparent 50%), radial-gradient(ellipse at 80% 100%, rgba(139, 92, 246, 0.04) 0%, transparent 50%), #080C15',
    },
    light: {
      '--bg': '#F8FAFC',
      '--surface': '#FFFFFF',
      '--surface-alt': '#F1F5F9',
      '--surface-hover': '#E2E8F0',
      '--primary': '#059669',
      '--primary-hover': '#047857',
      '--primary-muted': '#D1FAE5',
      '--primary-glow': 'rgba(5, 150, 105, 0.08)',
      '--accent': '#7C3AED',
      '--accent-muted': '#EDE9FE',
      '--text': '#0F172A',
      '--text-secondary': '#334155',
      '--text-muted': '#64748B',
      '--text-faint': '#94A3B8',
      '--border': '#E2E8F0',
      '--border-light': '#F1F5F9',
      '--error': '#DC2626',
      '--error-bg': '#FEF2F2',
      '--success': '#059669',
      '--warning': '#D97706',
      '--input-bg': '#F8FAFC',
      '--input-border': '#D1D5DB',
      '--input-focus': '#059669',
      '--card-shadow': '0 4px 24px rgba(0, 0, 0, 0.06), 0 1px 2px rgba(0, 0, 0, 0.04)',
      '--glow-shadow': '0 0 40px rgba(5, 150, 105, 0.06)',
      '--gradient-bg': 'radial-gradient(ellipse at 20% 0%, rgba(5, 150, 105, 0.04) 0%, transparent 50%), radial-gradient(ellipse at 80% 100%, rgba(124, 58, 237, 0.03) 0%, transparent 50%), #F8FAFC',
    },
  },
  'warm-earth': {
    name: 'Warm Earth',
    dark: {
      '--bg': '#1A1008',
      '--surface': '#261C10',
      '--surface-alt': '#332515',
      '--surface-hover': '#3D2E1A',
      '--primary': '#E87B35',
      '--primary-hover': '#C2410C',
      '--primary-muted': '#5C2D0E',
      '--primary-glow': 'rgba(232, 123, 53, 0.15)',
      '--accent': '#15803D',
      '--accent-muted': '#0A3D1C',
      '--text': '#FDF4EC',
      '--text-secondary': '#D4BFA8',
      '--text-muted': '#9A7460',
      '--text-faint': '#6D5240',
      '--border': '#3D2E1A',
      '--border-light': '#4A3820',
      '--error': '#EF4444',
      '--error-bg': 'rgba(127, 29, 29, 0.13)',
      '--success': '#15803D',
      '--warning': '#F59E0B',
      '--input-bg': 'rgba(51, 37, 21, 0.5)',
      '--input-border': '#4A3820',
      '--input-focus': '#E87B35',
      '--card-shadow': '0 8px 32px rgba(0, 0, 0, 0.4)',
      '--glow-shadow': '0 0 40px rgba(232, 123, 53, 0.08)',
      '--gradient-bg': 'radial-gradient(ellipse at 20% 0%, rgba(232, 123, 53, 0.06) 0%, transparent 50%), radial-gradient(ellipse at 80% 100%, rgba(21, 128, 61, 0.04) 0%, transparent 50%), #1A1008',
    },
    light: {
      '--bg': '#FFF8F0',
      '--surface': '#FFFFFF',
      '--surface-alt': '#FEF0E4',
      '--surface-hover': '#FDE8D0',
      '--primary': '#C2410C',
      '--primary-hover': '#A93509',
      '--primary-muted': '#FED7AA',
      '--primary-glow': 'rgba(194, 65, 12, 0.08)',
      '--accent': '#15803D',
      '--accent-muted': '#DCFCE7',
      '--text': '#3C1A08',
      '--text-secondary': '#6D3A1A',
      '--text-muted': '#9A7460',
      '--text-faint': '#C4A68E',
      '--border': '#F5DCC8',
      '--border-light': '#FEF0E4',
      '--error': '#DC2626',
      '--error-bg': '#FEF2F2',
      '--success': '#15803D',
      '--warning': '#D97706',
      '--input-bg': '#FFF8F0',
      '--input-border': '#E8CDB5',
      '--input-focus': '#C2410C',
      '--card-shadow': '0 4px 24px rgba(194, 65, 12, 0.08)',
      '--glow-shadow': '0 0 40px rgba(194, 65, 12, 0.06)',
      '--gradient-bg': 'radial-gradient(ellipse at 20% 0%, rgba(194, 65, 12, 0.04) 0%, transparent 50%), radial-gradient(ellipse at 80% 100%, rgba(21, 128, 61, 0.03) 0%, transparent 50%), #FFF8F0',
    },
  },
  'nordic-calm': {
    name: 'Nordic Calm',
    dark: {
      '--bg': '#0A1019',
      '--surface': '#111827',
      '--surface-alt': '#172035',
      '--surface-hover': '#1E293B',
      '--primary': '#0EA5E9',
      '--primary-hover': '#0284C7',
      '--primary-muted': '#0C4A6E',
      '--primary-glow': 'rgba(14, 165, 233, 0.15)',
      '--accent': '#0891B2',
      '--accent-muted': '#164E63',
      '--text': '#F1F5F9',
      '--text-secondary': '#CBD5E1',
      '--text-muted': '#64748B',
      '--text-faint': '#475569',
      '--border': '#1E293B',
      '--border-light': '#334155',
      '--error': '#EF4444',
      '--error-bg': 'rgba(127, 29, 29, 0.13)',
      '--success': '#10B981',
      '--warning': '#F59E0B',
      '--input-bg': 'rgba(23, 32, 53, 0.5)',
      '--input-border': '#334155',
      '--input-focus': '#0EA5E9',
      '--card-shadow': '0 8px 32px rgba(0, 0, 0, 0.4)',
      '--glow-shadow': '0 0 40px rgba(14, 165, 233, 0.08)',
      '--gradient-bg': 'radial-gradient(ellipse at 20% 0%, rgba(14, 165, 233, 0.06) 0%, transparent 50%), radial-gradient(ellipse at 80% 100%, rgba(8, 145, 178, 0.04) 0%, transparent 50%), #0A1019',
    },
    light: {
      '--bg': '#F8FAFC',
      '--surface': '#FFFFFF',
      '--surface-alt': '#F1F5F9',
      '--surface-hover': '#E2E8F0',
      '--primary': '#0369A1',
      '--primary-hover': '#075985',
      '--primary-muted': '#BAE6FD',
      '--primary-glow': 'rgba(3, 105, 161, 0.06)',
      '--accent': '#0891B2',
      '--accent-muted': '#CFFAFE',
      '--text': '#0C1829',
      '--text-secondary': '#334155',
      '--text-muted': '#64748B',
      '--text-faint': '#94A3B8',
      '--border': '#E2E8F0',
      '--border-light': '#F1F5F9',
      '--error': '#DC2626',
      '--error-bg': '#FEF2F2',
      '--success': '#059669',
      '--warning': '#D97706',
      '--input-bg': '#F8FAFC',
      '--input-border': '#D1D5DB',
      '--input-focus': '#0369A1',
      '--card-shadow': '0 1px 12px rgba(3, 105, 161, 0.06)',
      '--glow-shadow': '0 0 40px rgba(3, 105, 161, 0.04)',
      '--gradient-bg': 'radial-gradient(ellipse at 20% 0%, rgba(3, 105, 161, 0.04) 0%, transparent 50%), radial-gradient(ellipse at 80% 100%, rgba(8, 145, 178, 0.03) 0%, transparent 50%), #F8FAFC',
    },
  },
  'garden-fresh': {
    name: 'Garden Fresh',
    dark: {
      '--bg': '#0A150D',
      '--surface': '#121F16',
      '--surface-alt': '#1A2E1F',
      '--surface-hover': '#223828',
      '--primary': '#22C55E',
      '--primary-hover': '#16A34A',
      '--primary-muted': '#14532D',
      '--primary-glow': 'rgba(34, 197, 94, 0.15)',
      '--accent': '#EAB308',
      '--accent-muted': '#713F12',
      '--text': '#F0FDF4',
      '--text-secondary': '#BBF7D0',
      '--text-muted': '#4D7C5B',
      '--text-faint': '#365E42',
      '--border': '#1A2E1F',
      '--border-light': '#223828',
      '--error': '#EF4444',
      '--error-bg': 'rgba(127, 29, 29, 0.13)',
      '--success': '#22C55E',
      '--warning': '#EAB308',
      '--input-bg': 'rgba(26, 46, 31, 0.5)',
      '--input-border': '#223828',
      '--input-focus': '#22C55E',
      '--card-shadow': '0 8px 32px rgba(0, 0, 0, 0.4)',
      '--glow-shadow': '0 0 40px rgba(34, 197, 94, 0.08)',
      '--gradient-bg': 'radial-gradient(ellipse at 20% 0%, rgba(34, 197, 94, 0.06) 0%, transparent 50%), radial-gradient(ellipse at 80% 100%, rgba(234, 179, 8, 0.04) 0%, transparent 50%), #0A150D',
    },
    light: {
      '--bg': '#F0FDF4',
      '--surface': '#FFFFFF',
      '--surface-alt': '#ECFCCB',
      '--surface-hover': '#D9F99D',
      '--primary': '#15803D',
      '--primary-hover': '#166534',
      '--primary-muted': '#BBF7D0',
      '--primary-glow': 'rgba(21, 128, 61, 0.08)',
      '--accent': '#CA8A04',
      '--accent-muted': '#FEF9C3',
      '--text': '#14281D',
      '--text-secondary': '#2D5A3C',
      '--text-muted': '#4D7C5B',
      '--text-faint': '#86B396',
      '--border': '#D1FAE5',
      '--border-light': '#ECFDF5',
      '--error': '#DC2626',
      '--error-bg': '#FEF2F2',
      '--success': '#15803D',
      '--warning': '#CA8A04',
      '--input-bg': '#F0FDF4',
      '--input-border': '#A7F3D0',
      '--input-focus': '#15803D',
      '--card-shadow': '0 4px 20px rgba(21, 128, 61, 0.08)',
      '--glow-shadow': '0 0 40px rgba(21, 128, 61, 0.06)',
      '--gradient-bg': 'radial-gradient(ellipse at 20% 0%, rgba(21, 128, 61, 0.04) 0%, transparent 50%), radial-gradient(ellipse at 80% 100%, rgba(202, 138, 4, 0.03) 0%, transparent 50%), #F0FDF4',
    },
  },
} as const;

export type ThemePreset = keyof typeof themes;
export type ThemeMode = 'dark' | 'light';

// Master platform theme
export const MASTER_THEME: ThemePreset = 'midnight-modern';

// ============================================================
// THEME STORE (Zustand)
// ============================================================

interface ThemeState {
  mode: ThemeMode;
  preset: ThemePreset;
  setMode: (mode: ThemeMode) => void;
  toggleMode: () => void;
  setPreset: (preset: ThemePreset) => void;
}

export const useThemeStore = create<ThemeState>((set) => ({
  mode: 'dark', // will be overridden by system preference
  preset: MASTER_THEME,
  setMode: (mode) => {
    localStorage.setItem('nabora-theme-mode', mode);
    set({ mode });
  },
  toggleMode: () =>
    set((state) => {
      const newMode = state.mode === 'dark' ? 'light' : 'dark';
      localStorage.setItem('nabora-theme-mode', newMode);
      return { mode: newMode };
    }),
  setPreset: (preset) => set({ preset }),
}));

// ============================================================
// THEME PROVIDER COMPONENT
// ============================================================

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { mode, preset, setMode } = useThemeStore();

  // Detect system preference on mount
  useEffect(() => {
    const saved = localStorage.getItem('nabora-theme-mode') as ThemeMode | null;
    if (saved) {
      setMode(saved);
    } else {
      const prefersDark = window.matchMedia(
        '(prefers-color-scheme: dark)'
      ).matches;
      setMode(prefersDark ? 'dark' : 'light');
    }

    // Listen for system preference changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => {
      // Only follow system if user hasn't manually chosen
      if (!localStorage.getItem('nabora-theme-mode')) {
        setMode(e.matches ? 'dark' : 'light');
      }
    };
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, [setMode]);

  // Apply CSS variables to document
  useEffect(() => {
    const themeVars = themes[preset][mode];
    const root = document.documentElement;

    Object.entries(themeVars).forEach(([key, value]) => {
      root.style.setProperty(key, value);
    });

    // Set data attribute for Tailwind dark mode if needed
    root.setAttribute('data-theme', mode);
  }, [mode, preset]);

  return <>{children}</>;
}