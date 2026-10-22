import type {
    DiscountType,
    StudentFee,
    UpdateStudentFeeDto,
} from "@/app/types/student-fee";

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

export const idOf = (ref: { _id: string } | string | null | undefined) =>
    !ref ? "" : typeof ref === "string" ? ref : ref._id;

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

export function formatTxDate(iso?: string): string {
    if (!iso) return "—";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleString("en-KE", {
        year: "numeric",
        month: "short",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
    });
}

/**
 * Same derivation the server runs in `pre('validate')`: percentage-of-total
 * for PERCENTAGE, absolute amount for FIXED, rounded to 2dp and clamped to
 * the gross total. Keeping it identical means the preview always agrees
 * with what the backend will store.
 */
export function computeDiscountAmount(
    total: number,
    type: "" | DiscountType,
    valueStr: string,
): number {
    if (!type) return 0;
    const value = parseFloat(valueStr);
    if (!Number.isFinite(value) || value <= 0) return 0;

    const raw =
        type === "PERCENTAGE"
            ? (total * Math.min(100, value)) / 100
            : Math.max(0, value);

    return Math.min(total, Math.round(raw * 100) / 100);
}

/**
 * Mirrors the backend's create/update rules so the Save button can be
 * disabled with a useful inline message before the user hits a 400.
 */
export function validateDraft(
    fee: StudentFee,
    type: "" | DiscountType,
    valueStr: string,
): string | null {
    if (!type) return null;

    const value = parseFloat(valueStr);
    if (!Number.isFinite(value) || value <= 0) {
        return "Enter a discount value greater than zero.";
    }

    if (type === "PERCENTAGE" && value > 100) {
        return "Percentage discount cannot exceed 100%.";
    }

    if (type === "FIXED" && value > fee.totalAmount) {
        return "Fixed discount cannot exceed the fee structure total.";
    }

    return null;
}

/**
 * Build the minimal PATCH payload.
 *
 * - `null` means "no changes to save" — the Save button stays disabled.
 * - Clearing the discount is expressed as `{ discountType: null }`, which
 *   the backend expands to also clearing value + reason.
 * - Only fields that actually differ from the current document are sent.
 *   This matters because the backend blocks ANY `discountType` /
 *   `discountValue` field once `amountPaid > 0` — resending unchanged
 *   values would incorrectly 400.
 */
export function buildPatch(
    fee: StudentFee,
    draftType: "" | DiscountType,
    draftValue: string,
    draftReason: string,
): UpdateStudentFeeDto | null {
    if (!draftType && fee.discountType) {
        return { discountType: null };
    }

    const patch: UpdateStudentFeeDto = {};

    const newType = draftType || undefined;
    const oldType = fee.discountType;

    const newValue =
        draftValue.trim() === "" ? undefined : parseFloat(draftValue);
    const oldValue = fee.discountValue;

    const newReason = draftReason.trim();
    const oldReason = fee.discountReason ?? "";

    if (newType !== oldType) patch.discountType = newType;
    if (newValue !== undefined && newValue !== oldValue) {
        patch.discountValue = newValue;
    }
    if (newReason !== oldReason) patch.discountReason = newReason;

    return Object.keys(patch).length > 0 ? patch : null;
}