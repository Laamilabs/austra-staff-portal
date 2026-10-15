"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
    AlertCircle,
    ArrowLeft,
    Award,
    BarChart3,
    ChevronDown,
    ClipboardList,
    FileText,
    RefreshCw,
    User,
} from "lucide-react";

import {
    Result,
    getResultUnitId,
    resultApi,
} from "@/app/types/results";
import { Student, StudentUser, studentApi } from "@/app/types/students";
import { Course, courseApi } from "@/app/types/courses";
import { Unit, unitApi } from "@/app/types/units";

import {
    aggregateByStudent,
    CourseAggregate,
    CourseRef,
    UnitAggregate,
    UnitCourseLookup,
} from "../utils";
import { AllAssessments } from "./all-assessments";

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function resolveCourseId(courseId: unknown): string | null {
    if (!courseId) return null;
    if (typeof courseId === "string") return courseId;
    if (
        typeof courseId === "object" &&
        "_id" in (courseId as Record<string, unknown>)
    ) {
        return String((courseId as { _id: string })._id);
    }
    return null;
}

/** Full name from a Student record, tolerant of partial names. */
function studentFullName(s: Student): string {
    return [s.fullName?.firstName, s.fullName?.middleName, s.fullName?.lastName]
        .filter(Boolean)
        .join(" ")
        .trim();
}

/**
 * Find the admission number for the course the results belong to.
 *
 * Resolution order for each result's course:
 *   1. A populated `unit.courseId` object on the result's unit.
 *   2. The external unitId -> course lookup (built from units + courses).
 *
 * Returns "" when the results aren't populated enough to disambiguate
 * (e.g. units without a courseId and a multi-course student).
 */
function admissionFromResults(
    results: Result[],
    student: Student | null,
    lookup: UnitCourseLookup,
): string {
    if (!student?.courses?.length || results.length === 0) return "";

    // courseId -> admissionNumber for this student's enrollments.
    const admissionByCourseId = new Map<string, string>();
    for (const e of student.courses) {
        const cid = resolveCourseId(e.courseId);
        if (cid && e.admissionNumber) {
            admissionByCourseId.set(cid, e.admissionNumber);
        }
    }
    if (admissionByCourseId.size === 0) return "";

    // Walk results in the order they arrived; the first one whose course we
    // can resolve to a known enrollment wins.
    for (const r of results) {
        const unit = r.unitId as unknown;
        let unitCourseId: string | null = null;

        // 1. Populated courseId on the unit object.
        if (unit && typeof unit === "object") {
            unitCourseId = resolveCourseId(
                (unit as { courseId?: unknown }).courseId,
            );
        }

        // 2. Fall back to the lookup by unit id.
        if (!unitCourseId) {
            const uid = getResultUnitId(r.unitId);
            if (uid) {
                const ref = lookup(uid);
                if (ref) unitCourseId = ref.courseId;
            }
        }

        if (unitCourseId) {
            const adm = admissionByCourseId.get(unitCourseId);
            if (adm) return adm;
        }
    }

    // Units aren't populated with courseId. If there's exactly one
    // enrollment we can still answer unambiguously; otherwise we can't.
    if (admissionByCourseId.size === 1) {
        return [...admissionByCourseId.values()][0];
    }
    return "";
}

/* -------------------------------------------------------------------------- */
/* Pills / badges                                                             */
/* -------------------------------------------------------------------------- */

function GradeBadge({ grade }: { grade: string }) {
    const base =
        "inline-flex items-center gap-1 rounded-sm border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider";

    const tone =
        grade === "Distinction"
            ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
            : grade === "Credit"
                ? "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-800 dark:bg-sky-950/40 dark:text-sky-300"
                : grade === "Pass"
                    ? "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300"
                    : grade === "Incomplete"
                        ? "border-zinc-300 bg-zinc-100 text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800/60 dark:text-zinc-300"
                        : "border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300";

    return <span className={`${base} ${tone}`}>{grade}</span>;
}

/* -------------------------------------------------------------------------- */
/* Page                                                                       */
/* -------------------------------------------------------------------------- */

export default function StudentResultsPage() {
    const params = useParams<{ studentId: string }>();
    const studentId = params.studentId;

    const [results, setResults] = useState<Result[]>([]);
    const [units, setUnits] = useState<Unit[]>([]);
    const [courses, setCourses] = useState<Course[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // The student record itself — resolved independently of results so the
    // page can render the name even when there are no assessments yet.
    const [student, setStudent] = useState<Student | null>(null);
    const [courseOptions, setCourseOptions] = useState<
        { id: string; label: string }[]
    >([]);

    const fetchResults = async () => {
        try {
            setLoading(true);
            setError(null);

            // Units + courses are only needed to resolve each result's
            // unit -> course; a failure there degrades to "Unknown course"
            // rather than blanking the page.
            const [resultsRes, unitsRes, coursesRes] = await Promise.all([
                resultApi.getByStudent(studentId),
                unitApi
                    .getAll()
                    .catch(() => ({ data: [] as Unit[] })),
                courseApi
                    .getAll()
                    .catch(() => ({ data: [] as Course[] })),
            ]);

            setResults(resultsRes.data || []);
            setUnits(unitsRes.data || []);
            setCourses(coursesRes.data || []);
        } catch (err: unknown) {
            console.error("Failed to fetch student results:", err);
            const message =
                err && typeof err === "object" && "response" in err
                    ? (err as { response?: { data?: { message?: string } } })
                        .response?.data?.message
                    : null;
            setError(
                message || "Failed to load student results. Please try again.",
            );
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (studentId) fetchResults();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [studentId]);

    // Load the student + course list. This is what feeds the header name,
    // admission number and the "Open Mark Sheet" CTA — it must not depend
    // on results existing.
    useEffect(() => {
        if (!studentId) return;
        let cancelled = false;

        (async () => {
            try {
                const [studentRes, coursesRes] = await Promise.all([
                    studentApi.getById(studentId),
                    courseApi
                        .getAll()
                        .catch(() => ({ data: [] as Course[] })),
                ]);
                if (cancelled) return;

                const s: Student = studentRes.data;
                setStudent(s);

                const coursesById = new Map(
                    (coursesRes.data ?? []).map((c) => [c._id, c]),
                );

                const options = (s.courses ?? [])
                    .map((e) => {
                        const cid = resolveCourseId(e.courseId);
                        if (!cid) return null;
                        const c = coursesById.get(cid);
                        return {
                            id: cid,
                            label: c
                                ? `${c.courseCode} — ${c.name}`
                                : e.admissionNumber || cid,
                        };
                    })
                    .filter(
                        (x): x is { id: string; label: string } => x !== null,
                    );

                setCourseOptions(options);
            } catch {
                // Non-fatal: header falls back to the aggregate name, and
                // the CTA simply won't render.
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [studentId]);

    /* ---------------------- unitId -> course lookup -------------------- */

    // resultApi.getByStudent() populates unitId with only { _id, name, code },
    // so we stitch courses back on using the units + courses endpoints.
    const unitCourseLookup = useMemo<UnitCourseLookup>(() => {
        const courseById = new Map<string, Course>();
        for (const c of courses) courseById.set(c._id, c);

        const unitToCourse = new Map<string, CourseRef>();

        for (const u of units) {
            let courseId: string;
            let courseCode = "—";
            let courseName = "Unknown course";

            if (typeof u.courseId === "string") {
                courseId = u.courseId;
                const c = courseById.get(courseId);
                if (c) {
                    courseCode = c.courseCode ?? courseCode;
                    courseName = c.name ?? courseName;
                }
            } else if (u.courseId) {
                // Populated Course on the unit response.
                const c = u.courseId;
                courseId = c._id;
                courseCode = c.courseCode ?? courseCode;
                courseName = c.name ?? courseName;
            } else {
                continue;
            }

            unitToCourse.set(u._id, { courseId, courseCode, courseName });
        }

        return (unitId: string) => unitToCourse.get(unitId) ?? null;
    }, [units, courses]);

    const aggregate = useMemo(() => {
        const list = aggregateByStudent(results, unitCourseLookup);
        return list[0] ?? null;
    }, [results, unitCourseLookup]);

    /** Courses that actually have recorded results. */
    const coursesWithResults: CourseAggregate[] = aggregate?.courses ?? [];
    const hasMultipleCourses = coursesWithResults.length > 1;

    /** admissionNumber keyed by courseId, sourced from the student's enrollments. */
    const admissionByCourse = useMemo(() => {
        const map = new Map<string, string>();
        if (!student) return map;
        for (const e of student.courses ?? []) {
            const cid = resolveCourseId(e.courseId);
            if (cid && e.admissionNumber) map.set(cid, e.admissionNumber);
        }
        return map;
    }, [student]);

    /* --------------------------- Display fields ------------------------ */

    // Name: the profile record is authoritative — it's the one document
    // whose `fullName` is required. The populated User on that record is
    // next (some reads only populate `name`, some only `email`), and the
    // aggregate name is the last real source before the placeholder.
    const displayName = (() => {
        const fromProfile = student ? studentFullName(student) : "";
        if (fromProfile) return fromProfile;

        const uid = student?.userId;
        if (uid && typeof uid === "object") {
            const u = uid as StudentUser;
            if (u.name?.trim()) return u.name.trim();
            if (u.email?.trim()) return u.email.trim().split("@")[0];
        }

        if (aggregate?.studentName?.trim()) return aggregate.studentName.trim();

        return "Student Results";
    })();

    // Admission number in the header is only meaningful when there is a
    // single course. With multiple courses, we show the per-course number
    // inside each course section instead.
    const displayAdmission = hasMultipleCourses
        ? ""
        : admissionFromResults(results, student, unitCourseLookup) ||
        aggregate?.admissionNumber?.trim() ||
        "";

    const sheetHref = (courseId: string) =>
        `/results/new/student-based/units-sheet?studentId=${encodeURIComponent(
            studentId,
        )}&courseId=${encodeURIComponent(courseId)}`;

    const ctaCls =
        "inline-flex items-center gap-2 rounded-sm bg-[#082B66] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#082B66]/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 dark:bg-orange-400 dark:text-zinc-900 dark:hover:bg-orange-400/90";

    const totalUnits = coursesWithResults.reduce((s, c) => s + c.unitCount, 0);
    const totalResults = aggregate?.resultCount ?? 0;

    return (
        <div className="mx-auto max-w-screen-7xl space-y-6 p-6">
            {/* NAV */}
            <div className="flex flex-wrap items-center gap-2">
                <Link
                    href="/results"
                    className="inline-flex items-center gap-2 rounded-sm border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
                >
                    <ArrowLeft className="h-4 w-4" />
                    All Results
                </Link>
                <Link
                    href={`/students/${studentId}`}
                    className="inline-flex items-center gap-2 rounded-sm border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
                >
                    <User className="h-4 w-4" />
                    Student Profile
                </Link>

                {courseOptions.length === 1 && (
                    <Link
                        href={sheetHref(courseOptions[0].id)}
                        className={ctaCls}
                    >
                        <ClipboardList className="h-4 w-4" />
                        Open Mark Sheet
                    </Link>
                )}

                {courseOptions.length > 1 && (
                    <details className="group relative">
                        <summary
                            className={`${ctaCls} cursor-pointer list-none [&::-webkit-details-marker]:hidden`}
                        >
                            <ClipboardList className="h-4 w-4" />
                            Open Mark Sheet
                            <ChevronDown className="h-3.5 w-3.5 transition-transform group-open:rotate-180" />
                        </summary>
                        <div
                            role="menu"
                            className="absolute left-0 top-full z-30 mt-1 w-64 overflow-hidden rounded-sm border border-zinc-200 bg-white py-1 shadow-lg dark:border-zinc-700 dark:bg-zinc-900"
                        >
                            <p className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                                Choose a course
                            </p>
                            {courseOptions.map((c) => (
                                <Link
                                    key={c.id}
                                    href={sheetHref(c.id)}
                                    role="menuitem"
                                    className="block truncate px-3 py-2 text-xs font-medium text-zinc-700 transition hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
                                >
                                    {c.label}
                                </Link>
                            ))}
                        </div>
                    </details>
                )}

                <div className="ml-auto">
                    <button
                        type="button"
                        onClick={fetchResults}
                        disabled={loading}
                        title="Refresh"
                        aria-label="Refresh"
                        className="cursor-pointer rounded-sm border border-zinc-200 p-2 text-zinc-600 transition hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                    >
                        <RefreshCw
                            className={`h-4 w-4 ${loading ? "animate-spin" : ""
                                }`}
                        />
                    </button>
                </div>
            </div>

            {/* HEADER */}
            <div>
                <h1 className="flex items-center gap-2 text-2xl font-bold text-zinc-900 dark:text-white">
                    <BarChart3 className="h-7 w-7 text-[#082B66] dark:text-orange-400" />
                    {displayName}
                </h1>
                <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                    {displayAdmission
                        ? `Adm. No. ${displayAdmission}`
                        : hasMultipleCourses
                            ? `${coursesWithResults.length} courses · assessment breakdown per course`
                            : "Assessment breakdown per unit"}
                </p>
            </div>

            {/* ERROR */}
            {error && (
                <div className="flex items-center gap-3 rounded-sm border border-red-200 bg-red-50 p-4 text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-400">
                    <AlertCircle className="h-5 w-5 shrink-0 text-red-500 dark:text-red-400" />
                    <p className="text-sm">{error}</p>
                </div>
            )}

            {/* BODY */}
            {loading ? (
                <Skeleton />
            ) : coursesWithResults.length === 0 ? (
                <EmptyState studentId={studentId} />
            ) : (
                <>
                    {/* GLOBAL SUMMARY */}
                    <div className="grid grid-cols-3 gap-3 lg:grid-cols-3">
                        <StatCard
                            label="Courses"
                            value={coursesWithResults.length}
                            icon={<Award className="h-4 w-4" />}
                        />
                        <StatCard
                            label="Units"
                            value={totalUnits}
                            icon={<FileText className="h-4 w-4" />}
                        />
                        <StatCard
                            label="Results"
                            value={totalResults}
                            icon={<FileText className="h-4 w-4" />}
                        />
                    </div>

                    {/* ONE SECTION PER COURSE */}
                    {coursesWithResults.map((course) => (
                        <CourseSection
                            key={course.courseId}
                            course={course}
                            admissionNumber={admissionByCourse.get(
                                course.courseId,
                            )}
                            sheetHref={sheetHref(course.courseId)}
                        />
                    ))}

                    {/* RAW RESULTS — collapsed by default */}
                    <AllAssessments
                        results={results}
                        lookup={unitCourseLookup}
                    />
                </>
            )}
        </div>
    );
}

/* -------------------------------------------------------------------------- */
/* Sub-components                                                             */
/* -------------------------------------------------------------------------- */

function CourseSection({
    course,
    admissionNumber,
    sheetHref,
}: {
    course: CourseAggregate;
    admissionNumber?: string;
    sheetHref: string;
}) {
    return (
        <section className="space-y-4">
            {/* Course header */}
            <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center rounded-sm bg-[#082B66] px-2 py-1 font-mono text-[11px] font-bold uppercase tracking-wider text-orange-400">
                    {course.courseCode}
                </span>
                <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">
                    {course.courseName}
                </h2>
                {admissionNumber && (
                    <span className="font-mono text-xs text-zinc-500 dark:text-zinc-400">
                        Adm. No. {admissionNumber}
                    </span>
                )}
                <Link
                    href={sheetHref}
                    className="ml-auto inline-flex items-center gap-1.5 rounded-sm border border-zinc-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
                >
                    <ClipboardList className="h-3.5 w-3.5" />
                    Open Mark Sheet
                </Link>
            </div>

            {/* Incomplete banner for this course */}
            {!course.isComplete && (
                <div className="flex items-start gap-3 rounded-sm border border-amber-200 bg-amber-50 p-4 text-amber-800 dark:border-amber-800/60 dark:bg-amber-950/30 dark:text-amber-300">
                    <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
                    <div className="text-sm">
                        <p className="font-semibold">
                            Incomplete assessment record
                        </p>
                        <p className="mt-0.5 text-xs">
                            One or more units in this course are missing
                            required marks (a CAT in the sequence, or the
                            final exam). Totals and grades are not calculated
                            until every unit is complete.
                        </p>
                    </div>
                </div>
            )}

            {/* Course stats */}
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <StatCard
                    label="Total Score"
                    value={
                        course.isComplete ? (
                            `${course.totalScore.toFixed(1)}%`
                        ) : (
                            <span className="text-zinc-400">—</span>
                        )
                    }
                    icon={<BarChart3 className="h-4 w-4" />}
                />
                <StatCard
                    label="Overall Grade"
                    value={<GradeBadge grade={course.grade} />}
                    icon={<Award className="h-4 w-4" />}
                />
                <StatCard
                    label="Units"
                    value={course.unitCount}
                    icon={<FileText className="h-4 w-4" />}
                />
                <StatCard
                    label="Results"
                    value={course.resultCount}
                    icon={<FileText className="h-4 w-4" />}
                />
            </div>

            {/* Units table */}
            <div className="overflow-hidden rounded-sm border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                <div className="border-b border-zinc-200 bg-zinc-50 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-800/50">
                    <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">
                        Per-Unit Breakdown
                    </h3>
                    <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                        CATs &amp; practicals → /30 · Final exam → /70 · Unit
                        total → /100. Units with missing CATs or no final exam
                        are marked Incomplete.
                    </p>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-left text-sm">
                        <thead className="border-b border-zinc-200 font-medium text-zinc-600 dark:border-zinc-800 dark:text-zinc-400">
                            <tr>
                                <th className="px-4 py-3">Unit</th>
                                <th className="px-4 py-3">CAT/Prac Avg</th>
                                <th className="px-4 py-3">CAT/Prac (/30)</th>
                                <th className="px-4 py-3">Final (/70)</th>
                                <th className="px-4 py-3">Unit Total</th>
                                <th className="px-4 py-3">Grade</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                            {course.units.map((u) => (
                                <UnitRow key={u.unitId} unit={u} />
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </section>
    );
}

function UnitRow({ unit }: { unit: UnitAggregate }) {
    return (
        <tr className="hover:bg-zinc-50/70 dark:hover:bg-zinc-800/50">
            <td className="px-4 py-3">
                <div className="font-mono text-xs font-bold text-[#082B66] dark:text-orange-400">
                    {unit.unitCode}
                </div>
                <div className="text-xs text-zinc-600 dark:text-zinc-400">
                    {unit.unitName}
                </div>
                {!unit.isComplete && unit.missing.length > 0 && (
                    <div className="mt-1 text-[11px] font-medium text-amber-700 dark:text-amber-400">
                        Missing: {unit.missing.join(", ")}
                    </div>
                )}
            </td>
            <td className="px-4 py-3 text-xs text-zinc-700 dark:text-zinc-200">
                {unit.hasCatPractical
                    ? `${unit.catPracticalAvg.toFixed(1)}%`
                    : "—"}
            </td>
            <td className="px-4 py-3 font-mono text-xs font-bold text-zinc-800 dark:text-zinc-100">
                {unit.isComplete
                    ? `${unit.catPracticalScore.toFixed(1)} / 30`
                    : "—"}
            </td>
            <td className="px-4 py-3 font-mono text-xs font-bold text-zinc-800 dark:text-zinc-100">
                {unit.isComplete
                    ? `${unit.finalExamScore.toFixed(1)} / 70`
                    : "—"}
            </td>
            <td className="px-4 py-3 font-mono text-xs font-bold text-zinc-900 dark:text-white">
                {unit.isComplete ? `${unit.total.toFixed(1)}%` : "—"}
            </td>
            <td className="px-4 py-3">
                <GradeBadge grade={unit.grade} />
            </td>
        </tr>
    );
}

function StatCard({
    label,
    value,
    icon,
}: {
    label: string;
    value: React.ReactNode;
    icon: React.ReactNode;
}) {
    return (
        <div className="rounded-sm border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-center justify-between">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                    {label}
                </p>
                <span className="text-[#082B66] dark:text-orange-400">
                    {icon}
                </span>
            </div>
            <div className="mt-2 text-2xl font-bold text-zinc-900 dark:text-white">
                {value}
            </div>
        </div>
    );
}

function Skeleton() {
    return (
        <div className="space-y-6">
            <div className="grid grid-cols-3 gap-3">
                {[...Array(3)].map((_, i) => (
                    <div
                        key={i}
                        className="h-24 animate-pulse rounded-sm border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"
                    />
                ))}
            </div>
            <div className="space-y-3 rounded-sm border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
                {[...Array(6)].map((_, i) => (
                    <div
                        key={i}
                        className="flex animate-pulse items-center gap-4 border-b border-zinc-100 pb-3 dark:border-zinc-800"
                    >
                        <div className="h-5 w-40 rounded-sm bg-zinc-200 dark:bg-zinc-800" />
                        <div className="h-5 w-24 rounded-sm bg-zinc-200 dark:bg-zinc-800" />
                        <div className="h-5 flex-1 rounded-sm bg-zinc-200 dark:bg-zinc-800" />
                        <div className="h-5 w-16 rounded-sm bg-zinc-200 dark:bg-zinc-800" />
                    </div>
                ))}
            </div>
        </div>
    );
}

function EmptyState({ studentId }: { studentId: string }) {
    return (
        <div className="rounded-sm border border-dashed border-zinc-300 bg-white py-12 text-center dark:border-zinc-700 dark:bg-zinc-900">
            <FileText className="mx-auto mb-3 h-12 w-12 text-zinc-300 dark:text-zinc-700" />
            <h3 className="text-lg font-semibold text-zinc-800 dark:text-zinc-100">
                No results yet
            </h3>
            <p className="mx-auto mt-1 max-w-sm text-sm text-zinc-500 dark:text-zinc-400">
                This student has no recorded assessments. Record marks to see
                their aggregated score here.
            </p>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                <Link
                    href={`/students/${studentId}`}
                    className="inline-flex items-center gap-2 rounded-sm border border-zinc-300 bg-white px-4 py-2 text-xs font-semibold text-zinc-800 transition hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
                >
                    <User className="h-3.5 w-3.5" />
                    Student Profile
                </Link>
                <Link
                    href="/results"
                    className="inline-flex items-center gap-2 rounded-sm border border-zinc-300 bg-white px-4 py-2 text-xs font-semibold text-zinc-800 transition hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
                >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    All Results
                </Link>
            </div>
        </div>
    );
}