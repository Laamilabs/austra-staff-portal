"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
    ArrowLeft,
    ArrowRight,
    CircleDollarSign,
    LoaderCircle,
    Pencil,
    Receipt,
    RefreshCw,
    TriangleAlert,
} from "lucide-react";

import {
    studentFeeApi,
    getAdmissionNumber,
    getCourseCode,
    getCourseName,
    getDiscountLabel,
    getFeeStructureName,
    getNetAmount,
    getStudentEmail,
    getStudentName,
    hasDiscount,
    type StudentFee,
} from "@/app/types/student-fee";

import {
    feeTransactionApi,
    type FeeTransaction,
} from "@/app/types/fee-transaction";

import DiscountEditor from "./DiscountEditor";
import {
    BTN,
    BTN_PRIMARY,
    CARD,
    FOCUS,
    RISK_PILL,
    TX_METHOD_LABEL,
    TX_STATUS_ICON,
    TX_STATUS_LABEL,
    TX_STATUS_PILL,
} from "./ui";
import { formatTxDate, initials, money } from "./utils";

export default function StudentFeeDetailPage() {
    const params = useParams<{ id: string }>();
    const id = params?.id ?? "";

    const [fee, setFee] = useState<StudentFee | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    // Transactions against this assignment
    const [transactions, setTransactions] = useState<FeeTransaction[] | null>(
        null,
    );
    const [txError, setTxError] = useState("");

    // Discount editing UI state
    const [editing, setEditing] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState("");

    /* -------------------- Loading -------------------- */

    const load = useCallback(async () => {
        if (!id) return;
        setLoading(true);
        setError("");
        setTxError("");

        // Fetch fee + payments in parallel. A failure in the transactions
        // call must not block the fee view — that's the primary content.
        const [feeResult, txResult] = await Promise.allSettled([
            studentFeeApi.getById(id),
            feeTransactionApi.getByStudentFeeId(id),
        ]);

        if (feeResult.status === "fulfilled") {
            setFee(feeResult.value);
        } else {
            const err = feeResult.reason;
            setError(
                err instanceof Error
                    ? err.message
                    : "Could not load this fee assignment.",
            );
        }

        if (txResult.status === "fulfilled") {
            setTransactions(
                Array.isArray(txResult.value) ? txResult.value : [],
            );
        } else {
            setTransactions([]);
            setTxError(
                txResult.reason instanceof Error
                    ? txResult.reason.message
                    : "Could not load payment history for this assignment.",
            );
        }

        setLoading(false);
    }, [id]);

    useEffect(() => {
        void load();
    }, [load]);

    /* -------------------- Derived -------------------- */

    const structure =
        fee && typeof fee.feeStructureId === "object"
            ? fee.feeStructureId
            : null;

    const feeItems = structure?.feeItems ?? [];

    const net = fee ? getNetAmount(fee) : 0;
    const balance = fee ? Math.max(0, net - fee.amountPaid) : 0;
    const paidPct =
        fee && net > 0
            ? Math.min(100, Math.max(0, (fee.amountPaid / net) * 100))
            : fee
              ? 100
              : 0;

    const editable = fee ? fee.status !== "CANCELLED" : false;
    const canEditAmount = editable && (fee ? fee.amountPaid === 0 : false);

    // Totals of *confirmed* transactions to sanity-check the amountPaid
    // shown on the fee. Should match; if not, it means a payment was
    // reversed or the ledger was edited out-of-band.
    const txSummary = useMemo(() => {
        const list = transactions ?? [];
        let confirmed = 0;
        let reversed = 0;
        let pending = 0;
        for (const tx of list) {
            if (tx.status === "CONFIRMED") confirmed += tx.amount;
            else if (tx.status === "REVERSED") reversed += tx.amount;
            else pending += tx.amount;
        }
        return { confirmed, reversed, pending, count: list.length };
    }, [transactions]);

    /* -------------------- Handlers -------------------- */

    const startEdit = () => {
        if (!fee) return;
        setSaveSuccess("");
        setEditing(true);
    };

    const cancelEdit = () => {
        setEditing(false);
    };

    const handleSaved = (updated: StudentFee) => {
        setFee(updated);
        setEditing(false);
        setSaveSuccess("Discount updated.");
        setTimeout(() => setSaveSuccess(""), 3500);
    };

    /* -------------------- Render -------------------- */

    return (
        <main className="mx-auto w-full min-w-0 max-w-full py-6 sm:px-6 sm:py-8 lg:px-8">
            <nav className="mb-3 flex flex-wrap items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                <Link href="/finance" className="hover:text-orange-500">
                    Finance
                </Link>
                <span aria-hidden>/</span>
                <Link
                    href="/finance/student-payments"
                    className="hover:text-orange-500"
                >
                    Student payments
                </Link>
                <span aria-hidden>/</span>
                <span>Assignment</span>
            </nav>

            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                <div className="min-w-0">
                    <Link
                        href="/finance/student-payments"
                        className={`mb-2 inline-flex items-center gap-1.5 text-xs font-medium text-zinc-500 hover:text-[#0B1E3D] dark:hover:text-white ${FOCUS}`}
                    >
                        <ArrowLeft size={14} aria-hidden />
                        Back to student fees
                    </Link>
                    <h1 className="text-2xl font-semibold text-[#0B1E3D] dark:text-white sm:text-3xl">
                        Fee assignment
                    </h1>
                    {fee && (
                        <p className="mt-1 break-words text-sm text-zinc-500 dark:text-zinc-400">
                            {getStudentName(fee) || "Unknown student"} ·{" "}
                            {getCourseName(fee) || "Course"}
                        </p>
                    )}
                </div>

                <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                    <button
                        type="button"
                        onClick={() => void load()}
                        disabled={loading}
                        className={`${BTN} ${FOCUS}`}
                    >
                        <RefreshCw
                            size={15}
                            className={loading ? "motion-safe:animate-spin" : ""}
                        />
                        {loading ? "Refreshing" : "Refresh"}
                    </button>

                    <Link
                        href="/finance/transactions"
                        className={`${BTN_PRIMARY} ${FOCUS}`}
                    >
                        <Receipt size={15} aria-hidden />
                        View all transactions
                        <ArrowRight size={14} aria-hidden />
                    </Link>
                </div>
            </div>

            {saveSuccess && (
                <div
                    role="status"
                    className="mt-6 rounded-sm border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300"
                >
                    {saveSuccess}
                </div>
            )}

            {error && !fee && (
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
                            Couldn’t load this assignment
                        </p>
                        <p className="mt-0.5 break-words text-red-700/90 dark:text-red-200/90">
                            {error}
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={() => void load()}
                            className="rounded-sm bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-500"
                        >
                            Try again
                        </button>
                        <Link
                            href="/finance/student-payments"
                            className={`${BTN} border-red-200 dark:border-red-500/40`}
                        >
                            Back
                        </Link>
                    </div>
                </div>
            )}

            {loading && !fee && (
                <div className="mt-6 space-y-4" aria-busy="true">
                    <div className={`${CARD} p-5`}>
                        <div className="flex items-center gap-3">
                            <LoaderCircle
                                size={20}
                                className="text-orange-500 motion-safe:animate-spin"
                            />
                            <p className="text-sm font-semibold text-[#0B1E3D] dark:text-white">
                                Loading assignment…
                            </p>
                        </div>
                    </div>
                    <div className="grid gap-4 lg:grid-cols-3">
                        <div
                            className={`${CARD} h-64 lg:col-span-2 motion-safe:animate-pulse`}
                        />
                        <div
                            className={`${CARD} h-64 motion-safe:animate-pulse`}
                        />
                    </div>
                </div>
            )}

            {fee && (
                <div className="mt-6 grid gap-4 lg:grid-cols-3">
                    {/* Main column */}

                    <div className="space-y-4 lg:col-span-2">
                        {/* Amount summary + discount editor */}

                        <section className={CARD}>
                            <header className="flex flex-wrap items-start justify-between gap-3 border-b border-zinc-100 p-4 dark:border-white/10">
                                <div className="min-w-0">
                                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500 dark:text-zinc-400">
                                        Amount summary
                                    </p>
                                    <h2 className="mt-1 break-words text-lg font-semibold text-[#0B1E3D] dark:text-white">
                                        {getFeeStructureName(fee) ||
                                            "Fee structure"}
                                    </h2>
                                    <p className="mt-0.5 truncate text-xs text-zinc-500">
                                        {[getCourseName(fee), getCourseCode(fee)]
                                            .filter(Boolean)
                                            .join(" · ")}
                                    </p>
                                </div>

                                <span
                                    className={`shrink-0 rounded-sm px-2 py-1 text-xs font-medium ring-1 ring-inset ${RISK_PILL[fee.status]}`}
                                >
                                    {fee.status.charAt(0) +
                                        fee.status.slice(1).toLowerCase()}
                                </span>
                            </header>

                            <dl className="space-y-2 p-4 text-sm">
                                <div className="flex items-baseline justify-between gap-3">
                                    <dt className="text-zinc-500">
                                        Fee structure total
                                    </dt>
                                    <dd className="tabular-nums font-medium text-[#0B1E3D] dark:text-zinc-100">
                                        {money(fee.totalAmount, fee.currency)}
                                    </dd>
                                </div>

                                {!editing && (
                                    <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                                        <dt className="min-w-0 text-zinc-500">
                                            {hasDiscount(fee) ? (
                                                <>
                                                    Discount{" "}
                                                    <span className="text-zinc-400">
                                                        ({getDiscountLabel(fee)})
                                                    </span>
                                                </>
                                            ) : (
                                                "Discount"
                                            )}
                                        </dt>
                                        <dd className="flex items-center gap-3">
                                            <span
                                                className={`tabular-nums font-medium ${
                                                    hasDiscount(fee)
                                                        ? "text-emerald-600 dark:text-emerald-400"
                                                        : "text-zinc-400"
                                                }`}
                                            >
                                                {hasDiscount(fee)
                                                    ? `−${money(
                                                          fee.discountAmount,
                                                          fee.currency,
                                                      )}`
                                                    : "—"}
                                            </span>
                                            {editable && (
                                                <button
                                                    type="button"
                                                    onClick={startEdit}
                                                    className={`inline-flex items-center gap-1 rounded-sm border border-zinc-300 bg-white px-2 py-1 text-xs font-semibold text-[#0B1E3D] hover:bg-zinc-50 dark:border-white/15 dark:bg-white/5 dark:text-white dark:hover:bg-white/10 ${FOCUS}`}
                                                >
                                                    <Pencil
                                                        size={12}
                                                        aria-hidden
                                                    />
                                                    {hasDiscount(fee)
                                                        ? "Edit"
                                                        : "Add"}
                                                </button>
                                            )}
                                        </dd>
                                    </div>
                                )}

                                {editing && (
                                    <DiscountEditor
                                        fee={fee}
                                        canEditAmount={canEditAmount}
                                        onCancel={cancelEdit}
                                        onSaved={handleSaved}
                                    />
                                )}

                                <div className="flex items-baseline justify-between gap-3 border-t border-zinc-100 pt-2 dark:border-white/10">
                                    <dt className="font-semibold text-[#0B1E3D] dark:text-white">
                                        Net payable
                                    </dt>
                                    <dd className="tabular-nums font-semibold text-[#0B1E3D] dark:text-white">
                                        {money(net, fee.currency)}
                                    </dd>
                                </div>

                                <div className="flex items-baseline justify-between gap-3">
                                    <dt className="text-zinc-500">Paid</dt>
                                    <dd className="tabular-nums font-medium text-[#0B1E3D] dark:text-zinc-100">
                                        {money(fee.amountPaid, fee.currency)}
                                    </dd>
                                </div>

                                <div className="flex items-baseline justify-between gap-3 border-t border-zinc-100 pt-2 dark:border-white/10">
                                    <dt className="font-semibold text-[#0B1E3D] dark:text-white">
                                        Balance
                                    </dt>
                                    <dd
                                        className={`tabular-nums font-semibold ${
                                            balance > 0
                                                ? "text-orange-600 dark:text-orange-400"
                                                : "text-emerald-600 dark:text-emerald-400"
                                        }`}
                                    >
                                        {balance > 0
                                            ? money(balance, fee.currency)
                                            : "Settled"}
                                    </dd>
                                </div>

                                <div className="pt-2">
                                    <div className="flex items-center gap-3">
                                        <div
                                            role="progressbar"
                                            aria-label="Amount paid"
                                            aria-valuemin={0}
                                            aria-valuemax={100}
                                            aria-valuenow={Math.round(paidPct)}
                                            className="h-1.5 flex-1 overflow-hidden rounded-sm bg-zinc-100 dark:bg-white/10"
                                        >
                                            <div
                                                className="h-full rounded-sm bg-emerald-500 transition-[width] duration-500"
                                                style={{
                                                    width: `${paidPct}%`,
                                                }}
                                            />
                                        </div>
                                        <span className="shrink-0 text-xs font-semibold tabular-nums text-zinc-600 dark:text-zinc-300">
                                            {Math.round(paidPct)}% paid
                                        </span>
                                    </div>
                                </div>
                            </dl>
                        </section>

                        {/* Payments on this assignment */}

                        <section className={CARD}>
                            <header className="flex flex-wrap items-start justify-between gap-3 border-b border-zinc-100 p-4 dark:border-white/10">
                                <div className="flex items-start gap-3">
                                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-sm bg-orange-400/15 text-orange-500 dark:bg-orange-400/10 dark:text-orange-300">
                                        <CircleDollarSign
                                            size={18}
                                            aria-hidden
                                        />
                                    </span>
                                    <div className="min-w-0">
                                        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500 dark:text-zinc-400">
                                            Payments
                                        </p>
                                        <h2 className="mt-0.5 break-words text-base font-semibold text-[#0B1E3D] dark:text-white">
                                            Payments on this assignment
                                        </h2>
                                        <p className="mt-0.5 text-xs text-zinc-500">
                                            {transactions === null
                                                ? "Loading…"
                                                : txSummary.count === 0
                                                  ? "No payments recorded yet"
                                                  : `${txSummary.count} transaction${
                                                        txSummary.count === 1
                                                            ? ""
                                                            : "s"
                                                    } · ${money(
                                                        txSummary.confirmed,
                                                        fee.currency,
                                                    )} confirmed`}
                                        </p>
                                    </div>
                                </div>

                                <Link
                                    href="/finance/transactions"
                                    className={`inline-flex items-center gap-1 rounded-sm px-2 py-1 text-xs font-semibold text-orange-600 hover:bg-orange-400/10 dark:text-orange-400 ${FOCUS}`}
                                >
                                    All transactions
                                    <ArrowRight size={12} aria-hidden />
                                </Link>
                            </header>

                            {txError && (
                                <div
                                    role="alert"
                                    className="flex items-start gap-2 border-b border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-800 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-300"
                                >
                                    <TriangleAlert
                                        size={14}
                                        className="mt-0.5 shrink-0"
                                    />
                                    <span className="min-w-0 break-words">
                                        {txError}
                                    </span>
                                </div>
                            )}

                            {transactions === null ? (
                                <ul
                                    className="divide-y divide-zinc-100 dark:divide-white/10"
                                    aria-busy="true"
                                >
                                    {[0, 1].map((i) => (
                                        <li
                                            key={i}
                                            className="flex items-center gap-3 p-4"
                                        >
                                            <div className="h-8 w-8 shrink-0 animate-pulse rounded-sm bg-zinc-100 dark:bg-white/10" />
                                            <div className="min-w-0 flex-1 space-y-2">
                                                <div className="h-3 w-1/3 animate-pulse rounded-sm bg-zinc-100 dark:bg-white/10" />
                                                <div className="h-3 w-1/4 animate-pulse rounded-sm bg-zinc-100 dark:bg-white/10" />
                                            </div>
                                            <div className="h-4 w-16 animate-pulse rounded-sm bg-zinc-100 dark:bg-white/10" />
                                        </li>
                                    ))}
                                </ul>
                            ) : transactions.length === 0 ? (
                                <div className="flex flex-col items-center justify-center gap-2 px-6 py-10 text-center">
                                    <span className="flex h-10 w-10 items-center justify-center rounded-sm bg-zinc-100 text-zinc-500 dark:bg-white/5 dark:text-zinc-400">
                                        <Receipt size={18} aria-hidden />
                                    </span>
                                    <p className="text-sm font-medium text-[#0B1E3D] dark:text-white">
                                        No payments yet
                                    </p>
                                    <p className="max-w-sm text-xs text-zinc-500 dark:text-zinc-400">
                                        Once a payment is recorded against this
                                        assignment, it will appear here.
                                    </p>
                                    <Link
                                        href="/finance/transactions/new"
                                        className={`mt-2 inline-flex items-center gap-1 rounded-sm border border-zinc-300 px-3 py-1.5 text-xs font-semibold text-[#0B1E3D] hover:bg-zinc-50 dark:border-white/15 dark:text-white dark:hover:bg-white/10 ${FOCUS}`}
                                    >
                                        Record a payment
                                        <ArrowRight size={12} aria-hidden />
                                    </Link>
                                </div>
                            ) : (
                                <ul className="divide-y divide-zinc-100 dark:divide-white/10">
                                    {transactions.map((tx) => {
                                        const StatusIcon =
                                            TX_STATUS_ICON[tx.status];
                                        const reversed =
                                            tx.status === "REVERSED";

                                        return (
                                            <li
                                                key={tx._id}
                                                className={`flex items-start gap-3 px-4 py-3 ${
                                                    reversed ? "opacity-70" : ""
                                                }`}
                                            >
                                                <span
                                                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-sm ring-1 ring-inset ${TX_STATUS_PILL[tx.status]}`}
                                                >
                                                    <StatusIcon
                                                        size={14}
                                                        aria-hidden
                                                    />
                                                </span>

                                                <div className="min-w-0 flex-1">
                                                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm">
                                                        <span className="font-medium text-[#0B1E3D] dark:text-white">
                                                            {TX_METHOD_LABEL[
                                                                tx
                                                                    .paymentMethod
                                                            ]}
                                                        </span>
                                                        {tx.confirmationCode && (
                                                            <span className="truncate text-xs text-zinc-500">
                                                                ·{" "}
                                                                {
                                                                    tx.confirmationCode
                                                                }
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="mt-0.5 text-xs text-zinc-500">
                                                        {formatTxDate(
                                                            tx.transactionDate,
                                                        )}
                                                    </p>
                                                    {tx.notes && (
                                                        <p className="mt-1 line-clamp-2 break-words text-xs text-zinc-600 dark:text-zinc-300">
                                                            {tx.notes}
                                                        </p>
                                                    )}
                                                </div>

                                                <div className="shrink-0 text-right">
                                                    <p
                                                        className={`text-sm font-semibold tabular-nums ${
                                                            reversed
                                                                ? "text-zinc-400 line-through"
                                                                : "text-[#0B1E3D] dark:text-white"
                                                        }`}
                                                    >
                                                        {money(
                                                            tx.amount,
                                                            tx.currency ||
                                                                fee.currency,
                                                        )}
                                                    </p>
                                                    <span
                                                        className={`mt-1 inline-flex rounded-sm px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider ring-1 ring-inset ${TX_STATUS_PILL[tx.status]}`}
                                                    >
                                                        {
                                                            TX_STATUS_LABEL[
                                                                tx.status
                                                            ]
                                                        }
                                                    </span>
                                                </div>
                                            </li>
                                        );
                                    })}
                                </ul>
                            )}

                            {transactions !== null &&
                                transactions.length > 0 && (
                                    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-zinc-100 px-4 py-2 text-xs text-zinc-500 dark:border-white/10 dark:text-zinc-400">
                                        <span>
                                            Confirmed total:{" "}
                                            <span className="font-semibold tabular-nums text-[#0B1E3D] dark:text-white">
                                                {money(
                                                    txSummary.confirmed,
                                                    fee.currency,
                                                )}
                                            </span>
                                        </span>
                                        <Link
                                            href="/finance/transactions"
                                            className={`inline-flex items-center gap-1 font-semibold text-orange-600 hover:underline dark:text-orange-400 ${FOCUS}`}
                                        >
                                            Open transactions ledger
                                            <ArrowRight
                                                size={12}
                                                aria-hidden
                                            />
                                        </Link>
                                    </div>
                                )}
                        </section>

                        {/* Fee structure breakdown */}

                        {feeItems.length > 0 && (
                            <section className={CARD}>
                                <header className="border-b border-zinc-100 p-4 dark:border-white/10">
                                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500 dark:text-zinc-400">
                                        Fee structure
                                    </p>
                                    <h2 className="mt-1 text-base font-semibold text-[#0B1E3D] dark:text-white">
                                        {structure?.name ?? "Breakdown"}
                                    </h2>
                                </header>
                                <ul className="divide-y divide-zinc-100 dark:divide-white/10">
                                    {feeItems.map((item, index) => (
                                        <li
                                            key={`${item.name}-${index}`}
                                            className="flex items-start justify-between gap-4 px-4 py-2.5 text-sm"
                                        >
                                            <div className="min-w-0">
                                                <p className="font-medium text-[#0B1E3D] dark:text-white">
                                                    {item.name}
                                                </p>
                                                {item.description && (
                                                    <p className="mt-0.5 text-xs text-zinc-500">
                                                        {item.description}
                                                    </p>
                                                )}
                                            </div>
                                            <p className="shrink-0 tabular-nums font-medium text-[#0B1E3D] dark:text-zinc-100">
                                                {money(
                                                    item.amount,
                                                    structure?.currency ??
                                                        fee.currency,
                                                )}
                                            </p>
                                        </li>
                                    ))}
                                </ul>
                            </section>
                        )}
                    </div>

                    {/* Sidebar */}

                    <aside className="space-y-4 lg:sticky lg:top-4 lg:self-start">
                        <section className={CARD}>
                            <div className="flex items-center gap-3 border-b border-zinc-100 p-4 dark:border-white/10">
                                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-sm bg-[#0B1E3D] text-sm font-semibold text-white dark:bg-orange-400/15 dark:text-orange-300">
                                    {initials(
                                        getStudentName(fee) ||
                                            "Unknown student",
                                    )}
                                </span>
                                <div className="min-w-0">
                                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500 dark:text-zinc-400">
                                        Student
                                    </p>
                                    <h2 className="break-words font-semibold text-[#0B1E3D] dark:text-white">
                                        {getStudentName(fee) ||
                                            "Unknown student"}
                                    </h2>
                                </div>
                            </div>
                            <dl className="space-y-2 p-4 text-xs">
                                <div className="flex items-start justify-between gap-3">
                                    <dt className="text-zinc-500">Email</dt>
                                    <dd className="min-w-0 break-words text-right font-medium text-[#0B1E3D] dark:text-zinc-100">
                                        {getStudentEmail(fee) || "—"}
                                    </dd>
                                </div>
                                <div className="flex items-start justify-between gap-3">
                                    <dt className="text-zinc-500">
                                        Admission no.
                                    </dt>
                                    <dd className="break-words text-right font-medium text-[#0B1E3D] dark:text-zinc-100">
                                        {getAdmissionNumber(fee) || "—"}
                                    </dd>
                                </div>
                            </dl>
                        </section>

                        <section className={CARD}>
                            <div className="border-b border-zinc-100 p-4 dark:border-white/10">
                                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500 dark:text-zinc-400">
                                    Course
                                </p>
                                <h2 className="mt-1 break-words font-semibold text-[#0B1E3D] dark:text-white">
                                    {getCourseName(fee) || "Course"}
                                </h2>
                                {getCourseCode(fee) && (
                                    <p className="mt-0.5 text-xs text-zinc-500">
                                        {getCourseCode(fee)}
                                    </p>
                                )}
                            </div>
                            {typeof fee.courseId === "object" && (
                                <dl className="space-y-2 p-4 text-xs">
                                    {fee.courseId.level && (
                                        <div className="flex justify-between gap-3">
                                            <dt className="text-zinc-500">
                                                Level
                                            </dt>
                                            <dd className="text-right font-medium text-[#0B1E3D] dark:text-zinc-100">
                                                {fee.courseId.level}
                                            </dd>
                                        </div>
                                    )}
                                    {fee.courseId.duration && (
                                        <div className="flex justify-between gap-3">
                                            <dt className="text-zinc-500">
                                                Duration
                                            </dt>
                                            <dd className="text-right font-medium text-[#0B1E3D] dark:text-zinc-100">
                                                {fee.courseId.duration}
                                            </dd>
                                        </div>
                                    )}
                                </dl>
                            )}
                        </section>

                        <section className={CARD}>
                            <div className="border-b border-zinc-100 p-4 dark:border-white/10">
                                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500 dark:text-zinc-400">
                                    Assignment
                                </p>
                            </div>
                            <dl className="space-y-2 p-4 text-xs">
                                <div className="flex justify-between gap-3">
                                    <dt className="text-zinc-500">Status</dt>
                                    <dd className="text-right font-medium text-[#0B1E3D] dark:text-zinc-100">
                                        {fee.status}
                                    </dd>
                                </div>
                                {fee.createdAt && (
                                    <div className="flex justify-between gap-3">
                                        <dt className="text-zinc-500">
                                            Assigned
                                        </dt>
                                        <dd className="text-right font-medium text-[#0B1E3D] dark:text-zinc-100">
                                            {new Date(
                                                fee.createdAt,
                                            ).toLocaleDateString("en-KE")}
                                        </dd>
                                    </div>
                                )}
                                {fee.updatedAt && (
                                    <div className="flex justify-between gap-3">
                                        <dt className="text-zinc-500">
                                            Updated
                                        </dt>
                                        <dd className="text-right font-medium text-[#0B1E3D] dark:text-zinc-100">
                                            {new Date(
                                                fee.updatedAt,
                                            ).toLocaleDateString("en-KE")}
                                        </dd>
                                    </div>
                                )}
                                <div className="flex justify-between gap-3">
                                    <dt className="text-zinc-500">Currency</dt>
                                    <dd className="text-right font-medium text-[#0B1E3D] dark:text-zinc-100">
                                        {fee.currency}
                                    </dd>
                                </div>
                            </dl>
                        </section>

                        <Link
                            href="/finance/student-payments"
                            className={`${BTN} w-full ${FOCUS}`}
                        >
                            <ArrowLeft size={14} aria-hidden />
                            Back to all assignments
                        </Link>

                        <Link
                            href="/finance/transactions"
                            className={`${BTN} w-full ${FOCUS}`}
                        >
                            <Receipt size={14} aria-hidden />
                            Open transactions ledger
                        </Link>
                    </aside>
                </div>
            )}
        </main>
    );
}