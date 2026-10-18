
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
    tone: "bg-[#0B1E3D]/[0.07] text-[#0B1E3D] dark:bg-white/10 dark:text-white",
    description: "Manage student records",
  },
  {
    label: "Results",
    icon: BarChart3,
    tone: "bg-orange-400/20 text-orange-700 dark:bg-orange-400/15 dark:text-orange-300",
    description: "Publish academic results",
  },
  {
    label: "Finance",
    icon: Wallet,
    tone: "bg-orange-400/20 text-orange-700 dark:bg-orange-400/15 dark:text-orange-300",
    description: "Track fees and payments",
  },
  {
    label: "Courses",
    icon: BookOpen,
    tone: "bg-[#0B1E3D]/[0.07] text-[#0B1E3D] dark:bg-white/10 dark:text-white",
    description: "Organise courses",
  },
  {
    label: "Attendance",
    icon: CalendarCheck,
    tone: "bg-orange-400/20 text-orange-700 dark:bg-orange-400/15 dark:text-orange-300",
    description: "Monitor attendance",
  },
  {
    label: "Reports",
    icon: FileText,
    tone: "bg-[#0B1E3D]/[0.07] text-[#0B1E3D] dark:bg-white/10 dark:text-white",
    description: "Review institutional data",
  },
];

export default function LoginHero() {
  return (
    <section className="mx-auto w-full min-w-0 max-w-250 lg:mx-0">
      <div className="max-w-3xl text-center lg:text-left">
        <p className="mb-3 inline-flex items-center gap-2 rounded-sm border border-orange-400/35 bg-orange-400/10 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#0B1E3D] dark:text-orange-300 sm:mb-4 sm:text-xs sm:tracking-[0.2em]">
          <span className="h-1.5 w-1.5 rounded-full bg-orange-500" />
          Austra Training Institute
        </p>

        <h2 className="text-[clamp(1.75rem,4vw,3rem)] font-bold leading-[1.08] tracking-tight text-[#0B1E3D] dark:text-white xl:text-6xl min-[2000px]:text-7xl">
          A smarter way to <span className="text-orange-600 dark:text-orange-400">manage</span>
          <span className="block text-[#52658C] dark:text-[#9EB3DE]">
            your institution.
          </span>
        </h2>

        <p className="mx-auto mt-4 max-w-2xl text-sm leading-6 text-zinc-600 dark:text-zinc-400 sm:mt-5 sm:text-base sm:leading-7 lg:mx-0 xl:text-lg">
          Manage students, publish results, track fees and
          coordinate academic operations from one secure
          staff portal.
        </p>
      </div>

      <div className="mx-auto mt-6 max-w-4xl rounded-sm border border-[#0B1E3D]/10 bg-white/75 p-2.5 shadow-[0_16px_45px_-34px_rgba(11,30,61,0.5)] backdrop-blur-xl dark:border-white/10 dark:bg-[#0B1E3D]/55 sm:mt-8 sm:p-4 xl:mt-10 xl:p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-1 px-1 sm:mb-4">
          <p className="text-sm font-semibold text-[#0B1E3D] dark:text-white sm:text-base">
            Portal features
          </p>
          <span className="text-xs text-zinc-500 dark:text-zinc-400">
            Staff workspace
          </span>
        </div>

        <ul
          aria-label="Portal features"
          className="grid grid-cols-2 gap-1.5 min-[720px]:grid-cols-3 sm:gap-2 xl:gap-3"
        >
          {TILES.map(({ label, icon: Icon, tone, description }, i) => (
            <li
              key={label}
              className="lh-in group flex min-w-0 items-center gap-2 rounded-sm border border-[#0B1E3D]/[0.04] bg-white/60 p-2 transition-colors hover:border-orange-400/40 hover:bg-orange-400/[0.06] dark:border-white/[0.04] dark:bg-white/[0.03] dark:hover:border-orange-400/30 dark:hover:bg-orange-400/[0.06] min-[480px]:gap-3 min-[480px]:p-3 min-[720px]:flex-col min-[720px]:items-start xl:p-4"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-sm min-[480px]:h-10 min-[480px]:w-10 min-[720px]:h-11 min-[720px]:w-11 ${tone}`}
              >
                <Icon className="h-4 w-4 min-[480px]:h-5 min-[480px]:w-5" strokeWidth={1.8} />
              </span>

              <span className="min-w-0">
                <span className="block text-xs font-semibold text-[#0B1E3D] min-[480px]:text-sm dark:text-zinc-100">
                  {label}
                </span>
                <span className="mt-1 hidden text-xs leading-5 text-zinc-500 dark:text-zinc-400 min-[720px]:block">
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
