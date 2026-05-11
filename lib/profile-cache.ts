// Stale-while-revalidate profile cache.
// Stores last-known profile data in localStorage so pages show real values
// instantly on mount before any network calls resolve.
// Cleared on the login page so cross-user contamination never happens.

const KEY = "ph:profile";

export interface CachedProfile {
  initials: string;
  username: string;
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

export function writeProfileCache(data: CachedProfile): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(data));
}

export function clearProfileCache(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(KEY);
}
