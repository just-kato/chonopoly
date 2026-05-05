"use client";
import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Concept } from "@/types";

const tagClasses: Record<string, string> = {
  gold: "bg-amber-500/15 text-amber-400",
  purple: "bg-violet-500/15 text-violet-400",
  green: "bg-emerald-500/15 text-emerald-400",
};

const iconBgClasses: Record<string, string> = {
  gold: "bg-amber-500/15",
  purple: "bg-violet-500/15",
  green: "bg-emerald-500/15",
};

export default function ConceptCard({ concept }: { concept: Concept }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="bg-[#18181c] border border-[#2e2e38] rounded-xl overflow-hidden mb-3">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-[#222228] transition-colors"
      >
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-lg flex-shrink-0 ${iconBgClasses[concept.tagColor]}`}>
          {concept.icon}
        </div>
        <span className="font-semibold text-white flex-1">{concept.title}</span>
        <span className={`font-mono text-[11px] px-2 py-0.5 rounded ${tagClasses[concept.tagColor]}`}>
          {concept.tag}
        </span>
        <ChevronDown
          size={16}
          className={`text-[#7a7870] transition-transform duration-300 flex-shrink-0 ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div
          className="px-5 pb-5 border-t border-[#2e2e38] concept-body"
          dangerouslySetInnerHTML={{ __html: concept.body }}
        />
      )}
    </div>
  );
}
