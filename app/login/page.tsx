
"use client";

import LoginForm from "./LoginForm";
import LoginHero from "./LoginHero";

export default function LoginPage() {
  return (
    <main className="relative isolate flex min-h-dvh flex-col overflow-hidden bg-[#EEF2F9] dark:bg-[#050D1B]">
      {/* Responsive background decoration */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
      >
        <div className="absolute left-[-12%] -top-72 h-[min(70vw,850px)] w-[min(70vw,850px)] rounded-full bg-[#0B1E3D]/10 blur-3xl dark:bg-[#1B3A6B]/35" />

        <div className="absolute -bottom-80 right-[-10%] h-[min(65vw,800px)] w-[min(65vw,800px)] rounded-full bg-orange-400/20 blur-3xl dark:bg-orange-400/10" />

        <div className="absolute inset-0 bg-linear-to-b from-transparent via-transparent to-[#EEF2F9]/80 dark:to-[#050D1B]/80" />
      </div>

      {/* Fluid container with ultrawide limits */}
      <div className="mx-auto grid w-full max-w-[1800px] flex-1 grid-cols-1 items-center gap-10 px-5 py-10 sm:px-8 md:px-12 lg:grid-cols-[minmax(0,1fr)_minmax(380px,440px)] lg:gap-12 lg:px-16 xl:gap-20 xl:px-20 2xl:gap-28 2xl:px-24 min-[2000px]:px-28 min-[2400px]:px-32">
        <LoginHero />
        <div className="mx-auto w-full max-w-110 lg:mx-0 lg:justify-self-end">
          <LoginForm />
        </div>
      </div>

      <footer className="px-5 pb-5 pt-2 text-center text-xs text-zinc-500 dark:text-zinc-400 sm:px-8">
        © {new Date().getFullYear()} Austra Training Institute
        <span className="mx-2">·</span>
        Need help? Contact your administrator.
      </footer>
    </main>
  );
}