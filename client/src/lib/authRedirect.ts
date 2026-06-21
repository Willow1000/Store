const AUTH_REDIRECT_KEY = 'motorvault_auth_redirect';
const AUTH_REDIRECT_TTL_MS = 30 * 60 * 1000;

type StoredAuthRedirect = {
  path: string;
  createdAt: number;
};

export function sanitizeInternalRedirect(input: string | null | undefined): string | null {
  if (typeof window === 'undefined') return null;
  if (!input) return null;
  const value = input.trim();
  if (!value || value.startsWith('//') || /^[a-z][a-z0-9+.-]*:/i.test(value)) return null;

  try {
    const parsed = new URL(value, window.location.origin);
    if (parsed.origin !== window.location.origin) return null;
    const path = `${parsed.pathname}${parsed.search}${parsed.hash}`;
    if (!path.startsWith('/') || path.startsWith('//')) return null;
    if (path.startsWith('/auth/callback')) return null;
    return path;
  } catch {
    return null;
  }
}

export function getCurrentInternalPath(): string {
  if (typeof window === 'undefined') return '/';
  return `${window.location.pathname}${window.location.search}${window.location.hash}`;
}

export function saveAuthRedirect(input: string | null | undefined = getCurrentInternalPath()): string | null {
  if (typeof window === 'undefined') return null;
  const path = sanitizeInternalRedirect(input);
  if (!path) return null;

  const payload: StoredAuthRedirect = {
    path,
    createdAt: Date.now(),
  };

  try {
    localStorage.setItem(AUTH_REDIRECT_KEY, JSON.stringify(payload));
    localStorage.setItem('oauth_return_to', path);
  } catch {
    // Storage can be unavailable in private mode; callers should still continue auth.
  }

  return path;
}

export function consumeAuthRedirect(fallback = '/'): string {
  if (typeof window === 'undefined') return fallback;

  try {
    const raw = localStorage.getItem(AUTH_REDIRECT_KEY);
    const legacyReturnTo = localStorage.getItem('oauth_return_to');
    localStorage.removeItem(AUTH_REDIRECT_KEY);
    localStorage.removeItem('oauth_return_to');

    if (raw) {
      const parsed = JSON.parse(raw) as StoredAuthRedirect;
      const isFresh = Number.isFinite(parsed.createdAt) && Date.now() - parsed.createdAt <= AUTH_REDIRECT_TTL_MS;
      const path = isFresh ? sanitizeInternalRedirect(parsed.path) : null;
      if (path) return path;
    }

    const legacyPath = sanitizeInternalRedirect(legacyReturnTo);
    return legacyPath || fallback;
  } catch {
    return fallback;
  }
}
