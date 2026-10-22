import { CheckCircle2, Clock, XCircle } from "lucide-react";

import type {
    PaymentMethod,
    TransactionStatus,
} from "@/app/types/fee-transaction";

/* ------------------------------------------------------------------ */
/* Shared styling                                                      */
/* ------------------------------------------------------------------ */

export const FOCUS =
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#0B1E3D]";
export const CARD =
    "rounded-sm border border-zinc-200 bg-white shadow-sm shadow-blue-950/5 dark:border-white/10 dark:bg-[#0B1E3D]";
export const FIELD =
    "rounded-sm border border-zinc-300 bg-white px-3 py-2 text-sm text-[#0B1E3D] shadow-sm outline-none transition-colors placeholder:text-zinc-400 hover:bg-zinc-50 focus:border-orange-400 focus:ring-2 focus:ring-orange-400/30 disabled:cursor-not-allowed disabled:bg-zinc-50 disabled:opacity-70 dark:border-white/15 dark:bg-white/5 dark:text-white dark:hover:bg-white/10 dark:disabled:bg-white/5 dark:[color-scheme:dark] dark:[&>option]:bg-[#0B1E3D]";
export const BTN =
    "inline-flex items-center justify-center gap-2 rounded-sm border border-zinc-300 bg-white px-3.5 py-2 text-sm font-semibold text-[#0B1E3D] shadow-sm transition-colors hover:bg-zinc-50 active:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/15 dark:bg-white/5 dark:text-white dark:hover:bg-white/10";
export const BTN_PRIMARY =
    "inline-flex items-center justify-center gap-2 rounded-sm bg-orange-500 px-3.5 py-2 text-sm font-semibold text-white shadow-sm shadow-blue-950/20 transition-colors hover:bg-orange-400 active:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50";

/* ------------------------------------------------------------------ */
/* Status presentation                                                 */
/* ------------------------------------------------------------------ */

export const RISK_PILL: Record<"ACTIVE" | "COMPLETED" | "CANCELLED", string> = {
    ACTIVE:
        "bg-blue-50 text-blue-700 ring-blue-600/20 dark:bg-blue-500/10 dark:text-blue-300 dark:ring-blue-400/25",
    COMPLETED:
        "bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-400/25",
    CANCELLED:
        "bg-zinc-100 text-zinc-500 ring-zinc-400/20 dark:bg-white/5 dark:text-zinc-400 dark:ring-white/10",
};

/* ---- Transaction presentation ---- */

export const TX_METHOD_LABEL: Record<PaymentMethod, string> = {
    CASH: "Cash",
    MPESA: "M-Pesa",
    BANK_TRANSFER: "Bank transfer",
    OTHER: "Other",
};

export const TX_STATUS_LABEL: Record<TransactionStatus, string> = {
    PENDING: "Pending",
    CONFIRMED: "Confirmed",
    REVERSED: "Reversed",
};

export const TX_STATUS_PILL: Record<TransactionStatus, string> = {
    PENDING:
        "bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-400/25",
    CONFIRMED:
        "bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-400/25",
    REVERSED:
        "bg-rose-50 text-rose-700 ring-rose-600/20 dark:bg-rose-500/10 dark:text-rose-300 dark:ring-rose-400/25",
};

export const TX_STATUS_ICON: Record<TransactionStatus, typeof CheckCircle2> = {
    PENDING: Clock,
    CONFIRMED: CheckCircle2,
    REVERSED: XCircle,
};