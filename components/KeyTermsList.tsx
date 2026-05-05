"use client";
import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { KeyTerm } from "@/types";
import Flashcard from "./Flashcard";

export default function KeyTermsList({ terms }: { terms: KeyTerm[] }) {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <div>
      <p className="text-[#7a7870] text-xs mb-4">
        The terms marked <span className="text-amber-400 font-mono text-[11px] bg-amber-500/10 px-1.5 py-0.5 rounded">OFFICIAL</span> are straight from your course materials — memorize these exactly.
      </p>
      <div className="flex flex-col gap-2">
        {terms.map((t, i) => (
          <div key={i} className="bg-[#18181c] border border-[#2e2e38] rounded-lg overflow-hidden">
            <button
              onClick={() => setOpen(open === i ? null : i)}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-[#222228] transition-colors"
            >
              <div className="flex items-center gap-2.5">
                {t.official && (
                  <span className="font-mono text-[10px] bg-amber-500/15 text-amber-400 px-1.5 py-0.5 rounded">
                    OFFICIAL
                  </span>
                )}
                <span className="font-mono text-sm text-amber-400">{t.term}</span>
              </div>
              <ChevronDown
                size={14}
                className={`text-[#7a7870] transition-transform ${open === i ? "rotate-180" : ""}`}
              />
            </button>
            {open === i && (
              <div className="px-4 pb-4 border-t border-[#2e2e38]">
                <p className="text-[#c8c5bc] text-sm leading-relaxed mt-3">{t.definition}</p>
                {t.examTip && (
                  <div className="mt-3 bg-amber-500/8 border-l-2 border-amber-500 pl-3 py-2 rounded-r text-xs text-[#e8e6df]">
                    <strong className="text-amber-400">Exam tip: </strong>{t.examTip}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
      <Flashcard terms={terms} />
    </div>
  );
}
