"use client";

import LoginForm from "./LoginForm";
import LoginHero from "./LoginHero";

export default function LoginPage() {
  return (
    <main className="relative isolate flex min-h-screen flex-col overflow-hidden bg-[#EEF2F9] dark:bg-[#050D1B]">
      {/* Mica: two soft blooms, navy + orange, in both themes */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -left-40 -top-40 h-144 w-xl rounded-full bg-[#0B1E3D]/15 blur-3xl dark:bg-[#1B3A6B]/50" />
        <div className="absolute -bottom-48 -right-32 h-136 w-136 rounded-full bg-orange-400/25 blur-3xl dark:bg-orange-400/15" />
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent,rgba(238,242,249,0.6))] dark:bg-[linear-gradient(to_bottom,transparent,rgba(5,13,27,0.7))]" />
      </div>

      <div className="mx-auto grid w-full max-w-6xl flex-1 items-center gap-10 px-4 py-10 sm:px-6 lg:grid-cols-[1fr_26rem] lg:gap-16 lg:px-8">
        <LoginHero />
        <LoginForm />
      </div>

      <footer className="px-4 pb-5 text-center text-xs text-zinc-500 dark:text-zinc-400">
        © {new Date().getFullYear()} Austra Training Institute · Need help? Contact your administrator.
      </footer>
    </main>
  );
}