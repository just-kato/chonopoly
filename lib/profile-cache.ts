// Persist profile data to localStorage so pages show the last-known value
// instantly on mount before any network calls resolve (stale-while-revalidate).

const KEY = "ph:profile";

export interface CachedProfile {
  initials: string;
  name: string;
  email: string;
  role: "admin" | "user";
  avatarUrl: string | null;
  avatarColor: string;
}

export function readProfileCache(): CachedProfile | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as CachedProfile) : null;
  } catch {
    return null;
  }
}

export function writeProfileCache(data: Partial<CachedProfile>) {
  if (typeof window === "undefined") return;
  const existing = readProfileCache() ?? {};
  localStorage.setItem(KEY, JSON.stringify({ ...existing, ...data }));
}

export function clearProfileCache() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(KEY);
}
