"use client";
import { useState } from "react";
import { FileText, ArrowLeft } from "lucide-react";
import resources, { PdfResource } from "@/data/resources";

export default function ResourcesTab({ chapterId }: { chapterId: string }) {
  const [selected, setSelected] = useState<PdfResource | null>(null);
  const chapterResources = resources[chapterId] ?? [];

  if (selected) {
    return (
      <div>
        <button
          onClick={() => setSelected(null)}
          className="flex items-center gap-2 text-sm text-[#7a7870] hover:text-amber-400 transition-colors mb-4"
        >
          <ArrowLeft size={14} />
          Back to Resources
        </button>
        <h3 className="font-serif text-lg font-bold text-white mb-1">{selected.title}</h3>
        {selected.description && (
          <p className="text-[#7a7870] text-xs mb-4">{selected.description}</p>
        )}
        <iframe
          src={`/pdfs/${encodeURIComponent(selected.filename)}`}
          className="w-full rounded-lg border border-[#2e2e38]"
          style={{ height: "75vh" }}
          title={selected.title}
        />
      </div>
    );
  }

  return (
    <div>
      <h2 className="font-serif text-2xl font-bold text-white mb-1">Resources</h2>
      <p className="text-[#7a7870] text-sm border-b border-[#2e2e38] pb-4 mb-6">
        Supplemental materials for this chapter
      </p>

      {chapterResources.length === 0 ? (
        <div className="bg-[#18181c] border border-[#2e2e38] rounded-xl p-8 text-center">
          <FileText className="mx-auto mb-3 text-[#7a7870]" size={32} />
          <p className="text-[#7a7870] text-sm">No resources for this chapter yet.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {chapterResources.map((pdf) => (
            <button
              key={pdf.id}
              onClick={() => setSelected(pdf)}
              className="flex items-start gap-4 bg-[#18181c] border border-[#2e2e38] hover:border-amber-500/40 rounded-lg px-4 py-4 text-left transition-colors group"
            >
              <FileText
                size={18}
                className="mt-0.5 shrink-0 text-amber-400 group-hover:text-amber-300"
              />
              <div>
                <p className="text-sm font-medium text-white group-hover:text-amber-400 transition-colors">
                  {pdf.title}
                </p>
                {pdf.description && (
                  <p className="text-xs text-[#7a7870] mt-0.5">{pdf.description}</p>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
