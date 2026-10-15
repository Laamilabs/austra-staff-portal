"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
    Receipt,
    Plus,
    Search,
    X,
    Loader2,
    Undo2,
    AlertCircle,
    CheckCircle2,
    Clock,
    XCircle,
    Wallet,
    TrendingUp,
} from "lucide-react";

import {
    FeeTransaction,
    PaymentMethod,
    TransactionStatus,
    feeTransactionApi,
} from "@/app/types/fee-transaction";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const FOCUS_RING =
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400";

const HIDE_SCROLLBAR =
    "[scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden";

const STATUS_LABEL: Record<TransactionStatus, string> = {
    PENDING: "Pending",
    CONFIRMED: "Confirmed",
    REVERSED: "Reversed",
};

const STATUS_STYLE: Record<TransactionStatus, string> = {
    PENDING:
        "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-400/10 dark:text-amber-300 dark:ring-amber-400/25",
    CONFIRMED:
        "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-400/10 dark:text-emerald-300 dark:ring-emerald-400/25",
    REVERSED:
        "bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-400/10 dark:text-rose-300 dark:ring-rose-400/25",
};

const STATUS_ICON: Record<TransactionStatus, typeof Clock> = {
    PENDING: Clock,
    CONFIRMED: CheckCircle2,
    REVERSED: XCircle,
};

const METHOD_LABEL: Record<PaymentMethod, string> = {
    CASH: "Cash",
    MPESA: "M-Pesa",
    BANK_TRANSFER: "Bank Transfer",
    OTHER: "Other",
};

const ALL_METHODS: PaymentMethod[] = [
    "CASH",
    "MPESA",
    "BANK_TRANSFER",
    "OTHER",
];

// ---------------------------------------------------------------------------
// Populated-field helpers
// ---------------------------------------------------------------------------

function refId(ref: unknown): string | undefined {
    if (!ref) return undefined;
    if (typeof ref === "string") return ref;
    if (typeof ref === "object" && "_id" in (ref as object)) {
        return (ref as { _id: string })._id;
    }
    return undefined;
}

function getStudentName(tx: FeeTransaction): string {
    const ref = tx.studentId;
    if (!ref || typeof ref === "string") return "Unknown student";

    const name = ref.fullName;
    if (!name) return "Unknown student";

    const parts = [name.firstName, name.middleName, name.lastName].filter(
        (p) => p?.trim(),
    );
    return parts.join(" ") || "Unnamed student";
}

function getStudentEmail(tx: FeeTransaction): string {
    const ref = tx.studentId;
    if (!ref || typeof ref === "string") return "";
    return ref.contact?.email ?? "";
}

/**
 * Admission number is stored per course enrollment on the student.
 * Still used by the search filter even though the column is gone.
 */
function getAdmissionNumber(tx: FeeTransaction): string {
    const studentRef = tx.studentId;
    if (!studentRef || typeof studentRef === "string") return "";

    const courses = studentRef.courses ?? [];
    if (courses.length === 0) return "";

    const txCourseId = refId(tx.courseId);

    if (txCourseId) {
        const match = courses.find(
            (enrollment) => refId(enrollment.courseId) === txCourseId,
        );
        if (match?.admissionNumber) return match.admissionNumber;
    }

    return courses[0]?.admissionNumber ?? "";
}

function getCourseName(tx: FeeTransaction): string {
    const ref = tx.courseId;
    if (!ref || typeof ref === "string") return "—";
    return ref.name ?? ref.courseCode ?? "—";
}

function getCourseCode(tx: FeeTransaction): string {
    const ref = tx.courseId;
    if (!ref || typeof ref === "string") return "";
    return ref.courseCode ?? "";
}

// ---------------------------------------------------------------------------
// Formatters
// ---------------------------------------------------------------------------

function formatMoney(amount: number, currency = "KES"): string {
    const code = currency?.toUpperCase() || "KES";
    try {
        return new Intl.NumberFormat("en-KE", {
            style: "currency",
            currency: code,
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(amount);
    } catch {
        return `${code} ${amount.toFixed(2)}`;
    }
}

function isDateOnly(iso?: string): boolean {
    if (!iso) return false;
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return false;
    return (
        d.getUTCHours() === 0 &&
        d.getUTCMinutes() === 0 &&
        d.getUTCSeconds() === 0 &&
        d.getUTCMilliseconds() === 0
    );
}

function formatDate(iso?: string): string {
    if (!iso) return "—";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleDateString("en-KE", {
        year: "numeric",
        month: "short",
        day: "2-digit",
    });
}

function formatTime(iso?: string): string {
    if (!iso) return "";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleTimeString("en-KE", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
    });
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function TransactionsPage() {
    const router = useRouter();

    const [transactions, setTransactions] = useState<FeeTransaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState<
        TransactionStatus | "ALL"
    >("ALL");
    const [methodFilter, setMethodFilter] = useState<
        PaymentMethod | "ALL"
    >("ALL");

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            const txs = await feeTransactionApi.getAll();
            setTransactions(Array.isArray(txs) ? txs : []);
        } catch (err) {
            console.error("Failed to load transactions:", err);
            setError("Failed to load transactions. Please try again.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    // -----------------------------------------------------------------------
    // Filtering
    // -----------------------------------------------------------------------

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();

        return transactions.filter((tx) => {
            if (statusFilter !== "ALL" && tx.status !== statusFilter) {
                return false;
            }
            if (
                methodFilter !== "ALL" &&
                tx.paymentMethod !== methodFilter
            ) {
                return false;
            }
            if (!q) return true;

            const name = getStudentName(tx).toLowerCase();
            const adm = getAdmissionNumber(tx).toLowerCase();
            const course = getCourseName(tx).toLowerCase();
            const code = tx.confirmationCode?.toLowerCase() ?? "";
            const notes = tx.notes?.toLowerCase() ?? "";

            return (
                name.includes(q) ||
                adm.includes(q) ||
                course.includes(q) ||
                code.includes(q) ||
                notes.includes(q)
            );
        });
    }, [transactions, search, statusFilter, methodFilter]);

    // -----------------------------------------------------------------------
    // Summary
    // -----------------------------------------------------------------------

    const summary = useMemo(() => {
        let confirmedTotal = 0;
        let confirmedCount = 0;
        let reversedCount = 0;
        const currency =
            transactions.find((t) => t.currency)?.currency ?? "KES";

        for (const tx of transactions) {
            if (tx.status === "CONFIRMED") {
                confirmedTotal += tx.amount;
                confirmedCount += 1;
            } else if (tx.status === "REVERSED") {
                reversedCount += 1;
            }
        }

        return {
            confirmedTotal,
            confirmedCount,
            reversedCount,
            currency,
        };
    }, [transactions]);

    // -----------------------------------------------------------------------
    // Navigation
    // -----------------------------------------------------------------------

    const goToDetail = useCallback(
        (id: string) => {
            router.push(`/finance/transactions/${id}`);
        },
        [router],
    );

    const hasFilters =
        search.trim() !== "" ||
        statusFilter !== "ALL" ||
        methodFilter !== "ALL";

    const clearFilters = () => {
        setSearch("");
        setStatusFilter("ALL");
        setMethodFilter("ALL");
    };

    // -----------------------------------------------------------------------
    // Render
    // -----------------------------------------------------------------------

    return (
        <div className="mx-auto w-full max-w-400l px-4 py-6 sm:px-6 lg:px-8">
            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-sm bg-orange-400/15 text-orange-500 dark:bg-orange-400/10 dark:text-orange-300">
                        <Receipt className="h-5 w-5" />
                    </span>
                    <div>
                        <h1 className="text-lg font-semibold text-[#0B1E3D] dark:text-white">
                            Fee Transactions
                        </h1>
                        <p className="text-sm text-zinc-500 dark:text-zinc-400">
                            Track and manage all recorded student fee
                            payments.
                        </p>
                    </div>
                </div>

                <Link
                    href="/finance/transactions/new"
                    className={`inline-flex h-10 items-center gap-2 rounded-sm bg-orange-500 px-4 text-sm font-medium text-white shadow-sm transition-colors hover:bg-orange-600 ${FOCUS_RING}`}
                >
                    <Plus className="h-4 w-4" />
                    Record Payment
                </Link>
            </div>

            <div className="mb-6 grid gap-3 sm:grid-cols-3">
                <SummaryCard
                    icon={<TrendingUp className="h-4 w-4" />}
                    label="Total collected"
                    value={formatMoney(summary.confirmedTotal, summary.currency)}
                    tone="emerald"
                />
                <SummaryCard
                    icon={<CheckCircle2 className="h-4 w-4" />}
                    label="Confirmed payments"
                    value={String(summary.confirmedCount)}
                    tone="orange"
                />
                <SummaryCard
                    icon={<Undo2 className="h-4 w-4" />}
                    label="Reversed"
                    value={String(summary.reversedCount)}
                    tone="rose"
                />
            </div>

            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
                <label
                    className={`flex h-10 flex-1 items-center gap-2 rounded-sm border border-zinc-200 bg-white px-3 text-zinc-400 transition-colors focus-within:border-orange-400 focus-within:ring-2 focus-within:ring-orange-400/25 dark:border-white/10 dark:bg-[#0B1E3D] dark:text-zinc-500 ${FOCUS_RING}`}
                >
                    <Search className="h-4 w-4 shrink-0" />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search by student, admission no, course, code or notes..."
                        className="min-w-0 flex-1 bg-transparent text-sm text-[#0B1E3D] outline-none placeholder:text-zinc-400 dark:text-white dark:placeholder:text-zinc-500"
                    />
                    {search && (
                        <button
                            type="button"
                            onClick={() => setSearch("")}
                            aria-label="Clear search"
                            className={`flex h-5 w-5 items-center justify-center rounded-sm hover:text-[#0B1E3D] dark:hover:text-white ${FOCUS_RING}`}
                        >
                            <X className="h-3.5 w-3.5" />
                        </button>
                    )}
                </label>

                <select
                    value={statusFilter}
                    onChange={(e) =>
                        setStatusFilter(
                            e.target.value as TransactionStatus | "ALL",
                        )
                    }
                    className={`h-10 rounded-sm border border-zinc-200 bg-white px-3 text-sm text-[#0B1E3D] outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-400/25 dark:border-white/10 dark:bg-[#0B1E3D] dark:text-white ${FOCUS_RING}`}
                >
                    <option value="ALL">All statuses</option>
                    <option value="CONFIRMED">Confirmed</option>
                    <option value="PENDING">Pending</option>
                    <option value="REVERSED">Reversed</option>
                </select>

                <select
                    value={methodFilter}
                    onChange={(e) =>
                        setMethodFilter(
                            e.target.value as PaymentMethod | "ALL",
                        )
                    }
                    className={`h-10 rounded-sm border border-zinc-200 bg-white px-3 text-sm text-[#0B1E3D] outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-400/25 dark:border-white/10 dark:bg-[#0B1E3D] dark:text-white ${FOCUS_RING}`}
                >
                    <option value="ALL">All methods</option>
                    {ALL_METHODS.map((m) => (
                        <option key={m} value={m}>
                            {METHOD_LABEL[m]}
                        </option>
                    ))}
                </select>

                {hasFilters && (
                    <button
                        type="button"
                        onClick={clearFilters}
                        className={`inline-flex h-10 items-center gap-1.5 rounded-sm px-3 text-sm text-zinc-500 hover:bg-zinc-100 hover:text-[#0B1E3D] dark:text-zinc-400 dark:hover:bg-white/5 dark:hover:text-white ${FOCUS_RING}`}
                    >
                        <X className="h-3.5 w-3.5" />
                        Clear
                    </button>
                )}
            </div>

            <div className="overflow-hidden rounded-sm border border-zinc-200 bg-white dark:border-white/10 dark:bg-[#0B1E3D]">
                {loading ? (
                    <div className="flex flex-col items-center justify-center gap-3 py-20 text-zinc-400 dark:text-zinc-500">
                        <Loader2 className="h-6 w-6 animate-spin text-orange-500 dark:text-orange-400" />
                        <span className="text-sm">
                            Loading transactions...
                        </span>
                    </div>
                ) : error ? (
                    <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
                        <AlertCircle className="h-6 w-6 text-rose-500" />
                        <p className="text-sm text-zinc-600 dark:text-zinc-300">
                            {error}
                        </p>
                        <button
                            type="button"
                            onClick={load}
                            className={`inline-flex h-9 items-center gap-2 rounded-sm border border-zinc-200 px-3 text-sm font-medium text-[#0B1E3D] hover:bg-zinc-50 dark:border-white/10 dark:text-white dark:hover:bg-white/5 ${FOCUS_RING}`}
                        >
                            Try again
                        </button>
                    </div>
                ) : filtered.length === 0 ? (
                    <EmptyState
                        hasAny={transactions.length > 0}
                        hasFilters={hasFilters}
                        onClear={clearFilters}
                    />
                ) : (
                    <div className={`overflow-x-auto ${HIDE_SCROLLBAR}`}>
                        <table className="w-full min-w-[720px] border-collapse text-sm">
                            <thead>
                                <tr className="border-b border-zinc-200 bg-zinc-50 text-left text-[11px] font-semibold uppercase tracking-wider text-zinc-500 dark:border-white/10 dark:bg-white/[0.03] dark:text-zinc-400">
                                    <th className="px-4 py-3">
                                        Date &amp; time
                                    </th>
                                    <th className="px-4 py-3">Student</th>
                                    <th className="px-4 py-3">Course</th>
                                    <th className="px-4 py-3 text-right">
                                        Amount
                                    </th>
                                    <th className="px-4 py-3">Method</th>
                                    <th className="px-4 py-3">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map((tx) => {
                                    const StatusIcon = STATUS_ICON[tx.status];

                                    const studentName = getStudentName(tx);
                                    const studentEmail = getStudentEmail(tx);
                                    const courseName = getCourseName(tx);
                                    const courseCode = getCourseCode(tx);

                                    const dateOnly = isDateOnly(
                                        tx.transactionDate,
                                    );

                                    return (
                                        <tr
                                            key={tx._id}
                                            role="link"
                                            tabIndex={0}
                                            onClick={() =>
                                                goToDetail(tx._id)
                                            }
                                            onKeyDown={(e) => {
                                                if (
                                                    e.key === "Enter" ||
                                                    e.key === " "
                                                ) {
                                                    e.preventDefault();
                                                    goToDetail(tx._id);
                                                }
                                            }}
                                            className={`cursor-pointer border-b border-zinc-100 transition-colors last:border-b-0 hover:bg-zinc-50/70 focus-visible:bg-orange-50/60 focus-visible:outline-none dark:border-white/5 dark:hover:bg-white/[0.02] dark:focus-visible:bg-orange-400/5 ${FOCUS_RING}`}
                                        >
                                            <td className="whitespace-nowrap px-4 py-3 text-zinc-600 dark:text-zinc-300">
                                                <span className="block">
                                                    {formatDate(
                                                        tx.transactionDate,
                                                    )}
                                                </span>
                                                <span
                                                    className={`block text-[11px] ${dateOnly
                                                            ? "italic text-zinc-400 dark:text-zinc-500"
                                                            : "tabular-nums text-zinc-500 dark:text-zinc-400"
                                                        }`}
                                                >
                                                    {dateOnly
                                                        ? "date only"
                                                        : formatTime(
                                                            tx.transactionDate,
                                                        ) || "—"}
                                                </span>
                                            </td>

                                            {/* Student name (+ email underneath) */}
                                            <td className="max-w-[240px] px-4 py-3">
                                                <span className="block truncate font-medium text-[#0B1E3D] dark:text-white">
                                                    {studentName}
                                                </span>
                                                {studentEmail && (
                                                    <span className="block truncate text-[11px] text-zinc-500 dark:text-zinc-400">
                                                        {studentEmail}
                                                    </span>
                                                )}
                                            </td>

                                            {/* Course */}
                                            <td className="max-w-[240px] px-4 py-3">
                                                <span className="block truncate text-[#0B1E3D] dark:text-zinc-100">
                                                    {courseName}
                                                </span>
                                                {courseCode && (
                                                    <span className="block truncate text-[11px] text-zinc-500 dark:text-zinc-400">
                                                        {courseCode}
                                                    </span>
                                                )}
                                            </td>

                                            <td className="whitespace-nowrap px-4 py-3 text-right font-medium text-[#0B1E3D] tabular-nums dark:text-white">
                                                {formatMoney(
                                                    tx.amount,
                                                    tx.currency,
                                                )}
                                            </td>

                                            <td className="whitespace-nowrap px-4 py-3 text-zinc-600 dark:text-zinc-300">
                                                {METHOD_LABEL[tx.paymentMethod]}
                                            </td>

                                            <td className="whitespace-nowrap px-4 py-3">
                                                <span
                                                    className={`inline-flex items-center gap-1.5 rounded-sm px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset ${STATUS_STYLE[tx.status]
                                                        }`}
                                                >
                                                    <StatusIcon className="h-3 w-3" />
                                                    {STATUS_LABEL[tx.status]}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

interface SummaryCardProps {
    icon: React.ReactNode;
    label: string;
    value: string;
    tone: "emerald" | "orange" | "rose";
}

function SummaryCard({ icon, label, value, tone }: SummaryCardProps) {
    const toneStyles: Record<SummaryCardProps["tone"], string> = {
        emerald:
            "bg-emerald-50 text-emerald-600 ring-emerald-200 dark:bg-emerald-400/10 dark:text-emerald-300 dark:ring-emerald-400/25",
        orange:
            "bg-orange-50 text-orange-600 ring-orange-200 dark:bg-orange-400/10 dark:text-orange-300 dark:ring-orange-400/25",
        rose: "bg-rose-50 text-rose-600 ring-rose-200 dark:bg-rose-400/10 dark:text-rose-300 dark:ring-rose-400/25",
    };

    return (
        <div className="flex items-center gap-3 rounded-sm border border-zinc-200 bg-white p-4 dark:border-white/10 dark:bg-[#0B1E3D]">
            <span
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-sm ring-1 ring-inset ${toneStyles[tone]}`}
            >
                {icon}
            </span>
            <div className="min-w-0">
                <p className="truncate text-[11px] font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                    {label}
                </p>
                <p className="truncate text-base font-semibold text-[#0B1E3D] dark:text-white">
                    {value}
                </p>
            </div>
        </div>
    );
}

interface EmptyStateProps {
    hasAny: boolean;
    hasFilters: boolean;
    onClear: () => void;
}

function EmptyState({ hasAny, hasFilters, onClear }: EmptyStateProps) {
    if (hasAny && hasFilters) {
        return (
            <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
                <Search className="h-6 w-6 text-zinc-400 dark:text-zinc-500" />
                <p className="text-sm text-zinc-600 dark:text-zinc-300">
                    No transactions match your filters.
                </p>
                <button
                    type="button"
                    onClick={onClear}
                    className={`inline-flex h-9 items-center gap-2 rounded-sm border border-zinc-200 px-3 text-sm font-medium text-[#0B1E3D] hover:bg-zinc-50 dark:border-white/10 dark:text-white dark:hover:bg-white/5 ${FOCUS_RING}`}
                >
                    Clear filters
                </button>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-sm bg-orange-400/15 text-orange-500 dark:bg-orange-400/10 dark:text-orange-300">
                <Wallet className="h-6 w-6" />
            </span>
            <p className="text-sm font-medium text-[#0B1E3D] dark:text-white">
                No transactions yet
            </p>
            <p className="max-w-sm text-xs text-zinc-500 dark:text-zinc-400">
                Record the first fee payment to see it appear in this list.
            </p>
            <Link
                href="/finance/transactions/new"
                className={`mt-2 inline-flex h-9 items-center gap-2 rounded-sm bg-orange-500 px-3 text-sm font-medium text-white hover:bg-orange-600 ${FOCUS_RING}`}
            >
                <Plus className="h-4 w-4" />
                Record Payment
            </Link>
        </div>
    );
}