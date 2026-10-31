import { AssessmentType, Result, marksToGrade } from "@/app/types/results";
import { Student } from "@/app/types/students";

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

export type ColumnKey = string; // "cat:1" | "practical:" | "final_exam:"

export interface Column {
    key: ColumnKey;
    assessmentType: AssessmentType;
    assessmentNumber?: number;
    /** Current raw input value for this column. */
    mark: string;
}

export interface ExistingCell {
    resultId: string;
    marks: number;
}

/** Minimal shape needed to compute a unit score (also satisfied by `Result`). */
export interface MarkedEntry {
    assessmentType: AssessmentType;
    assessmentNumber?: number;
    marks: number;
}

export interface Template {
    catCount: number;
    hasPractical: boolean;
    hasFinalExam: boolean;
}

export const DEFAULT_TEMPLATE: Template = {
    catCount: 2,
    hasPractical: false,
    hasFinalExam: true,
};

/* -------------------------------------------------------------------------- */
/* Grade helpers                                                              */
/* -------------------------------------------------------------------------- */

/**
 * Compute a single unit's projected score (0–100).
 * Continuous = average of all CATs + practicals × 30%.
 * Final      = final exam mark × 70%.
 */
export function computeUnitScore(entries: MarkedEntry[]): {
    complete: boolean;
    score: number;
    continuousAvg: number;
    finalMark: number;
    grade: string | null;
} {
    const valid = entries.filter(
        (r) => typeof r.marks === "number" && !Number.isNaN(r.marks),
    );
    const cats = valid.filter((r) => r.assessmentType === AssessmentType.CAT);
    const practicals = valid.filter(
        (r) => r.assessmentType === AssessmentType.PRACTICAL,
    );
    const finals = valid.filter(
        (r) => r.assessmentType === AssessmentType.FINAL_EXAM,
    );
    const continuous = [...cats, ...practicals];

    if (continuous.length === 0 || finals.length === 0) {
        return {
            complete: false,
            score: 0,
            continuousAvg: 0,
            finalMark: 0,
            grade: null,
        };
    }

    const continuousAvg =
        continuous.reduce((s, r) => s + r.marks, 0) / continuous.length;
    const finalMark = finals[0].marks;
    const score = continuousAvg * 0.3 + finalMark * 0.7;
    return {
        complete: true,
        score,
        continuousAvg,
        finalMark,
        grade: marksToGrade(score),
    };
}

/** Tailwind tone classes for a grade returned by `marksToGrade`. */
export function gradeTone(grade: string | null): string {
    if (!grade)
        return "bg-zinc-500/10 text-zinc-600 ring-zinc-500/20 dark:text-zinc-300";
    if (grade.includes("Distinction"))
        return "bg-emerald-500/10 text-emerald-700 ring-emerald-500/25 dark:text-emerald-300";
    if (grade.includes("Credit"))
        return "bg-sky-500/10 text-sky-700 ring-sky-500/25 dark:text-sky-300";
    if (grade.includes("Pass"))
        return "bg-amber-400/10 text-amber-700 ring-amber-400/30 dark:text-amber-300";
    if (grade.includes("Fail"))
        return "bg-red-500/10 text-red-700 ring-red-500/25 dark:text-red-300";
    return "bg-zinc-500/10 text-zinc-600 ring-zinc-500/20 dark:text-zinc-300";
}

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

export function extractId(ref: unknown): string | null {
    if (!ref) return null;
    if (typeof ref === "string") return ref;
    if (typeof ref === "object" && "_id" in (ref as Record<string, unknown>)) {
        return String((ref as { _id: string })._id);
    }
    return null;
}

export function studentFullName(s: Student): string {
    return [s.fullName.firstName, s.fullName.middleName, s.fullName.lastName]
        .filter(Boolean)
        .join(" ")
        .trim();
}

export function columnKey(type: AssessmentType, num?: number): ColumnKey {
    return type === AssessmentType.CAT ? `${type}:${num ?? ""}` : `${type}:`;
}

export function labelOf(type: AssessmentType, num?: number): string {
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

export function columnLabel(col: Column): string {
    return labelOf(col.assessmentType, col.assessmentNumber);
}

export function extractStudentId(r: Result): string {
    return typeof r.studentId === "string" ? r.studentId : r.studentId._id;
}

export function sortColumns(cols: Column[]): Column[] {
    const order = (t: AssessmentType) =>
        t === AssessmentType.CAT ? 0 : t === AssessmentType.PRACTICAL ? 1 : 2;

    return [...cols].sort((a, b) => {
        const t = order(a.assessmentType) - order(b.assessmentType);
        if (t !== 0) return t;
        return (a.assessmentNumber ?? 0) - (b.assessmentNumber ?? 0);
    });
}

export function buildColumnsFromResults(results: Result[]): Column[] {
    const byKey = new Map<ColumnKey, Column>();
    for (const r of results) {
        const k = columnKey(r.assessmentType, r.assessmentNumber);
        if (!byKey.has(k)) {
            byKey.set(k, {
                key: k,
                assessmentType: r.assessmentType,
                assessmentNumber: r.assessmentNumber,
                mark: String(r.marks),
            });
        }
    }
    return sortColumns(Array.from(byKey.values()));
}

export function buildExistingFromResults(
    results: Result[],
): Record<ColumnKey, ExistingCell> {
    const out: Record<ColumnKey, ExistingCell> = {};
    for (const r of results) {
        const k = columnKey(r.assessmentType, r.assessmentNumber);
        out[k] = { resultId: r._id, marks: r.marks };
    }
    return out;
}

/**
 * Replace `current` columns with the shape described by `template`, keeping
 * any marks that already existed for matching columns. Marks for columns not
 * in the template are dropped from the view (backend records are untouched).
 */
export function applyTemplateToColumns(
    template: Template,
    current: Column[],
): Column[] {
    const currentByKey = new Map(current.map((c) => [c.key, c]));
    const next: Column[] = [];

    const takeOrEmpty = (
        key: ColumnKey,
        type: AssessmentType,
        num?: number,
    ): Column => {
        const existingCol = currentByKey.get(key);
        return {
            key,
            assessmentType: type,
            assessmentNumber: num,
            mark: existingCol?.mark ?? "",
        };
    };

    for (let i = 1; i <= template.catCount; i++) {
        next.push(
            takeOrEmpty(columnKey(AssessmentType.CAT, i), AssessmentType.CAT, i),
        );
    }

    if (template.hasPractical) {
        next.push(
            takeOrEmpty(
                columnKey(AssessmentType.PRACTICAL),
                AssessmentType.PRACTICAL,
            ),
        );
    }

    if (template.hasFinalExam) {
        next.push(
            takeOrEmpty(
                columnKey(AssessmentType.FINAL_EXAM),
                AssessmentType.FINAL_EXAM,
            ),
        );
    }

    return sortColumns(next);
}

export function templateSummary(t: Template): string {
    const parts: string[] = [];
    for (let i = 1; i <= t.catCount; i++) parts.push(`CAT ${i}`);
    if (t.hasPractical) parts.push("Practical");
    if (t.hasFinalExam) parts.push("Final Exam");
    return parts.length ? parts.join(" · ") : "No columns";
}