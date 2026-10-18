
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

const TILES: {
  label: string;
  icon: LucideIcon;
  tone: string;
  description: string;
}[] = [
  {
    label: "Students",
    icon: Users,
    tone: "bg-sky-500/15 text-sky-600 dark:text-sky-400",
    description: "Manage student records",
  },
  {
    label: "Results",
    icon: BarChart3,
    tone: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
    description: "Publish academic results",
  },
  {
    label: "Finance",
    icon: Wallet,
    tone: "bg-orange-400/20 text-orange-600 dark:text-orange-400",
    description: "Track fees and payments",
  },
  {
    label: "Courses",
    icon: BookOpen,
    tone: "bg-violet-500/15 text-violet-600 dark:text-violet-400",
    description: "Organise courses",
  },
  {
    label: "Attendance",
    icon: CalendarCheck,
    tone: "bg-rose-500/15 text-rose-600 dark:text-rose-400",
    description: "Monitor attendance",
  },
  {
    label: "Reports",
    icon: FileText,
    tone: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
    description: "Review institutional data",
  },
];

export default function LoginHero() {
  return (
    <section className="mx-auto w-full max-w-250 lg:mx-0">
      <div className="max-w-3xl text-center lg:text-left">
        <p className="mb-4 text-xs font-semibold uppercase tracking-[0.24em] text-orange-600 dark:text-orange-400 sm:text-sm">
          Austra Training Institute
        </p>

        <h2 className="text-3xl font-bold leading-tight tracking-tight text-[#0B1E3D] dark:text-white sm:text-4xl md:text-5xl xl:text-6xl min-[2000px]:text-7xl">
          A smarter way to
          <span className="block text-[#52658C] dark:text-[#9EB3DE]">
            manage your institution.
          </span>
        </h2>

        <p className="mx-auto mt-5 max-w-2xl text-sm leading-7 text-zinc-600 dark:text-zinc-400 sm:text-base lg:mx-0 xl:text-lg">
          Manage students, publish results, track fees and
          coordinate academic operations from one secure
          staff portal.
        </p>
      </div>

      <div className="mx-auto mt-8 max-w-4xl rounded-sm border border-white/70 bg-white/50 p-3 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-[#0B1E3D]/35 sm:mt-10 sm:p-5 xl:mt-12 xl:p-6">
        <div className="mb-4 flex items-center justify-between px-1">
          <p className="text-sm font-semibold text-[#0B1E3D] dark:text-white sm:text-base">
            Portal features
          </p>
          <span className="text-xs text-zinc-500 dark:text-zinc-400">
            Staff workspace
          </span>
        </div>

        <ul
          aria-label="Portal features"
          className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 xl:gap-4"
        >
          {TILES.map(({ label, icon: Icon, tone, description }, i) => (
            <li
              key={label}
              className="lh-in group flex min-w-0 items-center gap-3 rounded-sm border border-transparent p-3 transition-colors hover:border-[#0B1E3D]/10 hover:bg-white/80 dark:hover:border-white/10 dark:hover:bg-white/5 sm:flex-col sm:items-start sm:p-4 xl:p-5"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <span
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-sm sm:h-12 sm:w-12 ${tone}`}
              >
                <Icon className="h-5 w-5 sm:h-6 sm:w-6" strokeWidth={1.8} />
              </span>

              <span className="min-w-0">
                <span className="block text-sm font-semibold text-[#0B1E3D] dark:text-zinc-100">
                  {label}
                </span>
                <span className="mt-1 hidden text-xs leading-5 text-zinc-500 dark:text-zinc-400 sm:block">
                  {description}
                </span>
              </span>
            </li>
          ))}
        </ul>
      </div>

      <style>{`
        @keyframes lh-in {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .lh-in {
          animation: lh-in 450ms ease-out both;
        }

        @media (prefers-reduced-motion: reduce) {
          .lh-in {
            animation: none;
          }
        }
      `}</style>
    </section>
  );
}