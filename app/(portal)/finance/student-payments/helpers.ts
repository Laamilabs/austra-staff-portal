// app/(portal)/finance/student-payments/helpers.ts

import {
    getAdmissionNumber,
    getCourseCode,
    getCourseName,
    getFeeStructureId,
    getFeeStructureName,
    getStudentEmail,
    getStudentName,
    type StudentFee,
} from "@/app/types/student-fee";

import type {
    FilterState,
    Group,
    PayFilter,
    Risk,
    Row,
    SortKey,
} from "./types";

/* ------------------------------------------------------------------ */
/* Style tokens (Windows 11 feel: orange accent, rounded-sm)           */
/* ------------------------------------------------------------------ */

export const FOCUS =
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#0B1E3D]";
export const CARD =
    "rounded-sm border border-zinc-200 bg-white shadow-sm shadow-blue-950/5 dark:border-white/10 dark:bg-[#0B1E3D]";
export const FIELD =
    "rounded-sm border border-zinc-300 bg-white px-3 py-2 text-sm text-[#0B1E3D] shadow-sm outline-none transition-colors placeholder:text-zinc-400 hover:bg-zinc-50 focus:border-orange-400 focus:ring-2 focus:ring-orange-400/30 dark:border-white/15 dark:bg-white/5 dark:text-white dark:hover:bg-white/10 dark:[color-scheme:dark] dark:[&>option]:bg-[#0B1E3D]";
export const BTN =
    "inline-flex items-center justify-center gap-2 rounded-sm border border-zinc-300 bg-white px-3.5 py-2 text-sm font-semibold text-[#0B1E3D] shadow-sm transition-colors hover:bg-zinc-50 active:bg-zinc-100 disabled:opacity-50 dark:border-white/15 dark:bg-white/5 dark:text-white dark:hover:bg-white/10";

/* ------------------------------------------------------------------ */
/* Risk styling + sorting ranking                                      */
/* ------------------------------------------------------------------ */

export const RANK: Record<Risk, number> = {
    cancelled: 0,
    paid: 1,
    low: 2,
    medium: 3,
    high: 4,
};

export const RISK_STYLE: Record<
    Risk,
    { pill: string; bar: string; accent: string; text: string }
> = {
    paid: {
        pill: "bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-400/25",
        bar: "bg-emerald-500",
        accent: "border-l-emerald-500",
        text: "text-emerald-700 dark:text-emerald-300",
    },
    low: {
        pill: "bg-blue-50 text-blue-700 ring-blue-600/20 dark:bg-blue-500/10 dark:text-blue-300 dark:ring-blue-400/25",
        bar: "bg-blue-600",
        accent: "border-l-blue-600",
        text: "text-[#0B1E3D] dark:text-white",
    },
    medium: {
        pill: "bg-amber-50 text-amber-800 ring-amber-600/25 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-400/25",
        bar: "bg-amber-500",
        accent: "border-l-amber-400",
        text: "text-amber-700 dark:text-amber-300",
    },
    high: {
        pill: "bg-red-50 text-red-700 ring-red-600/20 dark:bg-red-500/10 dark:text-red-300 dark:ring-red-400/25",
        bar: "bg-red-500",
        accent: "border-l-red-500",
        text: "text-red-700 dark:text-red-300",
    },
    cancelled: {
        pill: "bg-zinc-100 text-zinc-500 ring-zinc-400/20 dark:bg-white/5 dark:text-zinc-400 dark:ring-white/10",
        bar: "bg-zinc-300 dark:bg-zinc-600",
        accent: "border-l-zinc-300 dark:border-l-zinc-600",
        text: "text-zinc-400",
    },
};

/* ------------------------------------------------------------------ */
/* Dropdown option lists + pagination                                  */
/* ------------------------------------------------------------------ */

// app/(portal)/finance/student-payments/helpers.ts

export const SORTS: { key: SortKey; label: string }[] = [
    { key: "balance", label: "Highest balance" },
    { key: "outstanding", label: "Highest % outstanding" },
    { key: "name", label: "Name A–Z" },
    { key: "recent", label: "Recently assigned" },
    { key: "count", label: "Most assignments" },
];

export const PAY_TABS: { key: PayFilter; label: string }[] = [
    { key: "all", label: "All" },
    { key: "unpaid", label: "Unpaid" },
    { key: "partial", label: "Partial" },
    { key: "paid", label: "Paid" },
];

export const PAGE = 20;

/* ------------------------------------------------------------------ */
/* Pure helpers                                                        */
/* ------------------------------------------------------------------ */

export const idOf = (
    ref: { _id: string } | string | null | undefined,
) => (!ref ? "" : typeof ref === "string" ? ref : ref._id);

export const pct = (paid: number, total: number) =>
    total > 0 ? Math.min(100, Math.max(0, (paid / total) * 100)) : 100;

export const money = (amount: number, currency = "KES") => {
    try {
        return new Intl.NumberFormat("en-KE", {
            style: "currency",
            currency,
            maximumFractionDigits: 2,
        }).format(Number.isFinite(amount) ? amount : 0);
    } catch {
        return `${currency} ${amount.toFixed(2)}`;
    }
};

export const initials = (name: string) =>
    name
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((p) => p[0]?.toUpperCase())
        .join("") || "?";

export function riskLabel(r: Row) {
    if (r.risk === "cancelled") return "Cancelled";
    if (r.state === "paid") return "Paid in full";
    if (r.state === "unpaid") return "Unpaid";
    return r.risk === "high" ? "High balance" : "Partial";
}

/** Project a raw StudentFee into a display/filter Row. */
export function toRow(fee: StudentFee): Row {
    const total = fee.totalAmount ?? 0;
    const paid = fee.amountPaid ?? 0;
    const balance = Math.max(0, total - paid);
    const paidPct = pct(paid, total);
    const outPct = 100 - paidPct;
    const state: Row["state"] =
        balance <= 0 ? "paid" : paid <= 0 ? "unpaid" : "partial";
    const risk: Risk =
        fee.status === "CANCELLED"
            ? "cancelled"
            : state === "paid"
              ? "paid"
              : outPct >= 75
                ? "high"
                : outPct >= 40
                  ? "medium"
                  : "low";

    const studentId = idOf(fee.studentId);
    const student = getStudentName(fee) || "Unknown student";
    const email = getStudentEmail(fee);
    const admission = getAdmissionNumber(fee);
    const courseId = idOf(fee.courseId);
    const course = getCourseName(fee) || "Course";
    const code = getCourseCode(fee);
    const structure = getFeeStructureName(fee) || "Fee structure";

    return {
        fee,
        studentId,
        student,
        email,
        admission,
        course,
        code,
        courseId,
        structure,
        structureId: getFeeStructureId(fee),
        currency: fee.currency || "KES",
        total,
        paid,
        balance,
        paidPct,
        outPct,
        state,
        risk,
        created: fee.createdAt ?? "",
        haystack: [
            student,
            email,
            admission,
            course,
            code,
            structure,
            studentId,
        ]
            .join(" ")
            .toLowerCase(),
    };
}

/**
 * Apply the filter bar. `skipPay` is used by the payment-tab counts, which
 * must not filter on the currently selected pay state (otherwise every
 * non-selected tab shows zero).
 */
export function matchesRow(
    r: Row,
    f: FilterState,
    skipPay = false,
): boolean {
    if (f.status === "live") {
        if (r.fee.status === "CANCELLED") return false;
    } else if (f.status !== "all" && r.fee.status !== f.status) {
        return false;
    }
    if (!skipPay && f.pay !== "all" && r.state !== f.pay) return false;
    if (f.course !== "all" && r.courseId !== f.course) return false;
    if (f.structure !== "all" && r.structureId !== f.structure) return false;
    if (f.minOut && r.outPct < f.minOut) return false;
    if (f.minBal && r.balance < f.minBal) return false;
    if (f.q && !r.haystack.includes(f.q)) return false;
    return true;
}

/** Bucket rows by student and aggregate their totals. */
export function buildGroups(
    rows: Row[],
    primary: string,
    sort: SortKey,
): Group[] {
    const countable = (r: Row) =>
        r.risk !== "cancelled" && r.currency === primary;

    const map = new Map<string, Group>();
    for (const r of rows) {
        if (!r.studentId) continue;
        let g = map.get(r.studentId);
        if (!g) {
            g = {
                studentId: r.studentId,
                name: r.student,
                email: r.email,
                rows: [],
                total: 0,
                paid: 0,
                balance: 0,
                paidPct: 0,
                latest: "",
                worst: "cancelled",
            };
            map.set(r.studentId, g);
        }
        g.rows.push(r);
        if (countable(r)) {
            g.total += r.total;
            g.paid += r.paid;
            g.balance += r.balance;
        }
        if (r.created > g.latest) g.latest = r.created;
        if (RANK[r.risk] > RANK[g.worst]) g.worst = r.risk;
    }

    const list = Array.from(map.values());
    for (const g of list) {
        g.paidPct = pct(g.paid, g.total);
        g.rows.sort(
            (a, b) =>
                b.balance - a.balance ||
                b.created.localeCompare(a.created),
        );
    }
    list.sort((a, b) => {
        switch (sort) {
            case "outstanding":
                return a.paidPct - b.paidPct || b.balance - a.balance;
            case "name":
                return a.name.localeCompare(b.name);
            case "recent":
                return b.latest.localeCompare(a.latest);
            case "count":
                return (
                    b.rows.length - a.rows.length ||
                    a.name.localeCompare(b.name)
                );
            default:
                return (
                    b.balance - a.balance || a.name.localeCompare(b.name)
                );
        }
    });
    return list;
}

/** Download the currently filtered rows as a CSV. */
export function exportCsv(rows: Row[]): void {
    const esc = (v: string | number) =>
        `"${String(v).replace(/"/g, '""')}"`;
    const head = [
        "Student",
        "Admission no.",
        "Email",
        "Course",
        "Course code",
        "Fee structure",
        "Currency",
        "Assessed",
        "Paid",
        "Balance",
        "Paid %",
        "Status",
    ];
    const lines = rows.map((r) =>
        [
            r.student,
            r.admission,
            r.email,
            r.course,
            r.code,
            r.structure,
            r.currency,
            r.total,
            r.paid,
            r.balance,
            Math.round(r.paidPct),
            r.fee.status,
        ]
            .map(esc)
            .join(","),
    );
    const blob = new Blob(
        ["\ufeff" + [head.map(esc).join(","), ...lines].join("\n")],
        { type: "text/csv;charset=utf-8" },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `student-fees-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
}