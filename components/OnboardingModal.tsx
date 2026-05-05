"use client";
import { useState } from "react";
import { updateProfile } from "@/lib/supabase/profile";

interface Props {
  onComplete: (displayName: string, username: string) => void;
}

export default function OnboardingModal({ onComplete }: Props) {
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!displayName.trim()) { setError("Display name is required."); return; }
    if (!username.trim()) { setError("Username is required."); return; }

    setSaving(true);
    setError(null);
    const result = await updateProfile(username, displayName);
    setSaving(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    onComplete(displayName.trim(), username.trim());
  }

  return (
    <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-[#18181c] border border-[#2e2e38] rounded-2xl p-8">
        <div className="mb-6">
          <span className="inline-block bg-amber-400 text-black font-mono text-[10px] font-medium px-2.5 py-1 rounded tracking-widest mb-4">
            WELCOME
          </span>
          <h2 className="font-serif text-xl font-bold text-white leading-tight">
            Set up your profile
          </h2>
          <p className="text-[#7a7870] text-sm mt-1">
            Just a couple of things before you get started.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-[#7a7870] tracking-widest uppercase">
              Display Name
            </label>
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Your full name"
              autoFocus
              className="bg-[#0f0f11] border border-[#2e2e38] rounded-lg px-4 py-3 text-sm text-[#e8e6df] placeholder-[#4a4a55] focus:outline-none focus:border-amber-500 transition-colors"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-[#7a7870] tracking-widest uppercase">
              Username
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#7a7870] text-sm select-none">
                @
              </span>
              <input
                value={username}
                onChange={(e) =>
                  setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))
                }
                placeholder="username"
                className="w-full bg-[#0f0f11] border border-[#2e2e38] rounded-lg pl-8 pr-4 py-3 text-sm text-[#e8e6df] placeholder-[#4a4a55] focus:outline-none focus:border-amber-500 transition-colors"
              />
            </div>
          </div>

          {error && (
            <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={saving}
            className="mt-1 bg-amber-400 hover:bg-amber-300 disabled:opacity-50 disabled:cursor-not-allowed text-black font-medium text-sm rounded-lg px-4 py-3 transition-colors"
          >
            {saving ? "Saving…" : "Get started →"}
          </button>
        </form>
      </div>
    </div>
  );
}
