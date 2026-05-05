"use client";
import { useActionState } from "react";
import { login } from "./actions";

export default function LoginPage() {
  const [error, action, pending] = useActionState(login, undefined);

  return (
    <div className="min-h-screen bg-[#0f0f11] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <span className="inline-block bg-amber-400 text-black font-mono text-[11px] font-medium px-2.5 py-1 rounded tracking-widest mb-4">
            GA EXAM PREP
          </span>
          <h1 className="font-serif text-2xl font-bold text-white">
            Sign in to continue
          </h1>
          <p className="text-[#7a7870] text-sm mt-1">
            Your Georgia Real Estate study guide
          </p>
        </div>

        <form action={action} className="flex flex-col gap-4">
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
            <label
              htmlFor="password"
              className="text-xs font-medium text-[#7a7870] tracking-widest uppercase"
            >
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              placeholder="••••••••"
              className="bg-[#18181c] border border-[#2e2e38] rounded-lg px-4 py-3 text-sm text-[#e8e6df] placeholder-[#4a4a55] focus:outline-none focus:border-amber-500 transition-colors"
            />
          </div>

          {error && (
            <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={pending}
            className="mt-2 bg-amber-400 hover:bg-amber-300 disabled:opacity-50 disabled:cursor-not-allowed text-black font-medium text-sm rounded-lg px-4 py-3 transition-colors"
          >
            {pending ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
