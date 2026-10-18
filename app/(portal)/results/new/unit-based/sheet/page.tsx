"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
    AlertCircle,
    ArrowLeft,
    CheckCircle2,
    ClipboardList,
    Loader2,
    Plus,
    RefreshCw,
    Save,
    Trash2,
} from "lucide-react";

import { Student, studentApi } from "@/app/types/students";
import { Unit, unitApi } from "@/app/types/units";
import {
    AssessmentType,
    CreateResultDto,
    Result,
    UpdateResultDto,
    resultApi,
} from "@/app/types/results";

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

interface StudentRow {
    student: Student;
    admissionNumber: string;
}

type ColumnKey = string; // "cat:1" | "practical:" | "final_exam:"
type CellKey = string; // `${ColumnKey}:${studentId}`

interface Column {
    key: ColumnKey;
    assessmentType: AssessmentType;
    assessmentNumber?: number;
    /** studentId -> raw input string. */
    marks: Record<string, string>;
}

interface ExistingCell {
    resultId: string;
    /** Last known server-side value; used to detect real edits. */
    marks: number;
}

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function extractId(ref: unknown): string | null {
    if (!ref) return null;
    if (typeof ref === "string") return ref;
    if (typeof ref === "object" && "_id" in (ref as Record<string, unknown>)) {
        return String((ref as { _id: string })._id);
    }
    return null;
}

function columnKey(type: AssessmentType, num?: number): ColumnKey {
    return type === AssessmentType.CAT ? `${type}:${num ?? ""}` : `${type}:`;
}

function cellKey(colKey: ColumnKey, studentId: string): CellKey {
    return `${colKey}:${studentId}`;
}

function labelOf(type: AssessmentType, num?: number): string {
    switch (type) {
        case AssessmentType.CAT:
            return num ? `CAT ${num}` : "CAT";
        case AssessmentType.PRACTICAL:
            return "Practical";
        case AssessmentType.FINAL_EXAM:
            return "Final Exam";
        default:
            return "Assessment";
    }
}

function columnLabel(col: Column): string {
    return labelOf(col.assessmentType, col.assessmentNumber);
}

function studentFullName(s: Student): string {
    return [s.fullName.firstName, s.fullName.middleName, s.fullName.lastName]
        .filter(Boolean)
        .join(" ")
        .trim();
}

function extractStudentId(r: Result): string {
    return typeof r.studentId === "string" ? r.studentId : r.studentId._id;
}

function buildColumn(
    key: ColumnKey,
    type: AssessmentType,
    num: number | undefined,
    existing: Record<CellKey, ExistingCell>,
): Column {
    const prefix = `${key}:`;
    const marks: Record<string, string> = {};
    for (const [ck, cell] of Object.entries(existing)) {
        if (ck.startsWith(prefix)) {
            const studentId = ck.slice(prefix.length);
            marks[studentId] = String(cell.marks);
        }
    }
    return { key, assessmentType: type, assessmentNumber: num, marks };
}

function sortColumns(cols: Column[]): Column[] {
    const order = (t: AssessmentType) =>
        t === AssessmentType.CAT ? 0 : t === AssessmentType.PRACTICAL ? 1 : 2;

    return [...cols].sort((a, b) => {
        const t = order(a.assessmentType) - order(b.assessmentType);
        if (t !== 0) return t;
        return (a.assessmentNumber ?? 0) - (b.assessmentNumber ?? 0);
    });
}

/* -------------------------------------------------------------------------- */
/* Page                                                                       */
/* -------------------------------------------------------------------------- */

export default function SheetPage() {
    return (
        <Suspense fallback={<PageFallback />}>
            <SheetPageInner />
        </Suspense>
    );
}

function SheetPageInner() {
    const searchParams = useSearchParams();
    const unitId = searchParams.get("unitId") ?? "";
    const courseId = searchParams.get("courseId") ?? "";
    const studentIdsParam = searchParams.get("studentIds") ?? "";

    const studentIds = useMemo(
        () =>
            studentIdsParam
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean),
        [studentIdsParam],
    );

    const [unit, setUnit] = useState<Unit | null>(null);
    const [rows, setRows] = useState<StudentRow[]>([]);
    const [loadingContext, setLoadingContext] = useState(true);
    const [contextError, setContextError] = useState<string | null>(null);

    useEffect(() => {
        if (!unitId) {
            setContextError("No unit specified.");
            setLoadingContext(false);
            return;
        }
        if (studentIds.length === 0) {
            setContextError("No students selected.");
            setLoadingContext(false);
            return;
        }

        let cancelled = false;
        (async () => {
            try {
                setLoadingContext(true);
                setContextError(null);

                const [unitsRes, studentsRes] = await Promise.all([
                    unitApi.getAll(),
                    studentApi.getAll(),
                ]);
                if (cancelled) return;

                const foundUnit =
                    (unitsRes.data ?? []).find((u) => u._id === unitId) ?? null;
                setUnit(foundUnit);

                const nextRows: StudentRow[] = [];
                for (const s of studentsRes.data ?? []) {
                    if (!studentIds.includes(s._id)) continue;

                    let admissionNumber = "";
                    if (courseId) {
                        const enrollment = s.courses.find(
                            (c) => extractId(c.courseId) === courseId,
                        );
                        admissionNumber = enrollment?.admissionNumber ?? "";
                    } else {
                        admissionNumber =
                            s.courses?.[0]?.admissionNumber ?? "";
                    }

                    nextRows.push({ student: s, admissionNumber });
                }

                nextRows.sort((a, b) =>
                    a.admissionNumber.localeCompare(
                        b.admissionNumber,
                        undefined,
                        { numeric: true, sensitivity: "base" },
                    ),
                );

                setRows(nextRows);
            } catch (err: any) {
                if (cancelled) return;
                setContextError(
                    err?.response?.data?.message ??
                    err?.message ??
                    "Failed to load unit context.",
                );
            } finally {
                if (!cancelled) setLoadingContext(false);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [unitId, courseId, studentIdsParam, studentIds]);

    return (
        <main className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
            <div className="mx-auto max-w-full space-y-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
                {/* BACK */}
                <Link
                    href="/results/new/unit-based"
                    className="inline-flex items-center gap-2 text-sm font-semibold text-zinc-500 transition-colors hover:text-[#082B66] dark:text-zinc-400 dark:hover:text-orange-400"
                >
                    <ArrowLeft size={16} />
                    Back to Selection
                </Link>

                {/* HEADER */}
                <header>
                    <h1 className="flex items-center gap-2 text-2xl font-bold text-zinc-900 dark:text-white">
                        <ClipboardList className="h-7 w-7 text-[#082B66] dark:text-orange-400" />
                        Mark Entry Sheet
                    </h1>
                    <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                        {unit
                            ? `${unit.code} — ${unit.name}`
                            : "Enter and edit marks for the selected students."}
                    </p>
                </header>

                {/* CONTEXT ERROR */}
                {contextError && (
                    <div className="flex items-center gap-3 rounded-sm border border-red-200 bg-red-50 p-4 text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-400">
                        <AlertCircle className="h-5 w-5 shrink-0" />
                        <p className="text-sm">{contextError}</p>
                    </div>
                )}

                {/* CONTEXT LOADING */}
                {loadingContext && !contextError && (
                    <div className="flex items-center gap-2 rounded-sm border border-zinc-200 bg-white p-6 text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Loading unit context…
                    </div>
                )}

                {/* SHEET */}
                {!loadingContext && !contextError && rows.length > 0 && (
                    <section className="overflow-hidden rounded-sm border border-zinc-200 border-t-4 border-t-orange-400 bg-white shadow-sm dark:border-zinc-800 dark:border-t-orange-400 dark:bg-zinc-900">
                        <Sheet unitId={unitId} rows={rows} />
                    </section>
                )}

                {!loadingContext &&
                    !contextError &&
                    rows.length === 0 && (
                        <div className="rounded-sm border border-dashed border-zinc-300 bg-white py-12 text-center dark:border-zinc-700 dark:bg-zinc-900">
                            <ClipboardList className="mx-auto mb-3 h-10 w-10 text-zinc-300 dark:text-zinc-700" />
                            <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">
                                No students found
                            </p>
                            <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                                Return to the selection page and pick your
                                students again.
                            </p>
                            <Link
                                href="/results/new/unit-based"
                                className="mt-4 inline-flex items-center gap-2 rounded-sm border border-zinc-300 bg-white px-4 py-2 text-xs font-semibold text-zinc-800 transition hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
                            >
                                <ArrowLeft className="h-3.5 w-3.5" />
                                Back to Selection
                            </Link>
                        </div>
                    )}
            </div>
        </main>
    );
}

/* -------------------------------------------------------------------------- */
/* Sheet                                                                      */
/* -------------------------------------------------------------------------- */

function Sheet({ unitId, rows }: { unitId: string; rows: StudentRow[] }) {
    const [columns, setColumns] = useState<Column[]>([]);
    const [existingCells, setExistingCells] = useState<
        Record<CellKey, ExistingCell>
    >({});

    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);

    const [showAddColumn, setShowAddColumn] = useState(false);
    const [newColType, setNewColType] = useState<AssessmentType>(
        AssessmentType.CAT,
    );
    const [newColCatNumber, setNewColCatNumber] = useState("1");

    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);
    const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

    /* ------------------------------ Load ------------------------------- */

    const loadExisting = async () => {
        try {
            setLoading(true);
            setLoadError(null);

            const res = await resultApi.getByUnit(unitId);
            const list = res.data ?? [];

            const colsByKey = new Map<ColumnKey, Column>();
            const cells: Record<CellKey, ExistingCell> = {};

            for (const r of list) {
                const k = columnKey(r.assessmentType, r.assessmentNumber);

                if (!colsByKey.has(k)) {
                    colsByKey.set(k, {
                        key: k,
                        assessmentType: r.assessmentType,
                        assessmentNumber: r.assessmentNumber,
                        marks: {},
                    });
                }

                const studentId = extractStudentId(r);
                const ck = cellKey(k, studentId);

                cells[ck] = { resultId: r._id, marks: r.marks };
                colsByKey.get(k)!.marks[studentId] = String(r.marks);
            }

            const cols = sortColumns(Array.from(colsByKey.values()));
            setColumns(cols);
            setExistingCells(cells);
        } catch (err: any) {
            setLoadError(
                err?.response?.data?.message ??
                err?.message ??
                "Failed to load existing results for this unit.",
            );
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadExisting();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [unitId]);

    /* ------------------------------ Derived ---------------------------- */

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
        () =>
            columns.some((c) =>
                rows.some(({ student }) => {
                    const v = c.marks[student._id];
                    return v !== undefined && v !== "";
                }),
            ),
        [columns, rows],
    );

    /* --------------------------- Add column ---------------------------- */

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
                `A ${labelOf(newColType, num)} column already exists in this sheet.`,
            );
            return;
        }

        const col = buildColumn(key, newColType, num, existingCells);
        setColumns((prev) => sortColumns([...prev, col]));
        setShowAddColumn(false);
        setSaveError(null);
    };

    const removeColumn = (colKey: ColumnKey) => {
        setColumns((prev) => prev.filter((c) => c.key !== colKey));
        setSaveSuccess(null);
    };

    /* --------------------------- Edit a cell --------------------------- */

    const updateMark = (
        colKey: ColumnKey,
        studentId: string,
        value: string,
    ) => {
        if (value !== "" && !/^\d{0,3}(\.\d{0,2})?$/.test(value)) return;

        setColumns((prev) =>
            prev.map((c) =>
                c.key === colKey
                    ? { ...c, marks: { ...c.marks, [studentId]: value } }
                    : c,
            ),
        );
        setSaveSuccess(null);
    };

    /* ------------------------------- Save ------------------------------ */

    const saveAll = async () => {
        setSaveError(null);
        setSaveSuccess(null);

        if (columns.length === 0) {
            setSaveError("Add at least one assessment column before saving.");
            return;
        }

        type CreateJob = {
            key: CellKey;
            colKey: ColumnKey;
            dto: CreateResultDto;
            marks: number;
        };
        type UpdateJob = {
            key: CellKey;
            resultId: string;
            dto: UpdateResultDto;
            marks: number;
        };

        const creates: CreateJob[] = [];
        const updates: UpdateJob[] = [];
        const invalid: string[] = [];

        for (const col of columns) {
            for (const { student, admissionNumber } of rows) {
                const raw = col.marks[student._id];
                if (raw === undefined || raw === "") continue;

                const mark = Number(raw);
                if (!Number.isFinite(mark) || mark < 0 || mark > 100) {
                    invalid.push(
                        `${columnLabel(col)} — ${admissionNumber || studentFullName(student)
                        }`,
                    );
                    continue;
                }

                const ck = cellKey(col.key, student._id);
                const existing = existingCells[ck];

                if (existing) {
                    if (existing.marks === mark) continue;
                    updates.push({
                        key: ck,
                        resultId: existing.resultId,
                        dto: { marks: mark },
                        marks: mark,
                    });
                } else {
                    creates.push({
                        key: ck,
                        colKey: col.key,
                        marks: mark,
                        dto: {
                            studentId: student._id,
                            unitId,
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
        }

        if (invalid.length > 0) {
            setSaveError(
                `Fix invalid marks before saving: ${invalid
                    .slice(0, 3)
                    .join(", ")}${invalid.length > 3
                    ? ` (+${invalid.length - 3} more)`
                    : ""
                }.`,
            );
            return;
        }

        if (creates.length === 0 && updates.length === 0) {
            setSaveError("Nothing to save — no new or edited marks.");
            return;
        }

        setSaving(true);
        const nextExisting: Record<CellKey, ExistingCell> = {
            ...existingCells,
        };

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

        setExistingCells(nextExisting);
        setSaving(false);

        const parts: string[] = [];
        if (created) parts.push(`${created} added`);
        if (updated) parts.push(`${updated} updated`);

        if (failed === 0) {
            setSaveSuccess(`Saved: ${parts.join(", ")}.`);
        } else {
            setSaveError(
                `${parts.join(", ") || "0 saved"}, ${failed} failed. ${failures[0]
                }${failures.length > 1
                    ? ` (+${failures.length - 1} more)`
                    : ""
                }`,
            );
            if (created || updated) {
                setSaveSuccess(`Saved: ${parts.join(", ")}.`);
            }
        }
    };

    /* ------------------------------- Render ---------------------------- */

    if (loading) {
        return (
            <div className="flex items-center justify-center gap-2 px-5 py-10 text-sm text-zinc-500 dark:text-zinc-400">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading existing results…
            </div>
        );
    }

    if (loadError) {
        return (
            <div className="p-5">
                <div className="flex items-start gap-2 rounded-sm border border-red-200 bg-red-50 p-3 text-xs text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
                    <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    <div className="flex-1">
                        <p>{loadError}</p>
                        <button
                            type="button"
                            onClick={loadExisting}
                            className="mt-2 inline-flex items-center gap-1.5 rounded-sm border border-red-300 bg-white px-2.5 py-1 font-semibold text-red-700 transition hover:bg-red-50 dark:border-red-800 dark:bg-zinc-900 dark:text-red-300 dark:hover:bg-red-950/50"
                        >
                            <RefreshCw className="h-3 w-3" />
                            Retry
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <>
            {/* Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-100 p-5 dark:border-zinc-800">
                <div className="flex flex-wrap items-center gap-2">
                    {!showAddColumn && (
                        <button
                            type="button"
                            onClick={openAddColumn}
                            className="inline-flex items-center gap-2 rounded-sm bg-[#082B66] px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-[#082B66]/90 dark:bg-orange-400 dark:text-zinc-900 dark:hover:bg-orange-400/90"
                        >
                            <Plus className="h-3.5 w-3.5" />
                            Add Assessment Column
                        </button>
                    )}

                    {showAddColumn && (
                        <div className="flex flex-wrap items-end gap-2 rounded-sm border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-700 dark:bg-zinc-800/60">
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
                                    className="cursor-pointer rounded-sm border border-zinc-200 bg-white px-2.5 py-1.5 text-xs focus:border-[#082B66] focus:outline-none focus:ring-2 focus:ring-[#082B66]/30 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white"
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
                                            setNewColCatNumber(e.target.value)
                                        }
                                        className="w-20 rounded-sm border border-zinc-200 bg-white px-2.5 py-1.5 text-xs focus:border-[#082B66] focus:outline-none focus:ring-2 focus:ring-[#082B66]/30 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white"
                                    />
                                </div>
                            )}

                            <button
                                type="button"
                                onClick={confirmAddColumn}
                                className="rounded-sm bg-[#082B66] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[#082B66]/90 dark:bg-orange-400 dark:text-zinc-900 dark:hover:bg-orange-400/90"
                            >
                                Add
                            </button>
                            <button
                                type="button"
                                onClick={() => setShowAddColumn(false)}
                                className="rounded-sm border border-zinc-300 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
                            >
                                Cancel
                            </button>
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={loadExisting}
                        disabled={saving}
                        title="Reload existing results"
                        aria-label="Reload existing results"
                        className="inline-flex h-9 w-9 items-center justify-center rounded-sm border border-zinc-200 bg-white text-zinc-600 transition hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
                    >
                        <RefreshCw className="h-4 w-4" />
                    </button>

                    <button
                        type="button"
                        onClick={saveAll}
                        disabled={saving || !hasAnyMark}
                        className="inline-flex items-center gap-2 rounded-sm bg-emerald-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {saving ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                            <Save className="h-3.5 w-3.5" />
                        )}
                        {saving ? "Saving…" : "Save Marks"}
                    </button>
                </div>
            </div>

            {/* Notifications */}
            {saveError && (
                <div className="mx-5 mt-3 flex items-start gap-2 rounded-sm border-l-4 border-red-500 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-600 dark:bg-red-950/30 dark:text-red-300">
                    <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    <span>{saveError}</span>
                </div>
            )}
            {saveSuccess && !saveError && (
                <div className="mx-5 mt-3 flex items-start gap-2 rounded-sm border-l-4 border-emerald-500 bg-emerald-50 px-3 py-2 text-xs text-emerald-700 dark:border-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-300">
                    <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    <span>{saveSuccess}</span>
                </div>
            )}

            {/* Spreadsheet */}
            {columns.length === 0 ? (
                <div className="px-5 py-10 text-center">
                    <ClipboardList className="mx-auto mb-3 h-10 w-10 text-zinc-300 dark:text-zinc-700" />
                    <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">
                        No assessment columns yet
                    </p>
                    <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                        Add a column to start entering marks. Existing results
                        for this unit load automatically.
                    </p>
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-sm">
                        <thead className="bg-zinc-50 dark:bg-zinc-800/50">
                            <tr>
                                <th className="sticky left-0 z-10 min-w-60 border-b border-zinc-200 bg-zinc-50 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:border-zinc-800 dark:bg-zinc-800/50 dark:text-zinc-400">
                                    Student
                                </th>

                                {columns.map((col) => (
                                    <th
                                        key={col.key}
                                        className="min-w-27.5 border-b border-l border-zinc-200 bg-zinc-50 px-3 py-2 text-center text-xs font-semibold text-zinc-600 dark:border-zinc-800 dark:bg-zinc-800/50 dark:text-zinc-400"
                                    >
                                        <div className="flex items-center justify-center gap-2">
                                            <span className="font-mono text-[11px] font-bold text-[#082B66] dark:text-orange-400">
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
                                    </th>
                                ))}
                            </tr>
                        </thead>

                        <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                            {rows.map(({ student, admissionNumber }) => (
                                <tr
                                    key={student._id}
                                    className="hover:bg-zinc-50/60 dark:hover:bg-zinc-800/40"
                                >
                                    <td className="sticky left-0 z-10 min-w-60 bg-white px-4 py-2 dark:bg-zinc-900">
                                        <div className="flex items-center gap-3">
                                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-sm bg-[#082B66]/5 text-[10px] font-bold uppercase text-[#082B66] dark:bg-orange-400/10 dark:text-orange-400">
                                                {student.fullName
                                                    .firstName?.[0] ?? ""}
                                                {student.fullName
                                                    .lastName?.[0] ?? ""}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="truncate text-xs font-semibold text-zinc-900 dark:text-white">
                                                    {studentFullName(student)}
                                                </p>
                                                <p className="font-mono text-[10px] text-zinc-500 dark:text-zinc-400">
                                                    {admissionNumber || "—"}
                                                </p>
                                            </div>
                                        </div>
                                    </td>

                                    {columns.map((col) => {
                                        const ck = cellKey(
                                            col.key,
                                            student._id,
                                        );
                                        const existing = existingCells[ck];
                                        const raw =
                                            col.marks[student._id] ?? "";
                                        const dirty =
                                            existing &&
                                            String(existing.marks) !== raw;
                                        const clean = existing && !dirty;

                                        return (
                                            <td
                                                key={col.key}
                                                className="border-l border-zinc-100 px-2 py-2 text-center dark:border-zinc-800"
                                            >
                                                <div className="relative inline-flex items-center">
                                                    <input
                                                        type="text"
                                                        inputMode="decimal"
                                                        value={raw}
                                                        onChange={(e) =>
                                                            updateMark(
                                                                col.key,
                                                                student._id,
                                                                e.target.value,
                                                            )
                                                        }
                                                        placeholder="—"
                                                        className="w-16 rounded-sm border border-zinc-200 bg-white px-2 py-1.5 text-center font-mono text-xs font-semibold text-zinc-900 focus:border-[#082B66] focus:outline-none focus:ring-2 focus:ring-[#082B66]/30 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white dark:focus:border-orange-400 dark:focus:ring-orange-400/30"
                                                    />
                                                    {clean && (
                                                        <CheckCircle2 className="pointer-events-none absolute -right-1 -top-1 h-3.5 w-3.5 text-emerald-500" />
                                                    )}
                                                </div>
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </>
    );
}

function PageFallback() {
    return (
        <main className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
            <div className="mx-auto max-w-full px-4 py-10 sm:px-6 lg:px-8">
                <div className="flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading…
                </div>
            </div>
        </main>
    );
}