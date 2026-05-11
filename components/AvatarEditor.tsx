"use client";
import { useEffect, useRef, useState } from "react";
import { Camera, Loader2, Pencil, Trash2 } from "lucide-react";
import { AVATAR_COLORS, getAvatarColors } from "@/lib/avatar";

interface Props {
  initials: string;
  avatarUrl: string | null;
  avatarColor: string | null;
  uploading?: boolean;
  size?: "sm" | "md" | "lg";
  onColorChange: (color: string) => void;
  onUpload: (file: File) => void;
  onRemove?: () => void;
}

export default function AvatarEditor({
  initials,
  avatarUrl,
  avatarColor,
  uploading = false,
  size = "md",
  onColorChange,
  onUpload,
  onRemove,
}: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const c = getAvatarColors(avatarColor);

  const sizeClasses = {
    sm: { circle: "w-9 h-9",   text: "text-xs",  icon: 10 },
    md: { circle: "w-14 h-14", text: "text-lg",  icon: 14 },
    lg: { circle: "w-20 h-20", text: "text-2xl", icon: 16 },
  }[size];

  useEffect(() => {
    if (!open) return;
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [open]);

  return (
    <div ref={ref} className="relative inline-block">
      {/* Avatar button */}
      <button
        type="button"
        onClick={() => !uploading && setOpen((v) => !v)}
        className={`${sizeClasses.circle} rounded-full ${c.bg} border ${c.border} flex items-center justify-center overflow-hidden relative group`}
        aria-label="Edit avatar"
      >
        {uploading ? (
          <Loader2 size={sizeClasses.icon} className="text-white animate-spin" />
        ) : avatarUrl ? (
          <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          <span className={`${c.text} font-mono font-bold ${sizeClasses.text}`}>{initials}</span>
        )}
        {!uploading && (
          <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <Pencil size={sizeClasses.icon} className="text-white" />
          </div>
        )}
      </button>

      {/* Popup */}
      {open && (
        <div className="absolute left-0 top-full mt-2 w-44 bg-[#18181c] border border-[#2e2e38] rounded-xl shadow-xl z-50 overflow-hidden">
          <p className="px-3 pt-2.5 pb-1.5 text-[#4a4a55] font-mono text-[10px] tracking-widest">
            CUSTOMIZE
          </p>

          <div className="px-3 pb-3">
            <p className="text-[#7a7870] text-xs mb-2">Color</p>
            <div className="flex gap-1.5 flex-wrap">
              {Object.entries(AVATAR_COLORS).map(([key, colors]) => (
                <button
                  key={key}
                  type="button"
                  title={key}
                  onClick={() => onColorChange(key)}
                  className={`w-5 h-5 rounded-full ${colors.swatch} transition-transform hover:scale-110 ${
                    (avatarColor ?? "amber") === key
                      ? "ring-2 ring-offset-1 ring-offset-[#18181c] ring-white scale-110"
                      : ""
                  }`}
                />
              ))}
            </div>
          </div>

          <div className="border-t border-[#2e2e38]">
            <button
              type="button"
              onClick={() => { fileRef.current?.click(); setOpen(false); }}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-[#c8c5bc] hover:bg-[#222228] transition-colors"
            >
              <Camera size={13} className="text-[#7a7870] shrink-0" />
              Upload photo
            </button>
            {avatarUrl && onRemove && (
              <button
                type="button"
                onClick={() => { onRemove(); setOpen(false); }}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-[#7a7870] hover:text-red-400 hover:bg-red-500/5 transition-colors"
              >
                <Trash2 size={13} className="shrink-0" />
                Remove photo
              </button>
            )}
          </div>
        </div>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onUpload(file);
          e.target.value = "";
        }}
      />
    </div>
  );
}
