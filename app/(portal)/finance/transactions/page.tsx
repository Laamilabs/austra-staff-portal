"use client";

import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
    type ReactNode,
} from "react";
import Link from "next/link";
import {
    AlertCircle,
    CheckCircle2,
    ChevronDown,
    Clock,
    LayoutDashboard,
    Loader2,
    Plus,
    Receipt,
    RefreshCw,
    Search,
    SlidersHorizontal,
    TrendingUp,
    Undo2,
    Users,
    Wallet,
    X,
    XCircle,
} from "lucide-react";

import {
    FeeTransaction,
    PaymentMethod,
    TransactionStatus,
    feeTransactionApi,
} from "@/app/types/fee-transaction";
import RequireRole from "@/app/components/navigation/RequireRole";

// ---------------------------------------------------------------------------
// Tokens
// ---------------------------------------------------------------------------

const FOCUS =
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#0B1E3D]";

const CARD =
    "rounded-sm border border-zinc-200 bg-white shadow-sm shadow-blue-950/5 dark:border-white/10 dark:bg-[#0B1E3D]";

const FIELD =
    "h-10 w-full rounded-sm border border-zinc-300 bg-white px-3 text-sm text-[#0B1E3D] shadow-sm outline-none transition-colors placeholder:text-zinc-400 hover:bg-zinc-50 focus:border-orange-400 focus:ring-2 focus:ring-orange-400/30 dark:border-white/15 dark:bg-white/5 dark:text-white dark:hover:bg-white/10 dark:[color-scheme:dark] dark:[&>option]:bg-[#0B1E3D]";

const BTN =
    "inline-flex h-10 items-center justify-center gap-2 rounded-sm border border-zinc-300 bg-white px-3.5 text-sm font-semibold text-[#0B1E3D] shadow-sm transition-colors hover:bg-zinc-50 active:bg-zinc-100 disabled:opacity-60 dark:border-white/15 dark:bg-white/5 dark:text-white dark:hover:bg-white/10";

const PRIMARY =
    "inline-flex h-10 items-center justify-center gap-2 rounded-sm bg-orange-500 px-4 text-sm font-semibold text-white shadow-sm shadow-blue-950/30 transition-colors hover:bg-orange-400 active:bg-orange-600";

// Desktop row layout, shared by the header and every row
const COLS =
    "md:grid-cols-[8.5rem_minmax(0,1.4fr)_minmax(0,1.2fr)_7.5rem_9rem_8rem]";

const PAGE = 50;

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
    BANK_TRANSFER: "Bank transfer",
    OTHER: "Other",
};

const ALL_METHODS: PaymentMethod[] = ["CASH", "MPESA", "BANK_TRANSFER", "OTHER"];

const STATUS_TABS: { key: TransactionStatus | "ALL"; label: string }[] = [
    { key: "ALL", label: "All" },
    { key: "CONFIRMED", label: "Confirmed" },
    { key: "PENDING", label: "Pending" },
    { key: "REVERSED", label: "Reversed" },
];

type SortKey = "newest" | "oldest" | "amount";

const SORTS: { key: SortKey; label: string }[] = [
    { key: "newest", label: "Newest first" },
    { key: "oldest", label: "Oldest first" },
    { key: "amount", label: "Highest amount" },
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

/** Admission number is per course enrolment; used by search only. */
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
// Row model
// ---------------------------------------------------------------------------

interface Row {
    tx: FeeTransaction;
    student: string;
    email: string;
    course: string;
    code: string;
    date: string;
    time: string;
    timestamp: number;
    haystack: string;
}

function toRow(tx: FeeTransaction): Row {
    const student = getStudentName(tx);
    const email = getStudentEmail(tx);
    const course = getCourseName(tx);
    const code = getCourseCode(tx);
    const ts = new Date(tx.transactionDate).getTime();

    return {
        tx,
        student,
        email,
        course,
        code,
        date: formatDate(tx.transactionDate),
        time: isDateOnly(tx.transactionDate)
            ? "date only"
            : formatTime(tx.transactionDate) || "—",
        timestamp: Number.isFinite(ts) ? ts : 0,
        haystack: [
            student,
            email,
            getAdmissionNumber(tx),
            course,
            code,
            tx.confirmationCode ?? "",
            tx.notes ?? "",
        ]
            .join(" ")
            .toLowerCase(),
    };
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

function TransactionsList() {
    const [transactions, setTransactions] = useState<FeeTransaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
    const [elapsed, setElapsed] = useState(0);

    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState<TransactionStatus | "ALL">("ALL");
    const [methodFilter, setMethodFilter] = useState<PaymentMethod | "ALL">("ALL");
    const [sort, setSort] = useState<SortKey>("newest");
    const [limitState, setLimitState] = useState({ sig: "", n: PAGE });

    // Mobile-only: filters panel collapsed by default
    const [filtersOpen, setFiltersOpen] = useState(false);

    const searchRef = useRef<HTMLInputElement>(null);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            const txs = await feeTransactionApi.getAll();
            setTransactions(Array.isArray(txs) ? txs : []);
            setUpdatedAt(new Date());
        } catch (err) {
            console.error("Failed to load transactions:", err);
            setError(
                err instanceof Error && err.message
                    ? err.message
                    : "Failed to load transactions.",
            );
        } finally {
            setLoading(false);
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

    // "/" focuses search.
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            const t = e.target as HTMLElement | null;
            if (e.key !== "/" || t?.closest("input, textarea, select")) return;
            e.preventDefault();
            searchRef.current?.focus();
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, []);

    const rows = useMemo(() => transactions.map(toRow), [transactions]);

    // -----------------------------------------------------------------------
    // Filtering, counts, sorting
    // -----------------------------------------------------------------------

    const q = search.trim().toLowerCase();

    const matchesBase = useCallback(
        (r: Row) =>
            (methodFilter === "ALL" || r.tx.paymentMethod === methodFilter) &&
            (!q || r.haystack.includes(q)),
        [methodFilter, q],
    );

    // Tab counts respect search + method, but not the status tab itself.
    const statusCounts = useMemo(() => {
        const c: Record<TransactionStatus | "ALL", number> = {
            ALL: 0,
            CONFIRMED: 0,
            PENDING: 0,
            REVERSED: 0,
        };
        for (const r of rows) {
            if (!matchesBase(r)) continue;
            c.ALL++;
            c[r.tx.status]++;
        }
        return c;
    }, [rows, matchesBase]);

    const filtered = useMemo(() => {
        const list = rows.filter(
            (r) =>
                matchesBase(r) &&
                (statusFilter === "ALL" || r.tx.status === statusFilter),
        );
        list.sort((a, b) =>
            sort === "amount"
                ? b.tx.amount - a.tx.amount
                : sort === "oldest"
                    ? a.timestamp - b.timestamp
                    : b.timestamp - a.timestamp,
        );
        return list;
    }, [rows, matchesBase, statusFilter, sort]);

    const sig = [q, statusFilter, methodFilter, sort].join("|");
    const limit = limitState.sig === sig ? limitState.n : PAGE;
    const shown = filtered.slice(0, limit);

    // -----------------------------------------------------------------------
    // Totals (whole ledger, unaffected by filters)
    // -----------------------------------------------------------------------

    const totals = useMemo(() => {
        const t = {
            confirmed: { amount: 0, count: 0 },
            pending: { amount: 0, count: 0 },
            reversed: { amount: 0, count: 0 },
            currency: transactions.find((x) => x.currency)?.currency ?? "KES",
        };
        for (const tx of transactions) {
            const bucket =
                tx.status === "CONFIRMED"
                    ? t.confirmed
                    : tx.status === "PENDING"
                        ? t.pending
                        : t.reversed;
            bucket.amount += tx.amount;
            bucket.count += 1;
        }
        return t;
    }, [transactions]);

    const hasFilters = q !== "" || statusFilter !== "ALL" || methodFilter !== "ALL";

    // Active-filter count for the mobile toggle badge. Sort is a reorder,
    // not a filter, so it's intentionally excluded.
    const activeFilterCount =
        (statusFilter !== "ALL" ? 1 : 0) +
        (methodFilter !== "ALL" ? 1 : 0);

    const clearFilters = () => {
        setSearch("");
        setStatusFilter("ALL");
        setMethodFilter("ALL");
    };

    const firstLoad = loading && updatedAt === null;
    const showList = !firstLoad && (transactions.length > 0 || !error);

    // -----------------------------------------------------------------------
    // Render
    // -----------------------------------------------------------------------

    return (
        <div className="mx-auto w-full min-w-0 max-w-full py-6 sm:px-6 lg:px-8">
            <style>{`@keyframes txSlide{0%{transform:translateX(-100%)}100%{transform:translateX(450%)}}`}</style>

            {/* Refresh progress, pinned above the page content */}
            {loading && !firstLoad && (
                <div
                    role="progressbar"
                    aria-label="Refreshing transactions"
                    className="relative -mt-6 mb-6 h-0.5 overflow-hidden bg-orange-400/20"
                >
                    <div className="absolute inset-y-0 left-0 w-1/5 bg-orange-500 motion-safe:animate-[txSlide_1.3s_ease-in-out_infinite]" />
                </div>
            )}

            <nav className="mb-3 flex flex-wrap gap-x-2 text-xs text-zinc-500 dark:text-zinc-400">
                <Link href="/finance" className="hover:text-orange-500">
                    Finance
                </Link>
                <span aria-hidden>/</span>
                <span>Transactions</span>
            </nav>

            {/* Header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex items-start gap-3">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-sm bg-orange-400/10 text-orange-500 ring-1 ring-inset ring-orange-400/30 dark:text-orange-400">
                        <Receipt className="h-5 w-5" />
                    </span>
                    <div className="min-w-0">
                        <h1 className="text-xl font-bold tracking-tight text-[#0B1E3D] dark:text-white">
                            Fee transactions
                        </h1>
                        <p className="text-sm text-zinc-500 dark:text-zinc-400">
                            Every recorded student fee payment.
                        </p>
                    </div>
                </div>

                <Link
                    href="/finance/transactions/new"
                    className={`${PRIMARY} h-11 w-full px-5 sm:w-auto ${FOCUS}`}
                >
                    <Plus className="h-4 w-4" />
                    Record payment
                </Link>
            </div>

            {/* Where to go next */}
            <div className="mt-4 flex flex-wrap gap-2">
                <Link href="/finance" className={`${BTN} ${FOCUS}`}>
                    <LayoutDashboard className="h-4 w-4 text-orange-500" />
                    Finance dashboard
                </Link>
                <Link href="/finance/student-payments" className={`${BTN} ${FOCUS}`}>
                    <Users className="h-4 w-4 text-orange-500" />
                    Student fee records
                </Link>
            </div>

            {/* First load: patience + visible progress */}
            {firstLoad && (
                <div className="mt-6" aria-busy="true">
                    <div className={`${CARD} p-5`}>
                        <div className="flex items-center gap-3">
                            <Loader2 className="h-5 w-5 text-orange-500 motion-safe:animate-spin" />
                            <div className="min-w-0 flex-1">
                                <p className="text-sm font-semibold text-[#0B1E3D] dark:text-white">
                                    Loading transactions
                                </p>
                                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                                    {elapsed < 8
                                        ? "Fetching the payment ledger."
                                        : "Still loading. Large ledgers can take a little longer."}
                                </p>
                            </div>
                            <span className="text-xs tabular-nums text-zinc-400">{elapsed}s</span>
                        </div>
                        <div className="relative mt-4 h-1 overflow-hidden rounded-sm bg-zinc-100 dark:bg-white/10">
                            <div className="absolute inset-y-0 left-0 w-1/4 rounded-sm bg-orange-500 motion-safe:animate-[txSlide_1.4s_ease-in-out_infinite] motion-reduce:w-full motion-reduce:opacity-50" />
                        </div>
                    </div>
                    <div className="mt-4 space-y-2">
                        {[0, 1, 2, 3].map((i) => (
                            <div key={i} className={`${CARD} h-16 motion-safe:animate-pulse`} />
                        ))}
                    </div>
                </div>
            )}

            {/* Error: specific, recoverable, keeps the old list if there is one */}
            {error && (
                <div
                    role="alert"
                    className="mt-6 flex flex-col gap-3 rounded-sm border border-red-200 border-l-4 border-l-red-500 bg-red-50 p-3.5 text-red-700 sm:flex-row sm:items-center dark:border-red-500/25 dark:border-l-red-500 dark:bg-red-500/10 dark:text-red-300"
                >
                    <AlertCircle className="h-5 w-5 shrink-0" />
                    <div className="min-w-0 flex-1 text-sm">
                        <p className="font-semibold">Couldn’t load transactions</p>
                        <p className="mt-0.5 break-words opacity-90">
                            {error}
                            {transactions.length > 0 && " Showing the last data that loaded."}
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={load}
                        disabled={loading}
                        className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-sm bg-red-600 px-3.5 text-xs font-semibold text-white shadow-sm hover:bg-red-500 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-2"
                    >
                        <RefreshCw className="h-3.5 w-3.5" />
                        Try again
                    </button>
                </div>
            )}

            {showList && (
                <>
                    {/* Totals — minimalist on mobile */}
                    <div className="mt-6 grid grid-cols-3 gap-2 sm:gap-3">
                        <Stat
                            icon={<TrendingUp className="h-4 w-4" />}
                            label="Collected"
                            value={formatMoney(totals.confirmed.amount, totals.currency)}
                            note={`${totals.confirmed.count} confirmed`}
                            tone="emerald"
                        />
                        <Stat
                            icon={<Clock className="h-4 w-4" />}
                            label="Pending"
                            value={formatMoney(totals.pending.amount, totals.currency)}
                            note={`${totals.pending.count} awaiting confirmation`}
                            tone="amber"
                        />
                        <Stat
                            icon={<Undo2 className="h-4 w-4" />}
                            label="Reversed"
                            value={formatMoney(totals.reversed.amount, totals.currency)}
                            note={`${totals.reversed.count} reversed`}
                            tone="rose"
                        />
                    </div>

                    {/* Search and filters */}
                    <div className={`${CARD} mt-5 p-3`}>
                        {/* Search + refresh — always visible */}
                        <div className="flex flex-col gap-2 sm:flex-row">
                            <div className="relative min-w-0 flex-1">
                                <Search
                                    className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400"
                                    aria-hidden
                                />
                                <input
                                    ref={searchRef}
                                    type="search"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder="Search student, admission no., course, code or notes"
                                    aria-label="Search transactions"
                                    className={`${FIELD} truncate pl-9 pr-9`}
                                />
                                {search ? (
                                    <button
                                        type="button"
                                        onClick={() => setSearch("")}
                                        aria-label="Clear search"
                                        className={`absolute right-1.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-sm text-zinc-400 hover:bg-zinc-100 hover:text-[#0B1E3D] dark:hover:bg-white/10 dark:hover:text-white ${FOCUS}`}
                                    >
                                        <X className="h-3.5 w-3.5" />
                                    </button>
                                ) : (
                                    <kbd className="pointer-events-none absolute right-2.5 top-1/2 hidden -translate-y-1/2 rounded-sm border border-zinc-200 px-1.5 text-xs text-zinc-400 sm:block dark:border-white/15">
                                        /
                                    </kbd>
                                )}
                            </div>

                            <button
                                type="button"
                                onClick={load}
                                disabled={loading}
                                className={`${BTN} ${FOCUS}`}
                            >
                                <RefreshCw
                                    className={`h-4 w-4 ${loading ? "motion-safe:animate-spin" : ""}`}
                                />
                                {loading ? "Refreshing" : "Refresh"}
                            </button>
                        </div>

                        {/* Mobile-only filter toggle */}
                        <button
                            type="button"
                            onClick={() => setFiltersOpen((v) => !v)}
                            aria-expanded={filtersOpen}
                            aria-controls="tx-filters"
                            className={`mt-3 flex h-10 w-full items-center justify-between gap-2 rounded-sm border bg-white px-3 text-sm font-medium transition-colors sm:hidden dark:bg-[#0B1E3D] ${FOCUS} ${
                                activeFilterCount > 0
                                    ? "border-orange-400/60 text-[#0B1E3D] hover:bg-orange-50/60 dark:text-white dark:hover:bg-orange-400/10"
                                    : "border-zinc-200 text-[#0B1E3D] hover:bg-zinc-50 dark:border-white/10 dark:text-white dark:hover:bg-white/5"
                            }`}
                        >
                            <span className="flex items-center gap-2">
                                <SlidersHorizontal
                                    size={15}
                                    className={
                                        activeFilterCount > 0
                                            ? "text-orange-500"
                                            : "text-zinc-500 dark:text-zinc-400"
                                    }
                                    aria-hidden
                                />
                                Filters
                                {activeFilterCount > 0 && (
                                    <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-orange-400 px-1.5 text-[10px] font-bold tabular-nums text-[#0B1E3D]">
                                        {activeFilterCount}
                                    </span>
                                )}
                            </span>
                            <ChevronDown
                                size={15}
                                aria-hidden
                                className={`shrink-0 text-zinc-400 transition-transform duration-200 ${
                                    filtersOpen ? "rotate-180" : ""
                                }`}
                            />
                        </button>

                        {/* Collapsible filters (mobile) / always visible (sm+) */}
                        <div
                            id="tx-filters"
                            className={`grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none ${
                                filtersOpen
                                    ? "grid-rows-[1fr]"
                                    : "grid-rows-[0fr] sm:grid-rows-[1fr]"
                            }`}
                        >
                            <div className="overflow-hidden">
                                <div className="mt-3 grid gap-3 sm:mt-4 lg:grid-cols-[auto_1fr_1fr] lg:items-end">
                                    <div
                                        role="group"
                                        aria-label="Status"
                                        className="grid grid-cols-4 rounded-sm border border-zinc-200 bg-zinc-100 p-0.5 lg:flex dark:border-white/10 dark:bg-white/5"
                                    >
                                        {STATUS_TABS.map((t) => {
                                            const active = statusFilter === t.key;
                                            return (
                                                <button
                                                    key={t.key}
                                                    type="button"
                                                    aria-pressed={active}
                                                    onClick={() => setStatusFilter(t.key)}
                                                    className={`relative flex flex-col items-center justify-center rounded-sm px-2 py-1.5 text-sm transition-colors lg:flex-row lg:px-3 ${FOCUS} ${
                                                        active
                                                            ? "bg-white font-semibold text-[#0B1E3D] shadow-sm after:absolute after:inset-x-3 after:bottom-0 after:h-0.5 after:rounded-sm after:bg-orange-400 dark:bg-white/15 dark:text-white"
                                                            : "text-zinc-600 hover:bg-white/60 dark:text-zinc-300 dark:hover:bg-white/10"
                                                    }`}
                                                >
                                                    <span>{t.label}</span>
                                                    <span className="text-xs font-normal tabular-nums text-zinc-400 lg:ml-1.5">
                                                        {statusCounts[t.key]}
                                                    </span>
                                                </button>
                                            );
                                        })}
                                    </div>

                                    <select
                                        aria-label="Payment method"
                                        value={methodFilter}
                                        onChange={(e) =>
                                            setMethodFilter(
                                                e.target.value as PaymentMethod | "ALL",
                                            )
                                        }
                                        className={FIELD}
                                    >
                                        <option value="ALL">All methods</option>
                                        {ALL_METHODS.map((m) => (
                                            <option key={m} value={m}>
                                                {METHOD_LABEL[m]}
                                            </option>
                                        ))}
                                    </select>

                                    <select
                                        aria-label="Sort transactions"
                                        value={sort}
                                        onChange={(e) => setSort(e.target.value as SortKey)}
                                        className={FIELD}
                                    >
                                        {SORTS.map((s) => (
                                            <option key={s.key} value={s.key}>
                                                {s.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Result line */}
                    <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-zinc-600 dark:text-zinc-300">
                        <p aria-live="polite">
                            Showing{" "}
                            <span className="font-semibold tabular-nums">
                                {filtered.length}
                            </span>{" "}
                            of <span className="tabular-nums">{transactions.length}</span>{" "}
                            transactions
                            {updatedAt && (
                                <span className="ml-2 text-xs text-zinc-400">
                                    Updated{" "}
                                    {updatedAt.toLocaleTimeString("en-KE", {
                                        hour: "2-digit",
                                        minute: "2-digit",
                                    })}
                                </span>
                            )}
                        </p>
                        {hasFilters && (
                            <button
                                type="button"
                                onClick={clearFilters}
                                className={`rounded-sm px-2 py-1 text-xs font-semibold text-orange-600 hover:bg-orange-400/10 dark:text-orange-400 ${FOCUS}`}
                            >
                                Clear filters
                            </button>
                        )}
                    </div>

                    {/* List */}
                    <div
                        className={`${CARD} mt-3 overflow-hidden transition-opacity ${
                            loading ? "opacity-70" : ""
                        }`}
                    >
                        {filtered.length === 0 ? (
                            <EmptyState
                                hasAny={transactions.length > 0}
                                hasFilters={hasFilters}
                                onClear={clearFilters}
                            />
                        ) : (
                            <>
                                <div
                                    className={`hidden gap-4 border-b border-zinc-200 bg-zinc-50 px-4 py-2.5 text-xs font-medium text-zinc-500 md:grid dark:border-white/10 dark:bg-white/5 dark:text-zinc-400 ${COLS}`}
                                >
                                    <span>Date</span>
                                    <span>Student</span>
                                    <span>Course</span>
                                    <span>Method</span>
                                    <span className="text-right">Amount</span>
                                    <span>Status</span>
                                </div>

                                <ul>
                                    {shown.map((r) => (
                                        <li
                                            key={r.tx._id}
                                            className="border-b border-zinc-100 last:border-b-0 dark:border-white/10"
                                        >
                                            <Link
                                                href={`/finance/transactions/${r.tx._id}`}
                                                className={`block px-4 py-3.5 transition-colors hover:bg-zinc-50 focus-visible:bg-orange-50/60 focus-visible:ring-inset dark:hover:bg-white/5 dark:focus-visible:bg-orange-400/5 md:grid md:items-center md:gap-4 ${COLS} ${FOCUS}`}
                                            >
                                                {/* Phones: one compact card */}
                                                <div className="md:hidden">
                                                    <div className="flex items-start justify-between gap-3">
                                                        <div className="min-w-0">
                                                            <p className="truncate font-semibold text-[#0B1E3D] dark:text-white">
                                                                {r.student}
                                                            </p>
                                                            <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
                                                                {[r.course, r.code]
                                                                    .filter((p) => p && p !== "—")
                                                                    .join(" · ") || "—"}
                                                            </p>
                                                        </div>
                                                        <p
                                                            className={`shrink-0 font-semibold tabular-nums ${
                                                                r.tx.status === "REVERSED"
                                                                    ? "text-zinc-400 line-through"
                                                                    : "text-[#0B1E3D] dark:text-white"
                                                            }`}
                                                        >
                                                            {formatMoney(r.tx.amount, r.tx.currency)}
                                                        </p>
                                                    </div>
                                                    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-zinc-500 dark:text-zinc-400">
                                                        <span>{r.date}</span>
                                                        <span>{METHOD_LABEL[r.tx.paymentMethod]}</span>
                                                        <StatusPill status={r.tx.status} />
                                                    </div>
                                                </div>

                                                {/* Tablet and up: one cell per column */}
                                                <div className="hidden md:contents">
                                                    <div className="text-zinc-600 dark:text-zinc-300">
                                                        <span className="block whitespace-nowrap">
                                                            {r.date}
                                                        </span>
                                                        <span
                                                            className={`block text-xs ${
                                                                r.time === "date only"
                                                                    ? "italic text-zinc-400 dark:text-zinc-500"
                                                                    : "tabular-nums text-zinc-500 dark:text-zinc-400"
                                                            }`}
                                                        >
                                                            {r.time}
                                                        </span>
                                                    </div>
                                                    <div className="min-w-0">
                                                        <span className="block truncate font-medium text-[#0B1E3D] dark:text-white">
                                                            {r.student}
                                                        </span>
                                                        {r.email && (
                                                            <span className="block truncate text-xs text-zinc-500 dark:text-zinc-400">
                                                                {r.email}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <span className="block truncate text-[#0B1E3D] dark:text-zinc-100">
                                                            {r.course}
                                                        </span>
                                                        {r.code && (
                                                            <span className="block truncate text-xs text-zinc-500 dark:text-zinc-400">
                                                                {r.code}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <span className="text-zinc-600 dark:text-zinc-300">
                                                        {METHOD_LABEL[r.tx.paymentMethod]}
                                                    </span>
                                                    <span
                                                        className={`text-right font-medium tabular-nums ${
                                                            r.tx.status === "REVERSED"
                                                                ? "text-zinc-400 line-through"
                                                                : "text-[#0B1E3D] dark:text-white"
                                                        }`}
                                                    >
                                                        {formatMoney(r.tx.amount, r.tx.currency)}
                                                    </span>
                                                    <span>
                                                        <StatusPill status={r.tx.status} />
                                                    </span>
                                                </div>
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                            </>
                        )}
                    </div>

                    {filtered.length > shown.length && (
                        <div className="mt-4 flex justify-center">
                            <button
                                type="button"
                                onClick={() =>
                                    setLimitState({ sig, n: limit + PAGE })
                                }
                                className={`${BTN} ${FOCUS}`}
                            >
                                Show {Math.min(PAGE, filtered.length - shown.length)} more
                                <span className="text-xs font-normal text-zinc-400">
                                    ({filtered.length - shown.length} remaining)
                                </span>
                            </button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}

export default function TransactionsPage() {
    return (
        <RequireRole roles={["admin", "registrar"]}>
            <TransactionsList />
        </RequireRole>
    );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StatusPill({ status }: { status: TransactionStatus }) {
    const Icon = STATUS_ICON[status];
    return (
        <span
            className={`inline-flex items-center gap-1.5 rounded-sm px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${STATUS_STYLE[status]}`}
        >
            <Icon className="h-3 w-3" />
            {STATUS_LABEL[status]}
        </span>
    );
}

function Stat({
    icon,
    label,
    value,
    note,
    tone,
}: {
    icon: ReactNode;
    label: string;
    value: string;
    note: string;
    tone: "emerald" | "amber" | "rose";
}) {
    const tones = {
        emerald:
            "bg-emerald-50 text-emerald-600 ring-emerald-200 dark:bg-emerald-400/10 dark:text-emerald-300 dark:ring-emerald-400/25",
        amber:
            "bg-amber-50 text-amber-600 ring-amber-200 dark:bg-amber-400/10 dark:text-amber-300 dark:ring-amber-400/25",
        rose: "bg-rose-50 text-rose-600 ring-rose-200 dark:bg-rose-400/10 dark:text-rose-300 dark:ring-rose-400/25",
    };

    return (
        <div className={`${CARD} min-w-0 p-2.5 sm:flex sm:items-center sm:gap-3 sm:p-4`}>
            <span
                className={`hidden h-10 w-10 shrink-0 items-center justify-center rounded-sm ring-1 ring-inset sm:flex ${tones[tone]}`}
            >
                {icon}
            </span>
            <div className="min-w-0">
                <p className="truncate text-[10px] font-medium uppercase leading-tight tracking-[0.1em] text-zinc-500 dark:text-zinc-400 sm:text-xs sm:font-normal sm:normal-case sm:tracking-normal">
                    {label}
                </p>
                <p className="mt-0.5 truncate text-sm font-semibold tabular-nums text-[#0B1E3D] dark:text-white sm:mt-0 sm:text-lg">
                    {value}
                </p>
                <p className="hidden truncate text-xs text-zinc-500 dark:text-zinc-400 sm:block">
                    {note}
                </p>
            </div>
        </div>
    );
}

function EmptyState({
    hasAny,
    hasFilters,
    onClear,
}: {
    hasAny: boolean;
    hasFilters: boolean;
    onClear: () => void;
}) {
    if (hasAny && hasFilters) {
        return (
            <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
                <Search className="h-6 w-6 text-zinc-400 dark:text-zinc-500" />
                <div>
                    <p className="text-sm font-semibold text-[#0B1E3D] dark:text-white">
                        No transactions match these filters
                    </p>
                    <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                        Try a different search or remove a filter.
                    </p>
                </div>
                <button type="button" onClick={onClear} className={`${BTN} ${FOCUS}`}>
                    Clear filters
                </button>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-sm bg-orange-400/10 text-orange-500 ring-1 ring-inset ring-orange-400/30 dark:text-orange-400">
                <Wallet className="h-6 w-6" />
            </span>
            <div>
                <p className="text-sm font-semibold text-[#0B1E3D] dark:text-white">
                    No transactions yet
                </p>
                <p className="mt-1 max-w-sm text-xs text-zinc-500 dark:text-zinc-400">
                    Record the first fee payment to see it appear in this list.
                </p>
            </div>
            <Link href="/finance/transactions/new" className={`${PRIMARY} ${FOCUS}`}>
                <Plus className="h-4 w-4" />
                Record payment
            </Link>
        </div>
    );
}