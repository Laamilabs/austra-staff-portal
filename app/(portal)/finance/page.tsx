// app/(portal)/finance/page.tsx
"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    AlertCircle,
    ArrowRight,
    ArrowUpRight,
    Banknote,
    CalendarDays,
    CheckCircle2,
    GraduationCap,
    Hourglass,
    Landmark,
    Layers,
    LoaderCircle,
    MoreHorizontal,
    Plus,
    Receipt,
    RefreshCw,
    Smartphone,
    TrendingDown,
    TrendingUp,
    Undo2,
    Users,
    Wallet,
    type LucideIcon,
} from "lucide-react";

import {
    financeAnalyticsApi,
    feeTransactionApi,
    type FinanceSummary,
    type FeeTransaction,
    type PaymentMethod,
    type TransactionStatus,
    type StudentBalance,
} from "@/app/types/finance";
import RequireRole from "@/app/components/navigation/RequireRole";

// ---------------------------------------------------------------------------
// Tokens
// ---------------------------------------------------------------------------

const FOCUS_RING =
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400";

const FOCUS_OFFSET =
    "focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#0B1E3D]";

const SURFACE =
    "rounded-sm border border-zinc-200/80 bg-white/80 shadow-sm shadow-blue-950/5 dark:border-white/10 dark:bg-white/4";

const CODE_CHIP =
    "rounded-sm bg-[#0B1E3D]/5 px-1.5 py-0.5 font-mono text-[11px] font-medium text-[#0B1E3D] ring-1 ring-inset ring-[#0B1E3D]/10 dark:bg-orange-400/10 dark:text-orange-300 dark:ring-orange-400/25";

const TONES = {
    sky: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
    emerald: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    violet: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
    rose: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
    orange: "bg-orange-400/10 text-orange-500 dark:text-orange-400",
    zinc: "bg-zinc-500/10 text-zinc-600 dark:text-zinc-300",
} as const;

type Tone = keyof typeof TONES;

// ---------------------------------------------------------------------------
// Static config
// ---------------------------------------------------------------------------

interface FinanceModule {
    href: string;
    title: string;
    description: string;
    tone: Tone;
    icon: LucideIcon;
    /** Live figure shown on the tile once the summary has loaded. */
    stat: (s: FinanceSummary) => { value: string; label: string };
}

// Order follows how money moves: price a course, bill the student, record payments.
const modules: FinanceModule[] = [
    {
        href: "/finance/fee-structures",
        title: "Fee structures",
        description:
            "Set what each course costs to take: fee items, totals and academic-year pricing.",
        tone: "orange",
        icon: Layers,
        stat: (s) => ({
            value: s.assessments.activeStructures.toLocaleString(),
            label: "active fee structures",
        }),
    },
    {
        href: "/finance/student-payments",
        title: "Student payments",
        description:
            "Each student's total fees, what they have paid and what is still owed.",
        tone: "sky",
        icon: Users,
        stat: (s) => ({
            value: formatCurrency(s.assessments.outstanding),
            label: `outstanding · ${s.assessments.activeCount.toLocaleString()} active`,
        }),
    },
    {
        href: "/finance/transactions",
        title: "Transactions",
        description:
            "Every payment on record. Confirm, reverse and audit the ledger.",
        tone: "emerald",
        icon: Receipt,
        stat: (s) => ({
            value: s.transactions.confirmedCount.toLocaleString(),
            label: `confirmed · ${s.transactions.pendingCount.toLocaleString()} pending`,
        }),
    },
];

const METHOD_META: Record<
    PaymentMethod,
    { label: string; icon: LucideIcon; tone: Tone; bar: string }
> = {
    CASH: { label: "Cash", icon: Banknote, tone: "emerald", bar: "bg-emerald-500 dark:bg-emerald-400" },
    MPESA: { label: "M-Pesa", icon: Smartphone, tone: "sky", bar: "bg-sky-500 dark:bg-sky-400" },
    BANK_TRANSFER: { label: "Bank transfer", icon: Landmark, tone: "violet", bar: "bg-violet-500 dark:bg-violet-400" },
    OTHER: { label: "Other", icon: MoreHorizontal, tone: "zinc", bar: "bg-zinc-400 dark:bg-zinc-500" },
};

const STATUS_META: Record<
    TransactionStatus,
    { label: string; dot: string; badge: string }
> = {
    CONFIRMED: {
        label: "Confirmed",
        dot: "bg-emerald-500",
        badge: "bg-emerald-500/10 text-emerald-700 ring-emerald-500/25 dark:text-emerald-300",
    },
    PENDING: {
        label: "Pending",
        dot: "bg-violet-500",
        badge: "bg-violet-500/10 text-violet-700 ring-violet-500/25 dark:text-violet-300",
    },
    REVERSED: {
        label: "Reversed",
        dot: "bg-rose-500",
        badge: "bg-rose-500/10 text-rose-700 ring-rose-500/25 dark:text-rose-300",
    },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const KES = new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    maximumFractionDigits: 2,
});

const COMPACT = new Intl.NumberFormat("en-KE", {
    notation: "compact",
    maximumFractionDigits: 1,
});

function formatCurrency(value: number | null | undefined): string {
    if (value == null || !Number.isFinite(value)) return "—";
    return KES.format(value);
}

function formatDate(iso: string | null | undefined): string {
    if (!iso) return "—";
    const d = new Date(iso);
    return Number.isNaN(d.getTime())
        ? "—"
        : d.toLocaleDateString("en-KE", {
            year: "numeric",
            month: "short",
            day: "2-digit",
        });
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

function FinanceDashboardContent() {
    const [summary, setSummary] = useState<FinanceSummary | null>(null);
    // Recent activity is the one panel that still wants raw documents:
    // the summary gives us totals, not the individual rows for the timeline.
    const [recentTransactions, setRecentTransactions] = useState<FeeTransaction[]>([]);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [revealed, setRevealed] = useState(false);
    const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
    const [elapsed, setElapsed] = useState(0);

    const mounted = useRef(true);

    useEffect(() => {
        mounted.current = true;
        return () => {
            mounted.current = false;
        };
    }, []);

    const load = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            // Two small requests instead of three large ones:
            //   - summary: aggregate across every collection
            //   - transactions: trimmed to the latest 6 for the timeline
            const [sum, txs] = await Promise.all([
                financeAnalyticsApi.summary(6, 5),
                feeTransactionApi.getAll(),
            ]);

            if (!mounted.current) return;
            setSummary(sum);
            setUpdatedAt(new Date());
            setRecentTransactions(
                [...txs]
                    .sort(
                        (a, b) =>
                            new Date(b.transactionDate).getTime() -
                            new Date(a.transactionDate).getTime(),
                    )
                    .slice(0, 6),
            );
        } catch (err) {
            if (!mounted.current) return;
            setError(
                err instanceof Error
                    ? err.message
                    : "Failed to load finance summary.",
            );
        } finally {
            if (mounted.current) setLoading(false);
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    // Elapsed timer while loading, so waiting feels accounted for.
    useEffect(() => {
        if (!loading) {
            setElapsed(0);
            return;
        }
        const started = Date.now();
        const id = setInterval(
            () => setElapsed(Math.floor((Date.now() - started) / 1000)),
            1000,
        );
        return () => clearInterval(id);
    }, [loading]);

    // Let charts animate in once the data has landed.
    useEffect(() => {
        if (loading || error) {
            setRevealed(false);
            return;
        }
        const id = requestAnimationFrame(() => setRevealed(true));
        return () => cancelAnimationFrame(id);
    }, [loading, error]);

    // -------------------------------------------------------------------------
    // Derived values
    // -------------------------------------------------------------------------

    // `byMethod` arrives as `MethodTotal[]`; the chart component wants a
    // lookup keyed by method. Rebuild it once per summary change.
    const byMethod = useMemo(() => {
        const acc: Record<string, number> = {};
        summary?.byMethod.forEach((m) => {
            acc[m.method] = m.amount;
        });
        return acc;
    }, [summary]);

    // Student names come straight off the transaction document — the
    // populated `studentId` carries the fullName projection we need.
    const transactionStudentName = useCallback(
        (t: FeeTransaction): string => {
            const s = t.studentId;
            if (!s || typeof s === "string") return "Unknown student";
            const fn = s.fullName;
            if (!fn) return "Unknown student";
            return [fn.firstName, fn.middleName, fn.lastName]
                .filter(Boolean)
                .join(" ")
                .replace(/\s+/g, " ")
                .trim() || "Unknown student";
        },
        [],
    );

    const transactionCourseName = useCallback(
        (t: FeeTransaction): string => {
            const c = t.courseId;
            if (!c || typeof c === "string") return "";
            return c.name ?? "";
        },
        [],
    );

    const ready = !loading && !error && summary !== null;
    // On a failed refresh we keep the last good data on screen.
    const showBody = !error || summary !== null;
    const pct = summary ? Math.round(summary.assessments.collectionRate * 100) : 0;

    // Derived for the ring's second arc: outstanding as a share of billed.
    const outstandingShare = useMemo(() => {
        if (!summary || summary.assessments.totalBilled <= 0) return 0;
        return Math.min(
            1 - summary.assessments.collectionRate,
            Math.max(
                0,
                summary.assessments.outstanding /
                summary.assessments.totalBilled,
            ),
        );
    }, [summary]);

    // -------------------------------------------------------------------------
    // Render
    // -------------------------------------------------------------------------

    return (
        <div className="w-full min-w-0 max-w-full space-y-5 pb-20 sm:pb-0">
            <style>{`@keyframes finSlide{0%{transform:translateX(-100%)}100%{transform:translateX(500%)}}`}</style>

            {/* Header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-sm bg-orange-400/10 text-orange-500 ring-1 ring-inset ring-orange-400/30 dark:text-orange-400">
                        <Wallet className="h-5 w-5" strokeWidth={2} />
                    </span>
                    <div className="min-w-0">
                        <h1 className="text-xl font-bold tracking-tight text-[#0B1E3D] dark:text-white">
                            Finance
                        </h1>
                        <p className="text-sm text-zinc-500 dark:text-zinc-400">
                            From fees billed to money collected, and what is still owed.
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {updatedAt && (
                        <span className="mr-1 hidden text-xs text-zinc-500 md:block dark:text-zinc-400">
                            Updated{" "}
                            {updatedAt.toLocaleTimeString("en-KE", {
                                hour: "2-digit",
                                minute: "2-digit",
                            })}
                        </span>
                    )}
                    <button
                        type="button"
                        onClick={load}
                        disabled={loading}
                        title="Refresh"
                        aria-label="Refresh finance data"
                        className={`flex h-11 w-11 items-center justify-center rounded-sm border border-zinc-200 bg-white text-zinc-500 shadow-sm transition-colors hover:bg-zinc-50 hover:text-[#0B1E3D] disabled:opacity-60 dark:border-white/15 dark:bg-white/5 dark:text-zinc-300 dark:hover:bg-white/10 dark:hover:text-white ${FOCUS_RING}`}
                    >
                        <RefreshCw
                            className={`h-4.5 w-4.5 ${loading ? "motion-safe:animate-spin" : ""}`}
                        />
                    </button>

                    <Link
                        href="/finance/transactions/new"
                        className={`hidden h-11 items-center justify-center gap-2 rounded-sm bg-orange-500 px-5 text-sm font-semibold text-white shadow-sm shadow-blue-950/30 transition-colors hover:bg-orange-400 active:bg-orange-600 sm:inline-flex ${FOCUS_RING} ${FOCUS_OFFSET}`}
                    >
                        <Plus className="h-4 w-4" />
                        Record payment
                    </Link>
                </div>
            </div>

            {/* Progress: visible whenever data is being fetched */}
            {loading && (
                <div
                    role="progressbar"
                    aria-label="Loading finance data"
                    className="relative h-1 overflow-hidden rounded-sm bg-orange-400/15"
                >
                    <div className="absolute inset-y-0 left-0 w-1/5 rounded-sm bg-orange-500 motion-safe:animate-[finSlide_1.4s_ease-in-out_infinite] motion-reduce:w-full motion-reduce:opacity-50" />
                </div>
            )}

            {/* First load: say what is happening and how long it has taken */}
            {loading && !summary && !error && (
                <div
                    role="status"
                    className="flex items-center gap-3 rounded-sm border border-blue-200 border-l-4 border-l-blue-500 bg-blue-50 p-3 text-sm text-blue-900 dark:border-blue-400/20 dark:border-l-blue-400 dark:bg-blue-500/10 dark:text-blue-100"
                >
                    <LoaderCircle className="h-4 w-4 shrink-0 motion-safe:animate-spin" />
                    <p className="min-w-0 flex-1">
                        Loading the finance summary.{" "}
                        {elapsed >= 8
                            ? "Still working. Large ledgers can take a little longer."
                            : "Gathering fees, payments and balances."}
                    </p>
                    <span className="shrink-0 text-xs tabular-nums opacity-70">{elapsed}s</span>
                </div>
            )}

            {/* Error: specific, recoverable, keeps old data if there is any */}
            {error && (
                <div
                    role="alert"
                    className="flex flex-col gap-3 rounded-sm border border-red-200 border-l-4 border-l-red-500 bg-red-50 p-3.5 text-red-700 sm:flex-row sm:items-center dark:border-red-500/20 dark:border-l-red-500 dark:bg-red-500/10 dark:text-red-300"
                >
                    <AlertCircle className="h-5 w-5 shrink-0" />
                    <div className="min-w-0 flex-1 text-sm">
                        <p className="font-semibold">Couldn’t load the finance summary</p>
                        <p className="mt-0.5 break-words opacity-90">
                            {error}
                            {summary !== null && " Showing the last data that loaded."}
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={load}
                        disabled={loading}
                        className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-sm bg-red-600 px-3.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-red-500 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-2"
                    >
                        <RefreshCw className="h-3.5 w-3.5" />
                        Try again
                    </button>
                </div>
            )}

            {/* The three places finance work happens: kept big and first */}
            <section aria-labelledby="finance-modules-title">
                <h2
                    id="finance-modules-title"
                    className="mb-2.5 text-sm text-zinc-500 dark:text-zinc-400"
                >
                    Set the price, bill the student, record the payment.
                </h2>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                    {modules.map((m) => {
                        const Icon = m.icon;
                        const stat = summary ? m.stat(summary) : null;
                        return (
                            <Link
                                key={m.href}
                                href={m.href}
                                className={`group relative flex min-w-0 flex-col gap-4 overflow-hidden rounded-sm border border-zinc-200 bg-white p-5 shadow-sm shadow-blue-950/10 transition-all hover:border-orange-400/70 hover:shadow-lg hover:shadow-blue-950/15 active:bg-zinc-50 md:hover:-translate-y-0.5 motion-reduce:transition-none motion-reduce:hover:translate-y-0 dark:border-white/10 dark:bg-[#0B1E3D] dark:hover:border-orange-400/60 dark:hover:shadow-blue-950/50 dark:active:bg-[#0d2347] ${FOCUS_RING} ${FOCUS_OFFSET}`}
                            >
                                <span
                                    aria-hidden
                                    className="absolute inset-x-0 top-0 h-0.5 origin-left scale-x-25 bg-orange-400 transition-transform duration-300 group-hover:scale-x-100 motion-reduce:transition-none"
                                />
                                <div className="flex items-start gap-3.5">
                                    <span
                                        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-sm ${TONES[m.tone]}`}
                                    >
                                        <Icon className="h-6 w-6" strokeWidth={2} />
                                    </span>
                                    <div className="min-w-0">
                                        <h3 className="text-base font-semibold text-[#0B1E3D] dark:text-white">
                                            {m.title}
                                        </h3>
                                        <p className="mt-1 text-sm leading-5 text-zinc-500 dark:text-zinc-400">
                                            {m.description}
                                        </p>
                                    </div>
                                </div>

                                <div className="mt-auto flex items-end justify-between gap-3 border-t border-zinc-100 pt-3 dark:border-white/10">
                                    <div className="min-w-0">
                                        {stat ? (
                                            <>
                                                <p className="truncate text-lg font-bold leading-tight tabular-nums text-[#0B1E3D] dark:text-white">
                                                    {stat.value}
                                                </p>
                                                <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
                                                    {stat.label}
                                                </p>
                                            </>
                                        ) : (
                                            <div className="space-y-1.5" aria-hidden>
                                                <div className="h-5 w-24 animate-pulse rounded-sm bg-zinc-200 dark:bg-white/10" />
                                                <div className="h-3 w-32 animate-pulse rounded-sm bg-zinc-100 dark:bg-white/5" />
                                            </div>
                                        )}
                                    </div>
                                    <span className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-orange-600 dark:text-orange-400">
                                        Open
                                        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none" />
                                    </span>
                                </div>
                            </Link>
                        );
                    })}
                </div>
            </section>

            {/* Chapter 1: the headline story */}
            {showBody && (
                <section
                    aria-label="Fee collection overview"
                    className="relative overflow-hidden rounded-sm bg-[#0B1E3D] p-5 text-white shadow-sm shadow-blue-950/30 ring-1 ring-inset ring-white/10 sm:p-6"
                >
                    <span
                        aria-hidden
                        className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rotate-12 rounded-sm bg-orange-400/10"
                    />
                    <span
                        aria-hidden
                        className="pointer-events-none absolute -bottom-10 right-24 h-24 w-24 -rotate-12 rounded-sm border border-orange-400/20"
                    />

                    <div className="relative grid gap-6 lg:grid-cols-[auto_1fr] lg:items-center lg:gap-8">
                        {/* Progress ring */}
                        <div className="relative mx-auto h-36 w-36 shrink-0">
                            <svg
                                viewBox="0 0 144 144"
                                className="h-full w-full -rotate-90"
                                role="img"
                                aria-label={
                                    ready
                                        ? `${pct}% of billed fees collected`
                                        : "Loading collection rate"
                                }
                            >
                                <circle
                                    cx="72"
                                    cy="72"
                                    r="60"
                                    fill="none"
                                    strokeWidth="12"
                                    className="stroke-white/10"
                                />
                                <circle
                                    cx="72"
                                    cy="72"
                                    r="60"
                                    fill="none"
                                    strokeWidth="12"
                                    strokeLinecap="round"
                                    className="stroke-emerald-400 transition-[stroke-dashoffset] duration-1000 ease-out motion-reduce:transition-none"
                                    strokeDasharray={2 * Math.PI * 60}
                                    strokeDashoffset={
                                        2 * Math.PI * 60 *
                                        (1 - (revealed && summary ? summary.assessments.collectionRate : 0))
                                    }
                                />
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                {!summary ? (
                                    <div className="h-8 w-16 animate-pulse rounded-sm bg-white/10" />
                                ) : (
                                    <>
                                        <span className="text-3xl font-bold tabular-nums">
                                            {pct}
                                            <span className="text-lg text-white/60">%</span>
                                        </span>
                                        <span className="text-[11px] font-medium text-white/60">
                                            collected
                                        </span>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* The story */}
                        <div className="min-w-0 space-y-4">
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-wide text-orange-400">
                                    Fee collection
                                </p>

                                {!summary ? (
                                    <div className="mt-2 space-y-2">
                                        <div className="h-7 w-3/4 animate-pulse rounded-sm bg-white/10" />
                                        <div className="h-4 w-full max-w-md animate-pulse rounded-sm bg-white/10" />
                                    </div>
                                ) : summary.assessments.totalBilled === 0 ? (
                                    <h2 className="mt-1 text-xl font-bold sm:text-2xl">
                                        No fees have been billed yet.
                                    </h2>
                                ) : (
                                    <>
                                        <h2 className="mt-1 text-xl font-bold leading-snug sm:text-2xl">
                                            <span className="text-emerald-400">
                                                {formatCurrency(summary.assessments.totalPaid)}
                                            </span>{" "}
                                            collected of{" "}
                                            {formatCurrency(summary.assessments.totalBilled)} billed.
                                        </h2>
                                        <p className="mt-1.5 text-sm text-white/70">
                                            <span className="font-semibold text-orange-300">
                                                {formatCurrency(summary.assessments.outstanding)}
                                            </span>{" "}
                                            is still outstanding across{" "}
                                            {summary.assessments.activeCount} active{" "}
                                            {summary.assessments.activeCount === 1
                                                ? "student fee"
                                                : "student fees"}
                                            .
                                        </p>
                                    </>
                                )}
                            </div>

                            {/* Billed → collected → owed, as one bar */}
                            <div>
                                <div
                                    className="flex h-3 w-full overflow-hidden rounded-sm bg-white/10"
                                    role="img"
                                    aria-label={`Collected ${pct}%, outstanding ${Math.round(outstandingShare * 100)}% of billed fees`}
                                >
                                    <div
                                        className="h-full bg-emerald-400 transition-[width] duration-1000 ease-out motion-reduce:transition-none"
                                        style={{
                                            width: `${revealed && summary ? summary.assessments.collectionRate * 100 : 0}%`,
                                        }}
                                    />
                                    <div
                                        className="h-full bg-orange-400 transition-[width] duration-1000 ease-out motion-reduce:transition-none"
                                        style={{
                                            width: `${revealed ? outstandingShare * 100 : 0}%`,
                                        }}
                                    />
                                </div>

                                <div className="mt-2.5 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs text-white/70">
                                    <span className="inline-flex items-center gap-1.5">
                                        <span className="h-2.5 w-2.5 rounded-sm bg-emerald-400" />
                                        Collected
                                        <span className="font-semibold tabular-nums text-white">
                                            {!summary ? "—" : formatCurrency(summary.assessments.totalPaid)}
                                        </span>
                                    </span>
                                    <span className="inline-flex items-center gap-1.5">
                                        <span className="h-2.5 w-2.5 rounded-sm bg-orange-400" />
                                        Outstanding
                                        <span className="font-semibold tabular-nums text-white">
                                            {!summary ? "—" : formatCurrency(summary.assessments.outstanding)}
                                        </span>
                                    </span>
                                </div>
                            </div>

                            {/* Supporting facts + View Payments */}
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                {/* Supporting facts */}
                                <div className="flex flex-wrap items-center gap-2">
                                    {[
                                        {
                                            icon: Hourglass,
                                            label: "Active",
                                            value: summary?.assessments.activeCount ?? 0,
                                        },
                                        {
                                            icon: CheckCircle2,
                                            label: "Completed",
                                            value: summary?.assessments.completedCount ?? 0,
                                        },
                                        {
                                            icon: Layers,
                                            label: "Fee structures",
                                            value: summary?.assessments.activeStructures ?? 0,
                                        },
                                    ].map(({ icon: Icon, label, value }) => (
                                        <span
                                            key={label}
                                            className="inline-flex h-8 shrink-0 items-center gap-2 rounded-sm bg-white/8 px-2.5 text-xs text-white/70 ring-1 ring-inset ring-white/10"
                                        >
                                            <Icon className="h-3.5 w-3.5 shrink-0 text-orange-400" />
                                            <span>{label}</span>
                                            <span className="font-semibold tabular-nums text-white">
                                                {!summary ? "—" : value.toLocaleString()}
                                            </span>
                                        </span>
                                    ))}
                                </div>

                                {/* View Payments */}
                                <Link
                                    href="/finance/student-payments"
                                    className="inline-flex h-8 shrink-0 items-center justify-center gap-2 self-start rounded-sm bg-orange-500 px-3 text-xs font-semibold text-white transition-colors hover:bg-orange-600 sm:self-auto"
                                >
                                    View Payments
                                    <ArrowUpRight className="h-3.5 w-3.5" />
                                </Link>
                            </div>
                        </div>
                    </div>
                </section>
            )}

            {/* Chapter 2: what is happening this month */}
            {showBody && (
                <section
                    aria-label="Payment activity"
                    className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4"
                >
                    <KpiCard
                        label="This month"
                        icon={CalendarDays}
                        tone="sky"
                        loading={!summary}
                        value={formatCurrency(summary?.thisMonth)}
                        hint={
                            summary?.delta == null ? (
                                "First collections to compare"
                            ) : (
                                <span
                                    className={`inline-flex items-center gap-1 font-semibold ${summary.delta >= 0
                                        ? "text-emerald-600 dark:text-emerald-400"
                                        : "text-rose-600 dark:text-rose-400"
                                        }`}
                                >
                                    {summary.delta >= 0 ? (
                                        <TrendingUp className="h-3.5 w-3.5" />
                                    ) : (
                                        <TrendingDown className="h-3.5 w-3.5" />
                                    )}
                                    {Math.abs(summary.delta).toFixed(0)}% vs last month
                                </span>
                            )
                        }
                    />
                    <KpiCard
                        label="Confirmed payments"
                        icon={CheckCircle2}
                        tone="emerald"
                        loading={!summary}
                        value={formatCurrency(summary?.transactions.totalConfirmed)}
                        hint={
                            summary
                                ? `${summary.transactions.confirmedCount} transaction${summary.transactions.confirmedCount === 1 ? "" : "s"}`
                                : undefined
                        }
                    />
                    <KpiCard
                        label="Pending"
                        icon={Hourglass}
                        tone="violet"
                        loading={!summary}
                        value={formatCurrency(summary?.transactions.totalPending)}
                        hint={
                            summary
                                ? `${summary.transactions.pendingCount} awaiting confirmation`
                                : undefined
                        }
                    />
                    <KpiCard
                        label="Reversed"
                        icon={Undo2}
                        tone="rose"
                        loading={!summary}
                        value={formatCurrency(summary?.transactions.totalReversed)}
                        hint={
                            summary
                                ? `${summary.transactions.reversedCount} reversed transaction${summary.transactions.reversedCount === 1 ? "" : "s"}`
                                : undefined
                        }
                    />
                </section>
            )}

            {/* Chapter 3: trend and how people pay */}
            {showBody && (
                <div className="grid gap-3 lg:grid-cols-5">
                    <Panel
                        className="lg:col-span-3"
                        icon={TrendingUp}
                        tone="sky"
                        title="Collections over time"
                        subtitle="Confirmed payments, last six months"
                    >
                        {!summary ? (
                            <div className="h-44 animate-pulse rounded-sm bg-zinc-100 dark:bg-white/5" />
                        ) : summary.months.every((m) => m.total === 0) ? (
                            <EmptyHint text="No confirmed payments in the last six months." />
                        ) : (
                            <MonthlyChart months={summary.months} revealed={revealed} />
                        )}
                    </Panel>

                    <Panel
                        className="lg:col-span-2"
                        icon={Wallet}
                        tone="violet"
                        title="How people pay"
                        subtitle="Share of confirmed payments"
                    >
                        {!summary ? (
                            <div className="h-44 animate-pulse rounded-sm bg-zinc-100 dark:bg-white/5" />
                        ) : summary.transactions.totalConfirmed === 0 ? (
                            <EmptyHint text="Payment methods will show once payments are confirmed." />
                        ) : (
                            <MethodBreakdown
                                byMethod={byMethod}
                                total={summary.transactions.totalConfirmed}
                                revealed={revealed}
                            />
                        )}
                    </Panel>
                </div>
            )}

            {/* Chapter 4: what is still owed */}
            {showBody && (
                <div className="grid gap-3 lg:grid-cols-5">
                    <Panel
                        className="lg:col-span-3"
                        icon={Hourglass}
                        tone="orange"
                        title="Largest balances"
                        subtitle="Students who still owe the most"
                        action={{ href: "/finance/student-payments", label: "All balances" }}
                    >
                        {!summary ? (
                            <SkeletonRows count={4} />
                        ) : summary.topBalances.length === 0 ? (
                            <EmptyHint text="No outstanding balances. Everyone is paid up." />
                        ) : (
                            <ul className="space-y-1">
                                {summary.topBalances.map((b) => (
                                    <BalanceRow
                                        key={b.studentFeeId}
                                        balance={b}
                                        revealed={revealed}
                                    />
                                ))}
                            </ul>
                        )}
                    </Panel>

                    <Panel
                        className="lg:col-span-2"
                        icon={GraduationCap}
                        tone="emerald"
                        title="Owed by course"
                        subtitle="Where the balance sits"
                    >
                        {!summary ? (
                            <SkeletonRows count={4} />
                        ) : summary.byCourse.length === 0 ? (
                            <EmptyHint text="No course has an outstanding balance." />
                        ) : (
                            <ul className="space-y-3.5 px-1 pt-1">
                                {summary.byCourse.map((c) => {
                                    const max = summary.byCourse[0].owed || 1;
                                    return (
                                        <li key={`${c.code}-${c.name}`}>
                                            <div className="flex items-baseline justify-between gap-3">
                                                <p className="min-w-0 truncate text-sm font-medium text-zinc-700 dark:text-zinc-200">
                                                    {c.code && (
                                                        <span className={`${CODE_CHIP} mr-2`}>{c.code}</span>
                                                    )}
                                                    {c.name}
                                                </p>
                                                <p className="shrink-0 text-sm font-semibold tabular-nums text-[#0B1E3D] dark:text-white">
                                                    {COMPACT.format(c.owed)}
                                                </p>
                                            </div>
                                            <div className="mt-1.5 h-2 overflow-hidden rounded-sm bg-[#0B1E3D]/5 dark:bg-white/10">
                                                <div
                                                    className="h-full rounded-sm bg-orange-400 transition-[width] duration-700 ease-out motion-reduce:transition-none"
                                                    style={{
                                                        width: `${revealed ? (c.owed / max) * 100 : 0}%`,
                                                    }}
                                                />
                                            </div>
                                            <p className="mt-1 text-[11px] text-zinc-500 dark:text-zinc-400">
                                                {c.count} active {c.count === 1 ? "student fee" : "student fees"}
                                            </p>
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                    </Panel>
                </div>
            )}

            {/* Chapter 5: the latest events */}
            {showBody && (
                <Panel
                    icon={Receipt}
                    tone="emerald"
                    title="Recent activity"
                    subtitle="Latest payments by transaction date"
                    action={{ href: "/finance/transactions", label: "View all" }}
                >
                    {loading && !summary ? (
                        <SkeletonRows count={4} />
                    ) : recentTransactions.length === 0 ? (
                        <div className="flex flex-col items-center gap-3 px-6 py-10 text-center">
                            <span className="flex h-12 w-12 items-center justify-center rounded-sm bg-orange-400/10 text-orange-500 ring-1 ring-inset ring-orange-400/30 dark:text-orange-400">
                                <Receipt className="h-6 w-6" />
                            </span>
                            <div>
                                <p className="text-sm font-semibold text-[#0B1E3D] dark:text-white">
                                    No transactions yet
                                </p>
                                <p className="mt-1 max-w-sm text-xs text-zinc-500 dark:text-zinc-400">
                                    Recorded payments will appear here as soon as finance starts processing entries.
                                </p>
                            </div>
                            <Link
                                href="/finance/transactions/new"
                                className={`inline-flex h-9 items-center gap-1.5 rounded-sm bg-orange-500 px-3.5 text-[13px] font-semibold text-white transition-colors hover:bg-orange-400 ${FOCUS_RING}`}
                            >
                                <Plus className="h-3.5 w-3.5" />
                                Record a payment
                            </Link>
                        </div>
                    ) : (
                        <ol className="relative ml-2">
                            <span
                                aria-hidden
                                className="absolute bottom-3 left-[5px] top-3 w-px bg-zinc-200 dark:bg-white/10"
                            />
                            {recentTransactions.map((t) => {
                                const status = STATUS_META[t.status];
                                const method = METHOD_META[t.paymentMethod];
                                const MethodIcon = method.icon;
                                const who = transactionStudentName(t);
                                const course = transactionCourseName(t);

                                return (
                                    <li
                                        key={t._id}
                                        className="relative flex items-start gap-4 rounded-sm py-3 pl-6 pr-2 transition-colors hover:bg-[#0B1E3D]/4 dark:hover:bg-white/6"
                                    >
                                        <span
                                            aria-hidden
                                            className={`absolute left-0 top-[18px] h-[11px] w-[11px] rounded-full ring-4 ring-white dark:ring-[#0a1a33] ${status.dot}`}
                                        />

                                        <div className="min-w-0 flex-1">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <span
                                                    className={`text-sm font-bold tabular-nums ${t.status === "REVERSED"
                                                        ? "text-zinc-400 line-through dark:text-zinc-500"
                                                        : "text-[#0B1E3D] dark:text-white"
                                                        }`}
                                                >
                                                    {formatCurrency(t.amount)}
                                                </span>
                                                <span
                                                    className={`inline-flex items-center rounded-sm px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${status.badge}`}
                                                >
                                                    {status.label}
                                                </span>
                                            </div>

                                            <p className="mt-0.5 truncate text-xs text-zinc-600 dark:text-zinc-300">
                                                {who}
                                                {course && (
                                                    <span className="text-zinc-400 dark:text-zinc-500">
                                                        {" · "}
                                                        {course}
                                                    </span>
                                                )}
                                            </p>

                                            <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                                                <span className="inline-flex items-center gap-1.5">
                                                    <span
                                                        className={`flex h-5 w-5 items-center justify-center rounded-sm ${TONES[method.tone]}`}
                                                    >
                                                        <MethodIcon className="h-3 w-3" />
                                                    </span>
                                                    {method.label}
                                                </span>
                                                {t.confirmationCode && (
                                                    <code className={CODE_CHIP}>{t.confirmationCode}</code>
                                                )}
                                            </div>
                                        </div>

                                        <time
                                            dateTime={t.transactionDate}
                                            className="shrink-0 pt-0.5 text-xs text-zinc-500 dark:text-zinc-400"
                                        >
                                            {formatDate(t.transactionDate)}
                                        </time>
                                    </li>
                                );
                            })}
                        </ol>
                    )}
                </Panel>
            )}

            {/* Record payment: always one tap away on phones */}
            <Link
                href="/finance/transactions/new"
                aria-label="Record payment"
                style={{ bottom: "calc(1.25rem + env(safe-area-inset-bottom, 0px))" }}
                className={`fixed right-4 z-30 inline-flex h-12 items-center justify-center gap-2 rounded-sm bg-orange-500 px-5 text-sm font-semibold text-white shadow-lg shadow-blue-950/40 transition-colors hover:bg-orange-400 active:bg-orange-600 sm:hidden ${FOCUS_RING} ${FOCUS_OFFSET}`}
            >
                <Plus className="h-5 w-5" />
                Record payment
            </Link>
        </div>
    );
}

export default function FinanceDashboardPage() {
    return (
        <RequireRole roles={["admin", "registrar"]}>
            <FinanceDashboardContent />
        </RequireRole>
    );
}

// ---------------------------------------------------------------------------
// Presentational bits
// ---------------------------------------------------------------------------

function BalanceRow({
    balance,
    revealed,
}: {
    balance: StudentBalance;
    revealed: boolean;
}) {
    const name = balance.studentName || "Unknown student";
    const paidShare =
        balance.totalAmount > 0
            ? Math.min(100, (balance.amountPaid / balance.totalAmount) * 100)
            : 0;

    return (
        <li className="flex items-center gap-3 rounded-sm px-2 py-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-sm bg-[#0B1E3D] text-xs font-bold uppercase text-orange-400 ring-1 ring-inset ring-orange-400/30">
                {name.charAt(0)}
            </span>

            <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-semibold text-[#0B1E3D] dark:text-white">
                        {name}
                    </p>
                    {balance.admissionNumber && (
                        <span className={`${CODE_CHIP} shrink-0`}>
                            {balance.admissionNumber}
                        </span>
                    )}
                </div>
                <div className="mt-1.5 flex items-center gap-2">
                    <div
                        className="h-1.5 flex-1 overflow-hidden rounded-sm bg-orange-400/20"
                        role="img"
                        aria-label={`${paidShare.toFixed(0)}% paid`}
                    >
                        <div
                            className="h-full bg-emerald-500 transition-[width] duration-700 ease-out motion-reduce:transition-none dark:bg-emerald-400"
                            style={{ width: `${revealed ? paidShare : 0}%` }}
                        />
                    </div>
                    <span className="shrink-0 text-[11px] tabular-nums text-zinc-500 dark:text-zinc-400">
                        {paidShare.toFixed(0)}% paid
                    </span>
                </div>
            </div>

            <div className="shrink-0 text-right">
                <p className="text-sm font-bold tabular-nums text-orange-600 dark:text-orange-400">
                    {formatCurrency(balance.owed)}
                </p>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                    of {COMPACT.format(balance.totalAmount)}
                </p>
            </div>
        </li>
    );
}

function Panel({
    icon: Icon,
    tone,
    title,
    subtitle,
    action,
    className = "",
    children,
}: {
    icon: LucideIcon;
    tone: Tone;
    title: string;
    subtitle?: string;
    action?: { href: string; label: string };
    className?: string;
    children: React.ReactNode;
}) {
    return (
        <section className={`${SURFACE} min-w-0 p-4 ${className}`}>
            <header className="mb-3 flex items-center gap-2.5">
                <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-sm ${TONES[tone]}`}
                >
                    <Icon className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                    <h2 className="text-sm font-semibold text-[#0B1E3D] dark:text-white">
                        {title}
                    </h2>
                    {subtitle && (
                        <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
                            {subtitle}
                        </p>
                    )}
                </div>
                {action && (
                    <Link
                        href={action.href}
                        className={`group inline-flex h-7 shrink-0 items-center gap-1 rounded-sm px-2 text-xs font-semibold text-orange-600 transition-colors hover:bg-orange-400/10 dark:text-orange-400 ${FOCUS_RING}`}
                    >
                        {action.label}
                        <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
                    </Link>
                )}
            </header>
            {children}
        </section>
    );
}

function KpiCard({
    label,
    value,
    hint,
    icon: Icon,
    tone,
    loading,
}: {
    label: string;
    value: string;
    hint?: React.ReactNode;
    icon: LucideIcon;
    tone: Tone;
    loading: boolean;
}) {
    return (
        <div className={`${SURFACE} flex min-w-0 items-center gap-3 p-3.5`}>
            <span
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-sm ${TONES[tone]}`}
            >
                <Icon className="h-5 w-5" strokeWidth={2} />
            </span>
            <div className="min-w-0">
                <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
                    {label}
                </p>
                {loading ? (
                    <div className="mt-1.5 space-y-1.5">
                        <div className="h-5 w-28 animate-pulse rounded-sm bg-zinc-200 dark:bg-white/10" />
                        <div className="h-3 w-20 animate-pulse rounded-sm bg-zinc-100 dark:bg-white/5" />
                    </div>
                ) : (
                    <>
                        <p className="truncate text-lg font-bold leading-tight tabular-nums text-[#0B1E3D] dark:text-white">
                            {value}
                        </p>
                        {hint && (
                            <p className="mt-0.5 truncate text-xs text-zinc-500 dark:text-zinc-400">
                                {hint}
                            </p>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}

function MonthlyChart({
    months,
    revealed,
}: {
    months: FinanceSummary["months"];
    revealed: boolean;
}) {
    const max = Math.max(...months.map((m) => m.total), 1);

    return (
        <div
            role="img"
            aria-label={`Confirmed collections by month: ${months
                .map((m) => `${m.full} ${formatCurrency(m.total)}`)
                .join(", ")}`}
            className="flex h-48 items-stretch gap-2 sm:gap-4"
        >
            {months.map((m) => {
                const h = m.total > 0 ? Math.max(4, (m.total / max) * 100) : 0;
                return (
                    <div
                        key={m.key}
                        title={`${m.full}: ${formatCurrency(m.total)} (${m.count} payment${m.count === 1 ? "" : "s"})`}
                        className="group flex min-w-0 flex-1 flex-col items-center gap-1.5"
                    >
                        <span
                            className={`text-[11px] font-semibold tabular-nums ${m.current
                                ? "text-orange-600 dark:text-orange-400"
                                : "text-zinc-500 dark:text-zinc-400"
                                }`}
                        >
                            {m.total > 0 ? COMPACT.format(m.total) : "—"}
                        </span>

                        <div className="flex min-h-0 w-full flex-1 items-end border-b border-zinc-200 dark:border-white/10">
                            <div
                                className={`w-full rounded-t-sm transition-[height,opacity] duration-700 ease-out motion-reduce:transition-none ${m.current
                                    ? "bg-orange-400"
                                    : "bg-[#0B1E3D]/75 group-hover:bg-[#0B1E3D] dark:bg-white/25 dark:group-hover:bg-white/40"
                                    }`}
                                style={{ height: `${revealed ? h : 0}%` }}
                            />
                        </div>

                        <span
                            className={`text-xs ${m.current
                                ? "font-semibold text-orange-600 dark:text-orange-400"
                                : "text-zinc-500 dark:text-zinc-400"
                                }`}
                        >
                            {m.label}
                        </span>
                    </div>
                );
            })}
        </div>
    );
}

function MethodBreakdown({
    byMethod,
    total,
    revealed,
}: {
    byMethod: Record<string, number>;
    total: number;
    revealed: boolean;
}) {
    const rows = (Object.keys(METHOD_META) as PaymentMethod[])
        .map((method) => {
            const amount = byMethod[method] ?? 0;
            return { method, amount, pct: total > 0 ? (amount / total) * 100 : 0 };
        })
        .sort((a, b) => b.amount - a.amount);

    return (
        <div className="space-y-4">
            <div
                className="flex h-3 w-full overflow-hidden rounded-sm bg-zinc-100 dark:bg-white/10"
                role="img"
                aria-label={rows
                    .filter((r) => r.amount > 0)
                    .map((r) => `${METHOD_META[r.method].label} ${r.pct.toFixed(0)}%`)
                    .join(", ")}
            >
                {rows.map((r) => (
                    <div
                        key={r.method}
                        className={`h-full transition-[width] duration-1000 ease-out motion-reduce:transition-none ${METHOD_META[r.method].bar}`}
                        style={{ width: `${revealed ? r.pct : 0}%` }}
                    />
                ))}
            </div>

            <ul className="space-y-2.5">
                {rows.map(({ method, amount, pct }) => {
                    const meta = METHOD_META[method];
                    const Icon = meta.icon;
                    return (
                        <li key={method} className="flex items-center gap-3">
                            <span
                                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-sm ${TONES[meta.tone]}`}
                            >
                                <Icon className="h-4 w-4" />
                            </span>
                            <span className="min-w-0 flex-1">
                                <span className="block text-sm font-medium text-zinc-700 dark:text-zinc-200">
                                    {meta.label}
                                </span>
                                <span className="block text-xs tabular-nums text-zinc-500 dark:text-zinc-400">
                                    {pct.toFixed(1)}% of confirmed
                                </span>
                            </span>
                            <span className="shrink-0 text-sm font-semibold tabular-nums text-[#0B1E3D] dark:text-white">
                                {formatCurrency(amount)}
                            </span>
                        </li>
                    );
                })}
            </ul>
        </div>
    );
}

function EmptyHint({ text }: { text: string }) {
    return (
        <p className="rounded-sm border border-dashed border-zinc-300 px-4 py-8 text-center text-xs text-zinc-500 dark:border-white/15 dark:text-zinc-400">
            {text}
        </p>
    );
}

function SkeletonRows({ count }: { count: number }) {
    return (
        <div className="space-y-2" aria-busy="true">
            {Array.from({ length: count }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 px-2 py-2">
                    <div className="h-9 w-9 shrink-0 animate-pulse rounded-sm bg-zinc-200 dark:bg-white/10" />
                    <div className="flex-1 space-y-2">
                        <div className="h-3.5 w-1/2 animate-pulse rounded-sm bg-zinc-200 dark:bg-white/10" />
                        <div className="h-3 w-1/3 animate-pulse rounded-sm bg-zinc-100 dark:bg-white/5" />
                    </div>
                    <div className="h-4 w-20 animate-pulse rounded-sm bg-zinc-100 dark:bg-white/5" />
                </div>
            ))}
        </div>
    );
}