"use client";
import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { updateProfile } from "@/lib/supabase/profile";

export default function SetupPage() {
  return (
    <Suspense>
      <SetupContent />
    </Suspense>
  );
}

function SetupContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [status, setStatus] = useState<"exchanging" | "ready" | "error" | "done">("exchanging");
  const [exchangeError, setExchangeError] = useState("");
  const [email, setEmail] = useState("");

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");

  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState("");

  useEffect(() => {
    const supabase = createClient();
    let resolved = false;

    const resolve = (user: { email?: string | null } | null) => {
      if (resolved) return;
      resolved = true;
      if (user) {
        setEmail(user.email ?? "");
        setStatus("ready");
      } else {
        setExchangeError("Invalid or expired invite link. Please ask an admin to send a new one.");
        setStatus("error");
      }
    };

    // Supabase may use implicit flow (tokens in URL hash).
    // The browser client detects these automatically and fires onAuthStateChange.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) resolve(session.user);
    });

    // Only fall back to getUser() when there are no hash tokens in the URL.
    // If hash tokens ARE present, onAuthStateChange will fire with the invited
    // user's session. Calling getUser() here would return the admin's existing
    // session before the hash tokens are processed, prefilling the wrong email.
    const hasHashTokens = window.location.hash.includes("access_token");
    if (!hasHashTokens) {
      supabase.auth.getUser().then(({ data: { user } }) => {
        if (user) resolve(user);
      });
    }

    // If no session detected after 2s, show the error.
    const timer = setTimeout(() => resolve(null), 2000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timer);
    };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (password.length < 8) {
      setSubmitError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setSubmitError("Passwords don't match.");
      return;
    }

    setSaving(true);
    setSubmitError("");

    const supabase = createClient();
    const { error: pwError } = await supabase.auth.updateUser({ password });
    if (pwError) {
      setSubmitError(pwError.message);
      setSaving(false);
      return;
    }

    const result = await updateProfile({
      displayName: displayName.trim() || null,
      username: username.trim() || null,
    });

    setSaving(false);
    if (result.error) {
      setSubmitError(result.error);
      return;
    }

    setStatus("done");
    setTimeout(() => router.replace("/"), 1500);
  }

  return (
    <div className="min-h-screen bg-[#0f0f11] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <span className="inline-block bg-amber-400 text-black font-mono text-[11px] font-medium px-2.5 py-1 rounded tracking-widest mb-4">
            GA EXAM PREP
          </span>
          <h1 className="font-serif text-2xl font-bold text-white">
            {status === "done" ? "You're all set!" : "Set up your account"}
          </h1>
          {status === "ready" && (
            <p className="text-[#7a7870] text-sm mt-1">
              Choose a password and tell us a bit about yourself.
            </p>
          )}
        </div>

        {status === "exchanging" && (
          <p className="text-center text-[#7a7870] text-sm">Verifying your invite link…</p>
        )}

        {status === "error" && (
          <div className="flex flex-col gap-4 text-center">
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-6 py-5">
              <p className="text-red-400 text-sm">{exchangeError}</p>
            </div>
          </div>
        )}

        {status === "done" && (
          <div className="text-center">
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-6 py-5">
              <p className="text-emerald-400 font-medium text-sm">Account created successfully</p>
              <p className="text-[#7a7870] text-sm mt-1">Taking you to the study guide…</p>
            </div>
          </div>
        )}

        {status === "ready" && (
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            {/* Email — prefilled and locked */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-[#7a7870] tracking-widest uppercase">
                Email
              </label>
              <input
                type="email"
                value={email}
                disabled
                className="bg-[#18181c] border border-[#2e2e38] rounded-lg px-4 py-3 text-sm text-[#7a7870] cursor-not-allowed"
              />
            </div>

            {/* Password */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-[#7a7870] tracking-widest uppercase">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoFocus
                  placeholder="At least 8 characters"
                  className="w-full bg-[#18181c] border border-[#2e2e38] rounded-lg px-4 py-3 pr-11 text-sm text-[#e8e6df] placeholder-[#4a4a55] focus:outline-none focus:border-amber-500 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#7a7870] hover:text-[#e8e6df] transition-colors"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Confirm password */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-[#7a7870] tracking-widest uppercase">
                Confirm Password
              </label>
              <div className="relative">
                <input
                  type={showConfirm ? "text" : "password"}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                  placeholder="Same password again"
                  className="w-full bg-[#18181c] border border-[#2e2e38] rounded-lg px-4 py-3 pr-11 text-sm text-[#e8e6df] placeholder-[#4a4a55] focus:outline-none focus:border-amber-500 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#7a7870] hover:text-[#e8e6df] transition-colors"
                  aria-label={showConfirm ? "Hide password" : "Show password"}
                >
                  {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="border-t border-[#2e2e38] pt-5">
              <p className="text-xs font-mono text-amber-400 tracking-widest mb-4">YOUR DETAILS</p>

              {/* Display name */}
              <div className="flex flex-col gap-1.5 mb-4">
                <label className="text-xs font-medium text-[#7a7870] tracking-widest uppercase">
                  Display Name <span className="normal-case text-[#4a4a55]">(optional)</span>
                </label>
                <input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Your name"
                  className="bg-[#18181c] border border-[#2e2e38] rounded-lg px-4 py-3 text-sm text-[#e8e6df] placeholder-[#4a4a55] focus:outline-none focus:border-amber-500 transition-colors"
                />
              </div>

              {/* Username */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-[#7a7870] tracking-widest uppercase">
                  Username <span className="normal-case text-[#4a4a55]">(optional)</span>
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#7a7870] text-sm select-none">@</span>
                  <input
                    value={username}
                    onChange={(e) =>
                      setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))
                    }
                    placeholder="janesmith"
                    className="w-full bg-[#18181c] border border-[#2e2e38] rounded-lg pl-8 pr-4 py-3 text-sm text-[#e8e6df] placeholder-[#4a4a55] focus:outline-none focus:border-amber-500 transition-colors"
                  />
                </div>
              </div>
            </div>

            {submitError && (
              <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3">
                {submitError}
              </p>
            )}

            <button
              type="submit"
              disabled={saving}
              className="bg-amber-400 hover:bg-amber-300 disabled:opacity-50 disabled:cursor-not-allowed text-black font-medium text-sm rounded-lg px-4 py-3 transition-colors"
            >
              {saving ? "Setting up…" : "Complete setup →"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
