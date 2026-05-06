"use client";
import { ChapterData } from "@/types";
import { BookOpen, X } from "lucide-react";
import { isChapterComplete, type AllProgress } from "@/lib/supabase/progress";

interface Props {
  chapters: ChapterData[];
  activeId: string;
  onSelect: (id: string) => void;
  progress: AllProgress;
  completedCount: number;
  totalCount: number;
  isOpen: boolean;
  onClose: () => void;
}

function ProgressCircle({ completed, total }: { completed: number; total: number }) {
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
  const r = 22;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - pct / 100);
  const isFinished = pct === 100;

  return (
    <div className="flex items-center gap-3 px-5 py-4 border-t border-[#2e2e38]">
      <svg width="54" height="54" viewBox="0 0 54 54" className="shrink-0">
        <circle cx="27" cy="27" r={r} fill="none" stroke="#2e2e38" strokeWidth="3" />
        <circle
          cx="27" cy="27" r={r}
          fill="none"
          stroke={isFinished ? "#4ade80" : "#f59e0b"}
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          transform="rotate(-90 27 27)"
          style={{ transition: "stroke-dashoffset 0.4s ease" }}
        />
        <text
          x="27" y="27"
          textAnchor="middle"
          dominantBaseline="middle"
          fill={isFinished ? "#4ade80" : "white"}
          fontSize="10"
          fontWeight="bold"
          fontFamily="monospace"
        >
          {pct}%
        </text>
      </svg>
      <div>
        <p className="text-white text-sm font-medium leading-tight">
          {completed} / {total}
        </p>
        <p className="text-[#7a7870] text-xs mt-0.5">chapters complete</p>
      </div>
    </div>
  );
}

export default function Sidebar({ chapters, activeId, onSelect, progress, completedCount, totalCount, isOpen, onClose }: Props) {
  const groups: Record<string, ChapterData[]> = {};
  chapters.forEach((ch) => {
    const group = ch.chapterNumber.split(".")[0];
    if (!groups[group]) groups[group] = [];
    groups[group].push(ch);
  });

  function handleSelect(id: string) {
    onSelect(id);
    onClose();
  }

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/60 md:hidden"
          onClick={onClose}
        />
      )}

      <div
        className={`
          fixed md:relative inset-y-0 left-0 z-40 md:z-auto
          w-72 md:w-64 h-full
          bg-[#18181c] border-r border-[#2e2e38]
          flex flex-col
          transition-transform duration-300 ease-in-out
          ${isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
        `}
      >
        <div className="px-5 py-5 border-b border-[#2e2e38] flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <BookOpen size={16} className="text-amber-400" />
              <span className="font-mono text-xs text-amber-400 tracking-widest">GA EXAM PREP</span>
            </div>
            <p className="text-white font-serif text-sm font-bold leading-tight">Real Estate Study Guide</p>
          </div>
          <button
            onClick={onClose}
            className="md:hidden text-[#7a7870] hover:text-white transition-colors mt-0.5 shrink-0"
            aria-label="Close menu"
          >
            <X size={18} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-3">
          {Object.entries(groups).map(([group, chs]) => (
            <div key={group} className="mb-4">
              <p className="text-[#7a7870] font-mono text-[10px] tracking-widest px-2 mb-2 uppercase">
                Chapter {group}
              </p>
              {chs.map((ch) => {
                const p = progress[ch.id];
                const complete = p ? isChapterComplete(p) : false;
                const isActive = activeId === ch.id;

                return (
                  <button
                    key={ch.id}
                    onClick={() => handleSelect(ch.id)}
                    className={`w-full text-left px-3 py-2.5 rounded-lg text-sm mb-1 transition-colors flex items-center gap-2 ${
                      isActive
                        ? "bg-amber-500/15 text-amber-400 font-medium"
                        : "text-[#c8c5bc] hover:bg-[#222228] hover:text-white"
                    }`}
                  >
                    <span className="font-mono text-[11px] opacity-60 shrink-0">{ch.chapterNumber}</span>
                    <span className="flex-1 min-w-0 truncate">{ch.title}</span>
                    {complete ? (
                      <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" title="Complete" />
                    ) : isActive ? (
                      <span className="w-2 h-2 rounded-full bg-amber-400/60 shrink-0" title="In progress" />
                    ) : null}
                  </button>
                );
              })}
            </div>
          ))}
          <div className="px-2 mt-6">
            <p className="text-[#2e2e38] font-mono text-[10px] tracking-widest">MORE CHAPTERS COMING SOON</p>
          </div>
        </nav>

        <ProgressCircle completed={completedCount} total={totalCount} />
      </div>
    </>
  );
}
