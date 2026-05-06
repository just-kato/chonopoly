"use client";
import { useActionState, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { login, forgotPassword } from "./actions";

export default function LoginPage() {
  const [mode, setMode] = useState<"login" | "forgot" | "sent">("login");
  const [showPassword, setShowPassword] = useState(false);

  const [loginError, loginAction, loginPending] = useActionState(login, undefined);
  const [forgotState, forgotAction, forgotPending] = useActionState(forgotPassword, undefined);

  function switchToForgot() {
    setMode("forgot");
  }

  function switchToLogin() {
    setMode("login");
  }

  if (forgotState?.sent && mode !== "sent") {
    setMode("sent");
  }

  return (
    <div className="min-h-screen bg-[#0f0f11] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <span className="inline-block bg-amber-400 text-black font-mono text-[11px] font-medium px-2.5 py-1 rounded tracking-widest mb-4">
            GA EXAM PREP
          </span>
          <h1 className="font-serif text-2xl font-bold text-white">
            {mode === "login" ? "Sign in to continue" : mode === "forgot" ? "Reset your password" : "Check your email"}
          </h1>
          <p className="text-[#7a7870] text-sm mt-1">
            {mode === "login"
              ? "Your Georgia Real Estate study guide"
              : mode === "forgot"
              ? "We'll send you a reset link"
              : "A reset link is on its way"}
          </p>
        </div>

        {/* ── Login form ── */}
        {mode === "login" && (
          <form action={loginAction} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="email"
                className="text-xs font-medium text-[#7a7870] tracking-widest uppercase"
              >
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder="you@example.com"
                className="bg-[#18181c] border border-[#2e2e38] rounded-lg px-4 py-3 text-sm text-[#e8e6df] placeholder-[#4a4a55] focus:outline-none focus:border-amber-500 transition-colors"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="password"
                  className="text-xs font-medium text-[#7a7870] tracking-widest uppercase"
                >
                  Password
                </label>
                <button
                  type="button"
                  onClick={switchToForgot}
                  className="text-xs text-[#7a7870] hover:text-amber-400 transition-colors"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete="current-password"
                  placeholder="••••••••"
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

            {loginError && (
              <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3">
                {loginError}
              </p>
            )}

            <button
              type="submit"
              disabled={loginPending}
              className="mt-2 bg-amber-400 hover:bg-amber-300 disabled:opacity-50 disabled:cursor-not-allowed text-black font-medium text-sm rounded-lg px-4 py-3 transition-colors"
            >
              {loginPending ? "Signing in…" : "Sign in"}
            </button>
          </form>
        )}

        {/* ── Forgot password form ── */}
        {mode === "forgot" && (
          <form action={forgotAction} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="reset-email"
                className="text-xs font-medium text-[#7a7870] tracking-widest uppercase"
              >
                Email
              </label>
              <input
                id="reset-email"
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder="you@example.com"
                autoFocus
                className="bg-[#18181c] border border-[#2e2e38] rounded-lg px-4 py-3 text-sm text-[#e8e6df] placeholder-[#4a4a55] focus:outline-none focus:border-amber-500 transition-colors"
              />
            </div>

            {forgotState?.error && (
              <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3">
                {forgotState.error}
              </p>
            )}

            <button
              type="submit"
              disabled={forgotPending}
              className="mt-2 bg-amber-400 hover:bg-amber-300 disabled:opacity-50 disabled:cursor-not-allowed text-black font-medium text-sm rounded-lg px-4 py-3 transition-colors"
            >
              {forgotPending ? "Sending…" : "Send reset link"}
            </button>

            <button
              type="button"
              onClick={switchToLogin}
              className="text-center text-sm text-[#7a7870] hover:text-[#e8e6df] transition-colors"
            >
              ← Back to sign in
            </button>
          </form>
        )}

        {/* ── Sent confirmation ── */}
        {mode === "sent" && (
          <div className="flex flex-col gap-4 text-center">
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-6 py-5">
              <p className="text-emerald-400 font-medium text-sm">Reset link sent</p>
              <p className="text-[#7a7870] text-sm mt-1">
                Check your inbox and click the link to set a new password. You can close this tab.
              </p>
            </div>
            <button
              type="button"
              onClick={switchToLogin}
              className="text-sm text-[#7a7870] hover:text-[#e8e6df] transition-colors"
            >
              ← Back to sign in
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
