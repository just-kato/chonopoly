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
import { readProfileCache, writeProfileCache } from "@/lib/profile-cache";

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
  // All start empty — matches server render, no hydration mismatch
  const [initials, setInitials] = useState("");
  const [profileName, setProfileName] = useState("");
  const [profileEmail, setProfileEmail] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const initialLoadDone = useRef(false);

  const chapterId = searchParams.get("chapter") ?? chapters[0].id;
  const slug = searchParams.get("tab") ?? "overview";
  const activeTab = SLUG_TO_TAB[slug] ?? "Overview";
  const activeChapter = chapters.find((c) => c.id === chapterId) ?? chapters[0];

  useEffect(() => {
    const supabase = createClient();
    let sessionEmail = "";

    // getSession reads Supabase's local token — near-instant
    supabase.auth.getSession().then(({ data: { session } }) => {
      sessionEmail = session?.user?.email ?? "";
      setProfileEmail(sessionEmail);

      // Apply cache if it belongs to this user (cache cleared on login)
      const cached = readProfileCache();
      if (cached?.email === sessionEmail) {
        setInitials(cached.initials);
        setProfileName(cached.username ? `@${cached.username}` : "");
      } else if (sessionEmail) {
        setInitials(sessionEmail.slice(0, 2).toUpperCase());
      }

      // Load fresh profile and refresh cache for next visit
      loadProfile().then((p) => {
        const username = p.username ?? "";
        const newInitials = username
          ? username.slice(0, 2).toUpperCase()
          : sessionEmail.slice(0, 2).toUpperCase();
        setProfileName(username ? `@${username}` : "");
        if (newInitials) setInitials(newInitials);
        writeProfileCache({ username, email: sessionEmail, initials: newInitials, role: p.role });
      });
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
      <ProfileDropdown initials={initials} name={profileName} email={profileEmail} />

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
