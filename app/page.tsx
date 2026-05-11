"use client";
import { useEffect, useRef, useState, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import chapters from "@/data";
import Sidebar from "@/components/Sidebar";
import ChapterView, { type Tab } from "@/components/ChapterView";
import { TAB_TO_SLUG, SLUG_TO_TAB } from "@/lib/tabs";
import {
  loadAllProgress,
  saveProgress,
  isChapterComplete,
  type AllProgress,
} from "@/lib/supabase/progress";
import { saveLastPosition, loadProfile } from "@/lib/supabase/profile";
import { createClient } from "@/lib/supabase/client";
import ProfileDropdown from "@/components/ProfileDropdown";

export default function Home() {
  return (
    <Suspense>
      <HomeContent />
    </Suspense>
  );
}

function HomeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [progress, setProgress] = useState<AllProgress | null>(null);
  // Read cached values instantly from localStorage — no flash on load
  const [initials, setInitials] = useState(() =>
    typeof window !== "undefined" ? (localStorage.getItem("ph:initials") ?? "") : ""
  );
  const [profileName, setProfileName] = useState("");
  const [profileEmail, setProfileEmail] = useState("");
  const [profileAvatarUrl, setProfileAvatarUrl] = useState<string | null>(() =>
    typeof window !== "undefined" ? (localStorage.getItem("ph:avatarUrl") ?? null) : null
  );
  const [profileAvatarColor, setProfileAvatarColor] = useState<string | null>(() =>
    typeof window !== "undefined" ? (localStorage.getItem("ph:avatarColor") ?? null) : null
  );
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const initialLoadDone = useRef(false);

  const chapterId = searchParams.get("chapter") ?? chapters[0].id;
  const slug = searchParams.get("tab") ?? "overview";
  const activeTab = SLUG_TO_TAB[slug] ?? "Overview";
  const activeChapter = chapters.find((c) => c.id === chapterId) ?? chapters[0];

  useEffect(() => {
    const supabase = createClient();
    // getSession reads from local cache — no network call, resolves immediately
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user?.email) {
        setProfileEmail(session.user.email);
        // Seed initials from email right away so "?" never shows
        setInitials(session.user.email.slice(0, 2).toUpperCase());
      }
    });
    // Then overwrite with fresh profile data and persist to localStorage
    loadProfile().then((p) => {
      const name = p.display_name || p.username || "";
      const newInitials = name
        ? name.slice(0, 2).toUpperCase()
        : (p.avatar_url ? initials : ""); // keep email-seeded if no name yet
      const avatarUrl = p.avatar_url ?? null;
      const avatarColor = p.avatar_color ?? "amber";
      setProfileName(name);
      setProfileAvatarUrl(avatarUrl);
      setProfileAvatarColor(avatarColor);
      if (newInitials) setInitials(newInitials);
      // Cache so next load is instant
      localStorage.setItem("ph:initials", newInitials || initials);
      if (avatarUrl) localStorage.setItem("ph:avatarUrl", avatarUrl);
      else localStorage.removeItem("ph:avatarUrl");
      localStorage.setItem("ph:avatarColor", avatarColor);
    });
  }, []);

  useEffect(() => {
    loadAllProgress().then((data) => {
      // Auto-advance if the user lands on an already-completed chapter
      if (data[chapterId]?.quizPassed) {
        const idx = chapters.findIndex((c) => c.id === chapterId);
        const next = chapters.slice(idx + 1).find((c) => !data[c.id]?.quizPassed);
        if (next) {
          setProgress(data);
          initialLoadDone.current = true;
          router.replace(`/?chapter=${next.id}`);
          saveLastPosition(next.id, "overview");
          return;
        }
      }

      // Track the initial tab visit
      const current = data[chapterId] ?? { tabsVisited: [], quizPassed: false };
      if (!current.tabsVisited.includes(activeTab)) {
        const updated = { ...current, tabsVisited: [...current.tabsVisited, activeTab] };
        saveProgress(chapterId, updated);
        data = { ...data, [chapterId]: updated };
      }
      setProgress(data);
      initialLoadDone.current = true;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!initialLoadDone.current) return;
    recordTabVisit(activeChapter.id, activeTab);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeChapter.id]);

  const recordTabVisit = useCallback((chapId: string, tab: Tab) => {
    setProgress((prev) => {
      if (prev === null) return null;
      const current = prev[chapId] ?? { tabsVisited: [], quizPassed: false };
      if (current.tabsVisited.includes(tab)) return prev;
      const updated = { ...current, tabsVisited: [...current.tabsVisited, tab] };
      saveProgress(chapId, updated);
      return { ...prev, [chapId]: updated };
    });
  }, []);

  const recordQuizComplete = useCallback((chapId: string, passed: boolean, score: number) => {
    setProgress((prev) => {
      if (prev === null) return null;
      const current = prev[chapId] ?? { tabsVisited: [], quizPassed: false };
      // once passed, chapter stays complete even on a failed retake
      const newPassed = current.quizPassed || passed;
      const updated = { ...current, quizPassed: newPassed, quizScore: score };
      saveProgress(chapId, updated);
      return { ...prev, [chapId]: updated };
    });
  }, []);

  function handleSelectChapter(id: string) {
    router.replace(`/?chapter=${id}`);
    saveLastPosition(id, "overview");
  }

  function handleTabChange(tab: Tab) {
    const tabSlug = TAB_TO_SLUG[tab];
    router.replace(`/?chapter=${activeChapter.id}&tab=${tabSlug}`, {
      scroll: false,
    });
    recordTabVisit(activeChapter.id, tab);
    saveLastPosition(activeChapter.id, tabSlug);
  }

  const activeIndex = chapters.findIndex((c) => c.id === activeChapter.id);
  const nextChapter = chapters[activeIndex + 1] ?? null;

  const completedCount = progress
    ? chapters.filter((ch) => {
        const p = progress[ch.id];
        return p && isChapterComplete(p);
      }).length
    : 0;

  return (
    <div className="flex h-screen overflow-hidden">
      <ProfileDropdown
        initials={initials}
        name={profileName}
        email={profileEmail}
        avatarUrl={profileAvatarUrl}
        avatarColor={profileAvatarColor}
      />

      <Sidebar
        chapters={chapters}
        activeId={activeChapter.id}
        onSelect={handleSelectChapter}
        progress={progress ?? {}}
        completedCount={completedCount}
        totalCount={chapters.length}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      <main className="flex-1 overflow-y-auto min-w-0">
        <ChapterView
          key={activeChapter.id}
          chapter={activeChapter}
          tab={activeTab}
          onTabChange={handleTabChange}
          onQuizComplete={(passed, score) => recordQuizComplete(activeChapter.id, passed, score)}
          onNextChapter={nextChapter ? () => handleSelectChapter(nextChapter.id) : undefined}
          onMenuClick={() => setSidebarOpen(true)}
        />
      </main>
    </div>
  );
}
