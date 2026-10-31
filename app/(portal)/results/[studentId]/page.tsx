"use client";

import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
    type ReactNode,
} from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { QRCodeCanvas } from "qrcode.react";
import {
    AlertCircle,
    ArrowLeft,
    Award,
    CheckCircle2,
    ClipboardList,
    Download,
    FileText,
    Info,
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

function initials(name: string): string {
    const parts = name.split(/\s+/).filter(Boolean);
    if (parts.length === 0) return "?";
    const first = parts[0][0] ?? "";
    const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
    return (first + last).toUpperCase();
}

const fmt = (n: number) => n.toFixed(1);

/** A course section — enrollment-first, with optional results attached. */
interface CourseSectionModel {
    courseId: string;
    courseCode: string;
    courseName: string;
    admissionNumber?: string;
    aggregate?: CourseAggregate;
}

type GradeKind = "distinction" | "credit" | "pass" | "incomplete" | "fail";

function gradeKind(grade: string): GradeKind {
    if (grade.includes("Distinction")) return "distinction";
    if (grade.includes("Credit")) return "credit";
    if (grade.includes("Pass")) return "pass";
    if (grade === "Incomplete") return "incomplete";
    return "fail";
}

const GRADE_BADGE: Record<GradeKind, string> = {
    distinction:
        "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300",
    credit: "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-800 dark:bg-sky-950/40 dark:text-sky-300",
    pass: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300",
    incomplete:
        "border-zinc-300 bg-zinc-100 text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800/60 dark:text-zinc-300",
    fail: "border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300",
};

const GRADE_BAR: Record<GradeKind, string> = {
    distinction: "bg-emerald-500",
    credit: "bg-sky-500",
    pass: "bg-amber-500",
    incomplete: "bg-zinc-400",
    fail: "bg-red-500",
};

/* -------------------------------------------------------------------------- */
/* Small building blocks                                                      */
/* -------------------------------------------------------------------------- */

function GradeBadge({
    grade,
    className = "",
}: {
    grade: string;
    className?: string;
}) {
    return (
        <span
            className={`inline-flex items-center whitespace-nowrap rounded-sm border px-2 py-0.5 text-[11px] font-semibold ${GRADE_BADGE[gradeKind(grade)]} ${className}`}
        >
            {grade}
        </span>
    );
}

function Bar({
    value,
    max,
    tone,
}: {
    value: number | null;
    max: number;
    tone: string;
}) {
    const pct =
        value === null ? 0 : Math.max(0, Math.min(100, (value / max) * 100));
    return (
        <div className="h-1 w-full overflow-hidden rounded-sm bg-zinc-100 dark:bg-zinc-800">
            <div
                className={`h-full rounded-sm ${tone}`}
                style={{ width: `${pct}%` }}
            />
        </div>
    );
}

/* -------------------------------------------------------------------------- */
/* Grading scale                                                              */
/* -------------------------------------------------------------------------- */

function GradingScaleCard() {
    return (
        <section className={`${card} overflow-hidden`}>
            <header className="flex items-center gap-3 border-b border-zinc-100 px-4 py-3 dark:border-zinc-800">
                <span className="flex h-7 w-7 items-center justify-center rounded-sm bg-orange-400/10 text-orange-500 ring-1 ring-inset ring-orange-400/30 dark:text-orange-400">
                    <Award className="h-3.5 w-3.5" />
                </span>
                <div className="min-w-0">
                    <h2 className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">
                        Grading scale
                    </h2>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                        7 bands · applied to every unit and course
                    </p>
                </div>
            </header>

            <ul className="grid grid-cols-1 gap-1.5 p-1 md:grid-cols-4 xl:grid-cols-1">
                {GRADING_SCALE.map((g) => (
                    <li
                        key={g.label}
                        className="flex items-center justify-between gap-2 rounded-sm border border-zinc-200 bg-zinc-50/60 px-2.5 py-1.5 dark:border-zinc-800 dark:bg-zinc-900/60"
                    >
                        <span className="font-mono text-[11px] font-semibold tabular-nums text-zinc-600 dark:text-zinc-400">
                            {g.range}%
                        </span>
                        <GradeBadge grade={g.label} />
                    </li>
                ))}
            </ul>

            <details className="group border-t border-zinc-100 dark:border-zinc-800">
                <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-2.5 text-[11px] font-semibold text-zinc-600 [&::-webkit-details-marker]:hidden dark:text-zinc-300">
                    <Info className="h-3.5 w-3.5 text-[#082B66] dark:text-orange-400" />
                    How are totals calculated?
                </summary>
                <p className="px-4 pb-3 text-[11px] leading-relaxed text-zinc-500 dark:text-zinc-400">
                    Per-unit totals combine CATs + practicals (30%) with the
                    final exam (70%). A course is graded only when every unit
                    in it is complete — missing CATs or a missing final exam
                    mark make a unit Incomplete, and an Incomplete unit makes
                    the course Incomplete.
                </p>
            </details>
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
    const [activeId, setActiveId] = useState<string | null>(null);

    /* Hidden QR canvas (rendered into the slip) */
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

    const hasMultipleCourses = sections.length > 1;
    const active =
        sections.find((s) => s.courseId === activeId) ?? sections[0] ?? null;

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

    /* ---------------------- Download slip handler ---------------------- */

    const handleDownloadSlip = useCallback(
        async (courseId: string) => {
            const section = sections.find((s) => s.courseId === courseId);
            if (!section || !section.aggregate) return;

            try {
                setDownloading(courseId);

                const qrDataUrl =
                    qrRef.current?.toDataURL("image/png") ?? undefined;

                await generateResultsSlip({
                    studentName: displayName,
                    admissionNumber: section.admissionNumber,
                    courseCode: section.courseCode,
                    courseName: section.courseName,
                    aggregate: section.aggregate,
                    totalUnits: totalUnitsByCourse.get(section.courseId),
                    qrDataUrl,
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
        <div className="mx-auto w-full max-w-[1920px] space-y-4 pb-28 pt-4 sm:space-y-5 lg:pb-8 lg:pt-6">
            {/* Hidden QR — same settings as <GenerateStudentQr /> */}
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
            <nav
                aria-label="Page navigation"
                className="flex items-center gap-2"
            >
                <Link href="/results" className={`${btnSecondary} ${btnSize}`}>
                    <ArrowLeft className="h-4 w-4" />
                    All Results
                </Link>

                <div className="ml-auto flex items-center gap-2">
                    <Link
                        href={`/students/${studentId}`}
                        aria-label="Student profile"
                        className={`${btnSecondary} h-11 w-11 sm:h-9 sm:w-auto sm:px-3`}
                    >
                        <User className="h-4 w-4" />
                        <span className="hidden sm:inline">
                            Student Profile
                        </span>
                    </Link>
                    <button
                        type="button"
                        onClick={fetchAll}
                        disabled={loading}
                        title="Refresh"
                        aria-label="Refresh"
                        className={`${btnSecondary} h-11 w-11 sm:h-9 sm:w-9`}
                    >
                        <RefreshCw
                            className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
                        />
                    </button>
                </div>
            </nav>

            {/* HERO */}
            <header className="overflow-hidden rounded-sm bg-[#082B66] text-white shadow-sm dark:border dark:border-white/10">
                <div className="h-1 bg-orange-400" />
                <div className="flex flex-col gap-4 p-4 sm:p-5 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex min-w-0 items-center gap-3 sm:gap-4">
                        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-sm bg-orange-400 text-base font-bold text-[#082B66] sm:h-14 sm:w-14 sm:text-lg">
                            {initials(displayName)}
                        </span>
                        <div className="min-w-0">
                            <h1 className="truncate text-xl font-bold leading-tight sm:text-2xl">
                                {displayName}
                            </h1>
                            <p className="mt-0.5 truncate text-xs text-white/70 sm:text-sm">
                                {hasMultipleCourses
                                    ? `${sections.length} courses · assessment breakdown per course`
                                    : sections[0]?.admissionNumber
                                        ? `Adm. No. ${sections[0].admissionNumber}`
                                        : "Assessment breakdown per unit"}
                            </p>
                        </div>
                    </div>

                    <dl className="grid grid-cols-3 gap-px overflow-hidden rounded-sm bg-white/15 lg:min-w-[22rem]">
                        {[
                            { label: "Courses", value: sections.length },
                            { label: "Units", value: recordedUnits },
                            { label: "Results", value: totalResults },
                        ].map((s) => (
                            <div
                                key={s.label}
                                className="bg-[#082B66] px-3 py-2 text-center"
                            >
                                <dt className="text-[10px] font-semibold uppercase tracking-wider text-white/60">
                                    {s.label}
                                </dt>
                                <dd className="text-lg font-bold tabular-nums">
                                    {loading ? "–" : s.value}
                                </dd>
                            </div>
                        ))}
                    </dl>
                </div>
            </header>

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

            {/* BODY */}
            {loading ? (
                <Skeleton />
            ) : sections.length === 0 || !active ? (
                <EmptyState studentId={studentId} />
            ) : (
                <>
                    {hasMultipleCourses && (
                        <CourseTabs
                            sections={sections}
                            activeId={active.courseId}
                            onSelect={setActiveId}
                        />
                    )}

                    <CoursePanel
                        key={active.courseId}
                        section={active}
                        totalUnits={totalUnitsByCourse.get(active.courseId)}
                        sheetHref={sheetHref(active.courseId)}
                        onDownload={() => handleDownloadSlip(active.courseId)}
                        downloading={downloading === active.courseId}
                    />

                    {results.length > 0 && (
                        <AllAssessments
                            results={results}
                            lookup={unitCourseLookup}
                        />
                    )}

                    {/* MOBILE / TABLET ACTION BAR */}
                    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-zinc-200 bg-white/95 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur lg:hidden dark:border-zinc-800 dark:bg-zinc-900/95">
                        <div className="mx-auto flex max-w-xl gap-2">
                            <Link
                                href={sheetHref(active.courseId)}
                                className={`${btnSecondary} h-11 flex-1`}
                            >
                                <ClipboardList className="h-4 w-4" />
                                Mark Sheet
                            </Link>
                            <button
                                type="button"
                                onClick={() =>
                                    handleDownloadSlip(active.courseId)
                                }
                                disabled={
                                    !active.aggregate || downloading !== null
                                }
                                className={`${btnPrimary} h-11 flex-1`}
                            >
                                {downloading === active.courseId ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <Download className="h-4 w-4" />
                                )}
                                Download Slip
                            </button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

/* -------------------------------------------------------------------------- */
/* Course tabs                                                                */
/* -------------------------------------------------------------------------- */

function statusDot(section: CourseSectionModel): string {
    const a = section.aggregate;
    if (!a) return "bg-zinc-300 dark:bg-zinc-600";
    if (!a.isComplete) return "bg-amber-400";
    return gradeKind(a.grade) === "fail" ? "bg-red-500" : "bg-emerald-500";
}

function CourseTabs({
    sections,
    activeId,
    onSelect,
}: {
    sections: CourseSectionModel[];
    activeId: string;
    onSelect: (id: string) => void;
}) {
    return (
        <div
            role="tablist"
            aria-label="Courses"
            className="-mx-1 flex snap-x gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
            {sections.map((s) => {
                const isActive = s.courseId === activeId;
                return (
                    <button
                        key={s.courseId}
                        type="button"
                        role="tab"
                        aria-selected={isActive}
                        onClick={() => onSelect(s.courseId)}
                        className={`relative flex min-h-12 w-[11rem] shrink-0 snap-start items-center gap-2.5 rounded-sm border px-3 py-2 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 sm:w-[14rem] ${isActive
                                ? "border-[#082B66] bg-[#082B66] text-white after:absolute after:inset-x-3 after:bottom-0 after:h-0.5 after:rounded-sm after:bg-orange-400 dark:border-orange-400 dark:bg-orange-400/10"
                                : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
                            }`}
                    >
                        <span
                            className={`h-2 w-2 shrink-0 rounded-full ${statusDot(s)}`}
                        />
                        <span className="min-w-0 flex-1">
                            <span
                                className={`block font-mono text-[11px] font-bold ${isActive
                                        ? "text-orange-400"
                                        : "text-[#082B66] dark:text-orange-400"
                                    }`}
                            >
                                {s.courseCode}
                            </span>
                            <span
                                className={`block truncate text-[11px] ${isActive ? "text-white/80" : "text-zinc-500 dark:text-zinc-400"
                                    }`}
                            >
                                {s.courseName}
                            </span>
                        </span>
                        {s.aggregate?.isComplete && (
                            <span className="font-mono text-[11px] font-bold tabular-nums">
                                {fmt(s.aggregate.totalScore)}%
                            </span>
                        )}
                    </button>
                );
            })}
        </div>
    );
}

/* -------------------------------------------------------------------------- */
/* Course panel                                                               */
/* -------------------------------------------------------------------------- */

function CoursePanel({
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
            {/* Course header (+ desktop actions) */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                <span className="inline-flex items-center rounded-sm bg-[#082B66] px-2 py-1 font-mono text-[11px] font-bold uppercase tracking-wider text-orange-400">
                    {courseCode}
                </span>
                <h2 className="min-w-0 text-base font-semibold text-zinc-900 sm:text-lg dark:text-white">
                    {courseName}
                </h2>
                {admissionNumber && (
                    <span className="font-mono text-xs text-zinc-500 dark:text-zinc-400">
                        Adm. No. {admissionNumber}
                    </span>
                )}

                <div className="ml-auto hidden items-center gap-2 lg:flex">
                    <Link
                        href={sheetHref}
                        className={`${btnSecondary} h-9 px-3`}
                    >
                        <ClipboardList className="h-4 w-4" />
                        Open Mark Sheet
                    </Link>
                    <button
                        type="button"
                        onClick={onDownload}
                        disabled={!aggregate || downloading}
                        title={
                            aggregate
                                ? "Download a PDF results slip"
                                : "Record marks first to generate a slip"
                        }
                        className={`${btnPrimary} h-9 px-3`}
                    >
                        {downloading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <Download className="h-4 w-4" />
                        )}
                        Download Results Slip
                    </button>
                </div>
            </div>

            {/* Layout: stacked on phones → sidebar on xl → 3 columns on 2xl */}
            <div className="grid gap-4 xl:grid-cols-[320px_minmax(0,1fr)] xl:items-start 2xl:grid-cols-[340px_minmax(0,1fr)_320px]">
                {/* `contents` below xl lets children interleave with <main> */}
                <aside className="contents space-y-4 xl:sticky xl:top-4 xl:block">
                    {aggregate && (
                        <div className="order-1">
                            <ScoreSummary
                                aggregate={aggregate}
                                possibleUnits={possibleUnits}
                            />
                        </div>
                    )}
                    <div className="order-3 xl:mt-4 2xl:hidden">
                        <GradingScaleCard />
                    </div>
                </aside>

                <div className="order-2 min-w-0 space-y-4">
                    {!aggregate ? (
                        <NoResults sheetHref={sheetHref} />
                    ) : (
                        <>
                            {!aggregate.isComplete && (
                                <IncompleteBanner aggregate={aggregate} />
                            )}
                            <UnitsPanel aggregate={aggregate} />
                        </>
                    )}
                </div>

                {/* Third column on ultra-wide screens */}
                <div className="order-4 hidden 2xl:sticky 2xl:top-4 2xl:block">
                    <GradingScaleCard />
                </div>
            </div>
        </section>
    );
}

/* -------------------------------------------------------------------------- */
/* Score summary                                                              */
/* -------------------------------------------------------------------------- */

function ScoreSummary({
    aggregate,
    possibleUnits,
}: {
    aggregate: CourseAggregate;
    possibleUnits: number;
}) {
    const completeCount = aggregate.units.filter((u) => u.isComplete).length;
    const denominator = Math.max(possibleUnits, aggregate.units.length, 1);
    const pct = aggregate.isComplete
        ? Math.max(0, Math.min(100, aggregate.totalScore))
        : 0;

    const R = 46;
    const C = 2 * Math.PI * R;

    return (
        <section className={`${card} p-4`}>
            <div className="flex items-center gap-4 xl:flex-col xl:text-center">
                {/* Ring */}
                <div className="relative h-28 w-28 shrink-0">
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
                            strokeDasharray={aggregate.isComplete ? undefined : "3 5"}
                        />
                        {aggregate.isComplete && (
                            <circle
                                cx="56"
                                cy="56"
                                r={R}
                                fill="none"
                                strokeWidth="8"
                                strokeLinecap="round"
                                className="stroke-orange-400"
                                strokeDasharray={C}
                                strokeDashoffset={C * (1 - pct / 100)}
                            />
                        )}
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                        {aggregate.isComplete ? (
                            <>
                                <span className="text-2xl font-bold tabular-nums text-[#082B66] dark:text-white">
                                    {fmt(aggregate.totalScore)}
                                    <span className="text-sm">%</span>
                                </span>
                                <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                                    Overall
                                </span>
                            </>
                        ) : (
                            <span className="px-2 text-center text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                                Incomplete
                            </span>
                        )}
                    </div>
                </div>

                <div className="min-w-0 flex-1 space-y-3 xl:w-full">
                    <div>
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                            Overall grade
                        </p>
                        <GradeBadge
                            grade={aggregate.grade}
                            className="mt-1 !text-xs !px-2.5 !py-1"
                        />
                    </div>
                    <div>
                        <div className="mb-1 flex items-center justify-between text-[11px] text-zinc-500 dark:text-zinc-400">
                            <span>Units complete</span>
                            <span className="font-mono font-semibold tabular-nums text-zinc-700 dark:text-zinc-200">
                                {completeCount} / {denominator}
                            </span>
                        </div>
                        <Bar
                            value={completeCount}
                            max={denominator}
                            tone="bg-[#082B66] dark:bg-orange-400"
                        />
                    </div>
                </div>
            </div>

            <dl className="mt-4 grid grid-cols-3 divide-x divide-zinc-100 border-t border-zinc-100 pt-3 text-center dark:divide-zinc-800 dark:border-zinc-800">
                {[
                    { label: "Recorded", value: aggregate.unitCount },
                    { label: "Complete", value: completeCount },
                    { label: "Results", value: aggregate.resultCount },
                ].map((s) => (
                    <div key={s.label}>
                        <dd className="text-lg font-bold tabular-nums text-zinc-900 dark:text-white">
                            {s.value}
                        </dd>
                        <dt className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                            {s.label}
                        </dt>
                    </div>
                ))}
            </dl>
        </section>
    );
}

/* -------------------------------------------------------------------------- */
/* Banners / empty                                                            */
/* -------------------------------------------------------------------------- */

function IncompleteBanner({ aggregate }: { aggregate: CourseAggregate }) {
    const incomplete = aggregate.units.filter((u) => !u.isComplete).length;
    return (
        <div className="flex items-start gap-3 rounded-sm border border-amber-200 bg-amber-50 p-3 text-amber-800 sm:p-4 dark:border-amber-800/60 dark:bg-amber-950/30 dark:text-amber-300">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
            <div className="text-sm">
                <p className="font-semibold">
                    Incomplete record · {incomplete} of{" "}
                    {aggregate.units.length} unit
                    {aggregate.units.length === 1 ? "" : "s"} missing marks
                </p>
                <p className="mt-0.5 text-xs">
                    A CAT in the sequence or the final exam is missing.
                    Totals and grades are calculated once every unit is
                    complete.
                </p>
            </div>
        </div>
    );
}

function NoResults({ sheetHref }: { sheetHref: string }) {
    return (
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
                className={`${btnPrimary} mt-4 h-11 px-4 sm:h-9`}
            >
                <ClipboardList className="h-3.5 w-3.5" />
                Record Marks
            </Link>
        </div>
    );
}

/* -------------------------------------------------------------------------- */
/* Units (cards on phones, table from md)                                     */
/* -------------------------------------------------------------------------- */

function UnitsPanel({ aggregate }: { aggregate: CourseAggregate }) {
    const [onlyIncomplete, setOnlyIncomplete] = useState(false);
    const incompleteCount = aggregate.units.filter((u) => !u.isComplete).length;

    const visible =
        onlyIncomplete && incompleteCount > 0
            ? aggregate.units.filter((u) => !u.isComplete)
            : aggregate.units;

    return (
        <section className={`${card} overflow-hidden`}>
            <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-zinc-200 bg-zinc-50 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-800/50">
                <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">
                        Unit results
                    </h3>
                    <p className="mt-0.5 text-[11px] text-zinc-500 dark:text-zinc-400">
                        CAT &amp; practicals{" "}
                        <b className="font-semibold">/30</b> · Final exam{" "}
                        <b className="font-semibold">/70</b> · Total{" "}
                        <b className="font-semibold">/100</b>
                    </p>
                </div>

                {incompleteCount > 0 && (
                    <div
                        role="group"
                        aria-label="Filter units"
                        className="inline-flex overflow-hidden rounded-sm border border-zinc-200 text-[11px] font-semibold dark:border-zinc-700"
                    >
                        <button
                            type="button"
                            onClick={() => setOnlyIncomplete(false)}
                            aria-pressed={!onlyIncomplete}
                            className={`h-9 px-3 transition sm:h-8 ${!onlyIncomplete
                                    ? "bg-[#082B66] text-white dark:bg-orange-400 dark:text-zinc-900"
                                    : "bg-white text-zinc-600 hover:bg-zinc-50 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
                                }`}
                        >
                            All ({aggregate.units.length})
                        </button>
                        <button
                            type="button"
                            onClick={() => setOnlyIncomplete(true)}
                            aria-pressed={onlyIncomplete}
                            className={`h-9 border-l border-zinc-200 px-3 transition sm:h-8 dark:border-zinc-700 ${onlyIncomplete
                                    ? "bg-[#082B66] text-white dark:bg-orange-400 dark:text-zinc-900"
                                    : "bg-white text-zinc-600 hover:bg-zinc-50 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
                                }`}
                        >
                            Incomplete ({incompleteCount})
                        </button>
                    </div>
                )}
            </header>

            {/* Phones: cards */}
            <ul className="divide-y divide-zinc-100 md:hidden dark:divide-zinc-800">
                {visible.map((u) => (
                    <UnitCard key={u.unitId} unit={u} />
                ))}
            </ul>

            {/* md+: table */}
            <div className="hidden overflow-x-auto md:block">
                <table className="w-full border-collapse text-left text-sm">
                    <thead className="border-b border-zinc-200 bg-white text-[11px] font-semibold uppercase tracking-wider text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
                        <tr>
                            <th className="px-4 py-3 2xl:px-5">Unit</th>
                            <th className="px-4 py-3 text-right 2xl:px-5">
                                CAT avg
                            </th>
                            <th className="px-4 py-3 text-right 2xl:px-5">
                                CAT/Prac (/30)
                            </th>
                            <th className="px-4 py-3 text-right 2xl:px-5">
                                Final (/70)
                            </th>
                            <th className="w-44 px-4 py-3 2xl:w-56 2xl:px-5">
                                Total
                            </th>
                            <th className="px-4 py-3 2xl:px-5">Grade</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                        {visible.map((u) => (
                            <UnitRow key={u.unitId} unit={u} />
                        ))}
                    </tbody>
                </table>
            </div>
        </section>
    );
}

function MissingNote({ unit }: { unit: UnitAggregate }) {
    if (unit.isComplete || unit.missing.length === 0) return null;
    return (
        <p className="mt-1.5 flex items-start gap-1 text-[11px] font-medium text-amber-700 dark:text-amber-400">
            <AlertCircle className="mt-px h-3 w-3 shrink-0" />
            Missing: {unit.missing.join(", ")}
        </p>
    );
}

function Metric({
    label,
    value,
    max,
    sub,
    tone,
    strong = false,
}: {
    label: string;
    value: number | null;
    max: number;
    sub?: string;
    tone: string;
    strong?: boolean;
}) {
    return (
        <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                {label}
            </p>
            <p
                className={`mt-0.5 font-mono tabular-nums ${strong
                        ? "text-base font-bold text-zinc-900 dark:text-white"
                        : "text-sm font-bold text-zinc-800 dark:text-zinc-100"
                    }`}
            >
                {value === null ? "—" : fmt(value)}
                <span className="ml-0.5 text-[10px] font-medium text-zinc-400">
                    /{max}
                </span>
            </p>
            <div className="mt-1.5">
                <Bar value={value} max={max} tone={tone} />
            </div>
            {sub && (
                <p className="mt-1 text-[10px] text-zinc-500 dark:text-zinc-400">
                    {sub}
                </p>
            )}
        </div>
    );
}

function UnitCard({ unit }: { unit: UnitAggregate }) {
    const ok = unit.isComplete;
    return (
        <li className="p-3.5">
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <p className="font-mono text-xs font-bold text-[#082B66] dark:text-orange-400">
                        {unit.unitCode}
                    </p>
                    <p className="mt-0.5 text-[13px] leading-snug text-zinc-700 dark:text-zinc-300">
                        {unit.unitName}
                    </p>
                </div>
                <GradeBadge grade={unit.grade} className="shrink-0" />
            </div>

            <div className="mt-3 grid grid-cols-3 gap-3">
                <Metric
                    label="CAT/Prac"
                    value={ok ? unit.catPracticalScore : null}
                    max={30}
                    sub={
                        unit.hasCatPractical
                            ? `avg ${fmt(unit.catPracticalAvg)}%`
                            : undefined
                    }
                    tone="bg-[#082B66] dark:bg-sky-400"
                />
                <Metric
                    label="Final"
                    value={ok ? unit.finalExamScore : null}
                    max={70}
                    tone="bg-orange-400"
                />
                <Metric
                    label="Total"
                    value={ok ? unit.total : null}
                    max={100}
                    tone={GRADE_BAR[gradeKind(unit.grade)]}
                    strong
                />
            </div>

            <MissingNote unit={unit} />
        </li>
    );
}

function UnitRow({ unit }: { unit: UnitAggregate }) {
    const ok = unit.isComplete;
    return (
        <tr className="align-middle hover:bg-zinc-50/70 dark:hover:bg-zinc-800/50">
            <td className="px-4 py-3 2xl:px-5">
                <div className="font-mono text-xs font-bold text-[#082B66] dark:text-orange-400">
                    {unit.unitCode}
                </div>
                <div className="text-xs text-zinc-600 dark:text-zinc-400">
                    {unit.unitName}
                </div>
                <MissingNote unit={unit} />
            </td>
            <td className="px-4 py-3 text-right text-xs tabular-nums text-zinc-700 2xl:px-5 dark:text-zinc-200">
                {unit.hasCatPractical ? `${fmt(unit.catPracticalAvg)}%` : "—"}
            </td>
            <td className="px-4 py-3 text-right font-mono text-xs font-bold tabular-nums text-zinc-800 2xl:px-5 dark:text-zinc-100">
                {ok ? `${fmt(unit.catPracticalScore)} / 30` : "—"}
            </td>
            <td className="px-4 py-3 text-right font-mono text-xs font-bold tabular-nums text-zinc-800 2xl:px-5 dark:text-zinc-100">
                {ok ? `${fmt(unit.finalExamScore)} / 70` : "—"}
            </td>
            <td className="px-4 py-3 2xl:px-5">
                <div className="flex items-center gap-3">
                    <span className="w-12 shrink-0 font-mono text-xs font-bold tabular-nums text-zinc-900 dark:text-white">
                        {ok ? `${fmt(unit.total)}%` : "—"}
                    </span>
                    <div className="flex-1">
                        <Bar
                            value={ok ? unit.total : null}
                            max={100}
                            tone={GRADE_BAR[gradeKind(unit.grade)]}
                        />
                    </div>
                </div>
            </td>
            <td className="px-4 py-3 2xl:px-5">
                <GradeBadge grade={unit.grade} />
            </td>
        </tr>
    );
}

/* -------------------------------------------------------------------------- */
/* Loading / empty                                                            */
/* -------------------------------------------------------------------------- */

function Skeleton() {
    return (
        <div className="space-y-4">
            <div className="flex gap-2 overflow-hidden">
                {[...Array(3)].map((_, i) => (
                    <div
                        key={i}
                        className="h-12 w-44 shrink-0 animate-pulse rounded-sm border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"
                    />
                ))}
            </div>
            <div className="grid gap-4 xl:grid-cols-[320px_minmax(0,1fr)] 2xl:grid-cols-[340px_minmax(0,1fr)_320px]">
                <div className="h-44 animate-pulse rounded-sm border border-zinc-200 bg-white xl:h-72 dark:border-zinc-800 dark:bg-zinc-900" />
                <div className="space-y-3 rounded-sm border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
                    {[...Array(5)].map((_, i) => (
                        <div
                            key={i}
                            className="animate-pulse space-y-2 border-b border-zinc-100 pb-3 dark:border-zinc-800"
                        >
                            <div className="h-4 w-1/3 rounded-sm bg-zinc-200 dark:bg-zinc-800" />
                            <div className="h-3 w-2/3 rounded-sm bg-zinc-200 dark:bg-zinc-800" />
                            <div className="h-6 w-full rounded-sm bg-zinc-100 dark:bg-zinc-800/60" />
                        </div>
                    ))}
                </div>
                <div className="hidden h-72 animate-pulse rounded-sm border border-zinc-200 bg-white 2xl:block dark:border-zinc-800 dark:bg-zinc-900" />
            </div>
        </div>
    );
}

function EmptyState({ studentId }: { studentId: string }) {
    return (
        <div className="rounded-sm border border-dashed border-zinc-300 bg-white px-4 py-12 text-center dark:border-zinc-700 dark:bg-zinc-900">
            <FileText className="mx-auto mb-3 h-12 w-12 text-zinc-300 dark:text-zinc-700" />
            <h3 className="text-lg font-semibold text-zinc-800 dark:text-zinc-100">
                No courses enrolled
            </h3>
            <p className="mx-auto mt-1 max-w-sm text-sm text-zinc-500 dark:text-zinc-400">
                This student has no course enrollments yet, so there is
                nothing to show here. Add an enrollment to begin recording
                results.
            </p>
            <div className="mx-auto mt-4 flex max-w-sm flex-col gap-2 sm:max-w-none sm:flex-row sm:justify-center">
                <Link
                    href={`/students/${studentId}`}
                    className={`${btnSecondary} h-11 px-4 sm:h-9`}
                >
                    <User className="h-3.5 w-3.5" />
                    Student Profile
                </Link>
                <Link
                    href="/results"
                    className={`${btnSecondary} h-11 px-4 sm:h-9`}
                >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    All Results
                </Link>
            </div>
        </div>
    );
}