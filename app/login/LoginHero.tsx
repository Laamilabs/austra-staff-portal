"use client";

import {
  BarChart3,
  BookOpen,
  CalendarCheck,
  FileText,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";

// Like pinned apps in the Windows 11 Start menu: what you'll find after signing in
const TILES: { label: string; icon: LucideIcon; tone: string }[] = [
  { label: "Students", icon: Users, tone: "bg-sky-500/15 text-sky-600 dark:text-sky-400" },
  { label: "Results", icon: BarChart3, tone: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" },
  { label: "Finance", icon: Wallet, tone: "bg-orange-400/20 text-orange-600 dark:text-orange-400" },
  { label: "Courses", icon: BookOpen, tone: "bg-violet-500/15 text-violet-600 dark:text-violet-400" },
  { label: "Attendance", icon: CalendarCheck, tone: "bg-rose-500/15 text-rose-600 dark:text-rose-400" },
  { label: "Reports", icon: FileText, tone: "bg-amber-500/15 text-amber-600 dark:text-amber-400" },
];

export default function LoginHero() {
  return (
    <section className="mx-auto w-full max-w-xl lg:mx-0">
      <div className="text-center lg:text-left">
        <h2 className="text-3xl font-semibold tracking-tight text-[#0B1E3D] dark:text-white sm:text-4xl">
          AUSTRA STAFF PORTAL
        </h2>
        <p className="mt-3 max-w-md text-base text-zinc-600 dark:text-zinc-400 max-lg:mx-auto">
          Manage students, publish results and keep fees on track.
        </p>
      </div>

      {/* Start-menu panel, hidden on small screens so the form stays first */}
      <div className="mt-8 hidden rounded-sm border border-white/60 bg-white/50 p-4 backdrop-blur-xl dark:border-white/10 dark:bg-[#0B1E3D]/40 sm:block">
        <p className="mb-3 px-1 text-sm font-medium text-[#0B1E3D] dark:text-zinc-100">Pinned</p>
        <ul className="grid grid-cols-3 gap-2" aria-label="What you can manage">
          {TILES.map(({ label, icon: Icon, tone }, i) => (
            <li
              key={label}
              className="lh-in flex flex-col items-center gap-2 rounded-sm px-2 py-4 transition-colors hover:bg-white/70 dark:hover:bg-white/10"
              style={{ animationDelay: `${0.1 + i * 0.07}s` }}
            >
              <span className={`flex h-11 w-11 items-center justify-center rounded-sm ${tone}`}>
                <Icon className="h-5 w-5" strokeWidth={2} />
              </span>
              <span className="text-xs font-medium text-[#0B1E3D] dark:text-zinc-200">{label}</span>
            </li>
          ))}
        </ul>
      </div>

      <style>{`
        @keyframes lh-in { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
        .lh-in { animation: lh-in .45s ease-out both; }
        @media (prefers-reduced-motion: reduce) { .lh-in { animation: none; } }
      `}</style>
    </section>
  );
}