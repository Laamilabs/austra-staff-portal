"use client";

import { FormEvent, KeyboardEvent, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowUpFromLine,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { DATABASE_BACKUP_PROMPT_KEY } from "../types/db-backup";

const FIELD =
  // shape + layout
  "peer h-11 min-w-0 w-full rounded-sm border border-[#0B1E3D]/15 bg-[#F8FAFD] pl-10 pr-3 text-sm " +
  // text + caret — always visible against the field background
  "text-[#0B1E3D] caret-[#0B1E3D] placeholder:text-zinc-400 " +
  // interaction + focus (light)
  "transition hover:border-[#0B1E3D]/25 " +
  "focus:border-orange-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-400/30 " +
  // dark mode — keep the field dark on focus so white text stays readable
  "dark:border-white/15 dark:bg-white/5 dark:text-white dark:caret-orange-400 dark:placeholder:text-zinc-500 " +
  "dark:hover:border-white/25 " +
  "dark:focus:border-orange-400 dark:focus:bg-[#0B1E3D] dark:focus:ring-orange-400/30 " +
  // browser autofill — stop Chrome from painting a light box behind white text
  "[&:-webkit-autofill]:[-webkit-text-fill-color:#0B1E3D] " +
  "[&:-webkit-autofill]:[-webkit-box-shadow:0_0_0_1000px_#F8FAFD_inset] " +
  "dark:[&:-webkit-autofill]:[-webkit-text-fill-color:#ffffff] " +
  "dark:[&:-webkit-autofill]:[-webkit-box-shadow:0_0_0_1000px_#0B1E3D_inset] " +
  // disabled
  "disabled:cursor-not-allowed disabled:opacity-60";

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
    <div className="w-full min-w-0 rounded-sm border border-[#0B1E3D]/10 bg-white p-3.5 shadow-[0_18px_55px_-28px_rgba(11,30,61,0.45)] min-[360px]:p-5 sm:p-7 lg:p-8 dark:border-white/10 dark:bg-[#0B1E3D]/85 dark:shadow-black/40">
      <div className="flex flex-col items-center text-center">
        <span className="flex h-16 w-full max-w-40 items-center justify-center sm:h-20">
          <Image
            src="/logo.png"
            alt="Austra Training Institute"
            width={192}
            height={96}
            priority
            className="h-full w-full object-contain"
          />
        </span>
        <h1 className="mt-3 text-xl font-semibold tracking-tight text-[#0B1E3D] min-[360px]:text-2xl dark:text-white">
          Sign in
        </h1>
        <p className="mt-1 text-xs text-zinc-500 min-[360px]:text-sm dark:text-zinc-400">
          to the Austra Staff Portal
        </p>
      </div>

      {/* Error: says what happened and what to do */}
      <div aria-live="assertive">
        {error && (
          <div
            id="login-error"
            role="alert"
            className="mt-6 flex items-start gap-2.5 rounded-sm border border-red-200 border-l-4 border-l-red-500 bg-red-50 px-3 py-2.5 text-sm text-red-700 dark:border-red-900/60 dark:border-l-red-500 dark:bg-red-950/40 dark:text-red-300"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </div>

      <form
        onSubmit={handleSubmit}
        className="mt-5 space-y-4 min-[360px]:mt-6 min-[360px]:space-y-5"
      >
        <div>
          <label
            htmlFor="email"
            className="mb-1.5 block text-xs font-medium text-zinc-600 dark:text-zinc-300"
          >
            Email
          </label>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#0B1E3D]/55 dark:text-white/60" />
            <input
              id="email"
              name="email"
              type="email"
              inputMode="email"
              autoComplete="username"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              enterKeyHint="next"
              autoFocus
              required
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (error) setError("");
              }}
              placeholder="you@austra.ac.ke"
              className={FIELD}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? "login-error" : undefined}
            />
          </div>
        </div>

        <div>
          <div className="mb-1.5 flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
            <label
              htmlFor="password"
              className="text-xs font-medium text-zinc-600 dark:text-zinc-300"
            >
              Password
            </label>
            <Link
              href="/forgot-password"
              className="rounded-sm text-[11px] font-medium text-orange-700 hover:underline focus-visible:outline focus-visible:outline-orange-400 min-[360px]:text-xs dark:text-orange-400"
            >
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-orange-600" />
            <input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              autoCapitalize="none"
              spellCheck={false}
              enterKeyHint="go"
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
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? "login-error" : undefined}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              aria-pressed={showPassword}
              tabIndex={0}
              className="absolute right-1 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-sm text-zinc-500 hover:bg-zinc-900/5 hover:text-[#0B1E3D] focus-visible:outline focus-visible:outline-orange-400 dark:text-zinc-400 dark:hover:bg-white/10 dark:hover:text-white"
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
          {capsOn && (
            <p
              className="mt-1.5 flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400"
              role="status"
            >
              <ArrowUpFromLine className="h-3.5 w-3.5" /> Caps Lock is on
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={isLoading}
          aria-busy={isLoading}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-sm bg-[#0B1E3D] text-sm font-semibold text-white shadow-sm transition hover:bg-[#16345F] active:scale-[0.99] focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-orange-400 disabled:cursor-not-allowed disabled:opacity-70 dark:bg-orange-400 dark:text-[#0B1E3D] dark:hover:bg-orange-300 dark:focus-visible:outline-white"
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