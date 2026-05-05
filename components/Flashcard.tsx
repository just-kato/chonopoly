"use client";
import { useState } from "react";
import { KeyTerm } from "@/types";

export default function Flashcard({ terms }: { terms: KeyTerm[] }) {
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);

  const current = terms[index];

  const next = () => { setIndex((i) => (i + 1) % terms.length); setFlipped(false); };
  const prev = () => { setIndex((i) => (i - 1 + terms.length) % terms.length); setFlipped(false); };

  return (
    <div className="mt-8">
      <p className="text-[#7a7870] text-xs tracking-widest mb-4 uppercase">Flashcard Self-Test</p>
      <div
        onClick={() => setFlipped(!flipped)}
        className="bg-[#18181c] border border-[#2e2e38] rounded-xl p-7 text-center cursor-pointer hover:border-amber-500/40 transition-colors min-h-[140px] flex flex-col items-center justify-center gap-3"
      >
        <p className="text-[#7a7870] font-mono text-[11px] tracking-widest">
          TERM {index + 1} OF {terms.length} — tap to flip
        </p>
        {!flipped ? (
          <p className="font-serif text-2xl text-white">{current.term}</p>
        ) : (
          <p className="text-sm text-[#c8c5bc] leading-relaxed max-w-lg">{current.definition}</p>
        )}
        <p className="text-[#7a7870] text-xs">{flipped ? "👆 Tap to see term" : "👆 Tap to see definition"}</p>
      </div>
      <div className="flex justify-center gap-3 mt-3">
        <button onClick={prev} className="bg-[#222228] border border-[#2e2e38] text-[#e8e6df] px-5 py-2 rounded-lg text-sm hover:border-amber-500/40 transition-colors">
          ← Prev
        </button>
        <button onClick={next} className="bg-[#222228] border border-[#2e2e38] text-[#e8e6df] px-5 py-2 rounded-lg text-sm hover:border-amber-500/40 transition-colors">
          Next →
        </button>
      </div>
    </div>
  );
}
