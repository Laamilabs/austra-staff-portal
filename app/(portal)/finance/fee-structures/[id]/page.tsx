// app/(portal)/finance/fee-structures/[id]/page.tsx
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { use, useEffect, useMemo, useState } from "react";
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
const ORANGE_HOVER = "#d97706";
const ORANGE_DEEP = "#b45309";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const KES = new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    maximumFractionDigits: 2,
});

function formatCurrency(
    value: number | null | undefined,
    currency = "KES",
): string {
    if (value == null || !Number.isFinite(value)) return "—";
    const nf = new Intl.NumberFormat("en-KE", {
        style: "currency",
        currency,
        maximumFractionDigits: 2,
    });
    return nf.format(value);
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

function formatDateTime(iso: string | null | undefined): string {
    if (!iso) return "—";
    const d = new Date(iso);
    return Number.isNaN(d.getTime())
        ? "—"
        : d.toLocaleString("en-KE", {
            year: "numeric",
            month: "short",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
        });
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function FeeStructureDetailPage({
    params,
}: {
    // Next 16: params is a Promise in both client and server components.
    params: Promise<{ id: string }>;
}) {
    const router = useRouter();
    const { id } = use(params);

    const [structure, setStructure] = useState<FeeStructure | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [confirmingDelete, setConfirmingDelete] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [deleteError, setDeleteError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;

        (async () => {
            try {
                setLoading(true);
                setError(null);
                const data = await feeStructureApi.getById(id);
                if (!cancelled) setStructure(data);
            } catch (err) {
                if (!cancelled) {
                    setError(
                        err instanceof Error
                            ? err.message
                            : "Failed to load fee structure.",
                    );
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [id]);

    // Fee item with a share of the total, for the bar widths.
    const itemsWithShare = useMemo(() => {
        if (!structure) return [];
        const total = structure.totalAmount || 0;
        return structure.feeItems.map((item, index) => ({
            ...item,
            index,
            share: total > 0 ? (item.amount / total) * 100 : 0,
        }));
    }, [structure]);

    async function handleDelete() {
        setDeleteError(null);
        try {
            setDeleting(true);
            await feeStructureApi.delete(id);
            router.push("/finance/fee-structures");
        } catch (err) {
            setDeleteError(
                err instanceof Error
                    ? err.message
                    : "Failed to delete fee structure.",
            );
            setDeleting(false);
        }
    }

    // ---------------------------------------------------------------------
    // Loading / error states
    // ---------------------------------------------------------------------

    if (loading) {
        return <DetailSkeleton />;
    }

    if (error || !structure) {
        return (
            <div className="mx-auto max-w-full px-4 py-8 sm:px-6 lg:px-8">
                <nav className="mb-3 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                    <Link
                        href="/finance"
                        className="rounded-sm transition hover:text-[#f59e0b]"
                    >
                        Finance
                    </Link>
                    <span aria-hidden>/</span>
                    <Link
                        href="/finance/fee-structures"
                        className="rounded-sm transition hover:text-[#f59e0b]"
                    >
                        Fee structures
                    </Link>
                </nav>
                <div
                    role="alert"
                    className="rounded-sm border border-rose-200 bg-rose-50 px-4 py-4 text-sm text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300"
                >
                    <p className="font-medium">
                        {error ?? "Fee structure not found."}
                    </p>
                    <Link
                        href="/finance/fee-structures"
                        className="mt-3 inline-flex items-center gap-1.5 rounded-sm border border-rose-200 bg-white px-3 py-1.5 text-xs font-medium text-rose-700 transition hover:bg-rose-100 dark:border-rose-900/50 dark:bg-slate-900 dark:text-rose-300 dark:hover:bg-slate-800"
                    >
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
                            <path d="M19 12H5" />
                            <path d="m12 19-7-7 7-7" />
                        </svg>
                        Back to list
                    </Link>
                </div>
            </div>
        );
    }

    // ---------------------------------------------------------------------
    // Render
    // ---------------------------------------------------------------------

    const course = isPopulatedCourse(structure.courseId)
        ? structure.courseId
        : null;
    const rawCourseId =
        typeof structure.courseId === "string" ? structure.courseId : null;

    return (
        <div className="mx-auto max-w-full px-4 py-8 sm:px-6 lg:px-8">
            {/* Breadcrumb */}
            <nav className="mb-3 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                <Link
                    href="/finance"
                    className="rounded-sm transition hover:text-[#f59e0b]"
                >
                    Finance
                </Link>
                <span aria-hidden>/</span>
                <Link
                    href="/finance/fee-structures"
                    className="rounded-sm transition hover:text-[#f59e0b]"
                >
                    Fee structures
                </Link>
                <span aria-hidden>/</span>
                <span className="max-w-[16ch] truncate text-slate-700 dark:text-slate-200">
                    {structure.name}
                </span>
            </nav>

            {/* Header */}
            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                        <h1 className="text-2xl font-semibold tracking-tight text-[#1e3a5f] dark:text-slate-100">
                            {structure.name}
                        </h1>
                        <StatusPill active={structure.isActive} />
                    </div>
                    <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
                        {course ? (
                            <>
                                {course.name ?? "Unnamed course"}
                                {course.courseCode && (
                                    <>
                                        {" "}
                                        ·{" "}
                                        <span className="font-mono text-xs">
                                            {course.courseCode}
                                        </span>
                                    </>
                                )}
                            </>
                        ) : rawCourseId ? (
                            <>
                                Course{" "}
                                <code className="rounded-sm bg-slate-100 px-1.5 py-0.5 font-mono text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                                    {rawCourseId}
                                </code>
                            </>
                        ) : (
                            "No course linked."
                        )}
                    </p>
                </div>

                <div className="flex shrink-0 flex-wrap items-center gap-2">
                    <Link
                        href={`/finance/fee-structures/${structure._id}/edit`}
                        className={[
                            "inline-flex items-center gap-2 rounded-sm border px-3.5 py-2 text-sm font-medium shadow-sm transition",
                            "border-slate-200 bg-white text-[#1e3a5f] hover:bg-slate-50",
                            "dark:border-slate-700 dark:bg-slate-900 dark:text-[#93b4dc] dark:hover:bg-slate-800",
                            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f59e0b]",
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
                            <path d="M12 20h9" />
                            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z" />
                        </svg>
                        Edit
                    </Link>

                    {!confirmingDelete && (
                        <button
                            type="button"
                            onClick={() => {
                                setConfirmingDelete(true);
                                setDeleteError(null);
                            }}
                            className={[
                                "inline-flex items-center gap-2 rounded-sm border px-3.5 py-2 text-sm font-medium shadow-sm transition",
                                "border-rose-200 bg-white text-rose-700 hover:bg-rose-50",
                                "dark:border-rose-900/60 dark:bg-slate-900 dark:text-rose-300 dark:hover:bg-rose-950/40",
                                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f59e0b]",
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
                                <path d="M3 6h18" />
                                <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                <path d="M6 6v14a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V6" />
                            </svg>
                            Delete
                        </button>
                    )}
                </div>
            </div>

            {/* Delete confirmation banner */}
            {confirmingDelete && (
                <div
                    role="alertdialog"
                    aria-label="Confirm delete"
                    className={[
                        "mb-6 rounded-sm border px-4 py-3",
                        "border-rose-200 bg-rose-50",
                        "dark:border-rose-900/60 dark:bg-rose-950/40",
                    ].join(" ")}
                >
                    <p className="text-sm font-medium text-rose-800 dark:text-rose-200">
                        Delete this fee structure?
                    </p>
                    <p className="mt-0.5 text-xs text-rose-700 dark:text-rose-300">
                        This cannot be undone. Existing student fee assignments
                        that reference it will lose their source structure.
                    </p>
                    {deleteError && (
                        <p
                            role="alert"
                            className="mt-2 text-xs font-medium text-rose-800 dark:text-rose-200"
                        >
                            {deleteError}
                        </p>
                    )}
                    <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
                        <button
                            type="button"
                            onClick={() => {
                                setConfirmingDelete(false);
                                setDeleteError(null);
                            }}
                            disabled={deleting}
                            className="rounded-sm border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={handleDelete}
                            disabled={deleting}
                            className="inline-flex items-center gap-1.5 rounded-sm bg-rose-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm transition hover:bg-rose-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f59e0b] disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {deleting && (
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    className="h-3.5 w-3.5 animate-spin"
                                >
                                    <circle
                                        cx="12"
                                        cy="12"
                                        r="9"
                                        stroke="currentColor"
                                        strokeOpacity="0.25"
                                        strokeWidth="3"
                                    />
                                    <path
                                        d="M21 12a9 9 0 0 0-9-9"
                                        stroke="currentColor"
                                        strokeWidth="3"
                                        strokeLinecap="round"
                                    />
                                </svg>
                            )}
                            {deleting ? "Deleting…" : "Yes, delete"}
                        </button>
                    </div>
                </div>
            )}

            {/* Meta strip */}
            <section className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <MetaTile
                    label="Total"
                    value={formatCurrency(structure.totalAmount, structure.currency)}
                    accent
                />
                <MetaTile
                    label="Items"
                    value={structure.feeItems.length.toLocaleString()}
                />
                <MetaTile label="Currency" value={structure.currency} />
                <MetaTile
                    label="Updated"
                    value={formatDate(structure.updatedAt ?? structure.createdAt)}
                />
            </section>

            {/* Fee items card */}
            <section className="rounded-sm border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <header className="flex items-center justify-between border-b border-slate-200 px-5 py-3.5 dark:border-slate-800">
                    <div>
                        <h2 className="text-sm font-semibold text-[#1e3a5f] dark:text-slate-100">
                            Fee items
                        </h2>
                        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                            Breakdown of the total, largest share first.
                        </p>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                        {structure.feeItems.length} item
                        {structure.feeItems.length === 1 ? "" : "s"}
                    </p>
                </header>

                {itemsWithShare.length === 0 ? (
                    <div className="px-5 py-10 text-center text-sm text-slate-500 dark:text-slate-400">
                        No fee items on this structure.
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
                            <thead className="bg-slate-50 dark:bg-slate-950/40">
                                <tr>
                                    <Th>Item</Th>
                                    <Th>Description</Th>
                                    <Th align="right">Amount</Th>
                                    <Th align="right">Share</Th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {itemsWithShare
                                    .slice()
                                    .sort((a, b) => b.amount - a.amount)
                                    .map((item) => (
                                        <tr
                                            key={item.index}
                                            className="transition hover:bg-[#f59e0b]/5 dark:hover:bg-[#f59e0b]/10"
                                        >
                                            <Td>
                                                <span className="font-medium text-slate-900 dark:text-slate-100">
                                                    {item.name}
                                                </span>
                                            </Td>
                                            <Td>
                                                <span className="text-slate-500 dark:text-slate-400">
                                                    {item.description || "—"}
                                                </span>
                                            </Td>
                                            <Td align="right">
                                                <span className="font-semibold tabular-nums text-slate-900 dark:text-slate-100">
                                                    {formatCurrency(
                                                        item.amount,
                                                        structure.currency,
                                                    )}
                                                </span>
                                            </Td>
                                            <Td align="right">
                                                <div className="flex items-center justify-end gap-3">
                                                    <div className="hidden h-1.5 w-24 overflow-hidden rounded-sm bg-slate-100 sm:block dark:bg-slate-800">
                                                        <div
                                                            className="h-full rounded-sm bg-[#f59e0b]"
                                                            style={{
                                                                width: `${Math.min(100, item.share)}%`,
                                                            }}
                                                        />
                                                    </div>
                                                    <span className="w-14 text-right tabular-nums text-xs text-slate-500 dark:text-slate-400">
                                                        {item.share.toFixed(1)}%
                                                    </span>
                                                </div>
                                            </Td>
                                        </tr>
                                    ))}
                            </tbody>
                            <tfoot>
                                <tr className="border-t border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950/40">
                                    <Td>
                                        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                            Total
                                        </span>
                                    </Td>
                                    <Td>{""}</Td>
                                    <Td align="right">
                                        <span className="text-base font-semibold tabular-nums text-[#1e3a5f] dark:text-[#f59e0b]">
                                            {formatCurrency(
                                                structure.totalAmount,
                                                structure.currency,
                                            )}
                                        </span>
                                    </Td>
                                    <Td align="right">
                                        <span className="text-xs text-slate-500 dark:text-slate-400">
                                            100%
                                        </span>
                                    </Td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                )}
            </section>

            {/* Audit footer */}
            <section className="mt-6 grid grid-cols-1 gap-3 text-xs text-slate-500 sm:grid-cols-2 dark:text-slate-400">
                <p>
                    Created{" "}
                    <span className="text-slate-700 dark:text-slate-300">
                        {formatDateTime(structure.createdAt)}
                    </span>
                </p>
                <p className="sm:text-right">
                    Last updated{" "}
                    <span className="text-slate-700 dark:text-slate-300">
                        {formatDateTime(structure.updatedAt)}
                    </span>
                </p>
            </section>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Presentational bits
// ---------------------------------------------------------------------------

function MetaTile({
    label,
    value,
    accent,
}: {
    label: string;
    value: string;
    accent?: boolean;
}) {
    return (
        <div className="rounded-sm border border-slate-200 bg-white px-4 py-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                {label}
            </p>
            <p
                className={[
                    "mt-1 text-base font-semibold tabular-nums",
                    accent
                        ? "text-[#b45309] dark:text-[#f59e0b]"
                        : "text-[#1e3a5f] dark:text-slate-100",
                ].join(" ")}
            >
                {value}
            </p>
        </div>
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
            className={`px-4 py-3 text-sm text-slate-700 dark:text-slate-300 ${align === "right" ? "text-right" : "text-left"
                }`}
        >
            {children}
        </td>
    );
}

function DetailSkeleton() {
    return (
        <div className="mx-auto max-w-full px-4 py-8 sm:px-6 lg:px-8">
            <div className="mb-3 h-3 w-48 animate-pulse rounded-sm bg-slate-200 dark:bg-slate-800" />
            <div className="mb-6 flex items-start justify-between gap-4">
                <div className="space-y-2">
                    <div className="h-7 w-72 animate-pulse rounded-sm bg-slate-200 dark:bg-slate-800" />
                    <div className="h-4 w-56 animate-pulse rounded-sm bg-slate-200 dark:bg-slate-800" />
                </div>
                <div className="h-9 w-32 animate-pulse rounded-sm bg-slate-200 dark:bg-slate-800" />
            </div>
            <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {Array.from({ length: 4 }).map((_, i) => (
                    <div
                        key={i}
                        className="h-16 animate-pulse rounded-sm bg-slate-200 dark:bg-slate-800"
                    />
                ))}
            </div>
            <div className="h-64 animate-pulse rounded-sm bg-slate-200 dark:bg-slate-800" />
        </div>
    );
}