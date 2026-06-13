export type ThemePreference = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

const STORAGE_KEY = 'patients_theme';

export function getStoredPreference(): ThemePreference | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === 'light' || stored === 'dark' || stored === 'system') {
    return stored;
  }

  return null;
}

export function getSystemTheme(): ResolvedTheme {
  if (typeof window === 'undefined') {
    return 'light';
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
}

export function resolveTheme(
  preference: ThemePreference | null = getStoredPreference(),
): ResolvedTheme {
  if (preference === 'light' || preference === 'dark') {
    return preference;
  }

  return getSystemTheme();
}

export function applyTheme(
  preference: ThemePreference | null = getStoredPreference(),
) {
  const resolved = resolveTheme(preference);
  document.documentElement.classList.toggle('dark', resolved === 'dark');
  return resolved;
}

export function setThemePreference(preference: ThemePreference) {
  if (preference === 'system') {
    localStorage.removeItem(STORAGE_KEY);
  } else {
    localStorage.setItem(STORAGE_KEY, preference);
  }

  return applyTheme(preference);
}

export function subscribeToSystemTheme(
  onChange: (theme: ResolvedTheme) => void,
) {
  const media = window.matchMedia('(prefers-color-scheme: dark)');

  const handler = (event: MediaQueryListEvent) => {
    onChange(event.matches ? 'dark' : 'light');
  };

  media.addEventListener('change', handler);

  return () => media.removeEventListener('change', handler);
}

export const themeInitScript = `
(function () {
  try {
    var stored = localStorage.getItem('${STORAGE_KEY}');
    var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    var isDark = stored === 'dark' || ((stored === null || stored === 'system') && prefersDark);
    document.documentElement.classList.toggle('dark', isDark);
  } catch (e) {}
})();
`;
