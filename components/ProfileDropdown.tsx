"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { LogOut, User } from "lucide-react";
import { logout } from "@/app/login/actions";

interface Props {
  initials: string;
  name: string;
  email: string;
}

export default function ProfileDropdown({ initials, name, email }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  return (
    <div ref={ref} className="fixed top-4 right-4 z-[200]">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-9 h-9 rounded-full bg-amber-400/20 border border-amber-400/40 hover:bg-amber-400/30 hover:border-amber-400 flex items-center justify-center transition-colors"
        aria-label="Profile menu"
      >
        <span className="text-amber-400 font-mono font-bold text-xs">
          {initials || "··"}
        </span>
      </button>

      {open && (
        <div className="absolute right-0 top-11 w-52 bg-[#18181c] border border-[#2e2e38] rounded-xl shadow-2xl overflow-hidden">
          <div className="px-4 py-3 border-b border-[#2e2e38]">
            {name && (
              <p className="text-white text-sm font-medium truncate">{name}</p>
            )}
            <p className="text-[#7a7870] text-xs truncate">{email}</p>
          </div>

          <Link
            href="/profile"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 px-4 py-3 text-sm text-[#c8c5bc] hover:bg-[#222228] hover:text-white transition-colors"
          >
            <User size={14} />
            Profile
          </Link>

          <div className="border-t border-[#2e2e38]">
            <form action={logout}>
              <button
                type="submit"
                className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-[#7a7870] hover:text-red-400 hover:bg-red-500/5 transition-colors"
              >
                <LogOut size={14} />
                Sign out
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
