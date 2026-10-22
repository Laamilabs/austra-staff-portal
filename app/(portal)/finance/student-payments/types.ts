// app/(portal)/finance/student-payments/types.ts

import type { StudentFee } from "@/app/types/student-fee";

export type Risk = "paid" | "low" | "medium" | "high" | "cancelled";
export type PayState = "paid" | "unpaid" | "partial";
export type PayFilter = "all" | PayState;
export type StatusFilter =
    | "live"
    | "all"
    | "ACTIVE"
    | "COMPLETED"
    | "CANCELLED";
export type SortKey =
    | "balance"
    | "outstanding"
    | "name"
    | "recent"
    | "count";

/** One fee-assignment row, pre-resolved for display + filtering. */
export interface Row {
    fee: StudentFee;
    studentId: string;
    student: string;
    email: string;
    admission: string;
    course: string;
    code: string;
    courseId: string;
    structure: string;
    structureId: string;
    currency: string;
    total: number;
    paid: number;
    balance: number;
    paidPct: number;
    outPct: number;
    state: PayState;
    risk: Risk;
    created: string;
    haystack: string;
}

/** A student and their aggregated assignments. */
export interface Group {
    studentId: string;
    name: string;
    email: string;
    rows: Row[];
    total: number;
    paid: number;
    balance: number;
    paidPct: number;
    latest: string;
    worst: Risk;
}

/** Snapshot of the filter UI, used by `matchesRow`. */
export interface FilterState {
    status: StatusFilter;
    pay: PayFilter;
    course: string;
    structure: string;
    minOut: number;
    minBal: number;
    q: string;
}