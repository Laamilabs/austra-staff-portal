"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
    AlertCircle,
    ArrowLeft,
    Award,
    BookOpen,
    CheckCircle2,
    ChevronDown,
    ChevronUp,
    ClipboardList,
    Info,
    Layers,
    Loader2,
    Minus,
    Plus,
    Sparkles,
    UserCircle2,
} from "lucide-react";

import { Student, studentApi } from "@/app/types/students";
import { Unit, unitApi } from "@/app/types/units";
import { Course, courseApi } from "@/app/types/courses";
import { Result, marksToGrade, resultApi } from "@/app/types/results";

import {
    DEFAULT_TEMPLATE,
    MarkedEntry,
    Template,
    computeUnitScore,
    extractId,
    extractStudentId,
    gradeTone,
    studentFullName,
    templateSummary,
} from "./utils";
import { UnitPanel } from "./UnitPanel";

/* -------------------------------------------------------------------------- */
/* Shared styles                                                              */
/* -------------------------------------------------------------------------- */

const btnBase =
    "inline-flex items-center justify-center gap-2 rounded-sm text-xs font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 disabled:cursor-not-allowed disabled:opacity-50";
const btnSecondary = `${btnBase} border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800`;
const btnPrimary = `${btnBase} bg-[#082B66] text-white hover:bg-[#082B66]/90 dark:bg-orange-400 dark:text-zinc-900 dark:hover:bg-orange-400/90`;
/** 44px touch targets on phones, compact on larger screens. */
const btnSize = "h-11 px-3.5 sm:h-9";

const card =
    "rounded-sm border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900";

const fieldLabel =
    "text-[10px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400";

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

interface GradePreview {
    overallScore: number;
    completeCount: number;
    incompleteCount: number;
    totalCount: number;
    hasComplete: boolean;
    grade: string | null;
    perUnit: {
        id: string;
        code: string;
        name: string; // NEW
        complete: boolean;
    }[];
}

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
    const [draftByUnit, setDraftByUnit] = useState<
        Record<string, MarkedEntry[]>
    >({});
    const [admissionNumber, setAdmissionNumber] = useState("");

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    /* ------------------------- Template state -------------------------- */

    const [draftTemplate, setDraftTemplate] =
        useState<Template>(DEFAULT_TEMPLATE);
    const [appliedTemplate, setAppliedTemplate] =
        useState<Template>(DEFAULT_TEMPLATE);
    const [templateVersion, setTemplateVersion] = useState(0);
    const [applyFeedback, setApplyFeedback] = useState<string | null>(null);

    /* -------------------- Expand / collapse all state ------------------ */

    const [expandAll, setExpandAll] = useState(true);
    const [expandVersion, setExpandVersion] = useState(0);

    const toggleExpandAll = () => {
        setExpandAll((prev) => !prev);
        setExpandVersion((v) => v + 1);
    };

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

                const enrollment = s.courses.find(
                    (c) => extractId(c.courseId) === courseId,
                );
                setAdmissionNumber(enrollment?.admissionNumber ?? "");

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

    /* --------------------------- Draft uplink -------------------------- */

    const handleDraftChange = useCallback(
        (unitId: string, drafts: MarkedEntry[]) => {
            setDraftByUnit((prev) => ({ ...prev, [unitId]: drafts }));
        },
        [],
    );

    /* --------------------------- Grade preview ------------------------- */

    const gradePreview = useMemo<GradePreview>(() => {
        const perUnit = units.map((u) => {
            const entries =
                draftByUnit[u._id] ?? resultsByUnit[u._id] ?? [];
            return { unit: u, calc: computeUnitScore(entries) };
        });

        const complete = perUnit.filter((p) => p.calc.complete);
        const overallScore =
            complete.length > 0
                ? complete.reduce((s, p) => s + p.calc.score, 0) /
                  complete.length
                : 0;

        return {
            overallScore,
            completeCount: complete.length,
            incompleteCount: perUnit.length - complete.length,
            totalCount: perUnit.length,
            hasComplete: complete.length > 0,
            grade: complete.length > 0 ? marksToGrade(overallScore) : null,
            perUnit: perUnit.map((p) => ({
                id: p.unit._id,
                code: p.unit.code,
                name: p.unit.name, // NEW
                complete: p.calc.complete,
            })),
        };
    }, [units, draftByUnit, resultsByUnit]);

    const academicRecordHref = `/results/${studentId}`;
    const ready = !loading && !error;

    const jumpTo = (unitId: string) => {
        document
            .getElementById(`unit-${unitId}`)
            ?.scrollIntoView({ behavior: "smooth", block: "start" });
    };

    /* ------------------------------- Render ---------------------------- */

    return (
        <main className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
            <div className="mx-auto w-full max-w-full space-y-4 px-3 pb-28 pt-4 sm:px-6 lg:px-8 lg:pt-6 xl:pb-10">
                {/* NAV */}
                <nav
                    aria-label="Page navigation"
                    className="flex flex-wrap items-center justify-between gap-2"
                >
                    <Link
                        href="/results/new/student-based"
                        className={`${btnSecondary} ${btnSize}`}
                    >
                        <ArrowLeft className="h-4 w-4 shrink-0" />
                        <span className="sm:hidden">Back</span>
                        <span className="hidden sm:inline">
                            Back to Student Selection
                        </span>
                    </Link>

                    {studentId && courseId && (
                        <Link
                            href={academicRecordHref}
                            aria-label="View academic profile"
                            className={`${btnSecondary} ${btnSize}`}
                        >
                            <UserCircle2 className="h-4 w-4 shrink-0" />
                            <span className="hidden sm:inline">
                                View Academic Profile
                            </span>
                            <span className="sm:hidden">Profile</span>
                        </Link>
                    )}
                </nav>

                {/* HERO */}
                {loading && !error ? (
                    <div className="h-32 animate-pulse rounded-sm bg-[#082B66]/80 sm:h-28" />
                ) : (
                    student && (
                        <Hero
                            student={student}
                            admissionNumber={admissionNumber}
                            course={course}
                            gradePreview={gradePreview}
                        />
                    )
                )}

                {/* ERROR */}
                {error && (
                    <div
                        role="alert"
                        className="flex items-center gap-3 rounded-sm border border-red-200 bg-red-50 p-4 text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-400"
                    >
                        <AlertCircle className="h-5 w-5 shrink-0" />
                        <p className="text-sm">{error}</p>
                    </div>
                )}

                {/* LOADING */}
                {loading && !error && <Skeleton />}

                {/* EMPTY */}
                {ready && units.length === 0 && (
                    <div className="rounded-sm border border-dashed border-zinc-300 bg-white px-4 py-12 text-center dark:border-zinc-700 dark:bg-zinc-900">
                        <BookOpen className="mx-auto mb-3 h-10 w-10 text-zinc-300 dark:text-zinc-700" />
                        <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">
                            No units for this course
                        </p>
                        <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                            Add units to{" "}
                            <strong>
                                {course?.courseCode ?? "the course"}
                            </strong>{" "}
                            first, then come back.
                        </p>
                        <Link
                            href="/units/new"
                            className={`${btnSecondary} mt-4 h-11 px-4 sm:h-9`}
                        >
                            <Plus className="h-3.5 w-3.5" />
                            Create Unit
                        </Link>
                    </div>
                )}

                {/* WORKSPACE: sidebar (xl+) + units */}
                {ready && units.length > 0 && (
                    <div className="grid gap-4 xl:grid-cols-[340px_minmax(0,1fr)] xl:items-start 2xl:grid-cols-[380px_minmax(0,1fr)]">
                        <aside className="space-y-4 xl:sticky xl:top-4">
                            <div className="hidden xl:block">
                                <GradeCard gp={gradePreview} />
                            </div>
                            <TemplateCard
                                draft={draftTemplate}
                                onChange={setDraftTemplate}
                                onApply={applyTemplateToAll}
                                feedback={applyFeedback}
                            />
                        </aside>

                        <section className="min-w-0">
                            {/* Sticky unit navigator */}
                            <div className="sticky top-0 z-30 -mx-3 border-b border-zinc-200 bg-zinc-50/90 px-3 py-2 backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8 xl:mx-0 xl:rounded-sm xl:border xl:bg-white/90 xl:px-3 dark:border-zinc-800 dark:bg-zinc-950/90 xl:dark:bg-zinc-900/90">
                                <div className="flex items-center gap-2">
                                    <div
                                        aria-label="Jump to unit"
                                        className="flex min-w-0 flex-1 gap-1.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                                    >
                                        {gradePreview.perUnit.map((p) => (
                                            <button
                                                key={p.id}
                                                type="button"
                                                onClick={() => jumpTo(p.id)}
                                                title={`${p.code} — ${p.name}`}
                                                className="inline-flex shrink-0 items-start gap-1.5 rounded-sm border border-zinc-200 bg-white px-2.5 py-1.5 text-left transition hover:border-[#082B66] focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:border-orange-400"
                                            >
                                                <span
                                                    className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${
                                                        p.complete
                                                            ? "bg-emerald-500"
                                                            : "bg-amber-400"
                                                    }`}
                                                />
                                                <span className="flex flex-col leading-tight">
                                                    <span className="font-mono text-[11px] font-bold text-[#082B66] dark:text-orange-400">
                                                        {p.code}
                                                    </span>
                                                    <span className="text-[10px] font-normal text-zinc-500 dark:text-zinc-400">
                                                        {p.name}
                                                    </span>
                                                </span>
                                            </button>
                                        ))}
                                    </div>

                                    <button
                                        type="button"
                                        onClick={toggleExpandAll}
                                        aria-label={
                                            expandAll
                                                ? "Collapse all units"
                                                : "Expand all units"
                                        }
                                        className={`${btnSecondary} h-9 shrink-0 px-2.5`}
                                    >
                                        {expandAll ? (
                                            <ChevronUp className="h-3.5 w-3.5" />
                                        ) : (
                                            <ChevronDown className="h-3.5 w-3.5" />
                                        )}
                                        <span className="hidden sm:inline">
                                            {expandAll
                                                ? "Collapse all"
                                                : "Expand all"}
                                        </span>
                                    </button>
                                </div>
                            </div>

                            {/* Units: 1 col, 2 cols on ultra-wide screens */}
                            <div className="mt-3 grid items-start gap-3 min-[1900px]:grid-cols-2">
                                {units.map((u) => (
                                    <div
                                        key={u._id}
                                        id={`unit-${u._id}`}
                                        className="min-w-0 scroll-mt-16"
                                    >
                                        <UnitPanel
                                            unit={u}
                                            studentId={studentId}
                                            initialResults={
                                                resultsByUnit[u._id] ?? []
                                            }
                                            defaultExpanded={true}
                                            template={appliedTemplate}
                                            templateVersion={templateVersion}
                                            expandVersion={expandVersion}
                                            expandTo={expandAll}
                                            onDraftChange={handleDraftChange}
                                        />
                                    </div>
                                ))}
                            </div>
                        </section>
                    </div>
                )}
            </div>

            {/* LIVE GRADE BAR — phones & tablets */}
            {ready && units.length > 0 && <LiveBar gp={gradePreview} />}
        </main>
    );
}

/* -------------------------------------------------------------------------- */
/* Hero                                                                       */
/* -------------------------------------------------------------------------- */

function Hero({
    student,
    admissionNumber,
    course,
    gradePreview,
}: {
    student: Student;
    admissionNumber: string;
    course: Course | null;
    gradePreview: GradePreview;
}) {
    const initials = `${student.fullName.firstName?.[0] ?? ""}${
        student.fullName.lastName?.[0] ?? ""
    }`.toUpperCase();

    return (
        <header className="overflow-hidden rounded-sm bg-[#082B66] text-white shadow-sm dark:border dark:border-white/10">
            <div className="h-1 bg-orange-400" />
            <div className="flex flex-col gap-4 p-4 sm:p-5 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex min-w-0 items-center gap-3 sm:gap-4">
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-sm bg-orange-400 text-base font-bold text-[#082B66] sm:h-14 sm:w-14 sm:text-lg">
                        {initials || "?"}
                    </span>
                    <div className="min-w-0">
                        <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-orange-300">
                            <ClipboardList className="h-3 w-3 shrink-0" />
                            Student mark sheet
                        </p>
                        <h1 className="text-xl font-bold leading-tight sm:text-2xl">
                            {studentFullName(student)}
                        </h1>
                        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-white/70">
                            <span className="font-mono">
                                {admissionNumber || "—"}
                            </span>
                            {course && (
                                <span className="inline-flex max-w-full items-center gap-1 rounded-sm bg-white/10 px-1.5 py-0.5 text-[11px] font-semibold text-white">
                                    <BookOpen className="h-3 w-3 shrink-0 text-orange-300" />
                                    <span className="break-words">
                                        {course.courseCode} — {course.name}
                                    </span>
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                <dl className="grid grid-cols-3 gap-px overflow-hidden rounded-sm bg-white/15 lg:min-w-[20rem]">
                    {[
                        { label: "Units", value: gradePreview.totalCount },
                        { label: "Graded", value: gradePreview.completeCount },
                        { label: "Pending", value: gradePreview.incompleteCount },
                    ].map((s) => (
                        <div
                            key={s.label}
                            className="bg-[#082B66] px-2 py-2 text-center sm:px-3"
                        >
                            <dt className="text-[10px] font-semibold uppercase tracking-wider text-white/60">
                                {s.label}
                            </dt>
                            <dd className="text-base font-bold tabular-nums sm:text-lg">
                                {s.value}
                            </dd>
                        </div>
                    ))}
                </dl>
            </div>
        </header>
    );
}

/* -------------------------------------------------------------------------- */
/* Grade preview                                                              */
/* -------------------------------------------------------------------------- */

function GradeChip({
    grade,
    large = false,
}: {
    grade: string | null;
    large?: boolean;
}) {
    const size = large ? "px-2.5 py-1 text-xs" : "px-2 py-0.5 text-[11px]";
    const base =
        "inline-flex items-center justify-center rounded-sm text-center font-semibold leading-tight ring-1 ring-inset";

    return grade ? (
        <span className={`${base} ${size} ${gradeTone(grade)}`}>{grade}</span>
    ) : (
        <span
            className={`${base} ${size} bg-zinc-500/10 text-zinc-500 ring-zinc-500/20 dark:text-zinc-400`}
        >
            Not graded yet
        </span>
    );
}

function FormulaNote() {
    return (
        <details className="group border-t border-zinc-100 dark:border-zinc-800">
            <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-2.5 text-[11px] font-semibold text-zinc-600 [&::-webkit-details-marker]:hidden dark:text-zinc-300">
                <Info className="h-3.5 w-3.5 shrink-0 text-[#082B66] dark:text-orange-400" />
                How is the grade calculated?
            </summary>
            <p className="px-4 pb-3 text-[11px] leading-relaxed text-zinc-500 dark:text-zinc-400">
                avg(CATs + Practicals) × 30% + Final × 70%, averaged across
                units. A unit is graded once it has a final exam and at least
                one CAT or practical.
            </p>
        </details>
    );
}

function GradeCard({ gp }: { gp: GradePreview }) {
    const R = 46;
    const C = 2 * Math.PI * R;
    const pct = gp.hasComplete
        ? Math.max(0, Math.min(100, gp.overallScore))
        : 0;
    const progress =
        gp.totalCount > 0 ? (gp.completeCount / gp.totalCount) * 100 : 0;

    return (
        <section className={`${card} overflow-hidden`}>
            <header className="flex items-center gap-3 border-b border-zinc-100 px-4 py-3 dark:border-zinc-800">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-sm bg-emerald-500/10 text-emerald-600 ring-1 ring-inset ring-emerald-500/30 dark:text-emerald-400">
                    <Award className="h-3.5 w-3.5" />
                </span>
                <div className="min-w-0">
                    <h2 className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">
                        Overall grade preview
                    </h2>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                        Updates live as you type
                    </p>
                </div>
            </header>

            <div className="flex flex-col items-center gap-4 p-4 text-center">
                <div className="relative h-32 w-32">
                    <svg
                        viewBox="0 0 112 112"
                        className="h-full w-full -rotate-90"
                        aria-hidden="true"
                    >
                        <circle
                            cx="56"
                            cy="56"
                            r={R}
                            fill="none"
                            strokeWidth="8"
                            className="stroke-zinc-100 dark:stroke-zinc-800"
                        />
                        {gp.hasComplete && (
                            <circle
                                cx="56"
                                cy="56"
                                r={R}
                                fill="none"
                                strokeWidth="8"
                                strokeLinecap="round"
                                className="stroke-orange-400 transition-[stroke-dashoffset] duration-500"
                                strokeDasharray={C}
                                strokeDashoffset={C * (1 - pct / 100)}
                            />
                        )}
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-3xl font-bold tabular-nums text-[#082B66] dark:text-white">
                            {gp.hasComplete
                                ? gp.overallScore.toFixed(1)
                                : "—"}
                            {gp.hasComplete && (
                                <span className="text-base">%</span>
                            )}
                        </span>
                        <span className={fieldLabel}>Overall</span>
                    </div>
                </div>

                <div className="w-full">
                    <p className={fieldLabel}>Projected grade</p>
                    <div className="mt-1">
                        <GradeChip grade={gp.grade} large />
                    </div>
                </div>

                <div className="w-full">
                    <div className="mb-1 flex items-center justify-between text-[11px] text-zinc-500 dark:text-zinc-400">
                        <span>Units graded</span>
                        <span className="font-mono font-semibold tabular-nums text-zinc-700 dark:text-zinc-200">
                            {gp.completeCount} / {gp.totalCount}
                        </span>
                    </div>
                    <div className="h-1 w-full overflow-hidden rounded-sm bg-zinc-100 dark:bg-zinc-800">
                        <div
                            className="h-full rounded-sm bg-[#082B66] transition-[width] duration-500 dark:bg-orange-400"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-2">
                    {gp.completeCount > 0 && (
                        <span className="inline-flex items-center gap-1.5 rounded-sm bg-emerald-500/10 px-2 py-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
                            <CheckCircle2 className="h-3 w-3 shrink-0" />
                            {gp.completeCount} complete
                        </span>
                    )}
                    {gp.incompleteCount > 0 && (
                        <span className="inline-flex items-center gap-1.5 rounded-sm bg-amber-400/10 px-2 py-1 text-[11px] font-semibold text-amber-700 dark:text-amber-400">
                            <AlertCircle className="h-3 w-3 shrink-0" />
                            {gp.incompleteCount} pending
                        </span>
                    )}
                </div>
            </div>

            <FormulaNote />
        </section>
    );
}

/** Fixed bottom summary for phones & tablets while entering marks. */
function LiveBar({ gp }: { gp: GradePreview }) {
    const progress =
        gp.totalCount > 0 ? (gp.completeCount / gp.totalCount) * 100 : 0;

    return (
        <div
            aria-live="polite"
            className="fixed inset-x-0 bottom-0 z-40 border-t border-zinc-200 bg-white/95 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2.5 backdrop-blur xl:hidden dark:border-zinc-800 dark:bg-zinc-900/95"
        >
            <div className="mx-auto flex w-full max-w-full items-center gap-3">
                <div className="shrink-0">
                    <p className={fieldLabel}>Overall</p>
                    <p className="text-xl font-bold leading-none tabular-nums text-[#082B66] dark:text-white">
                        {gp.hasComplete
                            ? `${gp.overallScore.toFixed(1)}%`
                            : "—"}
                    </p>
                </div>

                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                        <div className="min-w-0">
                            <GradeChip grade={gp.grade} />
                        </div>
                        <span className="ml-auto shrink-0 font-mono text-[11px] font-semibold tabular-nums text-zinc-600 dark:text-zinc-300">
                            {gp.completeCount}/{gp.totalCount}
                        </span>
                    </div>
                    <div className="mt-1.5 h-1 w-full overflow-hidden rounded-sm bg-zinc-100 dark:bg-zinc-800">
                        <div
                            className="h-full rounded-sm bg-orange-400 transition-[width] duration-500"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}

/* -------------------------------------------------------------------------- */
/* Template                                                                   */
/* -------------------------------------------------------------------------- */

function ToggleRow({
    label,
    checked,
    onChange,
}: {
    label: string;
    checked: boolean;
    onChange: (v: boolean) => void;
}) {
    return (
        <label className="flex h-11 cursor-pointer items-center justify-between gap-3 rounded-sm border border-zinc-200 bg-white px-3 transition hover:bg-zinc-50 sm:h-10 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-800">
            <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-200">
                {label}
            </span>
            <input
                type="checkbox"
                checked={checked}
                onChange={(e) => onChange(e.target.checked)}
                className="h-4 w-4 cursor-pointer accent-[#082B66] dark:accent-orange-400"
            />
        </label>
    );
}

function TemplateCard({
    draft,
    onChange,
    onApply,
    feedback,
}: {
    draft: Template;
    onChange: React.Dispatch<React.SetStateAction<Template>>;
    onApply: () => void;
    feedback: string | null;
}) {
    const [open, setOpen] = useState(false);

    const setCats = (n: number) =>
        onChange((t) => ({ ...t, catCount: Math.max(0, Math.min(10, n)) }));

    return (
        <section className={`${card} overflow-hidden`}>
            <button
                type="button"
                onClick={() => setOpen((o) => !o)}
                aria-expanded={open}
                className="flex w-full items-center gap-3 px-4 py-3 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-orange-400"
            >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-sm bg-[#082B66] text-white dark:bg-orange-400 dark:text-zinc-900">
                    <Layers className="h-3.5 w-3.5" />
                </span>
                <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-zinc-800 dark:text-zinc-100">
                        Assessment template
                    </span>
                    <span className="block truncate font-mono text-[11px] text-zinc-500 dark:text-zinc-400">
                        {templateSummary(draft)}
                    </span>
                </span>
                <ChevronDown
                    className={`h-4 w-4 shrink-0 text-zinc-400 transition-transform ${
                        open ? "rotate-180" : ""
                    }`}
                />
            </button>

            {open && (
                <div className="space-y-3 border-t border-zinc-100 p-4 dark:border-zinc-800">
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                        Default (2 CATs + Final) is auto-applied to every unit
                        — adjust only if you need a different column set.
                    </p>

                    <div className="flex items-center justify-between gap-3">
                        <span className={fieldLabel}>Number of CATs</span>
                        <div className="inline-flex overflow-hidden rounded-sm border border-zinc-200 dark:border-zinc-700">
                            <button
                                type="button"
                                onClick={() => setCats(draft.catCount - 1)}
                                disabled={draft.catCount <= 0}
                                aria-label="Fewer CATs"
                                className="flex h-11 w-11 items-center justify-center bg-white text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-40 sm:h-9 sm:w-9 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
                            >
                                <Minus className="h-3.5 w-3.5" />
                            </button>
                            <input
                                type="number"
                                inputMode="numeric"
                                min={0}
                                max={10}
                                value={draft.catCount}
                                onChange={(e) =>
                                    setCats(Number(e.target.value) || 0)
                                }
                                aria-label="Number of CATs"
                                className="h-11 w-12 border-x border-zinc-200 bg-white text-center text-sm font-bold tabular-nums text-zinc-900 [appearance:textfield] focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[#082B66]/30 sm:h-9 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white dark:focus:ring-orange-400/30 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                            />
                            <button
                                type="button"
                                onClick={() => setCats(draft.catCount + 1)}
                                disabled={draft.catCount >= 10}
                                aria-label="More CATs"
                                className="flex h-11 w-11 items-center justify-center bg-white text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-40 sm:h-9 sm:w-9 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
                            >
                                <Plus className="h-3.5 w-3.5" />
                            </button>
                        </div>
                    </div>

                    <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
                        <ToggleRow
                            label="Include Practical"
                            checked={draft.hasPractical}
                            onChange={(v) =>
                                onChange((t) => ({ ...t, hasPractical: v }))
                            }
                        />
                        <ToggleRow
                            label="Include Final Exam"
                            checked={draft.hasFinalExam}
                            onChange={(v) =>
                                onChange((t) => ({ ...t, hasFinalExam: v }))
                            }
                        />
                    </div>

                    <button
                        type="button"
                        onClick={onApply}
                        className={`${btnPrimary} h-11 w-full sm:h-9`}
                    >
                        <Sparkles className="h-3.5 w-3.5" />
                        Re-apply to All Units
                    </button>

                    {feedback && (
                        <p
                            role="status"
                            className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400"
                        >
                            <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                            {feedback}
                        </p>
                    )}
                </div>
            )}

            <div className="xl:hidden">
                <FormulaNote />
            </div>
        </section>
    );
}

/* -------------------------------------------------------------------------- */
/* Loading                                                                    */
/* -------------------------------------------------------------------------- */

function Skeleton() {
    return (
        <div className="grid gap-4 xl:grid-cols-[340px_minmax(0,1fr)] 2xl:grid-cols-[380px_minmax(0,1fr)]">
            <div className="space-y-4">
                <div className="hidden h-80 animate-pulse rounded-sm border border-zinc-200 bg-white xl:block dark:border-zinc-800 dark:bg-zinc-900" />
                <div className="h-14 animate-pulse rounded-sm border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900" />
            </div>
            <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                    <div
                        key={i}
                        className="h-40 animate-pulse rounded-sm border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"
                    />
                ))}
            </div>
        </div>
    );
}

function PageFallback() {
    return (
        <main className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
            <div className="mx-auto w-full max-w-full px-3 py-10 sm:px-6 lg:px-8">
                <div className="flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading…
                </div>
            </div>
        </main>
    );
}