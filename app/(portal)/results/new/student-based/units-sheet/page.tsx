"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
    AlertCircle,
    ArrowLeft,
    BookOpen,
    CheckCircle2,
    ClipboardList,
    Layers,
    Loader2,
    Plus,
    Sparkles,
    User,
    UserCircle2,
} from "lucide-react";

import { Student, studentApi } from "@/app/types/students";
import { Unit, unitApi } from "@/app/types/units";
import { Course, courseApi } from "@/app/types/courses";
import { Result, resultApi } from "@/app/types/results";

import {
    DEFAULT_TEMPLATE,
    Template,
    extractId,
    extractStudentId,
    studentFullName,
    templateSummary,
} from "./utils";
import { UnitPanel } from "./UnitPanel";

/* -------------------------------------------------------------------------- */
/* Page                                                                       */
/* -------------------------------------------------------------------------- */

export default function StudentUnitsSheetPage() {
    return (
        <Suspense fallback={<PageFallback />}>
            <StudentUnitsSheetPageInner />
        </Suspense>
    );
}

function StudentUnitsSheetPageInner() {
    const searchParams = useSearchParams();
    const studentId = searchParams.get("studentId") ?? "";
    const courseId = searchParams.get("courseId") ?? "";

    const [student, setStudent] = useState<Student | null>(null);
    const [course, setCourse] = useState<Course | null>(null);
    const [units, setUnits] = useState<Unit[]>([]);
    const [resultsByUnit, setResultsByUnit] = useState<
        Record<string, Result[]>
    >({});
    const [admissionNumber, setAdmissionNumber] = useState("");

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    /* ------------------------- Template state -------------------------- */

    const [draftTemplate, setDraftTemplate] =
        useState<Template>(DEFAULT_TEMPLATE);
    const [appliedTemplate, setAppliedTemplate] =
        useState<Template>(DEFAULT_TEMPLATE);
    // Increments each time the user clicks "Apply". Panels watch this value.
    const [templateVersion, setTemplateVersion] = useState(0);
    const [applyFeedback, setApplyFeedback] = useState<string | null>(null);

    useEffect(() => {
        if (!applyFeedback) return;
        const t = setTimeout(() => setApplyFeedback(null), 3000);
        return () => clearTimeout(t);
    }, [applyFeedback]);

    const applyTemplateToAll = () => {
        setAppliedTemplate(draftTemplate);
        setTemplateVersion((v) => v + 1);
        setApplyFeedback(
            `Applied to ${units.length} unit${units.length === 1 ? "" : "s"}.`,
        );
    };

    /* ------------------------------ Fetch ------------------------------ */

    useEffect(() => {
        if (!studentId || !courseId) {
            setError("Missing student or course reference.");
            setLoading(false);
            return;
        }

        let cancelled = false;
        (async () => {
            try {
                setLoading(true);
                setError(null);

                const [studentRes, coursesRes, unitsRes] = await Promise.all([
                    studentApi.getById(studentId),
                    courseApi.getAll(),
                    unitApi.getAll(),
                ]);
                if (cancelled) return;

                const s = studentRes.data;
                setStudent(s);
                setCourse(
                    (coursesRes.data ?? []).find((c) => c._id === courseId) ??
                    null,
                );

                const courseUnits = (unitsRes.data ?? [])
                    .filter((u) => extractId(u.courseId) === courseId)
                    .sort((a, b) =>
                        a.code.localeCompare(b.code, undefined, {
                            numeric: true,
                            sensitivity: "base",
                        }),
                    );
                setUnits(courseUnits);

                // Extract the admission number for this specific enrollment.
                const enrollment = s.courses.find(
                    (c) => extractId(c.courseId) === courseId,
                );
                setAdmissionNumber(enrollment?.admissionNumber ?? "");

                // Load existing results per unit in parallel, filtered to
                // this student.
                const perUnit = await Promise.all(
                    courseUnits.map(async (u) => {
                        try {
                            const res = await resultApi.getByUnit(u._id);
                            return {
                                unitId: u._id,
                                results: (res.data ?? []).filter(
                                    (r) => extractStudentId(r) === studentId,
                                ),
                            };
                        } catch {
                            return { unitId: u._id, results: [] };
                        }
                    }),
                );
                if (cancelled) return;

                const map: Record<string, Result[]> = {};
                for (const { unitId, results } of perUnit) {
                    map[unitId] = results;
                }
                setResultsByUnit(map);
            } catch (err: any) {
                if (cancelled) return;
                setError(
                    err?.response?.data?.message ??
                    err?.message ??
                    "Failed to load student, course or units.",
                );
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [studentId, courseId]);

    const academicRecordHref = `/students/${studentId}/academic-record/${courseId}`;

    /* ------------------------------- Render ---------------------------- */

    return (
        <main className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
            <div className="mx-auto max-w-full space-y-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
                {/* BACK + ACADEMIC PROFILE */}
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <Link
                        href="/results/new/student-based"
                        className="inline-flex items-center gap-2 text-sm font-semibold text-zinc-500 transition-colors hover:text-[#082B66] dark:text-zinc-400 dark:hover:text-orange-400"
                    >
                        <ArrowLeft size={16} />
                        Back to Student Selection
                    </Link>

                    {studentId && courseId && (
                        <Link
                            href={academicRecordHref}
                            className="inline-flex items-center gap-2 rounded-sm border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-700 transition hover:border-[#082B66] hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:border-orange-400 dark:hover:bg-zinc-800"
                        >
                            <UserCircle2 className="h-3.5 w-3.5" />
                            View Academic Profile
                        </Link>
                    )}
                </div>

                {/* HEADER */}
                <header>
                    <h1 className="flex items-center gap-2 text-2xl font-bold text-zinc-900 dark:text-white">
                        <ClipboardList className="h-7 w-7 text-[#082B66] dark:text-orange-400" />
                        Student Mark Sheet
                    </h1>
                    <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                        Enter or edit this student&apos;s marks across every
                        unit in the selected course.
                    </p>
                </header>

                {/* ERROR */}
                {error && (
                    <div className="flex items-center gap-3 rounded-sm border border-red-200 bg-red-50 p-4 text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-400">
                        <AlertCircle className="h-5 w-5 shrink-0" />
                        <p className="text-sm">{error}</p>
                    </div>
                )}

                {/* LOADING */}
                {loading && !error && (
                    <div className="flex items-center gap-2 rounded-sm border border-zinc-200 bg-white p-6 text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Loading student, course and units…
                    </div>
                )}

                {/* STUDENT SUMMARY */}
                {!loading && !error && student && (
                    <section className="flex flex-col gap-3 rounded-sm border border-zinc-200 border-t-4 border-t-orange-400 bg-white p-4 shadow-sm dark:border-zinc-800 dark:border-t-orange-400 dark:bg-zinc-900 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-sm bg-[#082B66]/5 text-sm font-bold uppercase text-[#082B66] dark:bg-orange-400/10 dark:text-orange-400">
                                {student.fullName.firstName?.[0] ?? ""}
                                {student.fullName.lastName?.[0] ?? ""}
                            </div>
                            <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-zinc-900 dark:text-white">
                                    {studentFullName(student)}
                                </p>
                                <p className="font-mono text-[11px] text-zinc-500 dark:text-zinc-400">
                                    {admissionNumber || "—"}
                                </p>
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                            {course && (
                                <span className="inline-flex items-center gap-1.5 rounded-sm bg-[#082B66]/5 px-2 py-1 text-[11px] font-semibold text-[#082B66] dark:bg-orange-400/10 dark:text-orange-400">
                                    <BookOpen className="h-3 w-3" />
                                    {course.courseCode} — {course.name}
                                </span>
                            )}
                            <span className="inline-flex items-center gap-1.5 rounded-sm border border-zinc-200 px-2 py-1 text-[11px] font-semibold text-zinc-600 dark:border-zinc-700 dark:text-zinc-300">
                                <User className="h-3 w-3" />
                                {units.length} unit
                                {units.length === 1 ? "" : "s"}
                            </span>
                        </div>
                    </section>
                )}

                {/* TEMPLATE */}
                {!loading && !error && units.length > 0 && (
                    <section className="overflow-hidden rounded-sm border border-zinc-200 border-t-4 border-t-orange-400 bg-white shadow-sm dark:border-zinc-800 dark:border-t-orange-400 dark:bg-zinc-900">
                        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-100 px-5 py-3 dark:border-zinc-800">
                            <div className="flex items-center gap-3">
                                <span className="flex h-6 w-6 items-center justify-center rounded-sm bg-[#082B66] text-[11px] font-bold text-white dark:bg-orange-400 dark:text-zinc-900">
                                    <Layers className="h-3.5 w-3.5" />
                                </span>
                                <h2 className="text-sm font-bold text-[#082B66] dark:text-white">
                                    Assessment Template
                                </h2>
                            </div>
                            <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
                                Define a column set and apply it to every unit
                                below.
                            </span>
                        </header>

                        <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-end sm:justify-between">
                            <div className="flex flex-wrap items-end gap-4">
                                {/* CAT count */}
                                <div>
                                    <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                                        Number of CATs
                                    </label>
                                    <input
                                        type="number"
                                        min={0}
                                        max={10}
                                        value={draftTemplate.catCount}
                                        onChange={(e) => {
                                            const n = Math.max(
                                                0,
                                                Math.min(
                                                    10,
                                                    Number(e.target.value) || 0,
                                                ),
                                            );
                                            setDraftTemplate((t) => ({
                                                ...t,
                                                catCount: n,
                                            }));
                                        }}
                                        className="w-20 rounded-sm border border-zinc-200 bg-white px-2.5 py-1.5 text-sm font-semibold text-zinc-900 focus:border-[#082B66] focus:outline-none focus:ring-2 focus:ring-[#082B66]/30 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white dark:focus:border-orange-400 dark:focus:ring-orange-400/30"
                                    />
                                </div>

                                {/* Include Practical */}
                                <label className="flex cursor-pointer items-center gap-2">
                                    <input
                                        type="checkbox"
                                        checked={draftTemplate.hasPractical}
                                        onChange={(e) =>
                                            setDraftTemplate((t) => ({
                                                ...t,
                                                hasPractical:
                                                    e.target.checked,
                                            }))
                                        }
                                        className="h-4 w-4 cursor-pointer accent-[#082B66] dark:accent-orange-400"
                                    />
                                    <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-200">
                                        Include Practical
                                    </span>
                                </label>

                                {/* Include Final Exam */}
                                <label className="flex cursor-pointer items-center gap-2">
                                    <input
                                        type="checkbox"
                                        checked={draftTemplate.hasFinalExam}
                                        onChange={(e) =>
                                            setDraftTemplate((t) => ({
                                                ...t,
                                                hasFinalExam:
                                                    e.target.checked,
                                            }))
                                        }
                                        className="h-4 w-4 cursor-pointer accent-[#082B66] dark:accent-orange-400"
                                    />
                                    <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-200">
                                        Include Final Exam
                                    </span>
                                </label>
                            </div>

                            <button
                                type="button"
                                onClick={applyTemplateToAll}
                                className="inline-flex items-center gap-1.5 rounded-sm bg-[#082B66] px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-[#082B66]/90 dark:bg-orange-400 dark:text-zinc-900 dark:hover:bg-orange-400/90"
                            >
                                <Sparkles className="h-3.5 w-3.5" />
                                Apply to All Units
                            </button>
                        </div>

                        {/* Preview + feedback */}
                        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-100 bg-zinc-50/60 px-5 py-3 dark:border-zinc-800 dark:bg-zinc-800/30">
                            <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                                <span className="font-semibold uppercase tracking-wider">
                                    Preview:
                                </span>{" "}
                                <span className="font-mono text-zinc-700 dark:text-zinc-200">
                                    {templateSummary(draftTemplate)}
                                </span>
                            </p>

                            {applyFeedback && (
                                <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                    {applyFeedback}
                                </span>
                            )}
                        </div>
                    </section>
                )}

                {/* EMPTY */}
                {!loading && !error && units.length === 0 && (
                    <div className="rounded-sm border border-dashed border-zinc-300 bg-white py-12 text-center dark:border-zinc-700 dark:bg-zinc-900">
                        <BookOpen className="mx-auto mb-3 h-10 w-10 text-zinc-300 dark:text-zinc-700" />
                        <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">
                            No units for this course
                        </p>
                        <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                            Add units to{" "}
                            <strong>{course?.courseCode ?? "the course"}</strong>{" "}
                            first, then come back.
                        </p>
                        <Link
                            href="/units/new"
                            className="mt-4 inline-flex items-center gap-2 rounded-sm border border-zinc-300 bg-white px-4 py-2 text-xs font-semibold text-zinc-800 transition hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
                        >
                            <Plus className="h-3.5 w-3.5" />
                            Create Unit
                        </Link>
                    </div>
                )}

                {/* UNITS */}
                {!loading && !error && units.length > 0 && (
                    <div className="space-y-3">
                        {units.map((u, idx) => (
                            <UnitPanel
                                key={u._id}
                                unit={u}
                                studentId={studentId}
                                initialResults={resultsByUnit[u._id] ?? []}
                                defaultExpanded={idx === 0}
                                template={appliedTemplate}
                                templateVersion={templateVersion}
                            />
                        ))}
                    </div>
                )}
            </div>
        </main>
    );
}

/* -------------------------------------------------------------------------- */
/* Fallback                                                                   */
/* -------------------------------------------------------------------------- */

function PageFallback() {
    return (
        <main className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
            <div className="mx-auto max-w-full py-10 sm:px-6 lg:px-8">
                <div className="flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading…
                </div>
            </div>
        </main>
    );
}