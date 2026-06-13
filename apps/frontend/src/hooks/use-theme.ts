'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  applyTheme,
  getStoredPreference,
  getSystemTheme,
  resolveTheme,
  setThemePreference,
  subscribeToSystemTheme,
  type ResolvedTheme,
  type ThemePreference,
} from '@/lib/theme';

export function useTheme() {
  const [preference, setPreference] = useState<ThemePreference | null>(null);
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>('light');

  useEffect(() => {
    const stored = getStoredPreference();
    setPreference(stored ?? 'system');
    setResolvedTheme(applyTheme(stored));

    return subscribeToSystemTheme((systemTheme) => {
      const currentPreference = getStoredPreference();
      if (!currentPreference || currentPreference === 'system') {
        setResolvedTheme(applyTheme('system'));
        setPreference('system');
      } else {
        setResolvedTheme(resolveTheme(currentPreference));
      }
    });
  }, []);

  const toggleTheme = useCallback(() => {
    const nextResolved = resolveTheme(getStoredPreference()) === 'dark' ? 'light' : 'dark';
    setThemePreference(nextResolved);
    setPreference(nextResolved);
    setResolvedTheme(nextResolved);
  }, []);

  const useSystemTheme = useCallback(() => {
    setThemePreference('system');
    setPreference('system');
    setResolvedTheme(applyTheme('system'));
  }, []);

  return {
    preference: preference ?? 'system',
    resolvedTheme,
    isDark: resolvedTheme === 'dark',
    followsSystem: (preference ?? 'system') === 'system',
    toggleTheme,
    useSystemTheme,
  };
}
