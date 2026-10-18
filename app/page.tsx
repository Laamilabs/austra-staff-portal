"use client";
import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "./context/AuthContext";

export default function Home() {
  const router = useRouter();
  const { user, isLoading, isAuthenticated } = useAuth();

  useEffect(() => {
    if (!isLoading && isAuthenticated && user) {
      router.replace("/dashboard");
    }
  }, [isLoading, isAuthenticated, user, router]);

  if (isLoading || (isAuthenticated && user)) {
    return (
      <main className="relative flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950 overflow-hidden">
        {/* Pattern Background */}
        <div
          className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat opacity-10 dark:opacity-5 dark:invert"
          style={{ backgroundImage: "url('/african-pattern.webp')" }}
        />
        
        <div className="relative z-10 text-center px-4">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-zinc-200 border-t-orange-400 dark:border-zinc-800 dark:border-t-orange-400" />
          <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">
            {isLoading
              ? "Checking your account..."
              : "Taking you to your dashboard..."}
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-zinc-50 dark:bg-zinc-950">
      {/* Background African Pattern Layer */}
      <div
        className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat opacity-15 dark:opacity-5 dark:invert pointer-events-none"
        style={{ backgroundImage: "url('/african-pattern.webp')" }}
      />

      {/* Optional subtle vignette / overlay to guarantee text legibility on all devices */}
      <div className="absolute inset-0 z-0 bg-linear-to-b from-zinc-50/80 via-zinc-50/50 to-zinc-50/90 dark:from-zinc-950/80 dark:via-zinc-950/50 dark:to-zinc-950/90 pointer-events-none" />

      {/* Main Content Overlay */}
      <section className="relative z-10 flex min-h-screen items-center py-12 sm:py-20">
        <div className="mx-auto w-full max-w-full px-4 sm:px-6 lg:px-8 2xl:max-w-384">
          <div className="max-w-3xl">
            <p className="text-xs sm:text-sm font-semibold uppercase tracking-[0.15em] text-orange-500 dark:text-orange-400">
              Austra Training Institute
            </p>

            <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-[#0B1F3A] dark:text-white sm:text-5xl lg:text-6xl xl:text-7xl">
              Staff Portal
            </h1>

            <p className="mt-4 sm:mt-6 max-w-2xl text-base sm:text-lg lg:text-xl leading-relaxed text-zinc-700 dark:text-zinc-300">
              Your central workspace for staff services, academic
              administration, student management, and institute resources.
            </p>

            {/* Action Buttons */}
            <div className="mt-8 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 max-w-md sm:max-w-none">
              <Link
                href="/login"
                className="inline-flex items-center justify-center rounded-lg bg-[#0B1F3A] px-6 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#102b50] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0B1F3A] dark:bg-orange-400 dark:text-zinc-950 dark:hover:bg-orange-500"
              >
                Sign in to Staff Portal
                <span className="ml-2" aria-hidden="true">→</span>
              </Link>

              <a
                href="https://austratraininginstitute.co.ke/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center rounded-lg border border-zinc-300/80 bg-white/90 backdrop-blur-sm px-6 py-3.5 text-sm font-semibold text-zinc-700 shadow-sm transition hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/90 dark:text-zinc-200 dark:hover:bg-zinc-800"
              >
                Visit Austra Website
              </a>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}