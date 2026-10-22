// app/(portal)/finance/fee-structures/page.tsx
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
    feeStructureApi,
    isPopulatedCourse,
    type FeeStructure,
} from "@/app/types/fee-structure";

// ---------------------------------------------------------------------------
// Palette
// ---------------------------------------------------------------------------
//
// Both colors appear in both themes. Navy = structure, orange = accent.
// Kept local so the page can be dropped into any codebase without a theme
// config change; swap for Tailwind theme tokens if your project has them.
//
const NAVY = "#1e3a5f";
const NAVY_HOVER = "#16304f";
const NAVY_LIGHT = "#93b4dc"; // navy tint for dark mode text
const ORANGE = "#f59e0b";
const ORANGE_DEEP = "#b45309"; // orange text on light backgrounds

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

/**
 * Best-effort label for a fee structure's course, usable in both the search
 * filter and the empty-state copy. Handles all three shapes: populated,
 * raw ObjectId, and null.
 */
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

    return (
        <div className="mx-auto max-w-full py-8 sm:px-6 lg:px-8">
            {/* Header */}
            <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <nav className="mb-2 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                        <Link
                            href="/finance"
                            className={`rounded-sm transition hover:text-[${ORANGE}]`}
                        >
                            Finance
                        </Link>
                        <span aria-hidden>/</span>
                        <span className="text-slate-700 dark:text-slate-200">
                            Fee structures
                        </span>
                    </nav>
                    <h1 className="text-2xl font-semibold tracking-tight text-[#1e3a5f] dark:text-slate-100">
                        Fee structures
                    </h1>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                        Course-level fee assessments and academic-year pricing.
                    </p>
                </div>

                <Link
                    href="/finance/fee-structures/new"
                    className={[
                        "inline-flex items-center gap-2 self-start rounded-sm px-4 py-2 text-sm font-medium text-white shadow-sm transition",
                        // Navy in both themes; focus ring orange in both themes.
                        "bg-[#1e3a5f] hover:bg-[#16304f]",
                        "focus:outline-none focus-visible:ring-2 focus-visible:ring-[#f59e0b] focus-visible:ring-offset-2",
                        "sm:self-auto",
                    ].join(" ")}
                >
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={2}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="h-4 w-4"
                    >
                        <path d="M12 5v14" />
                        <path d="M5 12h14" />
                    </svg>
                    New structure
                </Link>
            </div>

            {/* Summary tiles */}
            <section className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <StatTile
                    label="Total structures"
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
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="relative w-full sm:max-w-sm">
                    <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth={2}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="h-4 w-4"
                        >
                            <circle cx="11" cy="11" r="7" />
                            <path d="m21 21-4.3-4.3" />
                        </svg>
                    </span>
                    <input
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search by name or course…"
                        className="w-full rounded-sm border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-[#f59e0b] focus:outline-none focus:ring-1 focus:ring-[#f59e0b] dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500"
                    />
                </div>

                <label className="inline-flex select-none items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                    <input
                        type="checkbox"
                        checked={activeOnly}
                        onChange={(e) => setActiveOnly(e.target.checked)}
                        className="h-4 w-4 rounded-sm border-slate-300 text-[#f59e0b] focus:ring-[#f59e0b] dark:border-slate-700 dark:bg-slate-900"
                    />
                    Active only
                </label>
            </div>

            {/* Error */}
            {error && (
                <div
                    role="alert"
                    className="mb-6 rounded-sm border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300"
                >
                    {error}
                </div>
            )}

            {/* Table card */}
            <div className="overflow-hidden rounded-sm border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
                {loading ? (
                    <SkeletonRows />
                ) : filtered.length === 0 ? (
                    <EmptyState
                        hasAny={structures.length > 0}
                        onClear={() => {
                            setQuery("");
                            setActiveOnly(false);
                        }}
                    />
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
                            <thead className="bg-slate-50 dark:bg-slate-950/40">
                                <tr>
                                    <Th>Name</Th>
                                    <Th>Course</Th>
                                    <Th align="right">Items</Th>
                                    <Th align="right">Total</Th>
                                    <Th>Status</Th>
                                    <Th>Updated</Th>
                                    <Th align="right">Actions</Th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {filtered.map((s) => (
                                    <tr
                                        key={s._id}
                                        className="transition hover:bg-[#f59e0b]/5 dark:hover:bg-[#f59e0b]/10"
                                    >
                                        <Td>
                                            <span className="font-medium text-slate-900 dark:text-slate-100">
                                                {s.name}
                                            </span>
                                        </Td>
                                        <Td>
                                            <CourseCell courseId={s.courseId} />
                                        </Td>
                                        <Td align="right">
                                            <span className="tabular-nums text-slate-600 dark:text-slate-300">
                                                {s.feeItems.length}
                                            </span>
                                        </Td>
                                        <Td align="right">
                                            <span className="font-semibold tabular-nums text-slate-900 dark:text-slate-100">
                                                {formatCurrency(s.totalAmount)}
                                            </span>
                                        </Td>
                                        <Td>
                                            <StatusPill active={s.isActive} />
                                        </Td>
                                        <Td>
                                            <span className="text-xs text-slate-500 dark:text-slate-400">
                                                {formatDate(
                                                    s.updatedAt ?? s.createdAt,
                                                )}
                                            </span>
                                        </Td>
                                        <Td align="right">
                                            <Link
                                                href={`/finance/fee-structures/${s._id}`}
                                                className="inline-flex items-center gap-1 rounded-sm px-2 py-1 text-xs font-medium text-[#1e3a5f] transition hover:bg-[#1e3a5f]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f59e0b] dark:text-[#93b4dc] dark:hover:bg-[#1e3a5f]/30"
                                            >
                                                View
                                                <svg
                                                    xmlns="http://www.w3.org/2000/svg"
                                                    viewBox="0 0 24 24"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    strokeWidth={2}
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    className="h-3 w-3"
                                                >
                                                    <path d="M5 12h14" />
                                                    <path d="m12 5 7 7-7 7" />
                                                </svg>
                                            </Link>
                                        </Td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {!loading && filtered.length > 0 && (
                <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                    Showing{" "}
                    <span className="font-medium text-slate-700 dark:text-slate-200">
                        {filtered.length}
                    </span>{" "}
                    of {structures.length} structure
                    {structures.length === 1 ? "" : "s"}.
                </p>
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
        <div className="rounded-sm border border-slate-200 bg-white px-4 py-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                {label}
            </p>
            <p
                className={[
                    "mt-1 text-lg font-semibold tabular-nums",
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

function CourseCell({ courseId }: { courseId: FeeStructure["courseId"] }) {
    // Missing / null course reference.
    if (!courseId) {
        return <span className="text-slate-400">—</span>;
    }

    // Populated: show name + course code.
    if (isPopulatedCourse(courseId)) {
        return (
            <span className="inline-flex flex-col leading-tight">
                <span className="font-medium text-[#1e3a5f] dark:text-slate-100">
                    {courseId.name ?? "—"}
                </span>
                {courseId.courseCode && (
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                        {courseId.courseCode}
                    </span>
                )}
            </span>
        );
    }

    // Raw ObjectId (e.g. from a by-course read): show the last 6 chars.
    return (
        <code className="rounded-sm bg-slate-100 px-1.5 py-0.5 font-mono text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            {courseId.slice(-6)}
        </code>
    );
}

function StatusPill({ active }: { active: boolean }) {
    return (
        <span
            className={[
                "inline-flex items-center gap-1.5 rounded-sm px-2 py-0.5 text-xs font-medium ring-1 ring-inset",
                active
                    ? "bg-[#f59e0b]/10 text-[#b45309] ring-[#f59e0b]/30 dark:bg-[#f59e0b]/15 dark:text-[#f59e0b] dark:ring-[#f59e0b]/30"
                    : "bg-slate-100 text-slate-600 ring-slate-300/40 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700",
            ].join(" ")}
        >
            <span
                className={`h-1.5 w-1.5 rounded-full ${active ? "bg-[#f59e0b]" : "bg-slate-400"
                    }`}
            />
            {active ? "Active" : "Inactive"}
        </span>
    );
}

function Th({
    children,
    align = "left",
}: {
    children: React.ReactNode;
    align?: "left" | "right";
}) {
    return (
        <th
            scope="col"
            className={`px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 ${align === "right" ? "text-right" : "text-left"
                }`}
        >
            {children}
        </th>
    );
}

function Td({
    children,
    align = "left",
}: {
    children: React.ReactNode;
    align?: "left" | "right";
}) {
    return (
        <td
            className={`whitespace-nowrap px-4 py-3 text-sm text-slate-700 dark:text-slate-300 ${align === "right" ? "text-right" : "text-left"
                }`}
        >
            {children}
        </td>
    );
}

function SkeletonRows() {
    return (
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {Array.from({ length: 6 }).map((_, i) => (
                <div
                    key={i}
                    className="flex items-center justify-between gap-4 px-4 py-3.5"
                >
                    <div className="h-4 w-40 animate-pulse rounded-sm bg-slate-200 dark:bg-slate-800" />
                    <div className="h-4 w-24 animate-pulse rounded-sm bg-slate-200 dark:bg-slate-800" />
                    <div className="h-4 w-12 animate-pulse rounded-sm bg-slate-200 dark:bg-slate-800" />
                    <div className="h-4 w-20 animate-pulse rounded-sm bg-slate-200 dark:bg-slate-800" />
                    <div className="h-4 w-16 animate-pulse rounded-sm bg-slate-200 dark:bg-slate-800" />
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
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.75}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-5 w-5"
                >
                    <path d="M4 4h16v4H4z" />
                    <path d="M4 12h16v8H4z" />
                    <path d="M8 8v4" />
                    <path d="M16 12v8" />
                </svg>
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
                        className="mt-1 inline-flex items-center gap-1.5 rounded-sm border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-[#1e3a5f] shadow-sm transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f59e0b] dark:border-slate-700 dark:bg-slate-900 dark:text-[#93b4dc] dark:hover:bg-slate-800"
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
                        className="mt-1 inline-flex items-center gap-1.5 rounded-sm bg-[#1e3a5f] px-3 py-1.5 text-sm font-medium text-white shadow-sm transition hover:bg-[#16304f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f59e0b] focus-visible:ring-offset-2"
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth={2}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="h-3.5 w-3.5"
                        >
                            <path d="M12 5v14" />
                            <path d="M5 12h14" />
                        </svg>
                        New structure
                    </Link>
                </>
            )}
        </div>
    );
}