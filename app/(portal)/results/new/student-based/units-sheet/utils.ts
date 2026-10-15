import { AssessmentType, Result } from "@/app/types/results";
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