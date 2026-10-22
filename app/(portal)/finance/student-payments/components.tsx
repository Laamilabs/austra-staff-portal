// app/(portal)/finance/student-payments/components.tsx

"use client";

import Link from "next/link";
import type { RefObject } from "react";
import {
    ChevronRight,
    LoaderCircle,
    RefreshCw,
    Search,
    TriangleAlert,
    X,
} from "lucide-react";

import type {
    Group,
    PayFilter,
    SortKey,
    StatusFilter,
} from "./types";
import {
    CARD,
    BTN,
    FIELD,
    FOCUS,
    PAY_TABS,
    RISK_STYLE,
    SORTS,
    initials,
    money,
    riskLabel,
} from "./helpers";


/* ------------------------------------------------------------------ */
/* First-load skeleton                                                 */
/* ------------------------------------------------------------------ */

export function FirstLoadSkeleton({ elapsed }: { elapsed: number }) {
    return (
        <div className="mt-6" aria-busy="true">
            <div className={`${CARD} p-5`}>
                <div className="flex items-center gap-3">
                    <LoaderCircle
                        size={20}
                        className="text-orange-500 motion-safe:animate-spin"
                    />
                    <div>
                        <p className="text-sm font-semibold text-[#0B1E3D] dark:text-white">
                            Loading fee records
                        </p>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">
                            {elapsed < 8
                                ? "Gathering students, courses and payments."
                                : "Still loading. Large fee ledgers can take a little longer."}{" "}
                            <span className="tabular-nums">{elapsed}s</span>
                        </p>
                    </div>
                </div>
                <div className="relative mt-4 h-1 overflow-hidden rounded-sm bg-zinc-100 dark:bg-white/10">
                    <div className="absolute inset-y-0 left-0 w-1/4 rounded-sm bg-orange-500 motion-safe:animate-[feeSlide_1.4s_ease-in-out_infinite] motion-reduce:w-full motion-reduce:opacity-50" />
                </div>
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {[0, 1, 2, 3].map((i) => (
                    <div
                        key={i}
                        className={`${CARD} h-24 motion-safe:animate-pulse`}
                    />
                ))}
            </div>
            <div className="mt-5 space-y-3">
                {[0, 1, 2].map((i) => (
                    <div
                        key={i}
                        className={`${CARD} h-16 motion-safe:animate-pulse`}
                    />
                ))}
            </div>
        </div>
    );
}

/* ------------------------------------------------------------------ */
/* Error banner                                                        */
/* ------------------------------------------------------------------ */

export function ErrorBanner({
    error,
    hasData,
    loading,
    onRetry,
}: {
    error: string;
    hasData: boolean;
    loading: boolean;
    onRetry: () => void;
}) {
    return (
        <div
            role="alert"
            className="mt-6 flex flex-col gap-3 rounded-sm border border-red-200 border-l-4 border-l-red-500 bg-red-50 p-4 sm:flex-row sm:items-center dark:border-red-500/30 dark:border-l-red-500 dark:bg-red-500/10"
        >
            <TriangleAlert
                size={18}
                className="shrink-0 text-red-600 dark:text-red-400"
            />
            <div className="min-w-0 flex-1 text-sm">
                <p className="font-semibold text-red-700 dark:text-red-300">
                    Couldn’t load fee records
                </p>
                <p className="mt-0.5 break-words text-red-700/90 dark:text-red-200/90">
                    {error}
                    {hasData && " Showing the last data that loaded."}
                </p>
            </div>
            <button
                type="button"
                onClick={onRetry}
                disabled={loading}
                className="rounded-sm bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-500 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-2"
            >
                Try again
            </button>
        </div>
    );
}

/* ------------------------------------------------------------------ */
/* KPI strip                                                           */
/* ------------------------------------------------------------------ */

export interface KpiTotals {
    total: number;
    paid: number;
    balance: number;
    high: number;
    rate: number;
}

export function KpiStrip({
    totals,
    activeCount,
    groupsCount,
    primary,
    minOut,
    onToggleMinOut,
}: {
    totals: KpiTotals;
    activeCount: number;
    groupsCount: number;
    primary: string;
    minOut: number;
    onToggleMinOut: () => void;
}) {
    return (
        <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <section className={`${CARD} p-4`}>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    Total assessed
                </p>
                <p className="mt-1.5 text-2xl font-semibold tabular-nums text-[#0B1E3D] dark:text-white">
                    {money(totals.total, primary)}
                </p>
                <p className="mt-1 text-xs text-zinc-500">
                    {activeCount} assignments · {groupsCount} students
                </p>
            </section>

            <section className={`${CARD} p-4`}>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    Collected
                </p>
                <p className="mt-1.5 text-2xl font-semibold tabular-nums text-[#0B1E3D] dark:text-white">
                    {money(totals.paid, primary)}
                </p>
                <div className="mt-4">
                    <div className="mb-2 flex items-center justify-between gap-3">
                        <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                            Collection rate
                        </span>
                        <span className="text-sm font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
                            {Math.round(totals.rate)}%
                        </span>
                    </div>
                    <div
                        role="progressbar"
                        aria-label="Collection rate"
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-valuenow={Math.min(100, Math.max(0, Math.round(totals.rate)))}
                        className="h-2.5 w-full overflow-hidden rounded-full bg-zinc-100 ring-1 ring-inset ring-zinc-200/60 dark:bg-white/[0.07] dark:ring-white/[0.06]"
                    >
                        <div
                            className="h-full rounded-full bg-gradient-to-r from-emerald-600 to-emerald-400 transition-[width] duration-700 ease-out motion-reduce:transition-none"
                            style={{ width: `${Math.min(100, Math.max(0, totals.rate))}%` }}
                        />
                    </div>
                </div>
            </section>

            <section
                className={`${CARD} border-t-2 border-t-orange-400 p-4`}
            >
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    Outstanding balance
                </p>
                <p className="mt-1.5 text-2xl font-semibold tabular-nums text-[#0B1E3D] dark:text-white">
                    {money(totals.balance, primary)}
                </p>
                <p className="mt-1 text-xs text-zinc-500">
                    {totals.total > 0
                        ? `${Math.round(100 - totals.rate)}% of assessed fees`
                        : "Nothing assessed"}
                </p>
            </section>

            <button
                type="button"
                aria-pressed={minOut === 75}
                onClick={onToggleMinOut}
                className={`${CARD} p-4 text-left transition-colors hover:bg-red-50/60 dark:hover:bg-red-500/10 ${FOCUS} ${minOut === 75 ? "ring-2 ring-red-500" : ""}`}
            >
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    Needs attention
                </p>
                <p
                    className={`mt-1.5 text-2xl font-semibold tabular-nums ${totals.high ? "text-red-600 dark:text-red-400" : "text-[#0B1E3D] dark:text-white"}`}
                >
                    {totals.high}
                </p>
                <p className="mt-1 text-xs text-zinc-500">
                    {minOut === 75
                        ? "Showing only these · click to reset"
                        : "75%+ still owed · click to filter"}
                </p>
            </button>
        </div>
    );
}

/* ------------------------------------------------------------------ */
/* Toolbar (search + filters + payment tabs + still-owed)              */
/* ------------------------------------------------------------------ */

export interface ToolbarProps {
    search: string;
    onSearchChange: (v: string) => void;
    searchRef: RefObject<HTMLInputElement | null>;
    onRefresh: () => void;
    loading: boolean;

    course: string;
    onCourseChange: (v: string) => void;
    courseOptions: [string, string][];

    structure: string;
    onStructureChange: (v: string) => void;
    structureOptions: [string, string][];

    status: StatusFilter;
    onStatusChange: (v: StatusFilter) => void;

    sort: SortKey;
    onSortChange: (v: SortKey) => void;

    pay: PayFilter;
    onPayChange: (v: PayFilter) => void;
    payCounts: Record<PayFilter, number>;

    minOut: number;
    onMinOutChange: (v: number) => void;

    minBalance: string;
    onMinBalanceChange: (v: string) => void;
    primary: string;
}

export function Toolbar(props: ToolbarProps) {
    const {
        search,
        onSearchChange,
        searchRef,
        onRefresh,
        loading,
        course,
        onCourseChange,
        courseOptions,
        structure,
        onStructureChange,
        structureOptions,
        status,
        onStatusChange,
        sort,
        onSortChange,
        pay,
        onPayChange,
        payCounts,
        minOut,
        onMinOutChange,
        minBalance,
        onMinBalanceChange,
        primary,
    } = props;

    return (
        <div className={`${CARD} mt-6 space-y-4 p-3 sm:p-4`}>
            {/* Search + refresh */}
            <div className="flex flex-col gap-2 sm:flex-row">
                <div className="relative min-w-0 flex-1">
                    <Search
                        size={16}
                        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
                        aria-hidden
                    />
                    <input
                        ref={searchRef}
                        type="search"
                        value={search}
                        onChange={(e) => onSearchChange(e.target.value)}
                        placeholder="Search student, admission no., email, course or fee structure"
                        aria-label="Search student fees"
                        className={`${FIELD} w-full truncate pl-9 pr-9`}
                    />
                    {search ? (
                        <button
                            type="button"
                            onClick={() => onSearchChange("")}
                            aria-label="Clear search"
                            className={`absolute right-1.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-sm text-zinc-400 hover:bg-zinc-100 hover:text-[#0B1E3D] dark:hover:bg-white/10 dark:hover:text-white ${FOCUS}`}
                        >
                            <X size={14} />
                        </button>
                    ) : (
                        <kbd className="pointer-events-none absolute right-2.5 top-1/2 hidden -translate-y-1/2 rounded-sm border border-zinc-200 px-1.5 text-xs text-zinc-400 sm:block dark:border-white/15">
                            /
                        </kbd>
                    )}
                </div>
                <button
                    type="button"
                    onClick={onRefresh}
                    disabled={loading}
                    className={`${BTN} ${FOCUS}`}
                >
                    <RefreshCw
                        size={15}
                        className={
                            loading ? "motion-safe:animate-spin" : ""
                        }
                    />
                    {loading ? "Refreshing" : "Refresh"}
                </button>
            </div>

            {/* Four dropdowns */}
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <label className="grid min-w-0 gap-1 text-xs font-medium text-zinc-500 dark:text-zinc-400">
                    <span>Course</span>
                    <select
                        value={course}
                        onChange={(e) => onCourseChange(e.target.value)}
                        className={`${FIELD} w-full`}
                    >
                        <option value="all">All courses</option>
                        {courseOptions.map(([id, label]) => (
                            <option key={id} value={id}>
                                {label}
                            </option>
                        ))}
                    </select>
                </label>
                <label className="grid min-w-0 gap-1 text-xs font-medium text-zinc-500 dark:text-zinc-400">
                    <span>Fee structure</span>
                    <select
                        value={structure}
                        onChange={(e) => onStructureChange(e.target.value)}
                        className={`${FIELD} w-full`}
                    >
                        <option value="all">All fee structures</option>
                        {structureOptions.map(([id, label]) => (
                            <option key={id} value={id}>
                                {label}
                            </option>
                        ))}
                    </select>
                </label>
                <label className="grid min-w-0 gap-1 text-xs font-medium text-zinc-500 dark:text-zinc-400">
                    <span>Assignment status</span>
                    <select
                        value={status}
                        onChange={(e) =>
                            onStatusChange(e.target.value as StatusFilter)
                        }
                        className={`${FIELD} w-full`}
                    >
                        <option value="live">Active and completed</option>
                        <option value="ACTIVE">Active only</option>
                        <option value="COMPLETED">Completed only</option>
                        <option value="CANCELLED">Cancelled only</option>
                        <option value="all">Everything</option>
                    </select>
                </label>
                <label className="grid min-w-0 gap-1 text-xs font-medium text-zinc-500 dark:text-zinc-400">
                    <span>Sort students by</span>
                    <select
                        value={sort}
                        onChange={(e) =>
                            onSortChange(e.target.value as SortKey)
                        }
                        className={`${FIELD} w-full`}
                    >
                        {SORTS.map((o: { key: SortKey; label: string }) => (
                            <option key={o.key} value={o.key}>
                                {o.label}
                            </option>
                        ))}
                    </select>
                </label>
            </div>

            {/* Payment tabs + still-owed + balance floor */}
            <div className="grid gap-4 border-t border-zinc-100 pt-4 sm:grid-cols-2 lg:flex lg:flex-wrap lg:items-end lg:gap-x-8 dark:border-white/10">
                <div className="grid min-w-0 gap-1 text-xs font-medium text-zinc-500 sm:col-span-2 lg:col-span-1 dark:text-zinc-400">
                    <span id="pay-label">Payment</span>
                    <div
                        role="group"
                        aria-labelledby="pay-label"
                        className="grid grid-cols-4 rounded-sm border border-zinc-200 bg-zinc-100 p-0.5 lg:flex dark:border-white/10 dark:bg-white/5"
                    >
                        {PAY_TABS.map((t: { key: PayFilter; label: string }) => {
                            const active = pay === t.key;
                            return (
                                <button
                                    key={t.key}
                                    type="button"
                                    aria-pressed={active}
                                    onClick={() => onPayChange(t.key)}
                                    className={`relative flex flex-col items-center justify-center rounded-sm px-2 py-1.5 text-sm transition-colors lg:flex-row lg:px-3 ${FOCUS} ${active
                                            ? "bg-white font-semibold text-[#0B1E3D] shadow-sm after:absolute after:inset-x-3 after:bottom-0 after:h-0.5 after:rounded-sm after:bg-orange-400 dark:bg-white/15 dark:text-white"
                                            : "font-normal text-zinc-600 hover:bg-white/60 dark:text-zinc-300 dark:hover:bg-white/10"
                                        }`}
                                >
                                    <span>{t.label}</span>
                                    <span className="text-xs font-normal tabular-nums text-zinc-400 lg:ml-1.5">
                                        {payCounts[t.key]}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div className="grid min-w-0 gap-1 text-xs font-medium text-zinc-500 dark:text-zinc-400">
                    <span id="owed-label">Still owed</span>
                    <div
                        role="group"
                        aria-labelledby="owed-label"
                        className="grid grid-cols-4 gap-1 lg:flex"
                    >
                        {[0, 25, 50, 75].map((n) => (
                            <button
                                key={n}
                                type="button"
                                aria-pressed={minOut === n}
                                onClick={() => onMinOutChange(n)}
                                className={`rounded-sm border px-2.5 py-2 text-xs font-semibold transition-colors lg:py-1.5 ${FOCUS} ${minOut === n
                                        ? "border-orange-400 bg-orange-400/10 text-orange-700 dark:text-orange-300"
                                        : "border-zinc-200 text-zinc-600 hover:bg-zinc-50 dark:border-white/15 dark:text-zinc-300 dark:hover:bg-white/10"
                                    }`}
                            >
                                {n === 0 ? "Any" : `${n}%+`}
                            </button>
                        ))}
                    </div>
                </div>

                <label className="grid min-w-0 gap-1 text-xs font-medium text-zinc-500 dark:text-zinc-400">
                    <span>Balance of at least ({primary})</span>
                    <input
                        type="number"
                        min={0}
                        inputMode="numeric"
                        value={minBalance}
                        onChange={(e) =>
                            onMinBalanceChange(e.target.value)
                        }
                        placeholder="0"
                        className={`${FIELD} w-full tabular-nums lg:w-40`}
                    />
                </label>
            </div>
        </div>
    );
}

/* ------------------------------------------------------------------ */
/* Result summary + filter chips                                       */
/* ------------------------------------------------------------------ */

export interface FilterChip {
    key: string;
    label: string;
    clear: () => void;
}

export function ResultsHeader({
    filteredCount,
    rowsCount,
    groupsCount,
    updatedAt,
    chips,
    onClearAll,
    canToggleAll,
    allExpanded,
    onToggleAll,
}: {
    filteredCount: number;
    rowsCount: number;
    groupsCount: number;
    updatedAt: Date | null;
    chips: FilterChip[];
    onClearAll: () => void;
    canToggleAll: boolean;
    allExpanded: boolean;
    onToggleAll: () => void;
}) {
    return (
        <div className="mt-4 flex flex-wrap items-center gap-2">
            <p
                aria-live="polite"
                className="mr-1 text-sm text-zinc-600 dark:text-zinc-300"
            >
                Showing{" "}
                <span className="font-semibold tabular-nums">
                    {filteredCount}
                </span>{" "}
                of <span className="tabular-nums">{rowsCount}</span>{" "}
                assignments ·{" "}
                <span className="tabular-nums">{groupsCount}</span> student
                {groupsCount === 1 ? "" : "s"}
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
            {chips.map((c) => (
                <button
                    key={c.key}
                    type="button"
                    onClick={c.clear}
                    className={`inline-flex items-center gap-1 rounded-sm bg-[#0B1E3D]/5 px-2 py-1 text-xs font-medium text-[#0B1E3D] hover:bg-[#0B1E3D]/10 dark:bg-white/10 dark:text-white dark:hover:bg-white/15 ${FOCUS}`}
                >
                    {c.label}{" "}
                    <X size={12} aria-label="Remove filter" />
                </button>
            ))}
            {chips.length > 0 && (
                <button
                    type="button"
                    onClick={onClearAll}
                    className={`rounded-sm px-2 py-1 text-xs font-semibold text-orange-600 hover:bg-orange-400/10 dark:text-orange-400 ${FOCUS}`}
                >
                    Clear all
                </button>
            )}
            {canToggleAll && (
                <button
                    type="button"
                    onClick={onToggleAll}
                    className={`ml-auto rounded-sm px-2 py-1 text-xs font-semibold text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-white/10 ${FOCUS}`}
                >
                    {allExpanded ? "Collapse all" : "Expand all"}
                </button>
            )}
        </div>
    );
}

/* ------------------------------------------------------------------ */
/* Empty results                                                       */
/* ------------------------------------------------------------------ */

export function EmptyResults({
    hasRows,
    onClear,
}: {
    hasRows: boolean;
    onClear: () => void;
}) {
    return (
        <section className="mt-4 rounded-sm border border-dashed border-zinc-300 px-6 py-16 text-center dark:border-white/15">
            <h2 className="font-semibold text-[#0B1E3D] dark:text-white">
                {hasRows
                    ? "No records match these filters"
                    : "No fee assignments yet"}
            </h2>
            <p className="mt-1.5 text-sm text-zinc-500 dark:text-zinc-400">
                {hasRows
                    ? "Try removing a filter or searching for something else."
                    : "Assign a fee structure to an enrolled student to get started."}
            </p>
            {hasRows ? (
                <button
                    type="button"
                    onClick={onClear}
                    className={`${BTN} mt-5 ${FOCUS}`}
                >
                    Clear all filters
                </button>
            ) : (
                <Link
                    href="/finance/student-payments/new"
                    className={`mt-5 inline-flex rounded-sm bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-400 ${FOCUS}`}
                >
                    Assign a fee structure
                </Link>
            )}
        </section>
    );
}

/* ------------------------------------------------------------------ */
/* Group card (expandable student)                                     */
/* ------------------------------------------------------------------ */

export function GroupCard({
    group,
    open,
    onToggle,
    primary,
}: {
    group: Group;
    open: boolean;
    onToggle: () => void;
    primary: string;
}) {
    const worst = RISK_STYLE[group.worst];
    // Countable rows are those with `currency === primary`; by construction
    // any countable row is in primary, so the display currency is `primary`.
    const cur = primary;

    return (
        <section className={`${CARD} overflow-hidden`}>
            <button
                type="button"
                aria-expanded={open}
                onClick={onToggle}
                className={`flex w-full flex-wrap items-center gap-x-4 gap-y-3 px-4 py-3 text-left transition-colors hover:bg-zinc-50 focus-visible:ring-inset dark:hover:bg-white/5 ${FOCUS}`}
            >
                <ChevronRight
                    size={16}
                    className={`shrink-0 text-zinc-400 transition-transform ${open ? "rotate-90" : ""}`}
                    aria-hidden
                />
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-sm bg-[#0B1E3D] text-sm font-semibold text-white dark:bg-orange-400/15 dark:text-orange-300">
                    {initials(group.name)}
                </span>
                <span className="min-w-0 flex-1 basis-40">
                    <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span className="break-words font-semibold text-[#0B1E3D] dark:text-white">
                            {group.name}
                        </span>
                        {group.worst === "high" && (
                            <span
                                className={`shrink-0 rounded-sm px-1.5 py-0.5 text-xs font-medium ring-1 ring-inset ${worst.pill}`}
                            >
                                High balance
                            </span>
                        )}
                    </span>
                    <span className="block truncate text-xs text-zinc-500">
                        {group.email || "No email on record"} ·{" "}
                        {group.rows.length} assignment
                        {group.rows.length === 1 ? "" : "s"}
                    </span>
                </span>

                <span className="flex w-full items-center gap-4 sm:w-auto sm:gap-5">
                    <span className="min-w-0 flex-1 sm:w-36 sm:flex-none">
                        <span className="flex justify-between text-xs text-zinc-500">
                            <span>Paid</span>
                            <span className="font-semibold tabular-nums">
                                {Math.round(group.paidPct)}%
                            </span>
                        </span>
                        <span className="mt-2 block h-2 w-full overflow-hidden rounded-full bg-zinc-100 ring-1 ring-inset ring-zinc-200/50 dark:bg-white/[0.07] dark:ring-white/[0.05]">
                            <span
                                className={`block h-full rounded-full transition-[width] duration-700 ease-out motion-reduce:transition-none ${group.total > 0 && group.balance <= 0 ? RISK_STYLE.paid.bar : worst.bar}`}
                                style={{ width: `${Math.min(100, Math.max(0, group.paidPct))}%` }}
                            />
                        </span>
                    </span>
                    <span className="shrink-0 text-right">
                        <span
                            className={`block text-base font-semibold tabular-nums ${group.balance > 0 ? worst.text : RISK_STYLE.paid.text}`}
                        >
                            {group.balance > 0
                                ? money(group.balance, cur)
                                : "Settled"}
                        </span>
                        <span className="block text-xs tabular-nums text-zinc-500">
                            of {money(group.total, cur)}
                        </span>
                    </span>
                </span>
            </button>

            {open && (
                <div className="flex flex-col gap-1.5 border-t border-zinc-200 bg-zinc-50/70 p-3 sm:p-4 dark:border-white/10 dark:bg-black/20">
                    {group.rows.map((r) => {
                        const s = RISK_STYLE[r.risk];
                        const cancelled = r.risk === "cancelled";
                        return (
                            <Link
                                key={r.fee._id}
                                href={`/finance/student-payments/${r.fee._id}`}
                                aria-label={`Open ${r.structure} assignment for ${group.name}`}
                                className={`group flex min-w-0 items-center gap-3 rounded-sm border border-l-4 border-zinc-200 bg-white p-3 text-left shadow-sm shadow-blue-950/5 transition-colors hover:bg-zinc-50 dark:border-white/10 dark:bg-[#0B1E3D] dark:hover:bg-white/5 ${s.accent} ${cancelled ? "opacity-70" : ""} ${FOCUS}`}
                            >
                                <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                                        <h3 className="break-words text-sm font-semibold leading-5 text-[#0B1E3D] dark:text-white">
                                            {r.structure}
                                        </h3>
                                        <span
                                            className={`shrink-0 rounded-sm px-1.5 py-0.5 text-xs font-medium ring-1 ring-inset ${s.pill}`}
                                        >
                                            {riskLabel(r)}
                                        </span>
                                    </div>
                                    <p className="mt-0.5 truncate text-xs text-zinc-500">
                                        {[r.course, r.code]
                                            .filter(Boolean)
                                            .join(" · ")}
                                    </p>
                                    <div className="mt-3 flex items-center gap-3">
                                        <div
                                            role="progressbar"
                                            aria-label={`${r.structure} paid`}
                                            aria-valuemin={0}
                                            aria-valuemax={100}
                                            aria-valuenow={Math.min(100, Math.max(0, Math.round(r.paidPct)))}
                                            className="h-2 flex-1 overflow-hidden rounded-full bg-zinc-100 ring-1 ring-inset ring-zinc-200/50 dark:bg-white/[0.07] dark:ring-white/[0.05]"
                                        >
                                            <div
                                                className={`h-full rounded-full transition-[width] duration-700 ease-out motion-reduce:transition-none ${s.bar}`}
                                                style={{
                                                    width: `${Math.min(100, Math.max(0, r.paidPct))}%`,
                                                }}
                                            />
                                        </div>
                                        <span className="w-10 shrink-0 text-right text-xs font-semibold tabular-nums text-zinc-600 dark:text-zinc-300">
                                            {Math.round(r.paidPct)}%
                                        </span>
                                    </div>
                                </div>
                                <div className="shrink-0 text-right">
                                    <p
                                        className={`text-sm font-semibold tabular-nums ${cancelled ? "text-zinc-400 line-through" : s.text}`}
                                    >
                                        {money(r.balance, r.currency)}
                                    </p>
                                    <p className="text-xs tabular-nums text-zinc-500">
                                        of {money(r.total, r.currency)}
                                    </p>
                                </div>
                                <ChevronRight
                                    size={16}
                                    aria-hidden
                                    className="shrink-0 text-zinc-400 transition-transform group-hover:translate-x-0.5"
                                />
                            </Link>
                        );
                    })}
                </div>
            )}
        </section>
    );
}