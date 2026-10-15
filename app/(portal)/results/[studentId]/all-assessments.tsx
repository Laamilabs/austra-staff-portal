"use client";

import { ChevronDown, FileText } from "lucide-react";

import {
    AssessmentType,
    Result,
    ResultStatus,
    formatAssessmentLabel,
    getResultUnitId,
} from "@/app/types/results";

import { UnitCourseLookup } from "../utils";

/* -------------------------------------------------------------------------- */
/* Sub-components                                                             */
/* -------------------------------------------------------------------------- */

function StatusPill({ status }: { status: ResultStatus }) {
    const base =
        "inline-flex items-center rounded-sm border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider";
    return status === ResultStatus.COMPLETED ? (
        <span
            className={`${base} border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300`}
        >
            Completed
        </span>
    ) : (
        <span
            className={`${base} border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300`}
        >
            Pending
        </span>
    );
}

function AssessmentTypeLabel({ type }: { type: AssessmentType }) {
    switch (type) {
        case AssessmentType.CAT:
            return <>CAT</>;
        case AssessmentType.PRACTICAL:
            return <>Practical</>;
        case AssessmentType.FINAL_EXAM:
            return <>Final Exam</>;
        default:
            return <>Assessment</>;
    }
}

/**
 * Renders the course for a result's unit, resolved through the lookup.
 * Falls back to a populated `unit.courseId` when the backend provides one.
 */
function CourseCell({
    unitId,
    lookup,
}: {
    unitId: Result["unitId"];
    lookup: UnitCourseLookup;
}) {
    // 1. Try the lookup first.
    const uid = getResultUnitId(unitId);
    const ref = uid ? lookup(uid) : null;
    if (ref) {
        return (
            <div>
                <div className="font-mono text-xs font-bold text-[#082B66] dark:text-orange-400">
                    {ref.courseCode}
                </div>
                <div className="text-[11px] text-zinc-500 dark:text-zinc-400">
                    {ref.courseName}
                </div>
            </div>
        );
    }

    // 2. Fall back to a populated courseId on the unit.
    if (typeof unitId === "object" && unitId) {
        const raw = (unitId as { courseId?: unknown }).courseId;
        if (raw) {
            const obj =
                typeof raw === "string"
                    ? { _id: raw }
                    : (raw as {
                        _id?: string;
                        courseCode?: string;
                        code?: string;
                        name?: string;
                    });
            return (
                <div>
                    <div className="font-mono text-xs font-bold text-[#082B66] dark:text-orange-400">
                        {obj.courseCode ?? obj.code ?? "—"}
                    </div>
                    {obj.name && (
                        <div className="text-[11px] text-zinc-500 dark:text-zinc-400">
                            {obj.name}
                        </div>
                    )}
                </div>
            );
        }
    }

    return <span className="text-xs text-zinc-400">—</span>;
}

/* -------------------------------------------------------------------------- */
/* AllAssessments                                                             */
/* -------------------------------------------------------------------------- */

/**
 * Collapsible table of every raw assessment result for a student.
 *
 * Closed by default — the aggregated per-course sections are the primary
 * view. The details/summary pattern gives us native disclosure semantics
 * (keyboard, screen reader, no state to manage).
 */
export function AllAssessments({
    results,
    lookup,
    defaultOpen = false,
}: {
    results: Result[];
    lookup: UnitCourseLookup;
    defaultOpen?: boolean;
}) {
    const count = results.length;

    return (
        <details
            open={defaultOpen}
            className="group overflow-hidden rounded-sm border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
        >
            <summary className="flex cursor-pointer list-none items-center gap-2 border-b border-transparent bg-zinc-50 px-4 py-3 transition hover:bg-zinc-100 group-open:border-zinc-200 dark:bg-zinc-800/50 dark:hover:bg-zinc-800 dark:group-open:border-zinc-800 [&::-webkit-details-marker]:hidden">
                <ChevronDown
                    className="h-4 w-4 shrink-0 -rotate-90 text-zinc-500 transition-transform group-open:rotate-0 dark:text-zinc-400"
                    aria-hidden
                />
                <FileText
                    className="h-4 w-4 shrink-0 text-zinc-500 dark:text-zinc-400"
                    aria-hidden
                />
                <h2 className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">
                    All Recorded Assessments
                </h2>
                <span className="text-xs text-zinc-500 dark:text-zinc-400">
                    · {count} {count === 1 ? "result" : "results"}
                </span>
            </summary>

            {count === 0 ? (
                <p className="px-4 py-6 text-center text-xs text-zinc-500 dark:text-zinc-400">
                    No assessments recorded yet.
                </p>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-left text-sm">
                        <thead className="border-b border-zinc-200 font-medium text-zinc-600 dark:border-zinc-800 dark:text-zinc-400">
                            <tr>
                                <th className="px-4 py-3">Course</th>
                                <th className="px-4 py-3">Unit</th>
                                <th className="px-4 py-3">Assessment</th>
                                <th className="px-4 py-3">Marks</th>
                                <th className="px-4 py-3">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                            {results.map((r) => (
                                <tr
                                    key={r._id}
                                    className="hover:bg-zinc-50/70 dark:hover:bg-zinc-800/50"
                                >
                                    <td className="px-4 py-3">
                                        <CourseCell
                                            unitId={r.unitId}
                                            lookup={lookup}
                                        />
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="font-mono text-xs font-bold text-[#082B66] dark:text-orange-400">
                                            {typeof r.unitId === "object" &&
                                                r.unitId?.code
                                                ? r.unitId.code
                                                : "—"}
                                        </div>
                                        <div className="text-xs text-zinc-600 dark:text-zinc-400">
                                            {typeof r.unitId === "object" &&
                                                r.unitId?.name
                                                ? r.unitId.name
                                                : "Unknown unit"}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-xs text-zinc-700 dark:text-zinc-200">
                                        {formatAssessmentLabel(r)}
                                        <span className="ml-2 text-zinc-400">
                                            (
                                            <AssessmentTypeLabel
                                                type={r.assessmentType}
                                            />
                                            )
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 font-mono text-xs font-bold text-zinc-800 dark:text-zinc-100">
                                        {r.marks}%
                                    </td>
                                    <td className="px-4 py-3">
                                        <StatusPill status={r.status} />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </details>
    );
}