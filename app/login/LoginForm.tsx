"use client";

import { FormEvent, KeyboardEvent, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle, ArrowUpFromLine, Eye, EyeOff, Loader2, Lock, Mail } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { DATABASE_BACKUP_PROMPT_KEY } from "../types/db-backup";

// Windows 11 style field: subtle border, thicker accent line on the bottom edge when focused
const FIELD =
  "h-11 w-full rounded-sm border border-zinc-300 border-b-zinc-500 bg-white/80 pl-10 pr-3 text-sm text-[#0B1E3D] " +
  "placeholder:text-zinc-400 transition-shadow focus:border-b-orange-400 focus:outline-none focus:shadow-[0_1px_0_0_#FB923C] " +
  "dark:border-white/10 dark:border-b-white/40 dark:bg-white/5 dark:text-white dark:placeholder:text-zinc-500 dark:focus:border-b-orange-400";

export default function LoginForm() {
  const router = useRouter();
  const { login, isLoading } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [capsOn, setCapsOn] = useState(false);
  const [error, setError] = useState("");

  const trackCaps = (e: KeyboardEvent<HTMLInputElement>) =>
    setCapsOn(e.getModifierState("CapsLock"));

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    try {
      await login({ email: email.trim(), password });
      try {
        sessionStorage.setItem(DATABASE_BACKUP_PROMPT_KEY, "1");
      } catch {
        // The portal shell can still be used if session storage is unavailable.
      }
      router.push("/dashboard");
    } catch (err: any) {
      const message =
        err?.response?.data?.message ||
        err?.message ||
        "We couldn't sign you in. Check your email and password, then try again.";
      setError(Array.isArray(message) ? message.join(", ") : message);
    }
  };

  return (
    <div className="w-full rounded-sm border border-white/70 bg-white/80 p-5 shadow-[0_20px_60px_-20px_rgba(11,30,61,0.25)] backdrop-blur-xl dark:border-white/10 dark:bg-[#0B1E3D]/70 dark:shadow-black/40 sm:p-7 lg:p-8">
      {/* Identity, like the Windows sign-in avatar */}
      <div className="flex flex-col items-center text-center">
        <span className="flex h-20 w-auto items-center justify-center overflow-hidden p-2 ring-1 ring-[#0B1E3D]/10 dark:ring-white/15">
          <span className="flex h-20 w-40 items-center justify-center overflow-hidden p-2 ring-1 ring-[#0B1E3D]/10 dark:ring-white/15">
            <Image
              src="/logo.png"
              alt="Austra Training Institute"
              width={192}
              height={96}
              priority
              className="h-full w-full object-contain"
            />
          </span>
        </span>
        <h1 className="mt-4 text-2xl font-semibold tracking-tight text-[#0B1E3D] dark:text-white">
          Sign in
        </h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          to the Austra Staff Portal
        </p>
      </div>

      {/* Error: says what happened and what to do */}
      <div aria-live="assertive">
        {error && (
          <div
            role="alert"
            className="mt-6 flex items-start gap-2.5 rounded-sm border border-red-200 border-l-4 border-l-red-500 bg-red-50 px-3 py-2.5 text-sm text-red-700 dark:border-red-900/60 dark:border-l-red-500 dark:bg-red-950/40 dark:text-red-300"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="mt-6 space-y-5" noValidate={false}>
        <div>
          <label htmlFor="email" className="mb-1.5 block text-xs font-medium text-zinc-600 dark:text-zinc-300">
            Email
          </label>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-sky-500" />
            <input
              id="email"
              name="email"
              type="email"
              inputMode="email"
              autoComplete="username"
              autoFocus
              required
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (error) setError("");
              }}
              placeholder="you@austra.ac.ke"
              className={FIELD}
            />
          </div>
        </div>

        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <label htmlFor="password" className="text-xs font-medium text-zinc-600 dark:text-zinc-300">
              Password
            </label>
            <Link
              href="/forgot-password"
              className="rounded-sm text-xs font-medium text-orange-600 hover:underline focus-visible:outline focus-visible:outline-orange-400 dark:text-orange-400"
            >
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-violet-500" />
            <input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (error) setError("");
              }}
              onKeyUp={trackCaps}
              onKeyDown={trackCaps}
              onBlur={() => setCapsOn(false)}
              placeholder="Enter your password"
              className={`${FIELD} pr-11`}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              aria-pressed={showPassword}
              className="absolute right-1 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-sm text-zinc-500 hover:bg-zinc-900/5 hover:text-[#0B1E3D] focus-visible:outline focus-visible:outline-orange-400 dark:text-zinc-400 dark:hover:bg-white/10 dark:hover:text-white"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {capsOn && (
            <p className="mt-1.5 flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400" role="status">
              <ArrowUpFromLine className="h-3.5 w-3.5" /> Caps Lock is on
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-sm bg-orange-400 text-sm font-semibold text-[#0B1E3D] shadow-sm transition hover:bg-orange-300 active:scale-[0.99] focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-[#0B1E3D] disabled:cursor-not-allowed disabled:opacity-70 dark:focus-visible:outline-white"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Signing in…
            </>
          ) : (
            "Sign in"
          )}
        </button>
      </form>
    </div>
  );
}
