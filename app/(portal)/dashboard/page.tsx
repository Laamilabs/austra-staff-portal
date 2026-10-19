// app/(portal)/dashboard/page.tsx
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Award,
  Building2,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Clock,
  CreditCard,
  GraduationCap,
  Hourglass,
  Inbox,
  KeyRound,
  Landmark,
  Library,
  MinusCircle,
  Puzzle,
  Receipt,
  Search,
  TrendingDown,
  TrendingUp,
  Upload,
  User,
  UserCog,
  UserPlus,
  Users,
  BookOpen,
  XCircle,
  type LucideIcon,
} from "lucide-react";

import { useAuth } from "@/app/context/AuthContext";
import { financeAnalyticsApi, type FinanceSummary } from "@/app/types/finance";
import { curriculumApi, type CurriculumKpis } from "@/app/types/curriculum";
import { StudentOverviewStats, studentApi } from "@/app/types/students";
import {
  applicationApi,
  type ApplicationStatus,
  type ApplicationSummaryStats,
} from "@/app/types/application";
import RequireRoleInline from "@/app/components/navigation/RequiredRoleInline";

// ---------------------------------------------------------------------------
// Tokens
// ---------------------------------------------------------------------------

const CARD =
  "rounded-sm border border-zinc-200/80 bg-white shadow-[0_12px_40px_-24px_rgba(8,43,102,0.28)] dark:border-zinc-800 dark:bg-zinc-900";

const NAVY_FILL = "bg-[#082B66] dark:bg-[#4F7FD6]";
const NAVY_TEXT = "text-[#082B66] dark:text-white";

const HIDE_SCROLLBAR =
  "[scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden";

const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400";

// ---------------------------------------------------------------------------
// Quick actions
// ---------------------------------------------------------------------------

interface QuickLink {
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
  accent: string;
}

const QUICK_LINKS: QuickLink[] = [
  {
    href: "/applications",
    label: "Applications",
    description: "Review, decide and track admissions",
    icon: Inbox,
    accent: "text-orange-500 dark:text-orange-400",
  },
  {
    href: "/students/new",
    label: "Register student",
    description: "Create a record and enroll into a course",
    icon: UserPlus,
    accent: "text-orange-500 dark:text-orange-400",
  },
  {
    href: "/students",
    label: "Students",
    description: "Browse, search and manage records",
    icon: Users,
    accent: "text-orange-500 dark:text-orange-400",
  },
  {
    href: "/results",
    label: "Results",
    description: "Enter, review and publish marks",
    icon: ClipboardCheck,
    accent: "text-sky-600 dark:text-sky-400",
  },
  {
    href: "/units/new",
    label: "Add units",
    description: "Attach units to a course offering",
    icon: Puzzle,
    accent: "text-sky-600 dark:text-sky-400",
  },
  {
    href: "/finance/transactions/new",
    label: "Record payment",
    description: "Log cash, M-Pesa, bank or other fees",
    icon: CreditCard,
    accent: "text-emerald-600 dark:text-emerald-400",
  },
  {
    href: "/finance/fee-structures/new",
    label: "Fee structures",
    description: "Define fee items and assign to a course",
    icon: Receipt,
    accent: "text-emerald-600 dark:text-emerald-400",
  },
  {
    href: "/finance",
    label: "Finances",
    description: "Structures, assessments and transactions",
    icon: Landmark,
    accent: "text-emerald-600 dark:text-emerald-400",
  },
  {
    href: "/documents",
    label: "Library",
    description: "Academic and institutional documents",
    icon: Library,
    accent: "text-violet-600 dark:text-violet-400",
  },
  {
    href: "/documents/new",
    label: "Upload documents",
    description: "Share notes, resources or files",
    icon: Upload,
    accent: "text-violet-600 dark:text-violet-400",
  },
  {
    href: "/users",
    label: "Users & passwords",
    description: "Create users, roles and resets",
    icon: KeyRound,
    accent: "text-rose-600 dark:text-rose-400",
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatCurrency(amount: number, currency = "KES"): string {
  return `${currency} ${amount.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
}

function formatCompact(amount: number, currency = "KES"): string {
  if (amount >= 1_000_000) return `${currency} ${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `${currency} ${(amount / 1_000).toFixed(1)}K`;
  return `${currency} ${amount}`;
}

const clampPct = (n: number) => Math.max(0, Math.min(100, n));

// ---------------------------------------------------------------------------
// Small primitives
// ---------------------------------------------------------------------------

function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-sm bg-zinc-200 dark:bg-white/10 ${className}`}
    />
  );
}

function Chapter({
  n,
  title,
  subtitle,
  action,
}: {
  n: string;
  title: string;
  subtitle: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-4 flex items-end justify-between gap-3">
      <div className="flex items-center gap-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-sm bg-orange-400 text-xs font-bold text-[#082B66] shadow-sm">
          {n}
        </span>
        <div>
          <h2 className={`text-sm font-semibold leading-tight ${NAVY_TEXT}`}>
            {title}
          </h2>
          <p className="text-xs text-zinc-600 dark:text-zinc-400">{subtitle}</p>
        </div>
      </div>
      {action}
    </div>
  );
}

function Insight({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-sm border-l-4 border-orange-400 bg-orange-50 px-3 py-2.5 text-sm text-zinc-800 dark:bg-orange-400/10 dark:text-zinc-200">
      {children}
    </p>
  );
}

function B({ children }: { children: ReactNode }) {
  return (
    <strong className="font-semibold text-orange-600 dark:text-orange-400">
      {children}
    </strong>
  );
}

interface Segment {
  value: number;
  className: string;
  label: string;
}

function StackedBar({
  segments,
  total,
}: {
  segments: Segment[];
  total: number;
}) {
  return (
    <div
      role="img"
      aria-label={segments.map((s) => `${s.label}: ${s.value}`).join(", ")}
      className="flex h-3.5 w-full gap-0.5 overflow-hidden rounded-sm bg-zinc-200 dark:bg-white/10"
    >
      {segments.map((s) => (
        <div
          key={s.label}
          className={`h-full transition-all duration-700 ease-out ${s.className}`}
          style={{
            width: `${total > 0 ? clampPct((s.value / total) * 100) : 0}%`,
          }}
        />
      ))}
    </div>
  );
}

function LegendRow({
  swatch,
  label,
  value,
  pct,
}: {
  swatch: string;
  label: string;
  value: number | string;
  pct?: number;
}) {
  return (
    <li className="flex items-center justify-between gap-3 text-sm">
      <span className="flex min-w-0 items-center gap-2 text-zinc-700 dark:text-zinc-300">
        <span className={`h-3 w-3 shrink-0 rounded-sm ${swatch}`} />
        <span className="truncate">{label}</span>
      </span>
      <span className="shrink-0 font-semibold text-zinc-900 dark:text-white">
        {value}
        {pct !== undefined && (
          <span className="ml-1.5 text-xs font-normal text-zinc-500 dark:text-zinc-400">
            {pct}%
          </span>
        )}
      </span>
    </li>
  );
}

// ---------------------------------------------------------------------------
// Hero
// ---------------------------------------------------------------------------

function HeroAvatar({
  src,
  name,
  initials,
  loading,
  onError,
}: {
  src: string;
  name: string;
  initials: string;
  loading: boolean;
  onError: () => void;
}) {
  return (
    <span className="relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-sm bg-orange-400 text-xl font-bold text-[#082B66] ring-2 ring-orange-400/60 sm:h-16 sm:w-16">
      {loading ? (
        <span className="h-full w-full animate-pulse bg-white/30" />
      ) : src ? (
        <img
          src={src}
          alt={name}
          className="h-full w-full object-cover"
          onError={onError}
        />
      ) : (
        initials
      )}
    </span>
  );
}

function StoryStat({ children }: { children: ReactNode }) {
  return (
    <li className="text-sm text-blue-100 sm:border-l sm:border-white/20 sm:pl-6 sm:first:border-l-0 sm:first:pl-0">
      {children}
    </li>
  );
}

function Num({ children }: { children: ReactNode }) {
  return (
    <span className="mr-1 text-lg font-semibold text-orange-400">
      {children}
    </span>
  );
}

// ---------------------------------------------------------------------------
// KPI tile
// ---------------------------------------------------------------------------

function KpiTile({
  label,
  value,
  loading,
  icon: Icon,
  variant,
}: {
  label: string;
  value: number | undefined;
  loading: boolean;
  icon: LucideIcon;
  variant: "navy" | "orange";
}) {
  const navy = variant === "navy";
  return (
    <div className={`${CARD} relative overflow-hidden `}>
      <span
        aria-hidden
        className={`absolute inset-x-0 top-0 h-1 ${navy ? NAVY_FILL : "bg-orange-400"
          }`}
      />
      <div className="flex items-start justify-between gap-3 p-1 ">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">
            {label}
          </p>
          {loading ? (
            <Skeleton className="mt-2 h-9 w-20" />
          ) : (
            <p
              className={`mt-1.5 text-3xl font-semibold tracking-tight sm:text-4xl ${navy ? NAVY_TEXT : "text-orange-500 dark:text-orange-400"
                }`}
            >
              {value !== undefined ? value.toLocaleString() : "—"}
            </p>
          )}
        </div>

      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Quick actions
// ---------------------------------------------------------------------------

function QuickActions() {
  return (
    <section aria-labelledby="quick-actions-title" className={`${CARD} p-3 sm:p-4`}>
      <div className="mb-3 flex items-center gap-3">
        <span className="h-4 w-1 rounded-sm bg-orange-400" aria-hidden />
        <h2
          id="quick-actions-title"
          className={`text-xs font-semibold uppercase tracking-[0.15em] ${NAVY_TEXT}`}
        >
          Quick actions
        </h2>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-1">
        {QUICK_LINKS.map(({ href, label, description, icon: Icon, accent }) => (
          <Link
            key={href}
            href={href}
            title={description}
            className={`group flex items-center gap-3 rounded-sm border border-zinc-200/80 bg-white p-3 transition-all hover:-translate-y-0.5 hover:border-orange-300 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-orange-400 ${FOCUS_RING}`}
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-sm bg-zinc-100 dark:bg-white/5">
              <Icon size={18} className={accent} />
            </span>

            <span className="min-w-0 flex-1">
              <span
                className={`line-clamp-2 block text-[13px] font-semibold leading-tight xl:truncate ${NAVY_TEXT}`}
              >
                {label}
              </span>
              <span className="hidden truncate text-xs text-zinc-600 dark:text-zinc-400 xl:block">
                {description}
              </span>
            </span>

            <ChevronRight className="hidden h-4 w-4 shrink-0 text-zinc-400 transition-transform group-hover:translate-x-0.5 group-hover:text-orange-500 xl:block" />
          </Link>
        ))}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Applications — status config (typed against ApplicationStatus)
// ---------------------------------------------------------------------------

const APP_STATUS: {
  key: ApplicationStatus;
  label: string;
  hint: string;
  icon: LucideIcon;
  bar: string;
  tile: string;
}[] = [
    { key: "pending", label: "Pending", hint: "Not opened yet", icon: Clock, bar: "bg-amber-400", tile: "bg-amber-500/15 text-amber-600 dark:text-amber-400" },
    { key: "under_review", label: "Under review", hint: "With a reviewer", icon: Search, bar: "bg-sky-500", tile: "bg-sky-500/15 text-sky-600 dark:text-sky-400" },
    { key: "approved", label: "Approved", hint: "Accepted", icon: CheckCircle2, bar: "bg-emerald-500", tile: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" },
    { key: "waitlisted", label: "Waitlisted", hint: "Waiting for a place", icon: Hourglass, bar: "bg-violet-500", tile: "bg-violet-500/15 text-violet-600 dark:text-violet-400" },
    { key: "rejected", label: "Rejected", hint: "Declined", icon: XCircle, bar: "bg-rose-500", tile: "bg-rose-500/15 text-rose-600 dark:text-rose-400" },
    { key: "withdrawn", label: "Withdrawn", hint: "Applicant left", icon: MinusCircle, bar: "bg-zinc-400 dark:bg-zinc-500", tile: "bg-zinc-500/15 text-zinc-500 dark:text-zinc-400" },
  ];

// One row of the funnel: bar width is relative to everyone who applied
function StageRow({
  label,
  hint,
  value,
  total,
  fill,
}: {
  label: string;
  hint: string;
  value: number;
  total: number;
  fill: string;
}) {
  const pct = total > 0 ? clampPct((value / total) * 100) : 0;
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-3">
        <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          {label}
          <span className="ml-2 text-xs font-normal text-zinc-500 dark:text-zinc-400">
            {hint}
          </span>
        </span>
        <span className="text-sm font-semibold text-zinc-900 dark:text-white">
          {value.toLocaleString()}
        </span>
      </div>
      <div className="h-3 w-full overflow-hidden rounded-sm bg-zinc-200 dark:bg-white/10">
        <div
          className={`h-full transition-all duration-700 ease-out ${fill}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// The story: who applied → who is waiting on us → what we decided
function ApplicationsSection({
  stats,
  loading,
}: {
  stats: ApplicationSummaryStats | null;
  loading: boolean;
}) {
  if (loading && !stats) return <Skeleton className="h-72" />;

  if (!stats || stats.total === 0) {
    return (
      <div className={`${CARD} p-6 text-sm text-zinc-500 dark:text-zinc-400`}>
        No applications yet. They'll appear here as soon as someone applies.
      </div>
    );
  }

  const n = (k: ApplicationStatus) => stats.byStatus[k] ?? 0;
  const awaiting = n("pending") + n("under_review");
  const decided = n("approved") + n("waitlisted") + n("rejected");
  const approvalRate =
    decided > 0 ? Math.round((n("approved") / decided) * 100) : null;
  const R = 54;

  const growth = stats.growthRate;
  const showGrowth = stats.lastMonth > 0 || stats.thisMonth > 0;

  return (
    <div className="grid gap-4 lg:grid-cols-[3fr_2fr] lg:gap-6">
      {/* Pipeline */}
      <div className={`${CARD} p-5 sm:p-6`}>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-4xl font-semibold tracking-tight text-zinc-900 dark:text-white">
              {stats.total.toLocaleString()}
            </p>
            <p className="text-xs text-zinc-600 dark:text-zinc-400">
              applications received
              {stats.thisMonth > 0 && (
                <>
                  {" · "}
                  <span className="font-semibold text-orange-600 dark:text-orange-400">
                    {stats.thisMonth} new
                  </span>{" "}
                  this month
                  {showGrowth && (
                    <span
                      className={`ml-1.5 inline-flex items-center gap-0.5 font-semibold ${growth >= 0
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-rose-600 dark:text-rose-400"
                        }`}
                    >
                      {growth >= 0 ? (
                        <TrendingUp size={11} />
                      ) : (
                        <TrendingDown size={11} />
                      )}
                      {Math.abs(growth).toFixed(1)}%
                    </span>
                  )}
                </>
              )}
            </p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-semibold text-orange-500 dark:text-orange-400">
              {awaiting.toLocaleString()}
            </p>
            <p className="text-xs text-zinc-600 dark:text-zinc-400">need a decision</p>
          </div>
        </div>

        {/* Funnel */}
        <div className="mt-6 space-y-4">
          <StageRow label="Received" hint="Everyone who applied" value={stats.total} total={stats.total} fill={NAVY_FILL} />
          <StageRow label="Waiting" hint="Pending + under review" value={awaiting} total={stats.total} fill="bg-orange-400" />
          <StageRow label="Decided" hint="Approved, waitlisted, rejected" value={decided} total={stats.total} fill="bg-emerald-500" />
        </div>

        {/* Where everyone sits */}
        <div className="mt-6">
          <StackedBar
            total={stats.total}
            segments={APP_STATUS.map((s) => ({ label: s.label, value: n(s.key), className: s.bar }))}
          />
        </div>
        <ul className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {APP_STATUS.map(({ key, label, hint, icon: Icon, tile }) => (
            <li key={key}>
              <Link
                href={`/applications?status=${key}`}
                className={`flex items-center gap-3 rounded-sm border border-zinc-200 p-2.5 transition-colors hover:border-orange-400 hover:bg-orange-400/5 dark:border-zinc-800 ${FOCUS_RING}`}
              >
                <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-sm ${tile}`}>
                  <Icon size={16} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className={`block text-[13px] font-semibold leading-tight ${NAVY_TEXT}`}>{label}</span>
                  <span className="block truncate text-xs text-zinc-500 dark:text-zinc-400">{hint}</span>
                </span>
                <span className="text-sm font-semibold text-zinc-900 dark:text-white">
                  {n(key).toLocaleString()}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>

      {/* Outcome + next step */}
      <div className={`${CARD} flex flex-col p-5 sm:p-6`}>
        <h3 className={`text-sm font-semibold ${NAVY_TEXT}`}>Decision outcomes</h3>

        {approvalRate !== null ? (
          <div className="mt-4 flex items-center gap-5">
            <div role="img" aria-label={`Approval rate ${approvalRate} percent`} className="relative h-32 w-32 shrink-0">
              <svg viewBox="0 0 132 132" className="h-full w-full -rotate-90">
                <circle cx="66" cy="66" r={R} fill="none" strokeWidth="12" className="stroke-[#082B66]/15 dark:stroke-white/10" />
                <circle
                  cx="66"
                  cy="66"
                  r={R}
                  fill="none"
                  strokeWidth="12"
                  strokeDasharray={2 * Math.PI * R}
                  strokeDashoffset={2 * Math.PI * R * (1 - approvalRate / 100)}
                  className="stroke-emerald-500 transition-all duration-700 ease-out"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-semibold text-zinc-900 dark:text-white">{approvalRate}%</span>
                <span className="text-[11px] text-zinc-600 dark:text-zinc-400">approved</span>
              </div>
            </div>
            <ul className="min-w-0 flex-1 space-y-2.5">
              <LegendRow swatch="bg-emerald-500" label="Approved" value={n("approved").toLocaleString()} />
              <LegendRow swatch="bg-violet-500" label="Waitlisted" value={n("waitlisted").toLocaleString()} />
              <LegendRow swatch="bg-rose-500" label="Rejected" value={n("rejected").toLocaleString()} />
            </ul>
          </div>
        ) : (
          <p className="mt-4 text-sm text-zinc-500 dark:text-zinc-400">
            No decisions yet. Outcomes will show here once applications are approved, waitlisted or rejected.
          </p>
        )}

        <div className="mt-5">
          <Insight>
            {awaiting > 0 ? (
              <>
                <B>{awaiting.toLocaleString()}</B> {awaiting === 1 ? "application is" : "applications are"} waiting for a decision
                {n("pending") > 0 && (
                  <>
                    , <B>{n("pending").toLocaleString()}</B> not opened yet
                  </>
                )}
                .
              </>
            ) : (
              <>Every application has a decision. The queue is clear.</>
            )}
          </Insight>
        </div>

        <Link
          href={awaiting > 0 ? "/applications?status=pending" : "/applications"}
          className="mt-5 inline-flex h-10 items-center justify-center gap-2 rounded-sm bg-orange-400 px-4 text-sm font-semibold text-[#082B66] transition-colors hover:bg-orange-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#082B66] focus-visible:ring-offset-2 dark:focus-visible:ring-white dark:focus-visible:ring-offset-zinc-900 md:mt-auto"
        >
          <Inbox size={16} />
          {awaiting > 0 ? "Review pending" : "View all applications"}
        </Link>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------

interface GenderEntry {
  gender: string;
  count: number;
}

const COMPOSITION_SEGMENTS = [
  { bar: "bg-orange-400", swatch: "bg-orange-400" },
  { bar: NAVY_FILL, swatch: NAVY_FILL },
  { bar: "bg-orange-200 dark:bg-orange-300/70", swatch: "bg-orange-200 dark:bg-orange-300/70" },
  { bar: "bg-blue-300 dark:bg-blue-300/60", swatch: "bg-blue-300 dark:bg-blue-300/60" },
];

export default function DashboardPage() {
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();

  const [studentStats, setStudentStats] = useState<StudentOverviewStats | null>(
    null,
  );
  const [financeSummary, setFinanceSummary] = useState<FinanceSummary | null>(
    null,
  );
  const [kpis, setKpis] = useState<CurriculumKpis | null>(null);
  const [appStats, setAppStats] = useState<ApplicationSummaryStats | null>(
    null,
  );

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [imageFailed, setImageFailed] = useState(false);
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
  }, []);

  useEffect(() => {
    setImageFailed(false);
  }, [user?.profileImage]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      const [studentsRes, financeRes, kpisRes, appsRes] = await Promise.allSettled([
        studentApi.getOverviewStats(),
        financeAnalyticsApi.summary(6, 5),
        curriculumApi.kpis(),
        applicationApi.getSummaryStats(),
      ]);

      if (cancelled) return;

      if (studentsRes.status === "fulfilled") {
        setStudentStats(studentsRes.value.data);
      }
      if (financeRes.status === "fulfilled") {
        setFinanceSummary(financeRes.value);
      }
      if (kpisRes.status === "fulfilled") {
        setKpis(kpisRes.value);
      }
      if (appsRes.status === "fulfilled") {
        setAppStats(appsRes.value.data);
      }

      const anyFailed =
        studentsRes.status === "rejected" ||
        financeRes.status === "rejected" ||
        kpisRes.status === "rejected" ||
        appsRes.status === "rejected";

      if (anyFailed) setError("Some dashboard metrics could not be loaded.");

      setLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  // ---- Signed-in user ----------------------------------------------------

  const displayName = user?.name?.trim() || "Staff Member";
  const displayEmail = user?.email?.trim() || "Staff account";
  const initials = user?.name?.trim()?.charAt(0)?.toUpperCase() || "U";
  const firstName = displayName.split(/\s+/)[0];

  const rawRole = user?.role?.toString()?.trim() || "staff";
  const role = rawRole.charAt(0).toUpperCase() + rawRole.slice(1).toLowerCase();

  const profileImage =
    !imageFailed && user?.profileImage?.trim() ? user.profileImage.trim() : "";

  const greeting = !now
    ? "Welcome back"
    : now.getHours() < 12
      ? "Good morning"
      : now.getHours() < 17
        ? "Good afternoon"
        : "Good evening";

  // ---- Derived metrics ---------------------------------------------------

  const students = kpis?.students.total ?? studentStats?.totalStudents;
  const courses = kpis?.courses.total;

  const activePct = useMemo<number | null>(() => {
    if (!studentStats || studentStats.totalEnrollments <= 0) return null;
    return Math.round(
      (studentStats.activeEnrollments / studentStats.totalEnrollments) * 100,
    );
  }, [studentStats]);

  const completedPct = useMemo<number | null>(() => {
    if (!studentStats || studentStats.totalEnrollments <= 0) return null;
    return Math.round(
      (studentStats.completedEnrollments / studentStats.totalEnrollments) * 100,
    );
  }, [studentStats]);

  const perStudent = useMemo<string | null>(() => {
    if (!studentStats || studentStats.totalStudents <= 0) return null;
    return (studentStats.totalEnrollments / studentStats.totalStudents).toFixed(
      1,
    );
  }, [studentStats]);

  const collectionRatePct = useMemo<number>(() => {
    const r = financeSummary?.assessments.collectionRate ?? 0;
    return clampPct(Math.round(r * 100));
  }, [financeSummary]);

  const monthDelta = financeSummary?.delta ?? null;

  const genders: GenderEntry[] = studentStats?.genderBreakdown ?? [];
  const genderTotal =
    studentStats?.totalStudents ||
    genders.reduce((sum, g) => sum + g.count, 0);

  const appsAwaiting = appStats
    ? appStats.byStatus.pending + appStats.byStatus.under_review
    : 0;

  const storyLoading = loading && students === undefined && !financeSummary;

  // ---- Render ------------------------------------------------------------

  return (
    <div className="min-h-screen bg-[#f5f7fb] text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      <div className="mx-auto max-w-[120rem] space-y-8 px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
        {/* ============================================================== */}
        {/* HERO                                                           */}
        {/* ============================================================== */}
        <header className="relative overflow-hidden rounded-sm border border-white/10 bg-linear-to-br from-[#082B66] via-[#0b397c] to-[#14529a] px-5 py-6 text-white shadow-[0_24px_70px_-28px_rgba(8,43,102,0.65)] sm:px-8 sm:py-8">
          <span aria-hidden className="pointer-events-none absolute -right-16 -top-28 h-80 w-80 rounded-full border border-white/10 bg-white/3" />
          <span aria-hidden className="pointer-events-none absolute -right-2 top-4 h-52 w-52 rounded-full border border-orange-300/20" />
          <div className="relative z-10 flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div className="flex min-w-0 items-center gap-4">
              <HeroAvatar
                src={profileImage}
                name={displayName}
                initials={initials}
                loading={authLoading}
                onError={() => setImageFailed(true)}
              />

              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-orange-400">
                  {greeting}
                </p>

                {authLoading ? (
                  <div className="mt-1.5 space-y-2">
                    <div className="h-7 w-48 animate-pulse rounded-sm bg-white/15" />
                    <div className="h-4 w-56 animate-pulse rounded-sm bg-white/10" />
                  </div>
                ) : (
                  <>
                    <h1 className="truncate text-2xl font-semibold leading-tight tracking-tight sm:text-3xl">
                      {isAuthenticated ? firstName : "Welcome"}
                    </h1>
                    <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1.5">
                      <span className="rounded-sm border border-orange-400/50 bg-orange-400/15 px-2 py-0.5 text-xs font-semibold text-orange-300">
                        {role}
                      </span>
                      <span className="truncate text-sm text-blue-100">
                        {displayEmail}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-x-6 gap-y-3 md:justify-end">
              <div className="md:text-right">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-blue-200">
                  Today
                </p>
                <p className="text-sm font-medium text-white">
                  {now
                    ? now.toLocaleDateString(undefined, {
                      weekday: "long",
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })
                    : "\u00A0"}
                </p>
              </div>

              <Link
                href="/profile"
                className="inline-flex items-center justify-center gap-2 rounded-sm bg-orange-400 px-4 py-2.5 text-sm font-semibold text-[#082B66] transition-colors hover:bg-orange-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#082B66]"
              >
                <User size={16} />
                My profile
              </Link>
            </div>
          </div>

          {/* The story in one line */}
          <div className="mt-5 border-t border-white/15 pt-4">
            {storyLoading ? (
              <div className="flex flex-wrap gap-6">
                <div className="h-5 w-48 animate-pulse rounded-sm bg-white/10" />
                <div className="h-5 w-44 animate-pulse rounded-sm bg-white/10" />
                <div className="h-5 w-40 animate-pulse rounded-sm bg-white/10" />
              </div>
            ) : (
              <ul className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-6 sm:gap-y-2">
                {students !== undefined && (
                  <StoryStat>
                    <Num>{students.toLocaleString()}</Num>
                    students
                    {courses !== undefined && (
                      <> across {courses.toLocaleString()} courses</>
                    )}
                  </StoryStat>
                )}
                {activePct !== null && (
                  <StoryStat>
                    <Num>{activePct}%</Num>
                    of enrollments are active
                  </StoryStat>
                )}
                {financeSummary && (
                  <RequireRoleInline roles={["admin", "registrar"]}>
                    <StoryStat>
                      <Num>{collectionRatePct}%</Num>
                      of billed fees collected
                    </StoryStat>
                  </RequireRoleInline>
                )}
                {appStats && appsAwaiting > 0 && (
                  <StoryStat>
                    <Num>{appsAwaiting.toLocaleString()}</Num>
                    applications awaiting a decision
                  </StoryStat>
                )}
                {students === undefined &&
                  activePct === null &&
                  !financeSummary &&
                  !appStats && (
                    <StoryStat>Your institution at a glance.</StoryStat>
                  )}
              </ul>
            )}
          </div>
        </header>

        {error && (
          <div
            role="alert"
            className="rounded-sm border-l-4 border-orange-400 bg-orange-50 px-4 py-3 text-sm text-orange-900 dark:bg-orange-400/10 dark:text-orange-200"
          >
            {error}
          </div>
        )}

        {/* ============================================================== */}
        {/* BODY                                                           */}
        {/* ============================================================== */}
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_21rem] 2xl:grid-cols-[minmax(0,1fr)_24rem]">
          <aside
            className={`xl:order-2 xl:sticky xl:top-6 xl:max-h-[calc(100dvh-3rem)] xl:self-start xl:overflow-y-auto ${HIDE_SCROLLBAR}`}
          >
            <QuickActions />
          </aside>

          <div className="min-w-0 space-y-8 xl:order-1">
            {/* ---------------- 01 People ---------------- */}
            <section>
              <Chapter
                n="01"
                title="People"
                subtitle="The people, programs and structure behind the institution"
                action={
                  <Link
                    href="/students"
                    className={`inline-flex items-center gap-1 rounded-sm text-xs font-semibold text-[#082B66] hover:underline dark:text-orange-400 ${FOCUS_RING}`}
                  >
                    View students
                    <ChevronRight size={14} />
                  </Link>
                }
              />

              <div className="grid gap-4 lg:grid-cols-12">
                {/* Primary student metric */}
                <div className={`${CARD} relative overflow-hidden p-5 sm:p-6 lg:col-span-5`}>
                  <div className="absolute right-0 top-0 h-28 w-28 translate-x-8 -translate-y-8 rounded-full bg-orange-400/10" />
                  <div className="absolute bottom-0 right-0 h-1 w-24 bg-orange-400" />

                  <div className="relative">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex h-11 w-11 items-center justify-center rounded-sm bg-[#082B66] text-white">
                        <GraduationCap size={21} />
                      </div>

                      <span className="rounded-sm bg-orange-400/10 px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-orange-600 dark:text-orange-400">
                        Students
                      </span>
                    </div>

                    <div className="mt-8">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500 dark:text-zinc-400">
                        Registered learners
                      </p>

                      {loading && students === undefined ? (
                        <Skeleton className="mt-2 h-12 w-32" />
                      ) : (
                        <p className="mt-1 text-5xl font-semibold tracking-tight text-[#082B66] dark:text-white sm:text-6xl">
                          {students !== undefined ? students.toLocaleString() : "—"}
                        </p>
                      )}

                      <p className="mt-2 max-w-sm text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                        Learners currently represented in the institution's student records.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Supporting metrics */}
                <div className="grid grid-cols-2 gap-4 lg:col-span-7">
                  {/* Faculty */}
                  <div
                    className={`${CARD} group relative overflow-hidden p-4 transition-shadow hover:shadow-md sm:p-5`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-sm bg-orange-400/15 text-orange-600 dark:text-orange-400">
                        <UserCog size={19} />
                      </div>

                      <span className="h-1.5 w-1.5 rounded-full bg-orange-400" />
                    </div>

                    <div className="mt-6">
                      <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                        Faculty
                      </p>

                      {loading && !kpis ? (
                        <Skeleton className="mt-2 h-9 w-20" />
                      ) : (
                        <p className="mt-1 text-3xl font-semibold tracking-tight text-[#082B66] dark:text-white">
                          {kpis?.faculty.total !== undefined
                            ? kpis.faculty.total.toLocaleString()
                            : "—"}
                        </p>
                      )}

                      <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                        Teaching staff
                      </p>
                    </div>
                  </div>

                  {/* Courses */}
                  <div
                    className={`${CARD} group relative overflow-hidden p-4 transition-shadow hover:shadow-md sm:p-5`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-sm bg-[#082B66]/10 text-[#082B66] dark:bg-white/10 dark:text-white">
                        <BookOpen size={19} />
                      </div>

                      <span className="h-1.5 w-1.5 rounded-full bg-[#082B66]" />
                    </div>

                    <div className="mt-6">
                      <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                        Courses
                      </p>

                      {loading && !kpis ? (
                        <Skeleton className="mt-2 h-9 w-20" />
                      ) : (
                        <p className="mt-1 text-3xl font-semibold tracking-tight text-[#082B66] dark:text-white">
                          {courses !== undefined ? courses.toLocaleString() : "—"}
                        </p>
                      )}

                      <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                        Active programs
                      </p>
                    </div>
                  </div>

                  {/* Departments */}
                  <div
                    className={`${CARD} group relative overflow-hidden p-4 transition-shadow hover:shadow-md sm:p-5`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-sm bg-[#082B66]/10 text-[#082B66] dark:bg-white/10 dark:text-white">
                        <Building2 size={19} />
                      </div>

                      <span className="h-1.5 w-1.5 rounded-full bg-orange-400" />
                    </div>

                    <div className="mt-6">
                      <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                        Departments
                      </p>

                      {loading && !kpis ? (
                        <Skeleton className="mt-2 h-9 w-20" />
                      ) : (
                        <p className="mt-1 text-3xl font-semibold tracking-tight text-[#082B66] dark:text-white">
                          {kpis?.departments.total !== undefined
                            ? kpis.departments.total.toLocaleString()
                            : "—"}
                        </p>
                      )}

                      <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                        Academic divisions
                      </p>
                    </div>
                  </div>

                  {/* Student-to-course context */}
                  <div
                    className={`${CARD} relative overflow-hidden p-4 sm:p-5`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-sm bg-orange-400/15 text-orange-600 dark:text-orange-400">
                        <Users size={19} />
                      </div>

                      {perStudent && (
                        <span className="text-xs font-semibold text-orange-600 dark:text-orange-400">
                          {perStudent}:1
                        </span>
                      )}
                    </div>

                    <div className="mt-6">
                      <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                        Enrollment density
                      </p>

                      <p className="mt-1 text-3xl font-semibold tracking-tight text-[#082B66] dark:text-white">
                        {perStudent ?? "—"}
                      </p>

                      <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                        Enrollments per student
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* ---------------- 02 Admissions ---------------- */}
            <section>
              <Chapter
                n="02"
                title="Admissions"
                subtitle="Who applied, who is waiting on us, and what we decided"
                action={
                  <Link
                    href="/applications"
                    className={`inline-flex items-center gap-1 rounded-sm text-xs font-semibold text-[#082B66] hover:underline dark:text-orange-400 ${FOCUS_RING}`}
                  >
                    View applications
                    <ChevronRight size={14} />
                  </Link>
                }
              />
              <ApplicationsSection stats={appStats} loading={loading} />
            </section>

            {/* ---------------- 03 Student journey ---------------- */}
            <section>
              <Chapter
                n="03"
                title="Student journey"
                subtitle="Where learners are in their programs, and who they are"
              />

              <div className="grid gap-4 lg:grid-cols-2 lg:gap-6">
                {/* Enrollment lifecycle */}
                <div className={`${CARD} p-5 sm:p-6`}>
                  <h3 className={`text-sm font-semibold ${NAVY_TEXT}`}>
                    Enrollment lifecycle
                  </h3>

                  {loading && !studentStats ? (
                    <Skeleton className="mt-4 h-40" />
                  ) : studentStats ? (
                    <>
                      <div className="mt-4 flex items-end justify-between gap-4">
                        <div>
                          <p className="text-4xl font-semibold tracking-tight text-zinc-900 dark:text-white">
                            {studentStats.totalEnrollments.toLocaleString()}
                          </p>
                          <p className="text-xs text-zinc-600 dark:text-zinc-400">
                            total enrollments
                          </p>
                        </div>
                        {perStudent && (
                          <div className="text-right">
                            <p className="text-2xl font-semibold text-orange-500 dark:text-orange-400">
                              {perStudent}
                            </p>
                            <p className="text-xs text-zinc-600 dark:text-zinc-400">
                              per student
                            </p>
                          </div>
                        )}
                      </div>

                      <div className="mt-5">
                        <StackedBar
                          total={studentStats.totalEnrollments}
                          segments={[
                            {
                              label: "Active",
                              value: studentStats.activeEnrollments,
                              className: "bg-orange-400",
                            },
                            {
                              label: "Completed",
                              value: studentStats.completedEnrollments,
                              className: NAVY_FILL,
                            },
                          ]}
                        />
                      </div>

                      <ul className="mt-4 space-y-2.5">
                        <LegendRow
                          swatch="bg-orange-400"
                          label="Active"
                          value={studentStats.activeEnrollments.toLocaleString()}
                          pct={activePct ?? undefined}
                        />
                        <LegendRow
                          swatch={NAVY_FILL}
                          label="Completed"
                          value={studentStats.completedEnrollments.toLocaleString()}
                          pct={completedPct ?? undefined}
                        />
                      </ul>

                      {activePct !== null && (
                        <div className="mt-5">
                          <Insight>
                            <B>{activePct}%</B> of enrollments are still in
                            progress; <B>{completedPct ?? 0}%</B> have been
                            completed.
                          </Insight>
                        </div>
                      )}
                    </>
                  ) : (
                    <p className="mt-4 text-sm text-zinc-500 dark:text-zinc-400">
                      No enrollment data available.
                    </p>
                  )}
                </div>

                {/* Composition */}
                <div className={`${CARD} p-5 sm:p-6`}>
                  <h3 className={`text-sm font-semibold ${NAVY_TEXT}`}>
                    Student composition
                  </h3>

                  {loading && !studentStats ? (
                    <Skeleton className="mt-4 h-40" />
                  ) : genders.length > 0 ? (
                    <>
                      <div className="mt-4 flex items-end justify-between gap-4">
                        <div>
                          <p className="text-4xl font-semibold tracking-tight text-zinc-900 dark:text-white">
                            {genderTotal.toLocaleString()}
                          </p>
                          <p className="text-xs text-zinc-600 dark:text-zinc-400">
                            registered students
                          </p>
                        </div>
                      </div>

                      <div className="mt-5">
                        <StackedBar
                          total={genderTotal || 1}
                          segments={genders.map((g, i) => ({
                            label: g.gender,
                            value: g.count,
                            className:
                              COMPOSITION_SEGMENTS[i % COMPOSITION_SEGMENTS.length]
                                .bar,
                          }))}
                        />
                      </div>

                      <ul className="mt-4 space-y-2.5">
                        {genders.map((g, i) => (
                          <LegendRow
                            key={g.gender}
                            swatch={
                              COMPOSITION_SEGMENTS[i % COMPOSITION_SEGMENTS.length]
                                .swatch
                            }
                            label={g.gender}
                            value={g.count.toLocaleString()}
                            pct={
                              genderTotal > 0
                                ? Math.round((g.count / genderTotal) * 100)
                                : 0
                            }
                          />
                        ))}
                      </ul>
                    </>
                  ) : (
                    <p className="mt-4 text-sm text-zinc-500 dark:text-zinc-400">
                      No student data available.
                    </p>
                  )}
                </div>
              </div>
            </section>

            {/* ---------------- 04 Finance ---------------- */}
            <RequireRoleInline roles={["admin", "registrar"]}>
              <section>
                <Chapter
                  n="04"
                  title="Fee collection"
                  subtitle="From what was billed to what has been collected"
                  action={
                    <Link
                      href="/finance"
                      className={`inline-flex items-center gap-1 rounded-sm text-xs font-semibold text-[#082B66] hover:underline dark:text-orange-400 ${FOCUS_RING}`}
                    >
                      View finances
                      <ChevronRight size={14} />
                    </Link>
                  }
                />

                <div className={`${CARD} p-5 sm:p-6`}>
                  {loading && !financeSummary ? (
                    <Skeleton className="h-56" />
                  ) : financeSummary ? (
                    <>
                      <div className="grid gap-6 md:grid-cols-[auto_1fr] md:items-center md:gap-10">
                        {/* Gauge */}
                        <div className="flex justify-center md:justify-start">
                          <div
                            role="img"
                            aria-label={`Collection rate ${collectionRatePct} percent`}
                            className="relative h-36 w-36"
                          >
                            <svg viewBox="0 0 132 132" className="h-full w-full -rotate-90">
                              <circle
                                cx="66"
                                cy="66"
                                r="54"
                                fill="none"
                                strokeWidth="12"
                                className="stroke-[#082B66]/15 dark:stroke-white/10"
                              />
                              <circle
                                cx="66"
                                cy="66"
                                r="54"
                                fill="none"
                                strokeWidth="12"
                                strokeLinecap="butt"
                                strokeDasharray={2 * Math.PI * 54}
                                strokeDashoffset={
                                  2 * Math.PI * 54 * (1 - collectionRatePct / 100)
                                }
                                className="stroke-orange-400 transition-all duration-700 ease-out"
                              />
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                              <span className="text-3xl font-semibold text-zinc-900 dark:text-white">
                                {collectionRatePct}%
                              </span>
                              <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">
                                collected
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Billed → Paid → Outstanding */}
                        <div className="space-y-4">
                          <FlowRow
                            label="Billed"
                            amount={financeSummary.assessments.totalBilled}
                            billed={financeSummary.assessments.totalBilled}
                            fill={NAVY_FILL}
                          />
                          <FlowRow
                            label="Paid"
                            amount={financeSummary.assessments.totalPaid}
                            billed={financeSummary.assessments.totalBilled}
                            fill="bg-orange-400"
                          />
                          <FlowRow
                            label="Outstanding"
                            amount={financeSummary.assessments.outstanding}
                            billed={financeSummary.assessments.totalBilled}
                            fill="bg-orange-200 dark:bg-orange-300/70"
                          />
                        </div>
                      </div>

                      <div className="mt-6">
                        <Insight>
                          <B>
                            {formatCompact(financeSummary.assessments.outstanding)}
                          </B>{" "}
                          is still outstanding —{" "}
                          <B>{collectionRatePct}%</B> of billed fees have been
                          collected.
                        </Insight>
                      </div>

                      <div className="mt-5 grid grid-cols-2 gap-3 border-t border-zinc-200 pt-5 dark:border-zinc-800 lg:grid-cols-4">
                        {/* This month */}
                        <div className="col-span-2 rounded-sm border border-zinc-200 bg-zinc-50 p-3.5 dark:border-zinc-800 dark:bg-zinc-950 lg:col-span-1">
                          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">
                            This month
                          </p>
                          <p
                            className="mt-1 text-xl font-semibold text-orange-500 dark:text-orange-400"
                            title={formatCurrency(financeSummary.thisMonth)}
                          >
                            {formatCompact(financeSummary.thisMonth)}
                          </p>
                          {monthDelta !== null && (
                            <span
                              className={`mt-1.5 inline-flex items-center gap-1 rounded-sm px-1.5 py-0.5 text-xs font-semibold ${monthDelta >= 0
                                ? "bg-orange-400/15 text-orange-700 dark:text-orange-300"
                                : "bg-rose-500/10 text-rose-700 dark:text-rose-300"
                                }`}
                            >
                              {monthDelta >= 0 ? (
                                <TrendingUp size={12} />
                              ) : (
                                <TrendingDown size={12} />
                              )}
                              {Math.abs(monthDelta).toFixed(1)}% vs last month
                            </span>
                          )}
                        </div>

                        <StatusTile
                          label="Confirmed"
                          count={financeSummary.transactions.confirmedCount}
                          dot="bg-orange-400"
                        />
                        <StatusTile
                          label="Pending"
                          count={financeSummary.transactions.pendingCount}
                          dot={NAVY_FILL}
                        />
                        <StatusTile
                          label="Reversed"
                          count={financeSummary.transactions.reversedCount}
                          dot="bg-zinc-400 dark:bg-zinc-500"
                        />
                      </div>
                    </>
                  ) : (
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
                      No finance data available.
                    </p>
                  )}
                </div>
              </section>
            </RequireRoleInline>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Finance helpers
// ---------------------------------------------------------------------------

function FlowRow({
  label,
  amount,
  billed,
  fill,
}: {
  label: string;
  amount: number;
  billed: number;
  fill: string;
}) {
  const pct = billed > 0 ? clampPct((amount / billed) * 100) : 0;
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-3">
        <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          {label}
        </span>
        <span
          className="text-sm font-semibold text-zinc-900 dark:text-white"
          title={formatCurrency(amount)}
        >
          {formatCompact(amount)}
        </span>
      </div>
      <div className="h-3 w-full overflow-hidden rounded-sm bg-zinc-200 dark:bg-white/10">
        <div
          className={`h-full transition-all duration-700 ease-out ${fill}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function StatusTile({
  label,
  count,
  dot,
}: {
  label: string;
  count: number;
  dot: string;
}) {
  return (
    <div className="rounded-sm border border-zinc-200 bg-zinc-50 p-3.5 dark:border-zinc-800 dark:bg-zinc-950">
      <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">
        <span className={`h-2.5 w-2.5 rounded-sm ${dot}`} />
        {label}
      </p>
      <p className="mt-1 text-xl font-semibold text-zinc-900 dark:text-white">
        {count.toLocaleString()}
      </p>
      <p className="text-xs text-zinc-500 dark:text-zinc-400">transactions</p>
    </div>
  );
}
