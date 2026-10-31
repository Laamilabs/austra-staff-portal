"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react"; // ← added useRef
import Link from "next/link";
import { useParams } from "next/navigation";
import { QRCodeCanvas } from "qrcode.react"; // ← NEW
import {
    AlertCircle,
    ArrowLeft,
    Award,
    BarChart3,
    ChevronDown,
    ClipboardList,
    Download,
    FileText,
    Loader2,
    RefreshCw,
    User,
} from "lucide-react";

import { Result, resultApi } from "@/app/types/results";
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
import { GRADING_SCALE, generateResultsSlip } from "./results-slip";

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

function studentFullName(s: Student): string {
    return [s.fullName?.firstName, s.fullName?.middleName, s.fullName?.lastName]
        .filter(Boolean)
        .join(" ")
        .trim();
}

/** A course section — enrollment-first, with optional results attached. */
interface CourseSectionModel {
    courseId: string;
    courseCode: string;
    courseName: string;
    admissionNumber?: string;
    aggregate?: CourseAggregate;
}

/* -------------------------------------------------------------------------- */
/* Pills / badges                                                             */
/* -------------------------------------------------------------------------- */

function GradeBadge({ grade }: { grade: string }) {
    const base =
        "inline-flex items-center gap-1 rounded-sm border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider";

    const tone =
        grade.includes("Distinction")
            ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
            : grade.includes("Credit")
                ? "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-800 dark:bg-sky-950/40 dark:text-sky-300"
                : grade.includes("Pass")
                    ? "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300"
                    : grade === "Incomplete"
                        ? "border-zinc-300 bg-zinc-100 text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800/60 dark:text-zinc-300"
                        : "border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300";

    return <span className={`${base} ${tone}`}>{grade}</span>;
}

/* -------------------------------------------------------------------------- */
/* Grading scale reference card                                               */
/* -------------------------------------------------------------------------- */

function GradingScaleCard() {
    return (
        <section className="overflow-hidden rounded-sm border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <header className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-100 px-5 py-3 dark:border-zinc-800">
                <div className="flex items-center gap-3">
                    <span className="flex h-7 w-7 items-center justify-center rounded-sm bg-orange-400/10 text-orange-500 ring-1 ring-inset ring-orange-400/30 dark:text-orange-400">
                        <Award className="h-3.5 w-3.5" />
                    </span>
                    <div>
                        <h2 className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">
                            Grading Scale
                        </h2>
                        <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                            Applied to every unit, course and overall total
                        </p>
                    </div>
                </div>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                    7-band scale
                </span>
            </header>

            <ul className="flex flex-wrap gap-2 p-4">
                {GRADING_SCALE.map((g) => (
                    <li
                        key={g.label}
                        className="flex items-center gap-2 rounded-sm border border-zinc-200 bg-zinc-50/60 px-3 py-1.5 dark:border-zinc-800 dark:bg-zinc-900/60"
                    >
                        <span className="font-mono text-[11px] font-semibold tabular-nums text-zinc-600 dark:text-zinc-400">
                            {g.range}%
                        </span>
                        <GradeBadge grade={g.label} />
                    </li>
                ))}
            </ul>

            <div className="border-t border-zinc-100 bg-zinc-50/60 px-5 py-2.5 dark:border-zinc-800 dark:bg-zinc-800/30">
                <p className="text-[10px] leading-relaxed text-zinc-500 dark:text-zinc-400">
                    Per-unit totals combine CATs + practicals (30%) with the
                    final exam (70%). A course is graded only when every unit
                    in it is complete — missing CATs or a missing final exam
                    mark make a unit Incomplete, and an Incomplete unit makes
                    the course Incomplete.
                </p>
            </div>
        </section>
    );
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
    const [student, setStudent] = useState<Student | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [downloading, setDownloading] = useState<string | null>(null);

    /* -------------------- NEW: hidden QR canvas ref -------------------- */
    const qrRef = useRef<HTMLCanvasElement | null>(null);

    /* ------------------------------ Fetch ------------------------------ */

    const fetchAll = useCallback(async () => {
        if (!studentId) return;

        try {
            setLoading(true);
            setError(null);

            const [studentRes, resultsRes, unitsRes, coursesRes] =
                await Promise.all([
                    studentApi.getById(studentId),
                    resultApi.getByStudent(studentId),
                    unitApi.getAll().catch(() => ({ data: [] as Unit[] })),
                    courseApi
                        .getAll()
                        .catch(() => ({ data: [] as Course[] })),
                ]);

            setStudent(studentRes.data);
            setResults(resultsRes.data ?? []);
            setUnits(unitsRes.data ?? []);
            setCourses(coursesRes.data ?? []);
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
    }, [studentId]);

    useEffect(() => {
        fetchAll();
    }, [fetchAll]);

    /* ---------------------- unitId -> course lookup -------------------- */

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

    /* ------------------- total possible units per course ---------------- */

    const totalUnitsByCourse = useMemo(() => {
        const map = new Map<string, number>();
        for (const u of units) {
            const cid = resolveCourseId(u.courseId);
            if (!cid) continue;
            map.set(cid, (map.get(cid) ?? 0) + 1);
        }
        return map;
    }, [units]);

    const aggregate = useMemo(() => {
        const list = aggregateByStudent(results, unitCourseLookup);
        return list[0] ?? null;
    }, [results, unitCourseLookup]);

    const coursesWithResults = useMemo(
        () => aggregate?.courses ?? [],
        [aggregate],
    );

    /* --------------------- Sections (enrollment-first) ----------------- */

    const sections = useMemo<CourseSectionModel[]>(() => {
        const aggByCourse = new Map(
            coursesWithResults.map((c) => [c.courseId, c]),
        );
        const coursesById = new Map(courses.map((c) => [c._id, c]));
        const seen = new Set<string>();
        const out: CourseSectionModel[] = [];

        for (const e of student?.courses ?? []) {
            const cid = resolveCourseId(e.courseId);
            if (!cid || seen.has(cid)) continue;
            seen.add(cid);

            const agg = aggByCourse.get(cid);
            const c = coursesById.get(cid);
            out.push({
                courseId: cid,
                courseCode: agg?.courseCode ?? c?.courseCode ?? "—",
                courseName: agg?.courseName ?? c?.name ?? "Unknown course",
                admissionNumber: e.admissionNumber,
                aggregate: agg,
            });
        }

        for (const a of coursesWithResults) {
            if (seen.has(a.courseId)) continue;
            seen.add(a.courseId);
            out.push({
                courseId: a.courseId,
                courseCode: a.courseCode,
                courseName: a.courseName,
                aggregate: a,
            });
        }

        return out;
    }, [student, courses, coursesWithResults]);

    const courseOptions = useMemo(
        () =>
            sections.map((s) => ({
                id: s.courseId,
                label: `${s.courseCode} — ${s.courseName}`,
                hasAggregate: Boolean(s.aggregate),
            })),
        [sections],
    );

    const hasMultipleCourses = sections.length > 1;

    /* --------------------------- Display fields ------------------------ */

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

    const displayAdmission = hasMultipleCourses
        ? ""
        : sections[0]?.admissionNumber ?? "";

    /* ------------ NEW: student email + QR target URL ------------ */
    const studentEmail = useMemo(() => {
        if (!student) return "";
        const uid = student.userId;
        if (uid && typeof uid === "object") {
            const u = uid as StudentUser;
            if (u.email?.trim()) return u.email.trim();
        }
        const direct = (student as unknown as { email?: string }).email;
        return typeof direct === "string" ? direct.trim() : "";
    }, [student]);

    const qrUrl = studentEmail
        ? `https://austratraininginstitute.co.ke/studentQr/${encodeURIComponent(
              studentEmail,
          )}`
        : "";

    const sheetHref = (courseId: string) =>
        `/results/new/student-based/units-sheet?studentId=${encodeURIComponent(
            studentId,
        )}&courseId=${encodeURIComponent(courseId)}`;

    const ctaCls =
        "inline-flex items-center gap-2 rounded-sm bg-[#082B66] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#082B66]/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 dark:bg-orange-400 dark:text-zinc-900 dark:hover:bg-orange-400/90 disabled:cursor-not-allowed disabled:opacity-50";

    /* ---------------------- Download slip handler ---------------------- */

    const handleDownloadSlip = useCallback(
        async (courseId: string) => {
            const section = sections.find((s) => s.courseId === courseId);
            if (!section || !section.aggregate) return;

            try {
                setDownloading(courseId);

                // High-res PNG from the hidden <QRCodeCanvas>.
                // If the logo hasn't painted yet this still yields a valid
                // logo-less QR — the slip always generates.
                const qrDataUrl =
                    qrRef.current?.toDataURL("image/png") ?? undefined;

                await generateResultsSlip({
                    studentName: displayName,
                    admissionNumber: section.admissionNumber,
                    courseCode: section.courseCode,
                    courseName: section.courseName,
                    aggregate: section.aggregate,
                    totalUnits: totalUnitsByCourse.get(section.courseId),
                    qrDataUrl, // ← NEW
                });
            } catch (err) {
                console.error("Failed to generate results slip:", err);
                window.alert(
                    "Unable to generate the results slip. Please ensure the PDF libraries are installed and try again.",
                );
            } finally {
                setDownloading(null);
            }
        },
        [sections, displayName, totalUnitsByCourse],
    );

    const recordedUnits = coursesWithResults.reduce(
        (s, c) => s + c.unitCount,
        0,
    );
    const totalResults = aggregate?.resultCount ?? 0;

    /* ------------------------------- Render ---------------------------- */

    return (
        <div className="mx-auto max-w-full space-y-6 py-6">
            {/* NEW: hidden QR — same settings as <GenerateStudentQr /> so the
                slip and on-page QR match visually. */}
            {qrUrl && (
                <div className="hidden" aria-hidden="true">
                    <QRCodeCanvas
                        ref={qrRef}
                        value={qrUrl}
                        size={512}
                        level="H"
                        bgColor="#ffffff"
                        fgColor="#0B1E3D"
                        marginSize={1}
                        imageSettings={{
                            src: "/logo2.png",
                            height: 512 * 0.22,
                            width: 512 * 0.22,
                            excavate: true,
                        }}
                    />
                </div>
            )}

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

                {/* Open Mark Sheet */}
                {courseOptions.length === 1 && (
                    <Link
                        href={sheetHref(courseOptions[0].id)}
                        className="inline-flex items-center gap-2 rounded-sm border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
                    >
                        <ClipboardList className="h-4 w-4" />
                        Open Mark Sheet
                    </Link>
                )}

                {courseOptions.length > 1 && (
                    <details className="group relative">
                        <summary
                            className="inline-flex cursor-pointer list-none items-center gap-2 rounded-sm border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-50 [&::-webkit-details-marker]:hidden dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
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

                {/* Download Results Slip */}
                {courseOptions.length === 1 && (
                    <button
                        type="button"
                        onClick={() => handleDownloadSlip(courseOptions[0].id)}
                        disabled={
                            !courseOptions[0].hasAggregate ||
                            downloading !== null
                        }
                        title={
                            courseOptions[0].hasAggregate
                                ? "Download a PDF results slip"
                                : "Record marks first to generate a slip"
                        }
                        className={ctaCls}
                    >
                        {downloading === courseOptions[0].id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <Download className="h-4 w-4" />
                        )}
                        Download Results Slip
                    </button>
                )}

                {courseOptions.length > 1 && (
                    <details className="group relative">
                        <summary
                            className={`${ctaCls} cursor-pointer list-none [&::-webkit-details-marker]:hidden`}
                        >
                            <Download className="h-4 w-4" />
                            Download Results Slip
                            <ChevronDown className="h-3.5 w-3.5 transition-transform group-open:rotate-180" />
                        </summary>
                        <div
                            role="menu"
                            className="absolute left-0 top-full z-30 mt-1 w-72 overflow-hidden rounded-sm border border-zinc-200 bg-white py-1 shadow-lg dark:border-zinc-700 dark:bg-zinc-900"
                        >
                            <p className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                                Choose a course
                            </p>
                            {courseOptions.map((c) => (
                                <button
                                    key={c.id}
                                    type="button"
                                    onClick={() => handleDownloadSlip(c.id)}
                                    disabled={
                                        !c.hasAggregate || downloading !== null
                                    }
                                    role="menuitem"
                                    className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-xs font-medium text-zinc-700 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50 dark:text-zinc-200 dark:hover:bg-zinc-800"
                                >
                                    <span className="truncate">{c.label}</span>
                                    {!c.hasAggregate && (
                                        <span className="shrink-0 text-[10px] text-zinc-400">
                                            no results
                                        </span>
                                    )}
                                    {downloading === c.id && (
                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    )}
                                </button>
                            ))}
                        </div>
                    </details>
                )}

                <div className="ml-auto">
                    <button
                        type="button"
                        onClick={fetchAll}
                        disabled={loading}
                        title="Refresh"
                        aria-label="Refresh"
                        className="cursor-pointer rounded-sm border border-zinc-200 p-2 text-zinc-600 transition hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                    >
                        <RefreshCw
                            className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
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
                            ? `${sections.length} courses · assessment breakdown per course`
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
            ) : sections.length === 0 ? (
                <EmptyState studentId={studentId} />
            ) : (
                <>
                    {/* GLOBAL SUMMARY */}
                    <div className="grid grid-cols-3 gap-3">
                        <StatCard
                            label="Courses"
                            value={sections.length}
                            icon={<Award className="h-4 w-4" />}
                        />
                        <StatCard
                            label="Units"
                            value={recordedUnits}
                            icon={<FileText className="h-4 w-4" />}
                        />
                        <StatCard
                            label="Results"
                            value={totalResults}
                            icon={<FileText className="h-4 w-4" />}
                        />
                    </div>

                    {/* ONE SECTION PER ENROLLED COURSE */}
                    {sections.map((section) => (
                        <CourseSection
                            key={section.courseId}
                            section={section}
                            totalUnits={totalUnitsByCourse.get(
                                section.courseId,
                            )}
                            sheetHref={sheetHref(section.courseId)}
                            onDownload={() =>
                                handleDownloadSlip(section.courseId)
                            }
                            downloading={downloading === section.courseId}
                        />
                    ))}

                    {/* GRADING SCALE REFERENCE */}
                    <GradingScaleCard />

                    {/* RAW RESULTS — collapsed, only when present */}
                    {results.length > 0 && (
                        <AllAssessments
                            results={results}
                            lookup={unitCourseLookup}
                        />
                    )}
                </>
            )}
        </div>
    );
}

/* -------------------------------------------------------------------------- */
/* Sub-components                                                             */
/* -------------------------------------------------------------------------- */

function CourseSection({
    section,
    sheetHref,
    onDownload,
    downloading,
    totalUnits,
}: {
    section: CourseSectionModel;
    sheetHref: string;
    onDownload: () => void;
    downloading: boolean;
    totalUnits?: number;
}) {
    const { aggregate, admissionNumber, courseCode, courseName } = section;

    const possibleUnits = totalUnits ?? aggregate?.unitCount ?? 0;

    return (
        <section className="space-y-4">
            {/* Course header */}
            <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center rounded-sm bg-[#082B66] px-2 py-1 font-mono text-[11px] font-bold uppercase tracking-wider text-orange-400">
                    {courseCode}
                </span>
                <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">
                    {courseName}
                </h2>
                {admissionNumber && (
                    <span className="font-mono text-xs text-zinc-500 dark:text-zinc-400">
                        Adm. No. {admissionNumber}
                    </span>
                )}

                <div className="ml-auto flex items-center gap-2">
                    {aggregate && (
                        <button
                            type="button"
                            onClick={onDownload}
                            disabled={downloading}
                            title="Download Results Slip"
                            aria-label="Download Results Slip"
                            className="inline-flex h-7 w-7 items-center justify-center rounded-sm border border-zinc-200 bg-white text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
                        >
                            {downloading ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                                <Download className="h-3.5 w-3.5" />
                            )}
                        </button>
                    )}
                    <Link
                        href={sheetHref}
                        className="inline-flex items-center gap-1.5 rounded-sm border border-zinc-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
                    >
                        <ClipboardList className="h-3.5 w-3.5" />
                        Open Mark Sheet
                    </Link>
                </div>
            </div>

            {!aggregate ? (
                <div className="rounded-sm border border-dashed border-zinc-300 bg-white px-6 py-10 text-center dark:border-zinc-700 dark:bg-zinc-900">
                    <FileText className="mx-auto mb-3 h-10 w-10 text-zinc-300 dark:text-zinc-700" />
                    <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">
                        No results recorded yet
                    </p>
                    <p className="mx-auto mt-1 max-w-sm text-xs text-zinc-500 dark:text-zinc-400">
                        Record marks for this course&apos;s units to see the
                        aggregated score and grade here.
                    </p>
                    <Link
                        href={sheetHref}
                        className="mt-4 inline-flex items-center gap-1.5 rounded-sm bg-[#082B66] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#082B66]/90 dark:bg-orange-400 dark:text-zinc-900 dark:hover:bg-orange-400/90"
                    >
                        <ClipboardList className="h-3.5 w-3.5" />
                        Record Marks
                    </Link>
                </div>
            ) : (
                <>
                    {/* Incomplete banner */}
                    {!aggregate.isComplete && (
                        <div className="flex items-start gap-3 rounded-sm border border-amber-200 bg-amber-50 p-4 text-amber-800 dark:border-amber-800/60 dark:bg-amber-950/30 dark:text-amber-300">
                            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
                            <div className="text-sm">
                                <p className="font-semibold">
                                    Incomplete assessment record
                                </p>
                                <p className="mt-0.5 text-xs">
                                    One or more units in this course are
                                    missing required marks (a CAT in the
                                    sequence, or the final exam). Totals and
                                    grades are not calculated until every
                                    unit is complete.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Course stats */}
                    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                        <StatCard
                            label="Total Score"
                            value={
                                aggregate.isComplete ? (
                                    `${aggregate.totalScore.toFixed(1)}%`
                                ) : (
                                    <span className="text-zinc-400">—</span>
                                )
                            }
                            icon={<BarChart3 className="h-4 w-4" />}
                        />
                        <StatCard
                            label="Overall Grade"
                            value={<GradeBadge grade={aggregate.grade} />}
                            icon={<Award className="h-4 w-4" />}
                        />
                        <StatCard
                            label="Units"
                            value={`${aggregate.unitCount} / ${possibleUnits}`}
                            icon={<FileText className="h-4 w-4" />}
                        />
                        <StatCard
                            label="Results"
                            value={aggregate.resultCount}
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
                                CATs &amp; practicals → /30 · Final exam → /70
                                · Unit total → /100. Units with missing CATs
                                or no final exam are marked Incomplete.
                            </p>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full border-collapse text-left text-sm">
                                <thead className="border-b border-zinc-200 font-medium text-zinc-600 dark:border-zinc-800 dark:text-zinc-400">
                                    <tr>
                                        <th className="px-4 py-3">Unit</th>
                                        <th className="px-4 py-3">
                                            CAT/Prac Avg
                                        </th>
                                        <th className="px-4 py-3">
                                            CAT/Prac (/30)
                                        </th>
                                        <th className="px-4 py-3">
                                            Final (/70)
                                        </th>
                                        <th className="px-4 py-3">
                                            Unit Total
                                        </th>
                                        <th className="px-4 py-3">Grade</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                                    {aggregate.units.map((u) => (
                                        <UnitRow key={u.unitId} unit={u} />
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}
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
                No courses enrolled
            </h3>
            <p className="mx-auto mt-1 max-w-sm text-sm text-zinc-500 dark:text-zinc-400">
                This student has no course enrollments yet, so there is
                nothing to show here. Add an enrollment to begin recording
                results.
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