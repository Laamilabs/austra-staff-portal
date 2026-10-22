"use client";

import { useMemo, useState } from "react";
import { Save, X } from "lucide-react";

import {
    studentFeeApi,
    type DiscountType,
    type StudentFee,
} from "@/app/types/student-fee";

import { BTN, BTN_PRIMARY, FIELD, FOCUS } from "./ui";
import {
    buildPatch,
    computeDiscountAmount,
    money,
    validateDraft,
} from "./utils";

interface DiscountEditorProps {
    fee: StudentFee;
    canEditAmount: boolean;
    onCancel: () => void;
    onSaved: (updated: StudentFee) => void;
}

export default function DiscountEditor({
    fee,
    canEditAmount,
    onCancel,
    onSaved,
}: DiscountEditorProps) {
    const [draftType, setDraftType] = useState<"" | DiscountType>(
        fee.discountType ?? "",
    );
    const [draftValue, setDraftValue] = useState(
        fee.discountValue?.toString() ?? "",
    );
    const [draftReason, setDraftReason] = useState(fee.discountReason ?? "");

    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState("");

    const draftError = useMemo(
        () => validateDraft(fee, draftType, draftValue),
        [fee, draftType, draftValue],
    );

    const patch = useMemo(
        () =>
            !draftError
                ? buildPatch(fee, draftType, draftValue, draftReason)
                : null,
        [fee, draftError, draftType, draftValue, draftReason],
    );

    const previewDiscount = useMemo(
        () => computeDiscountAmount(fee.totalAmount, draftType, draftValue),
        [fee.totalAmount, draftType, draftValue],
    );

    const previewNet = Math.max(0, fee.totalAmount - previewDiscount);

    const save = async () => {
        if (draftError) {
            setSaveError(draftError);
            return;
        }
        if (!patch) {
            onCancel();
            return;
        }

        setSaving(true);
        setSaveError("");
        try {
            const updated = await studentFeeApi.update(fee._id, patch);
            onSaved(updated);
        } catch (err) {
            setSaveError(
                err instanceof Error
                    ? err.message
                    : "Could not save the discount.",
            );
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="my-3 rounded-sm border border-orange-200 bg-orange-50/50 p-3 dark:border-orange-400/30 dark:bg-orange-400/5">
            <p className="mb-2 flex items-center justify-between text-xs font-semibold uppercase tracking-[0.12em] text-orange-700 dark:text-orange-300">
                <span>Edit discount</span>
                <button
                    type="button"
                    onClick={onCancel}
                    aria-label="Close discount editor"
                    className={`rounded-sm p-0.5 text-orange-700 hover:bg-orange-100 dark:text-orange-300 dark:hover:bg-orange-400/10 ${FOCUS}`}
                >
                    <X size={14} />
                </button>
            </p>

            {!canEditAmount && (
                <p className="mb-3 rounded-sm bg-amber-100/70 px-2 py-1.5 text-xs text-amber-800 dark:bg-amber-400/10 dark:text-amber-300">
                    Payments have been recorded against this assignment, so the
                    discount amount is locked. Only the reason can be updated.
                </p>
            )}

            <div className="grid gap-3 sm:grid-cols-2">
                <label className="grid gap-1 text-xs font-medium text-zinc-600 dark:text-zinc-300">
                    <span>Type</span>
                    <select
                        value={draftType}
                        onChange={(e) => {
                            const next = e.target.value as "" | DiscountType;
                            setDraftType(next);
                            if (!next) {
                                setDraftValue("");
                                setDraftReason("");
                            }
                            setSaveError("");
                        }}
                        disabled={!canEditAmount}
                        className={`${FIELD} w-full`}
                    >
                        <option value="">No discount</option>
                        <option value="PERCENTAGE">Percentage</option>
                        <option value="FIXED">Fixed amount</option>
                    </select>
                </label>

                <label className="grid gap-1 text-xs font-medium text-zinc-600 dark:text-zinc-300">
                    <span>
                        Value
                        {draftType === "PERCENTAGE" && " (%)"}
                        {draftType === "FIXED" && ` (${fee.currency})`}
                    </span>
                    <input
                        type="number"
                        min={0}
                        max={draftType === "PERCENTAGE" ? 100 : undefined}
                        step="0.01"
                        value={draftValue}
                        onChange={(e) => {
                            setDraftValue(e.target.value);
                            setSaveError("");
                        }}
                        disabled={!draftType || !canEditAmount}
                        placeholder={
                            draftType === "PERCENTAGE"
                                ? "e.g. 10"
                                : "e.g. 5000"
                        }
                        className={`${FIELD} w-full tabular-nums`}
                    />
                </label>
            </div>

            <label className="mt-3 grid gap-1 text-xs font-medium text-zinc-600 dark:text-zinc-300">
                <span>Reason (recommended)</span>
                <input
                    type="text"
                    maxLength={200}
                    value={draftReason}
                    onChange={(e) => {
                        setDraftReason(e.target.value);
                        setSaveError("");
                    }}
                    disabled={!draftType}
                    placeholder="e.g. Merit scholarship, sibling discount, staff waiver"
                    className={`${FIELD} w-full`}
                />
            </label>

            {draftError && (
                <p className="mt-2 text-xs text-red-600 dark:text-red-400">
                    {draftError}
                </p>
            )}

            {!draftError && draftType && previewDiscount > 0 && (
                <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                    Applying{" "}
                    <strong className="text-emerald-600 dark:text-emerald-400">
                        −{money(previewDiscount, fee.currency)}
                    </strong>{" "}
                    → net {money(previewNet, fee.currency)}
                </p>
            )}

            {saveError && (
                <p
                    role="alert"
                    className="mt-3 rounded-sm bg-red-50 px-2 py-1.5 text-xs text-red-700 dark:bg-red-500/10 dark:text-red-300"
                >
                    {saveError}
                </p>
            )}

            <div className="mt-3 flex justify-end gap-2">
                <button
                    type="button"
                    onClick={onCancel}
                    disabled={saving}
                    className={`${BTN} px-3 py-1.5 text-xs ${FOCUS}`}
                >
                    Cancel
                </button>
                <button
                    type="button"
                    onClick={() => void save()}
                    disabled={saving || !!draftError || patch === null}
                    className={`${BTN_PRIMARY} px-3 py-1.5 text-xs ${FOCUS}`}
                >
                    <Save size={12} aria-hidden />
                    {saving ? "Saving…" : "Save"}
                </button>
            </div>
        </div>
    );
}