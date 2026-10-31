"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import {
    AlertCircle,
    BookOpen,
    CheckCircle2,
    ChevronDown,
    Info,
    Loader2,
    Minus,
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
    MarkedEntry,
    Template,
    applyTemplateToColumns,
    buildColumnsFromResults,
    buildExistingFromResults,
    columnKey,
    columnLabel,
    computeUnitScore,
    gradeTone,
    labelOf,
    sortColumns,
} from "./utils";

/* -------------------------------------------------------------------------- */
/* Shared styles                                                              */
/* -------------------------------------------------------------------------- */

const btnBase =
    "inline-flex items-center justify-center gap-2 rounded-sm text-xs font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 disabled:cursor-not-allowed disabled:opacity-50";
const btnSecondary = `${btnBase} border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800`;
const btnPrimary = `${btnBase} bg-[#082B66] text-white hover:bg-[#082B66]/90 dark:bg-orange-400 dark:text-zinc-900 dark:hover:bg-orange-400/90`;

const fieldLabel =
    "text-[10px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400";

const TYPE_OPTIONS: { value: AssessmentType; label: string }[] = [
    { value: AssessmentType.CAT, label: "CAT" },
    { value: AssessmentType.PRACTICAL, label: "Practical" },
    { value: AssessmentType.FINAL_EXAM, label: "Final Exam" },
];

/* -------------------------------------------------------------------------- */
/* Unit panel — one per unit                                                  */
/* -------------------------------------------------------------------------- */

export function UnitPanel({
    unit,
    studentId,
    initialResults,
    defaultExpanded = true,
    template,
    templateVersion,
    expandVersion = 0,
    expandTo = true,
    onDraftChange,
}: {
    unit: Unit;
    studentId: string;
    initialResults: Result[];
    defaultExpanded?: boolean;
    template: Template;
    templateVersion: number;
    /** Increment to push `expandTo` onto every panel at once. */
    expandVersion?: number;
    /** Target expanded state when `expandVersion` changes. */
    expandTo?: boolean;
    onDraftChange?: (unitId: string, drafts: MarkedEntry[]) => void;
}) {
    const bodyId = useId();
    const [expanded, setExpanded] = useState(defaultExpanded);

    // Template-seeded initial columns: 2 CATs + Final by default. Users
    // edit and save immediately — no "Apply" click needed.
    const [columns, setColumns] = useState<Column[]>(() =>
        applyTemplateToColumns(
            template,
            buildColumnsFromResults(initialResults),
        ),
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
        setSaveError(null);
        setSaveSuccess(null);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [templateVersion]);

    /* ------------------------ Global expand/collapse ------------------- */

    const lastExpandVersionRef = useRef(0);

    useEffect(() => {
        if (expandVersion === 0) return;
        if (expandVersion === lastExpandVersionRef.current) return;
        lastExpandVersionRef.current = expandVersion;
        setExpanded(expandTo);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [expandVersion]);

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

    /* ---------------------- Live score for this unit ------------------ */

    const drafts = useMemo<MarkedEntry[]>(() => {
        const out: MarkedEntry[] = [];
        for (const col of columns) {
            if (col.mark === "") continue;
            const n = Number(col.mark);
            if (!Number.isFinite(n)) continue;
            out.push({
                assessmentType: col.assessmentType,
                assessmentNumber: col.assessmentNumber,
                marks: n,
            });
        }
        return out;
    }, [columns]);

    const unitScore = useMemo(() => computeUnitScore(drafts), [drafts]);

    /** What a pending unit still needs, shown as a hint on touch screens. */
    const missingHint = useMemo(() => {
        const hasContinuous = drafts.some(
            (d) => d.assessmentType !== AssessmentType.FINAL_EXAM,
        );
        const hasFinal = drafts.some(
            (d) => d.assessmentType === AssessmentType.FINAL_EXAM,
        );
        const need: string[] = [];
        if (!hasContinuous) need.push("at least one CAT or practical");
        if (!hasFinal) need.push("a final exam mark");
        return need;
    }, [drafts]);

    const onDraftChangeRef = useRef(onDraftChange);
    useEffect(() => {
        onDraftChangeRef.current = onDraftChange;
    }, [onDraftChange]);

    useEffect(() => {
        onDraftChangeRef.current?.(unit._id, drafts);
    }, [drafts, unit._id]);

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
            if (raw === "") continue;

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
                `${parts.join(", ") || "0 saved"}, ${failed} failed. ${
                    failures[0]
                }${failures.length > 1 ? ` (+${failures.length - 1} more)` : ""}`,
            );
            if (created || updated) {
                setSaveSuccess(`Saved: ${parts.join(", ")}.`);
            }
        }
    };

    /* ------------------------------ Render ---------------------------- */

    const edge = isDirty
        ? "border-l-orange-400"
        : unitScore.complete
          ? "border-l-emerald-500"
          : "border-l-zinc-300 dark:border-l-zinc-700";

    return (
        <section
            className={`overflow-hidden rounded-sm border border-l-[3px] border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900 ${edge}`}
        >
            {/* ------------------------------ Header ------------------------------ */}
            <button
                type="button"
                onClick={() => setExpanded((v) => !v)}
                className="flex w-full items-start gap-3 px-3 py-3 text-left transition-colors hover:bg-zinc-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-orange-400 sm:px-4 dark:hover:bg-zinc-800/40"
                aria-expanded={expanded}
                aria-controls={bodyId}
            >
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-sm bg-[#082B66]/5 text-[#082B66] dark:bg-orange-400/10 dark:text-orange-400">
                    <ChevronDown
                        className={`h-3.5 w-3.5 transition-transform ${
                            expanded ? "" : "-rotate-90"
                        }`}
                    />
                </span>

                <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span className="inline-flex items-center gap-1 font-mono text-[11px] font-bold text-[#082B66] dark:text-orange-400">
                            <BookOpen className="h-3 w-3" />
                            {unit.code}
                        </span>
                        <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
                            {columns.length} assessment
                            {columns.length === 1 ? "" : "s"}
                        </span>
                        {isDirty && (
                            <span className="inline-flex items-center gap-1 rounded-sm bg-orange-400/10 px-1.5 py-0.5 text-[10px] font-semibold text-orange-600 ring-1 ring-inset ring-orange-400/30 dark:text-orange-400">
                                <span className="h-1.5 w-1.5 rounded-full bg-orange-400" />
                                Unsaved
                            </span>
                        )}
                    </span>
                    <span className="mt-0.5 block text-sm font-semibold leading-snug text-zinc-900 dark:text-white">
                        {unit.name}
                    </span>
                </span>

                <span className="flex shrink-0 flex-col items-end gap-1 sm:flex-row sm:items-center sm:gap-2">
                    {unitScore.complete ? (
                        <>
                            <span className="font-mono text-sm font-bold tabular-nums text-zinc-800 dark:text-zinc-100">
                                {unitScore.score.toFixed(1)}%
                            </span>
                            <span
                                className={`inline-flex items-center whitespace-nowrap rounded-sm px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset ${gradeTone(
                                    unitScore.grade,
                                )}`}
                            >
                                {unitScore.grade}
                            </span>
                        </>
                    ) : (
                        <span className="rounded-sm bg-zinc-500/10 px-2 py-0.5 text-[10px] font-semibold text-zinc-500 ring-1 ring-inset ring-zinc-500/20 dark:text-zinc-400">
                            Pending
                        </span>
                    )}
                </span>
            </button>

            {/* ------------------------------- Body ------------------------------- */}
            {expanded && (
                <div
                    id={bodyId}
                    className="space-y-3 border-t border-zinc-100 p-3 sm:p-4 dark:border-zinc-800"
                >
                    {/* Score breakdown / hint */}
                    {unitScore.complete ? (
                        <dl className="grid grid-cols-3 gap-2">
                            <div className="rounded-sm border border-zinc-200 bg-zinc-50/70 px-2.5 py-2 dark:border-zinc-800 dark:bg-zinc-800/30">
                                <dt className={fieldLabel}>
                                    CAT/Prac avg · ×30%
                                </dt>
                                <dd className="mt-0.5 font-mono text-sm font-bold tabular-nums text-zinc-800 dark:text-zinc-100">
                                    {unitScore.continuousAvg.toFixed(1)}
                                </dd>
                            </div>
                            <div className="rounded-sm border border-zinc-200 bg-zinc-50/70 px-2.5 py-2 dark:border-zinc-800 dark:bg-zinc-800/30">
                                <dt className={fieldLabel}>Final · ×70%</dt>
                                <dd className="mt-0.5 font-mono text-sm font-bold tabular-nums text-zinc-800 dark:text-zinc-100">
                                    {unitScore.finalMark.toFixed(1)}
                                </dd>
                            </div>
                            <div className="rounded-sm border border-[#082B66]/20 bg-[#082B66]/5 px-2.5 py-2 dark:border-orange-400/30 dark:bg-orange-400/10">
                                <dt className={fieldLabel}>Unit score</dt>
                                <dd className="mt-0.5 font-mono text-sm font-bold tabular-nums text-[#082B66] dark:text-orange-400">
                                    {unitScore.score.toFixed(1)}%
                                </dd>
                            </div>
                        </dl>
                    ) : (
                        <p className="flex items-start gap-2 rounded-sm border border-zinc-200 bg-zinc-50/70 px-3 py-2 text-[11px] text-zinc-600 dark:border-zinc-800 dark:bg-zinc-800/30 dark:text-zinc-300">
                            <Info className="mt-px h-3.5 w-3.5 shrink-0 text-[#082B66] dark:text-orange-400" />
                            <span>
                                To grade this unit, add{" "}
                                <b className="font-semibold">
                                    {missingHint.join(" and ")}
                                </b>
                                .
                            </span>
                        </p>
                    )}

                    {/* Toolbar */}
                    <div className="flex items-center justify-between gap-2">
                        <h4 className={fieldLabel}>Assessments</h4>
                        {!showAddColumn && (
                            <button
                                type="button"
                                onClick={openAddColumn}
                                className={`${btnPrimary} h-11 px-3.5 sm:h-9`}
                            >
                                <Plus className="h-3.5 w-3.5" />
                                Add Assessment
                            </button>
                        )}
                    </div>

                    {/* Add-assessment form */}
                    {showAddColumn && (
                        <div className="space-y-3 rounded-sm border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-700 dark:bg-zinc-800/60">
                            <div>
                                <p className={`${fieldLabel} mb-1.5`}>Type</p>
                                <div
                                    role="radiogroup"
                                    aria-label="Assessment type"
                                    className="grid grid-cols-3 overflow-hidden rounded-sm border border-zinc-200 dark:border-zinc-700"
                                >
                                    {TYPE_OPTIONS.map((o, i) => {
                                        const on = newColType === o.value;
                                        return (
                                            <button
                                                key={o.value}
                                                type="button"
                                                role="radio"
                                                aria-checked={on}
                                                onClick={() =>
                                                    setNewColType(o.value)
                                                }
                                                className={`h-11 text-xs font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-orange-400 sm:h-9 ${
                                                    i > 0
                                                        ? "border-l border-zinc-200 dark:border-zinc-700"
                                                        : ""
                                                } ${
                                                    on
                                                        ? "bg-[#082B66] text-white dark:bg-orange-400 dark:text-zinc-900"
                                                        : "bg-white text-zinc-600 hover:bg-zinc-50 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
                                                }`}
                                            >
                                                {o.label}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {newColType === AssessmentType.CAT && (
                                <div className="flex items-center justify-between gap-3">
                                    <span className={fieldLabel}>CAT No.</span>
                                    <div className="inline-flex overflow-hidden rounded-sm border border-zinc-200 dark:border-zinc-700">
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setNewColCatNumber((v) =>
                                                    String(
                                                        Math.max(
                                                            1,
                                                            (Number(v) || 1) - 1,
                                                        ),
                                                    ),
                                                )
                                            }
                                            aria-label="Lower CAT number"
                                            className="flex h-11 w-11 items-center justify-center bg-white text-zinc-700 transition hover:bg-zinc-50 sm:h-9 sm:w-9 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
                                        >
                                            <Minus className="h-3.5 w-3.5" />
                                        </button>
                                        <input
                                            type="number"
                                            inputMode="numeric"
                                            min={1}
                                            value={newColCatNumber}
                                            onChange={(e) =>
                                                setNewColCatNumber(
                                                    e.target.value,
                                                )
                                            }
                                            aria-label="CAT number"
                                            className="h-11 w-14 border-x border-zinc-200 bg-white text-center text-sm font-bold tabular-nums text-zinc-900 [appearance:textfield] focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[#082B66]/30 sm:h-9 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white dark:focus:ring-orange-400/30 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                                        />
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setNewColCatNumber((v) =>
                                                    String(
                                                        (Number(v) || 0) + 1,
                                                    ),
                                                )
                                            }
                                            aria-label="Raise CAT number"
                                            className="flex h-11 w-11 items-center justify-center bg-white text-zinc-700 transition hover:bg-zinc-50 sm:h-9 sm:w-9 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
                                        >
                                            <Plus className="h-3.5 w-3.5" />
                                        </button>
                                    </div>
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-2 sm:flex sm:justify-end">
                                <button
                                    type="button"
                                    onClick={() => setShowAddColumn(false)}
                                    className={`${btnSecondary} h-11 px-4 sm:h-9`}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={confirmAddColumn}
                                    className={`${btnPrimary} h-11 px-4 sm:h-9`}
                                >
                                    Add
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Mark tiles */}
                    {columns.length === 0 ? (
                        <p className="rounded-sm border border-dashed border-zinc-300 px-4 py-6 text-center text-xs text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
                            No assessments recorded for this unit yet. Add a
                            column, or use the template.
                        </p>
                    ) : (
                        <div className="grid grid-cols-[repeat(auto-fill,minmax(8.5rem,1fr))] gap-2">
                            {columns.map((col) => {
                                const ex = existing[col.key];
                                const num = Number(col.mark);
                                const invalid =
                                    col.mark !== "" &&
                                    (!Number.isFinite(num) ||
                                        num < 0 ||
                                        num > 100);
                                const saved =
                                    !!ex &&
                                    col.mark !== "" &&
                                    num === ex.marks;
                                const edited = !!ex && !saved;
                                const fresh = !ex && col.mark !== "";

                                const tone = invalid
                                    ? "border-red-400 bg-red-50/60 dark:border-red-700 dark:bg-red-950/20"
                                    : edited || fresh
                                      ? "border-orange-400 bg-orange-50/50 dark:bg-orange-400/5"
                                      : "border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900";

                                return (
                                    <div
                                        key={col.key}
                                        className={`flex flex-col gap-1.5 rounded-sm border p-2.5 transition-colors ${tone}`}
                                    >
                                        <div className="flex items-center justify-between gap-1">
                                            <span className="truncate text-[11px] font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-300">
                                                {columnLabel(col)}
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    removeColumn(col.key)
                                                }
                                                title="Hide this column"
                                                aria-label={`Hide ${columnLabel(col)} column`}
                                                className="-mr-1.5 -mt-1.5 flex h-9 w-9 items-center justify-center rounded-sm text-zinc-400 transition hover:bg-red-50 hover:text-red-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 sm:-mr-1 sm:-mt-1 sm:h-7 sm:w-7 dark:hover:bg-red-950/40 dark:hover:text-red-400"
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </button>
                                        </div>

                                        <div className="relative">
                                            <input
                                                type="text"
                                                inputMode="decimal"
                                                enterKeyHint="next"
                                                value={col.mark}
                                                onChange={(e) =>
                                                    updateMark(
                                                        col.key,
                                                        e.target.value,
                                                    )
                                                }
                                                onFocus={(e) =>
                                                    e.target.select()
                                                }
                                                placeholder="—"
                                                aria-label={`${columnLabel(col)} mark`}
                                                aria-invalid={invalid}
                                                className="h-12 w-full rounded-sm border border-zinc-200 bg-white pl-2 pr-9 text-center font-mono text-lg font-semibold tabular-nums text-zinc-900 focus:border-[#082B66] focus:outline-none focus:ring-2 focus:ring-[#082B66]/30 sm:h-10 sm:text-base dark:border-zinc-700 dark:bg-zinc-800 dark:text-white dark:focus:border-orange-400 dark:focus:ring-orange-400/30"
                                            />
                                            <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-medium text-zinc-400">
                                                /100
                                            </span>
                                        </div>

                                        <p
                                            className={`flex h-4 items-center gap-1 text-[10px] font-semibold ${
                                                invalid
                                                    ? "text-red-600 dark:text-red-400"
                                                    : saved
                                                      ? "text-emerald-600 dark:text-emerald-400"
                                                      : edited || fresh
                                                        ? "text-orange-600 dark:text-orange-400"
                                                        : "text-zinc-400"
                                            }`}
                                        >
                                            {invalid ? (
                                                <>
                                                    <AlertCircle className="h-3 w-3" />
                                                    Must be 0–100
                                                </>
                                            ) : saved ? (
                                                <>
                                                    <CheckCircle2 className="h-3 w-3" />
                                                    Saved
                                                </>
                                            ) : edited ? (
                                                "Edited"
                                            ) : fresh ? (
                                                "New"
                                            ) : (
                                                "Empty"
                                            )}
                                        </p>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Messages */}
                    {saveError && (
                        <div
                            role="alert"
                            className="flex items-start gap-2 rounded-sm border-l-4 border-red-500 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-600 dark:bg-red-950/30 dark:text-red-300"
                        >
                            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                            <span>{saveError}</span>
                        </div>
                    )}
                    {saveSuccess && !saveError && (
                        <div
                            role="status"
                            className="flex items-start gap-2 rounded-sm border-l-4 border-emerald-500 bg-emerald-50 px-3 py-2 text-xs text-emerald-700 dark:border-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-300"
                        >
                            <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                            <span>{saveSuccess}</span>
                        </div>
                    )}

                    {/* Footer */}
                    <div className="flex items-center justify-between gap-3 border-t border-zinc-100 pt-3 dark:border-zinc-800">
                        {isDirty && (
                            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-orange-600 dark:text-orange-400">
                                <span className="h-1.5 w-1.5 rounded-full bg-orange-400" />
                                Unsaved changes
                            </span>
                        )}
                        <button
                            type="button"
                            onClick={saveAll}
                            disabled={saving || !hasAnyMark || !isDirty}
                            className={`${btnBase} h-12 flex-1 bg-emerald-600 px-4 text-white hover:bg-emerald-700 sm:h-9 sm:flex-none sm:px-3.5`}
                        >
                            {saving ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <Save className="h-4 w-4" />
                            )}
                            {saving ? "Saving…" : "Save Changes"}
                        </button>
                    </div>
                </div>
            )}
        </section>
    );
}