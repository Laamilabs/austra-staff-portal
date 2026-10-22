// app/(portal)/finance/fee-structures/page.tsx
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
    ArrowRight,
    Check,
    Plus,
    Receipt,
    Search,
} from "lucide-react";

import {
    feeStructureApi,
    isPopulatedCourse,
    type FeeStructure,
} from "@/app/types/fee-structure";

// ---------------------------------------------------------------------------
// Palette
// ---------------------------------------------------------------------------

const NAVY = "#1e3a5f";
const NAVY_HOVER = "#16304f";
const NAVY_LIGHT = "#93b4dc";
const ORANGE = "#f59e0b";
const ORANGE_DEEP = "#b45309";

// ---------------------------------------------------------------------------
// Shared tokens
// ---------------------------------------------------------------------------

const FOCUS =
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f59e0b] focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900";

const CARD =
    "rounded-sm border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const KES = new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    maximumFractionDigits: 2,
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

function courseLabel(courseId: FeeStructure["courseId"]): string {
    if (isPopulatedCourse(courseId)) {
        return [courseId.name, courseId.courseCode].filter(Boolean).join(" ");
    }
    return typeof courseId === "string" ? courseId : "";
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function FeeStructuresPage() {
    const [structures, setStructures] = useState<FeeStructure[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [query, setQuery] = useState("");
    const [activeOnly, setActiveOnly] = useState(false);

    useEffect(() => {
        let cancelled = false;

        (async () => {
            try {
                setLoading(true);
                setError(null);
                const data = await feeStructureApi.getAll();
                if (!cancelled) setStructures(data);
            } catch (err) {
                if (!cancelled) {
                    setError(
                        err instanceof Error
                            ? err.message
                            : "Failed to load fee structures.",
                    );
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, []);

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        return structures.filter((s) => {
            if (activeOnly && !s.isActive) return false;
            if (!q) return true;

            return (
                s.name.toLowerCase().includes(q) ||
                courseLabel(s.courseId).toLowerCase().includes(q)
            );
        });
    }, [structures, query, activeOnly]);

    const summary = useMemo(() => {
        const active = structures.filter((s) => s.isActive).length;
        return { total: structures.length, active };
    }, [structures]);

    const hasFilters = query.trim() !== "" || activeOnly;

    const clearFilters = () => {
        setQuery("");
        setActiveOnly(false);
    };

    // -----------------------------------------------------------------------
    // Render
    // -----------------------------------------------------------------------

    return (
        <div className="mx-auto w-full max-w-full px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
            {/* Header */}
            <div className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
                <div className="min-w-0">
                    <nav className="mb-2 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                        <Link
                            href="/finance"
                            className={`rounded-sm transition hover:text-[#f59e0b] ${FOCUS}`}
                        >
                            Finance
                        </Link>
                        <span aria-hidden>/</span>
                        <span className="text-slate-700 dark:text-slate-200">
                            Fee structures
                        </span>
                    </nav>
                    <h1 className="text-xl font-semibold tracking-tight text-[#1e3a5f] dark:text-slate-100 sm:text-2xl">
                        Fee structures
                    </h1>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                        Course-level fee assessments and academic-year pricing.
                    </p>
                </div>

                <Link
                    href="/finance/fee-structures/new"
                    className={`inline-flex h-10 items-center justify-center gap-2 self-start rounded-sm bg-[#1e3a5f] px-4 text-sm font-medium text-white shadow-sm transition hover:bg-[#16304f] sm:self-auto ${FOCUS}`}
                >
                    <Plus className="h-4 w-4" aria-hidden />
                    New structure
                </Link>
            </div>

            {/* Summary tiles */}
            <section className="mb-5 grid grid-cols-2 gap-2 sm:mb-6 sm:gap-3">
                <StatTile
                    label="Total"
                    value={loading ? "—" : summary.total.toLocaleString()}
                    loading={loading}
                />
                <StatTile
                    label="Active"
                    value={loading ? "—" : summary.active.toLocaleString()}
                    loading={loading}
                    accent
                />
            </section>

            {/* Toolbar */}
            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                <div className="relative w-full sm:max-w-sm">
                    <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                        <Search className="h-4 w-4" aria-hidden />
                    </span>
                    <input
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search by name or course…"
                        aria-label="Search fee structures"
                        className="w-full rounded-sm border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-[#f59e0b] focus:outline-none focus:ring-1 focus:ring-[#f59e0b] dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500"
                    />
                </div>

                <div className="flex items-center justify-between gap-2 sm:justify-end">
                    <button
                        type="button"
                        onClick={() => setActiveOnly((v) => !v)}
                        aria-pressed={activeOnly}
                        className={`inline-flex h-9 items-center gap-1.5 rounded-sm border px-3 text-sm font-medium transition-colors ${FOCUS} ${
                            activeOnly
                                ? "border-[#f59e0b] bg-[#f59e0b]/10 text-[#b45309] dark:text-[#f59e0b]"
                                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                        }`}
                    >
                        {activeOnly && (
                            <Check className="h-3.5 w-3.5" aria-hidden />
                        )}
                        Active only
                    </button>

                    {!loading && (
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                            <span className="font-semibold tabular-nums text-slate-700 dark:text-slate-200">
                                {filtered.length}
                            </span>{" "}
                            of{" "}
                            <span className="tabular-nums">
                                {structures.length}
                            </span>
                        </span>
                    )}
                </div>
            </div>

            {/* Error */}
            {error && (
                <div
                    role="alert"
                    className="mb-4 rounded-sm border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300"
                >
                    {error}
                </div>
            )}

            {/* List — cards on all sizes; stacked on mobile, horizontal on md+ */}
            <div className="overflow-hidden rounded-sm border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
                {loading ? (
                    <SkeletonRows />
                ) : filtered.length === 0 ? (
                    <EmptyState
                        hasAny={structures.length > 0}
                        onClear={clearFilters}
                    />
                ) : (
                    <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                        {filtered.map((s) => (
                            <li key={s._id}>
                                <Link
                                    href={`/finance/fee-structures/${s._id}`}
                                    className={`group block px-4 py-3.5 transition-colors hover:bg-[#f59e0b]/5 md:flex md:items-center md:gap-6 md:px-5 md:py-3.5 dark:hover:bg-[#f59e0b]/10 ${FOCUS}`}
                                >
                                    {/* Identity block */}
                                    <div className="min-w-0 md:flex-1">
                                        <div className="flex items-start justify-between gap-3 md:block">
                                            <div className="min-w-0">
                                                <p className="break-words font-semibold text-slate-900 md:truncate dark:text-slate-100">
                                                    {s.name}
                                                </p>
                                                <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">
                                                    <CourseInline
                                                        courseId={s.courseId}
                                                    />
                                                </p>
                                            </div>

                                            {/* Mobile-only status pill */}
                                            <div className="shrink-0 md:hidden">
                                                <StatusPill
                                                    active={s.isActive}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Items + Updated — stacked on mobile, columns on desktop */}
                                    <div className="mt-3 flex items-end justify-between gap-3 md:mt-0 md:contents">
                                        <div className="text-xs text-slate-500 md:w-20 md:shrink-0 md:text-left dark:text-slate-400">
                                            <p className="md:hidden">
                                                {s.feeItems.length} item
                                                {s.feeItems.length === 1
                                                    ? ""
                                                    : "s"}
                                            </p>
                                            <p className="hidden md:block">
                                                <span className="font-semibold tabular-nums text-slate-700 dark:text-slate-200">
                                                    {s.feeItems.length}
                                                </span>{" "}
                                                item
                                                {s.feeItems.length === 1
                                                    ? ""
                                                    : "s"}
                                            </p>
                                        </div>

                                        <div className="truncate text-xs text-slate-500 md:w-36 md:shrink-0 md:overflow-visible md:whitespace-nowrap md:text-left dark:text-slate-400">
                                            <p className="md:hidden">
                                                Updated{" "}
                                                {formatDate(
                                                    s.updatedAt ??
                                                        s.createdAt,
                                                )}
                                            </p>
                                            <p className="hidden md:block">
                                                <span className="text-slate-400">
                                                    Updated
                                                </span>{" "}
                                                <span className="tabular-nums">
                                                    {formatDate(
                                                        s.updatedAt ??
                                                            s.createdAt,
                                                    )}
                                                </span>
                                            </p>
                                        </div>

                                        {/* Total + arrow/status on desktop */}
                                        <div className="flex shrink-0 items-center gap-3 md:contents">
                                            <div className="text-right md:w-32 md:shrink-0">
                                                <p className="text-base font-semibold tabular-nums text-slate-900 dark:text-slate-100">
                                                    {formatCurrency(
                                                        s.totalAmount,
                                                    )}
                                                </p>
                                                <p className="mt-0.5 inline-flex items-center gap-1 text-xs font-semibold text-[#1e3a5f] md:hidden dark:text-[#93b4dc]">
                                                    View
                                                    <ArrowRight
                                                        className="h-3 w-3"
                                                        aria-hidden
                                                    />
                                                </p>
                                            </div>

                                            {/* Desktop-only status pill */}
                                            <div className="hidden md:block md:shrink-0">
                                                <StatusPill
                                                    active={s.isActive}
                                                />
                                            </div>

                                            {/* Desktop-only arrow */}
                                            <ArrowRight
                                                className="hidden h-4 w-4 shrink-0 text-slate-400 transition-all group-hover:translate-x-0.5 group-hover:text-[#1e3a5f] md:block dark:group-hover:text-[#93b4dc]"
                                                aria-hidden
                                            />
                                        </div>
                                    </div>
                                </Link>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            {/* Clear filters nudge */}
            {!loading && hasFilters && filtered.length > 0 && (
                <div className="mt-3 flex justify-end">
                    <button
                        type="button"
                        onClick={clearFilters}
                        className={`rounded-sm px-2 py-1 text-xs font-semibold text-[#b45309] hover:bg-[#f59e0b]/10 dark:text-[#f59e0b] ${FOCUS}`}
                    >
                        Clear filters
                    </button>
                </div>
            )}
        </div>
    );
}

// ---------------------------------------------------------------------------
// Presentational bits
// ---------------------------------------------------------------------------

function StatTile({
    label,
    value,
    loading,
    accent,
}: {
    label: string;
    value: string;
    loading: boolean;
    accent?: boolean;
}) {
    return (
        <div className={`${CARD} px-3 py-2.5 sm:px-4 sm:py-3`}>
            <p className="text-[10px] font-medium uppercase leading-tight tracking-[0.12em] text-slate-500 dark:text-slate-400 sm:text-[11px]">
                {label}
            </p>
            <p
                className={[
                    "mt-0.5 text-lg font-semibold tabular-nums sm:mt-1",
                    accent
                        ? "text-[#b45309] dark:text-[#f59e0b]"
                        : "text-[#1e3a5f] dark:text-slate-100",
                    loading ? "opacity-60" : "",
                ].join(" ")}
            >
                {value}
            </p>
        </div>
    );
}

/** Compact one-line course label — same presentation in both layouts. */
function CourseInline({ courseId }: { courseId: FeeStructure["courseId"] }) {
    if (!courseId) return <span className="text-slate-400">—</span>;
    if (isPopulatedCourse(courseId)) {
        return (
            <span>
                {courseId.name ?? "—"}
                {courseId.courseCode && (
                    <span className="ml-1.5 font-mono text-[10px] text-slate-400 dark:text-slate-500">
                        {courseId.courseCode}
                    </span>
                )}
            </span>
        );
    }
    return (
        <code className="rounded-sm bg-slate-100 px-1 py-0.5 font-mono text-[11px] text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            {courseId.slice(-6)}
        </code>
    );
}

function StatusPill({ active }: { active: boolean }) {
    return (
        <span
            className={[
                "inline-flex shrink-0 items-center gap-1.5 rounded-sm px-2 py-0.5 text-xs font-medium ring-1 ring-inset",
                active
                    ? "bg-[#f59e0b]/10 text-[#b45309] ring-[#f59e0b]/30 dark:bg-[#f59e0b]/15 dark:text-[#f59e0b] dark:ring-[#f59e0b]/30"
                    : "bg-slate-100 text-slate-600 ring-slate-300/40 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700",
            ].join(" ")}
        >
            <span
                className={`h-1.5 w-1.5 rounded-full ${
                    active ? "bg-[#f59e0b]" : "bg-slate-400"
                }`}
            />
            {active ? "Active" : "Inactive"}
        </span>
    );
}

function SkeletonRows() {
    return (
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {Array.from({ length: 6 }).map((_, i) => (
                <div
                    key={i}
                    className="flex items-center justify-between gap-4 px-4 py-3.5 md:px-5"
                >
                    <div className="min-w-0 flex-1 space-y-1.5">
                        <div className="h-4 w-40 animate-pulse rounded-sm bg-slate-200 dark:bg-slate-800" />
                        <div className="h-3 w-32 animate-pulse rounded-sm bg-slate-200 md:w-48 dark:bg-slate-800" />
                    </div>
                    <div className="hidden h-4 w-16 animate-pulse rounded-sm bg-slate-200 md:block dark:bg-slate-800" />
                    <div className="hidden h-4 w-28 animate-pulse rounded-sm bg-slate-200 md:block dark:bg-slate-800" />
                    <div className="h-4 w-20 animate-pulse rounded-sm bg-slate-200 dark:bg-slate-800" />
                    <div className="hidden h-5 w-14 animate-pulse rounded-sm bg-slate-200 md:block dark:bg-slate-800" />
                </div>
            ))}
        </div>
    );
}

function EmptyState({
    hasAny,
    onClear,
}: {
    hasAny: boolean;
    onClear: () => void;
}) {
    return (
        <div className="flex flex-col items-center justify-center gap-3 px-6 py-14 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-sm bg-[#f59e0b]/10 text-[#f59e0b]">
                <Receipt className="h-5 w-5" aria-hidden />
            </div>
            {hasAny ? (
                <>
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                        No matches
                    </p>
                    <p className="max-w-sm text-sm text-slate-500 dark:text-slate-400">
                        No fee structures match the current filters.
                    </p>
                    <button
                        type="button"
                        onClick={onClear}
                        className={`mt-1 inline-flex items-center gap-1.5 rounded-sm border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-[#1e3a5f] shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-[#93b4dc] dark:hover:bg-slate-800 ${FOCUS}`}
                    >
                        Clear filters
                    </button>
                </>
            ) : (
                <>
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                        No fee structures yet
                    </p>
                    <p className="max-w-sm text-sm text-slate-500 dark:text-slate-400">
                        Create a fee structure to start assessing course fees.
                    </p>
                    <Link
                        href="/finance/fee-structures/new"
                        className={`mt-1 inline-flex items-center gap-1.5 rounded-sm bg-[#1e3a5f] px-3 py-1.5 text-sm font-medium text-white shadow-sm transition hover:bg-[#16304f] ${FOCUS}`}
                    >
                        <Plus className="h-3.5 w-3.5" aria-hidden />
                        New structure
                    </Link>
                </>
            )}
        </div>
    );
}