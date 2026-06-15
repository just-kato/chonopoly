"use client";
import { ChapterData } from "@/types";
import { Menu } from "lucide-react";
import ConceptCard from "./ConceptCard";
import KeyTermsList from "./KeyTermsList";
import Quiz from "./Quiz";
import ResourcesTab from "./ResourcesTab";

export const TABS = ["Overview", "Course Content", "Core Concepts", "Key Terms", "Quick Reference", "Resources" , "Practice Questions"] as const;
export type Tab = (typeof TABS)[number];

export default function ChapterView({
  chapter,
  tab,
  onTabChange,
  onQuizComplete,
  onNextChapter,
  onMenuClick,
}: {
  chapter: ChapterData;
  tab: Tab;
  onTabChange: (tab: Tab) => void;
  onQuizComplete: (passed: boolean, score: number, total: number) => void;
  onNextChapter?: () => void;
  onMenuClick?: () => void;
}) {
  const setTab = onTabChange;

  return (
    <div className="flex flex-col h-full bg-[#0f0f11] text-[#e8e6df] font-sans">
      {/* Sticky header + tabs */}
      <div className="sticky top-0 z-10 shrink-0">
        <div className="bg-[#18181c] border-b border-[#2e2e38] px-4 md:px-6 py-4 md:py-6 flex items-center gap-3 md:gap-4">
          {/* Hamburger — mobile only */}
          <button
            onClick={onMenuClick}
            className="md:hidden shrink-0 text-[#7a7870] hover:text-white transition-colors"
            aria-label="Open menu"
          >
            <Menu size={22} />
          </button>

          <span className="hidden md:inline-flex bg-amber-400 text-black font-mono text-[11px] font-medium px-2.5 py-1 rounded shrink-0 tracking-widest items-center">
            RE LICENSING
          </span>

          <div className="flex-1 min-w-0 pr-10 md:pr-0">
            <h1 className="font-serif text-base md:text-xl font-bold text-white leading-tight truncate">
              {chapter.chapterNumber} — {chapter.title}
            </h1>
            <p className="text-[#7a7870] text-xs mt-0.5 truncate">{chapter.subtitle}</p>
          </div>
        </div>

        <div className="flex gap-0.5 md:gap-1 px-2 md:px-6 border-b border-[#2e2e38] overflow-x-auto bg-[#0f0f11] scrollbar-none">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-3 md:px-4 py-2.5 md:py-3 text-xs md:text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                tab === t
                  ? "text-amber-400 border-amber-400"
                  : "text-[#7a7870] border-transparent hover:text-[#e8e6df]"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        <div className={`${tab === "Resources" ? "" : "max-w-3xl"} mx-auto px-4 md:px-6 py-6 md:py-8 pb-16`}>

          {/* OVERVIEW */}
          {tab === "Overview" && (
            <div>
              <h2 className="font-serif text-xl md:text-2xl font-bold text-white mb-1">Chapter Overview</h2>
              <p className="text-[#7a7870] text-sm border-b border-[#2e2e38] pb-4 mb-6">What you need to know and why it matters</p>
              <ul className="flex flex-col gap-3 mb-7">
                {chapter.objectives.map((obj, i) => (
                  <li key={i} className="flex gap-3 items-start bg-[#18181c] border border-[#2e2e38] rounded-lg px-4 py-3.5 text-sm">
                    <span className="bg-amber-400 text-black font-mono text-[11px] font-medium px-2 py-0.5 rounded shrink-0 mt-0.5">
                      OBJ {i + 1}
                    </span>
                    {obj}
                  </li>
                ))}
              </ul>
              <div className="bg-amber-500/8 border-l-2 border-amber-500 pl-4 py-3 rounded-r-lg mb-6 text-sm text-[#e8e6df]">
                <strong className="text-amber-400">Why this matters for the exam: </strong>
                The Georgia exam tests whether you know the legal distinctions between these three terms. Many candidates use them interchangeably — that&apos;s wrong on the exam.
              </div>
              <p className="text-[#7a7870] text-xs tracking-widest mb-3 uppercase">Chapter Summary</p>
              <p
                className="text-[#c8c5bc] text-sm leading-relaxed"
                dangerouslySetInnerHTML={{ __html: chapter.summary }}
              />
            </div>
          )}

          {/* COURSE CONTENT */}
          {tab === "Course Content" && (
            <div>
              <h2 className="font-serif text-xl md:text-2xl font-bold text-white mb-1">Course Content</h2>
              <p className="text-[#7a7870] text-sm border-b border-[#2e2e38] pb-4 mb-6">Original course text for reference</p>
              {chapter.courseContent ? (
                <div className="bg-[#18181c] border border-[#2e2e38] rounded-xl p-4 md:p-6 max-h-[60vh] overflow-y-auto">
                  <div className="prose prose-invert max-w-none">
                    {chapter.courseContent.split('\n\n').map((paragraph, i) => (
                      paragraph.trim() && (
                        <p key={i} className="text-[#c8c5bc] text-sm leading-relaxed mb-4 whitespace-pre-wrap">
                          {paragraph.trim()}
                        </p>
                      )
                    ))}
                  </div>
                </div>
              ) : (
                <div className="bg-[#18181c] border border-[#2e2e38] rounded-xl p-8 text-center">
                  <p className="text-[#7a7870] text-sm">No course content added for this chapter yet.</p>
                  <p className="text-[#7a7870] text-xs mt-2">Add a <span className="font-mono text-amber-400">courseContent</span> field to the chapter data file to display the original text here.</p>
                </div>
              )}
            </div>
          )}

          {/* CORE CONCEPTS */}
          {tab === "Core Concepts" && (
            <div>
              <h2 className="font-serif text-xl md:text-2xl font-bold text-white mb-1">Core Concepts</h2>
              <p className="text-[#7a7870] text-sm border-b border-[#2e2e38] pb-4 mb-6">Click each concept to expand the explanation</p>
              {chapter.concepts.map((c, i) => <ConceptCard key={i} concept={c} />)}
            </div>
          )}

          {/* KEY TERMS */}
          {tab === "Key Terms" && (
            <div>
              <h2 className="font-serif text-xl md:text-2xl font-bold text-white mb-1">Key Terms</h2>
              <p className="text-[#7a7870] text-sm border-b border-[#2e2e38] pb-4 mb-6">Click any term to reveal its definition</p>
              <KeyTermsList terms={chapter.keyTerms} />
            </div>
          )}

          {/* PRACTICE QUESTIONS — always mounted so selected answers survive tab switches */}
          <div className={tab !== "Practice Questions" ? "hidden" : ""}>
            <h2 className="font-serif text-xl md:text-2xl font-bold text-white mb-1">Practice Questions</h2>
            <p className="text-[#7a7870] text-sm border-b border-[#2e2e38] pb-4 mb-6">Select an answer to reveal the explanation</p>
            <Quiz questions={chapter.practiceQuestions} onComplete={onQuizComplete} onNextChapter={onNextChapter} />
          </div>

          {/* QUICK REFERENCE */}
          {tab === "Quick Reference" && (
            <div>
              <h2 className="font-serif text-xl md:text-2xl font-bold text-white mb-1">Quick Reference</h2>
              <p className="text-[#7a7870] text-sm border-b border-[#2e2e38] pb-4 mb-6">Use this as a fast review before the exam</p>

              {chapter.quickRefTables.map((table, ti) => (
                <div key={ti} className="mb-8">
                  <p className="text-[#7a7870] text-xs tracking-widest mb-3 uppercase">{table.title}</p>
                  <div className="overflow-x-auto rounded-lg border border-[#2e2e38]">
                    <table className="w-full text-sm">
                      <thead>
                        <tr>
                          {table.headers.map((h, hi) => (
                            <th key={hi} className="bg-[#222228] text-amber-400 font-mono text-[11px] tracking-widest text-left px-4 py-3 border-b border-[#2e2e38]">
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {table.rows.map((row, ri) => (
                          <tr key={ri} className={ri % 2 === 1 ? "bg-white/2" : ""}>
                            {row.map((cell, ci) => (
                              <td key={ci} className="px-4 py-3 text-[#c8c5bc] border-b border-[#2e2e38] align-top leading-relaxed">
                                {cell}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}

              <p className="text-[#7a7870] text-xs tracking-widest mb-3 uppercase">Rules to Memorize</p>
              <div className="flex flex-col gap-2">
                {chapter.rules.map((r, i) => (
                  <div key={i} className="bg-amber-500/8 border-l-2 border-amber-500 pl-4 py-3 rounded-r-lg text-sm text-[#e8e6df]">
                    📌 <span dangerouslySetInnerHTML={{ __html: r.text.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>") }} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* RESOURCES */}
          {tab === "Resources" && <ResourcesTab chapterId={chapter.id} />}
        </div>
      </div>
    </div>
  );
}
