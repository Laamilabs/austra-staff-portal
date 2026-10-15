"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
    AlertCircle,
    BookOpen,
    CheckCircle2,
    ChevronDown,
    ChevronRight,
    Loader2,
    Plus,
    Save,
    Trash2,
} from "lucide-react";

import { Unit } from "@/app/types/units";
import {
    AssessmentType,
    CreateResultDto,
    Result,
    UpdateResultDto,
    resultApi,
} from "@/app/types/results";

import {
    Column,
    ColumnKey,
    ExistingCell,
    Template,
    applyTemplateToColumns,
    buildColumnsFromResults,
    buildExistingFromResults,
    columnKey,
    columnLabel,
    labelOf,
    sortColumns,
} from "./utils";

/* -------------------------------------------------------------------------- */
/* Unit panel — one per unit                                                  */
/* -------------------------------------------------------------------------- */

export function UnitPanel({
    unit,
    studentId,
    initialResults,
    defaultExpanded = false,
    template,
    templateVersion,
}: {
    unit: Unit;
    studentId: string;
    initialResults: Result[];
    defaultExpanded?: boolean;
    template: Template;
    templateVersion: number;
}) {
    const [expanded, setExpanded] = useState(defaultExpanded);
    const [columns, setColumns] = useState<Column[]>(() =>
        buildColumnsFromResults(initialResults),
    );
    const [existing, setExisting] = useState<Record<ColumnKey, ExistingCell>>(
        () => buildExistingFromResults(initialResults),
    );

    const [showAddColumn, setShowAddColumn] = useState(false);
    const [newColType, setNewColType] = useState<AssessmentType>(
        AssessmentType.CAT,
    );
    const [newColCatNumber, setNewColCatNumber] = useState("1");

    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);
    const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

    /* ------------------------- Template application -------------------- */

    const lastAppliedRef = useRef(0);

    useEffect(() => {
        if (templateVersion === 0) return;
        if (templateVersion === lastAppliedRef.current) return;
        lastAppliedRef.current = templateVersion;
        setColumns((prev) => applyTemplateToColumns(template, prev));
        // Clear stale notifications after re-shaping columns.
        setSaveError(null);
        setSaveSuccess(null);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [templateVersion]);

    /* ----------------------------- Derived ---------------------------- */

    const nextCatNumber = useMemo(() => {
        const highest = columns.reduce((acc, c) => {
            if (
                c.assessmentType === AssessmentType.CAT &&
                c.assessmentNumber
            ) {
                return Math.max(acc, c.assessmentNumber);
            }
            return acc;
        }, 0);
        return highest + 1;
    }, [columns]);

    const hasAnyMark = useMemo(
        () => columns.some((c) => c.mark !== ""),
        [columns],
    );

    const isDirty = useMemo(() => {
        for (const col of columns) {
            const ex = existing[col.key];
            const raw = col.mark;
            if (ex) {
                if (raw === "") return true;
                if (Number(raw) !== ex.marks) return true;
            } else if (raw !== "") {
                return true;
            }
        }
        return false;
    }, [columns, existing]);

    /* -------------------------- Column actions ------------------------ */

    const openAddColumn = () => {
        setNewColType(AssessmentType.CAT);
        setNewColCatNumber(String(nextCatNumber));
        setShowAddColumn(true);
        setSaveError(null);
        setSaveSuccess(null);
    };

    const confirmAddColumn = () => {
        let key: ColumnKey;
        let num: number | undefined;

        if (newColType === AssessmentType.CAT) {
            const n = Number(newColCatNumber);
            if (!Number.isInteger(n) || n < 1) {
                setSaveError("CAT number must be a positive integer.");
                return;
            }
            key = columnKey(AssessmentType.CAT, n);
            num = n;
        } else {
            key = columnKey(newColType);
        }

        if (columns.some((c) => c.key === key)) {
            setSaveError(
                `A ${labelOf(newColType, num)} column already exists.`,
            );
            return;
        }

        setColumns((prev) =>
            sortColumns([
                ...prev,
                {
                    key,
                    assessmentType: newColType,
                    assessmentNumber: num,
                    mark: "",
                },
            ]),
        );
        setShowAddColumn(false);
        setSaveError(null);
    };

    const removeColumn = (colKey: ColumnKey) => {
        setColumns((prev) => prev.filter((c) => c.key !== colKey));
        setSaveSuccess(null);
    };

    /* ------------------------------ Edit ------------------------------ */

    const updateMark = (colKey: ColumnKey, value: string) => {
        if (value !== "" && !/^\d{0,3}(\.\d{0,2})?$/.test(value)) return;
        setColumns((prev) =>
            prev.map((c) =>
                c.key === colKey ? { ...c, mark: value } : c,
            ),
        );
        setSaveSuccess(null);
    };

    /* ------------------------------ Save ------------------------------ */

    const saveAll = async () => {
        setSaveError(null);
        setSaveSuccess(null);

        if (columns.length === 0) {
            setSaveError("Add at least one assessment column before saving.");
            return;
        }

        type CreateJob = {
            key: ColumnKey;
            col: Column;
            dto: CreateResultDto;
            marks: number;
        };
        type UpdateJob = {
            key: ColumnKey;
            resultId: string;
            dto: UpdateResultDto;
            marks: number;
        };

        const creates: CreateJob[] = [];
        const updates: UpdateJob[] = [];
        const invalid: string[] = [];

        for (const col of columns) {
            const raw = col.mark;
            if (raw === "") {
                // Emptying an existing cell = leave as-is (no destructive
                // update without an explicit API contract). Skip silently.
                continue;
            }

            const mark = Number(raw);
            if (!Number.isFinite(mark) || mark < 0 || mark > 100) {
                invalid.push(columnLabel(col));
                continue;
            }

            const ex = existing[col.key];
            if (ex) {
                if (ex.marks === mark) continue;
                updates.push({
                    key: col.key,
                    resultId: ex.resultId,
                    dto: { marks: mark },
                    marks: mark,
                });
            } else {
                creates.push({
                    key: col.key,
                    col,
                    marks: mark,
                    dto: {
                        studentId,
                        unitId: unit._id,
                        assessmentType: col.assessmentType,
                        assessmentNumber:
                            col.assessmentType === AssessmentType.CAT
                                ? col.assessmentNumber
                                : undefined,
                        marks: mark,
                    },
                });
            }
        }

        if (invalid.length > 0) {
            setSaveError(
                `Fix invalid marks before saving: ${invalid.join(", ")}.`,
            );
            return;
        }

        if (creates.length === 0 && updates.length === 0) {
            setSaveError("Nothing to save — no new or edited marks.");
            return;
        }

        setSaving(true);
        const nextExisting: Record<ColumnKey, ExistingCell> = { ...existing };

        let created = 0;
        let updated = 0;
        let failed = 0;
        const failures: string[] = [];

        for (const job of creates) {
            try {
                const res = await resultApi.create(job.dto);
                nextExisting[job.key] = {
                    resultId: res.data._id,
                    marks: job.marks,
                };
                created++;
            } catch (err: any) {
                failed++;
                failures.push(
                    err?.response?.data?.message ??
                    err?.message ??
                    "Create failed.",
                );
            }
        }

        for (const job of updates) {
            try {
                await resultApi.update(job.resultId, job.dto);
                nextExisting[job.key] = {
                    resultId: job.resultId,
                    marks: job.marks,
                };
                updated++;
            } catch (err: any) {
                failed++;
                failures.push(
                    err?.response?.data?.message ??
                    err?.message ??
                    "Update failed.",
                );
            }
        }

        setExisting(nextExisting);
        setSaving(false);

        const parts: string[] = [];
        if (created) parts.push(`${created} added`);
        if (updated) parts.push(`${updated} updated`);

        if (failed === 0) {
            setSaveSuccess(`Saved: ${parts.join(", ")}.`);
        } else {
            setSaveError(
                `${parts.join(", ") || "0 saved"}, ${failed} failed. ${failures[0]
                }${failures.length > 1 ? ` (+${failures.length - 1} more)` : ""}`,
            );
            if (created || updated) {
                setSaveSuccess(`Saved: ${parts.join(", ")}.`);
            }
        }
    };

    /* ------------------------------ Render ---------------------------- */

    return (
        <section className="overflow-hidden rounded-sm border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            {/* Header / toggle */}
            <button
                type="button"
                onClick={() => setExpanded((v) => !v)}
                className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/40"
                aria-expanded={expanded}
            >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-sm bg-[#082B66]/5 text-[10px] font-bold text-[#082B66] dark:bg-orange-400/10 dark:text-orange-400">
                    {expanded ? (
                        <ChevronDown className="h-3.5 w-3.5" />
                    ) : (
                        <ChevronRight className="h-3.5 w-3.5" />
                    )}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-sm bg-[#082B66]/5 px-2 py-1 text-[11px] font-semibold text-[#082B66] dark:bg-orange-400/10 dark:text-orange-400">
                    <BookOpen className="h-3 w-3" />
                    {unit.code}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm font-semibold text-zinc-900 dark:text-white">
                    {unit.name}
                </span>
                <span className="shrink-0 text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">
                    {columns.length} assessment
                    {columns.length === 1 ? "" : "s"}
                </span>
            </button>

            {/* Expanded content */}
            {expanded && (
                <div className="border-t border-zinc-100 p-4 dark:border-zinc-800">
                    {/* Toolbar */}
                    <div className="mb-3 flex flex-wrap items-center gap-2">
                        {!showAddColumn && (
                            <button
                                type="button"
                                onClick={openAddColumn}
                                className="inline-flex items-center gap-1.5 rounded-sm bg-[#082B66] px-3 py-1.5 text-[11px] font-semibold text-white transition hover:bg-[#082B66]/90 dark:bg-orange-400 dark:text-zinc-900 dark:hover:bg-orange-400/90"
                            >
                                <Plus className="h-3 w-3" />
                                Add Assessment
                            </button>
                        )}

                        {showAddColumn && (
                            <div className="flex flex-wrap items-end gap-2 rounded-sm border border-zinc-200 bg-zinc-50 p-2 dark:border-zinc-700 dark:bg-zinc-800/60">
                                <div>
                                    <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                                        Type
                                    </label>
                                    <select
                                        value={newColType}
                                        onChange={(e) =>
                                            setNewColType(
                                                e.target.value as AssessmentType,
                                            )
                                        }
                                        className="cursor-pointer rounded-sm border border-zinc-200 bg-white px-2 py-1 text-xs focus:border-[#082B66] focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-white"
                                    >
                                        <option value={AssessmentType.CAT}>
                                            CAT
                                        </option>
                                        <option value={AssessmentType.PRACTICAL}>
                                            Practical
                                        </option>
                                        <option value={AssessmentType.FINAL_EXAM}>
                                            Final Exam
                                        </option>
                                    </select>
                                </div>

                                {newColType === AssessmentType.CAT && (
                                    <div>
                                        <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                                            CAT No.
                                        </label>
                                        <input
                                            type="number"
                                            min={1}
                                            value={newColCatNumber}
                                            onChange={(e) =>
                                                setNewColCatNumber(
                                                    e.target.value,
                                                )
                                            }
                                            className="w-16 rounded-sm border border-zinc-200 bg-white px-2 py-1 text-xs focus:border-[#082B66] focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-white"
                                        />
                                    </div>
                                )}

                                <button
                                    type="button"
                                    onClick={confirmAddColumn}
                                    className="rounded-sm bg-[#082B66] px-2.5 py-1 text-xs font-semibold text-white transition hover:bg-[#082B66]/90 dark:bg-orange-400 dark:text-zinc-900 dark:hover:bg-orange-400/90"
                                >
                                    Add
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setShowAddColumn(false)}
                                    className="rounded-sm border border-zinc-300 bg-white px-2.5 py-1 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
                                >
                                    Cancel
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Columns */}
                    {columns.length === 0 ? (
                        <p className="rounded-sm border border-dashed border-zinc-300 px-4 py-6 text-center text-xs text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
                            No assessments recorded for this unit yet. Add a
                            column, or use the template above.
                        </p>
                    ) : (
                        <div className="flex flex-wrap gap-2">
                            {columns.map((col) => {
                                const ex = existing[col.key];
                                const dirty =
                                    ex && String(ex.marks) !== col.mark;
                                const clean = ex && !dirty;
                                return (
                                    <div
                                        key={col.key}
                                        className="flex w-28 flex-col gap-1 rounded-sm border border-zinc-200 p-2 dark:border-zinc-700"
                                    >
                                        <div className="flex items-center justify-between">
                                            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                                                {columnLabel(col)}
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    removeColumn(col.key)
                                                }
                                                title="Hide this column"
                                                aria-label="Hide this column"
                                                className="rounded-sm p-0.5 text-zinc-400 transition hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40 dark:hover:text-red-400"
                                            >
                                                <Trash2 className="h-3 w-3" />
                                            </button>
                                        </div>

                                        <div className="relative">
                                            <input
                                                type="text"
                                                inputMode="decimal"
                                                value={col.mark}
                                                onChange={(e) =>
                                                    updateMark(
                                                        col.key,
                                                        e.target.value,
                                                    )
                                                }
                                                placeholder="—"
                                                className="w-full rounded-sm border border-zinc-200 bg-white px-2 py-1.5 text-center font-mono text-sm font-semibold text-zinc-900 focus:border-[#082B66] focus:outline-none focus:ring-2 focus:ring-[#082B66]/30 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white dark:focus:border-orange-400 dark:focus:ring-orange-400/30"
                                            />
                                            {clean && (
                                                <CheckCircle2 className="pointer-events-none absolute -right-1 -top-1 h-3.5 w-3.5 text-emerald-500" />
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Notifications */}
                    {saveError && (
                        <div className="mt-3 flex items-start gap-2 rounded-sm border-l-4 border-red-500 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-600 dark:bg-red-950/30 dark:text-red-300">
                            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                            <span>{saveError}</span>
                        </div>
                    )}
                    {saveSuccess && !saveError && (
                        <div className="mt-3 flex items-start gap-2 rounded-sm border-l-4 border-emerald-500 bg-emerald-50 px-3 py-2 text-xs text-emerald-700 dark:border-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-300">
                            <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                            <span>{saveSuccess}</span>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="mt-3 flex items-center justify-end gap-2">
                        <button
                            type="button"
                            onClick={saveAll}
                            disabled={saving || !hasAnyMark || !isDirty}
                            className="inline-flex items-center gap-2 rounded-sm bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {saving ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                                <Save className="h-3.5 w-3.5" />
                            )}
                            {saving ? "Saving…" : "Save Changes"}
                        </button>
                    </div>
                </div>
            )}
        </section>
    );
}