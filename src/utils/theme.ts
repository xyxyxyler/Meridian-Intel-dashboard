import { useEffect, useState } from 'react';
import type { ThemeMode } from '../types/intelligence.ts';

export const THEME_STORAGE_KEY = 'meridian_theme_mode';

export function getSystemPreference(): 'dark' | 'light' {
  if (typeof window === 'undefined') return 'dark';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function getStoredThemeMode(): ThemeMode {
  if (typeof window === 'undefined') return 'system';
  try {
    const raw = localStorage.getItem(THEME_STORAGE_KEY);
    if (raw === 'light' || raw === 'dark' || raw === 'system') {
      return raw;
    }
  } catch {
    // Ignore localStorage access restrictions
  }
  return 'system';
}

export function resolveTheme(mode: ThemeMode): 'dark' | 'light' {
  if (mode === 'system') {
    return getSystemPreference();
  }
  return mode;
}

export function applyThemeToDocument(mode: ThemeMode): 'dark' | 'light' {
  if (typeof document === 'undefined') return 'dark';

  const resolved = resolveTheme(mode);

  // Update <meta name="color-scheme">
  let meta = document.querySelector<HTMLMetaElement>('meta[name="color-scheme"]');
  if (!meta) {
    meta = document.createElement('meta');
    meta.name = 'color-scheme';
    document.head.appendChild(meta);
  }
  meta.content = mode === 'system' ? 'light dark' : mode;

  // Update class and attribute on root element
  const root = document.documentElement;
  root.classList.remove('dark', 'light');
  root.classList.add(resolved);
  root.setAttribute('data-theme', resolved);

  return resolved;
}

export function useTheme(initialMode?: ThemeMode) {
  const [themeMode, setThemeModeState] = useState<ThemeMode>(() => {
    return initialMode || getStoredThemeMode();
  });
  const [resolvedTheme, setResolvedTheme] = useState<'dark' | 'light'>(() => {
    return resolveTheme(initialMode || getStoredThemeMode());
  });

  const setThemeMode = (newMode: ThemeMode) => {
    setThemeModeState(newMode);
    try {
      if (newMode === 'system') {
        localStorage.removeItem(THEME_STORAGE_KEY);
      } else {
        localStorage.setItem(THEME_STORAGE_KEY, newMode);
      }
    } catch {
      // Storage quota or permission error
    }
    const resolved = applyThemeToDocument(newMode);
    setResolvedTheme(resolved);
  };

  const toggleTheme = () => {
    // Two-state toggle: switches to the opposite of current resolved theme
    const nextTheme: ThemeMode = resolvedTheme === 'dark' ? 'light' : 'dark';
    setThemeMode(nextTheme);
  };

  useEffect(() => {
    // Initial sync
    const resolved = applyThemeToDocument(themeMode);
    setResolvedTheme(resolved);

    // Listen for OS system theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleMediaChange = () => {
      if (themeMode === 'system') {
        const nextResolved = applyThemeToDocument('system');
        setResolvedTheme(nextResolved);
      }
    };

    // Listen for storage events across tabs
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === THEME_STORAGE_KEY) {
        const nextMode = (e.newValue as ThemeMode) || 'system';
        setThemeModeState(nextMode);
        const nextResolved = applyThemeToDocument(nextMode);
        setResolvedTheme(nextResolved);
      }
    };

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleMediaChange);
    } else {
      mediaQuery.addListener(handleMediaChange);
    }
    window.addEventListener('storage', handleStorageChange);

    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleMediaChange);
      } else {
        mediaQuery.removeListener(handleMediaChange);
      }
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [themeMode]);

  return {
    themeMode,
    resolvedTheme,
    isDark: resolvedTheme === 'dark',
    setThemeMode,
    toggleTheme,
  };
}
