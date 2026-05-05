"use client";
import { useEffect, useRef, useState, useCallback } from "react";
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
import Link from "next/link";
import OnboardingModal from "@/components/OnboardingModal";

export default function Home() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [progress, setProgress] = useState<AllProgress | null>(null);
  const [initials, setInitials] = useState("");
  const [showOnboarding, setShowOnboarding] = useState(false);
  const initialLoadDone = useRef(false);

  const chapterId = searchParams.get("chapter") ?? chapters[0].id;
  const slug = searchParams.get("tab") ?? "overview";
  const activeTab = SLUG_TO_TAB[slug] ?? "Overview";
  const activeChapter = chapters.find((c) => c.id === chapterId) ?? chapters[0];

  useEffect(() => {
    loadProfile().then((p) => {
      const raw = p.display_name || p.username || "";
      setInitials(raw.slice(0, 2).toUpperCase());
      if (!p.display_name && !p.username) setShowOnboarding(true);
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
      {showOnboarding && (
        <OnboardingModal
          onComplete={(displayName, username) => {
            setInitials((displayName || username).slice(0, 2).toUpperCase());
            setShowOnboarding(false);
          }}
        />
      )}

      <Link
        href="/profile"
        title="Profile"
        className="fixed top-4 right-4 z-50 w-9 h-9 rounded-full bg-amber-400/20 border border-amber-400/40 hover:bg-amber-400/30 hover:border-amber-400 flex items-center justify-center transition-colors"
      >
        <span className="text-amber-400 font-mono font-bold text-xs">
          {initials || "?"}
        </span>
      </Link>

      <Sidebar
        chapters={chapters}
        activeId={activeChapter.id}
        onSelect={handleSelectChapter}
        progress={progress ?? {}}
        completedCount={completedCount}
        totalCount={chapters.length}
      />
      <main className="flex-1 overflow-y-auto">
        <ChapterView
          key={activeChapter.id}
          chapter={activeChapter}
          tab={activeTab}
          onTabChange={handleTabChange}
          onQuizComplete={(passed, score) => recordQuizComplete(activeChapter.id, passed, score)}
          onNextChapter={nextChapter ? () => handleSelectChapter(nextChapter.id) : undefined}
        />
      </main>
    </div>
  );
}
