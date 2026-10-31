"use client";

import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { QRCodeCanvas } from "qrcode.react";
import {
    AlertCircle,
    ArrowLeft,
    Award,
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
/* Shared styles                                                              */
/* -------------------------------------------------------------------------- */

const btnBase =
    "inline-flex items-center justify-center gap-2 rounded-sm text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 disabled:cursor-not-allowed disabled:opacity-50";
const btnSecondary = `${btnBase} border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800`;
const btnPrimary = `${btnBase} bg-[#082B66] text-white hover:bg-[#082B66]/90 dark:bg-orange-400 dark:text-zinc-900 dark:hover:bg-orange-400/90`;
/** 44px touch targets on phones, compact on larger screens. */
const btnSize = "h-11 px-4 sm:h-9";

const card =
    "rounded-sm border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900";

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
            className={`inline-flex items-center whitespace-nowrap rounded-sm border px-2 py-0.5 text-xs font-medium ${GRADE_BADGE[gradeKind(grade)]} ${className}`}
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
        <div className="h-1.5 w-full overflow-hidden rounded-sm bg-zinc-100 dark:bg-zinc-800">
            <div
                className={`h-full rounded-sm ${tone}`}
                style={{ width: `${pct}%` }}
            />
        </div>
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

        return "Student results";
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

    /* ------------------------------- Render ---------------------------- */

    return (
        <div className="mx-auto w-full max-w-[1600px] space-y-5 pb-28 pt-4 lg:pb-8 lg:pt-6">
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

            {/* Top bar */}
            <nav
                aria-label="Page navigation"
                className="flex items-center gap-2"
            >
                <Link href="/results" className={`${btnSecondary} ${btnSize}`}>
                    <ArrowLeft className="h-4 w-4" />
                    All results
                </Link>

                <div className="ml-auto flex items-center gap-2">
                    <Link
                        href={`/students/${studentId}`}
                        aria-label="Student profile"
                        className={`${btnSecondary} h-11 w-11 sm:h-9 sm:w-auto sm:px-4`}
                    >
                        <User className="h-4 w-4" />
                        <span className="hidden sm:inline">
                            Student profile
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

            {/* Student header */}
            <header className="border-l-4 border-orange-400 pl-4">
                <h1 className="truncate text-2xl font-semibold text-zinc-900 dark:text-white">
                    {displayName}
                </h1>
                <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
                    {loading
                        ? "Loading…"
                        : sections.length === 0
                          ? "No courses enrolled"
                          : `${sections.length} ${
                                sections.length === 1 ? "course" : "courses"
                            }${
                                !hasMultipleCourses &&
                                sections[0]?.admissionNumber
                                    ? ` · Adm. No. ${sections[0].admissionNumber}`
                                    : ""
                            }`}
                </p>
            </header>

            {/* Error */}
            {error && (
                <div
                    role="alert"
                    className="flex items-center gap-3 rounded-sm border border-red-200 bg-red-50 p-4 text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-400"
                >
                    <AlertCircle className="h-5 w-5 shrink-0" />
                    <p className="text-sm">{error}</p>
                </div>
            )}

            {/* Body */}
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

                    {/* Mobile / tablet action bar */}
                    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-zinc-200 bg-white/95 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur lg:hidden dark:border-zinc-800 dark:bg-zinc-900/95">
                        <div className="mx-auto flex max-w-xl gap-2">
                            <Link
                                href={sheetHref(active.courseId)}
                                className={`${btnSecondary} h-11 flex-1`}
                            >
                                <ClipboardList className="h-4 w-4" />
                                Mark sheet
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
                                Download slip
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
            className="-mx-1 flex gap-1 overflow-x-auto border-b border-zinc-200 px-1 [scrollbar-width:none] dark:border-zinc-800 [&::-webkit-scrollbar]:hidden"
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
                        className={`-mb-px flex min-h-11 shrink-0 items-center gap-2 rounded-t-sm border-b-2 px-3 text-left text-sm transition focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 ${
                            isActive
                                ? "border-orange-400 font-semibold text-[#082B66] dark:text-white"
                                : "border-transparent text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-100"
                        }`}
                    >
                        <span
                            className={`h-2 w-2 shrink-0 rounded-full ${statusDot(s)}`}
                        />
                        <span className="whitespace-nowrap">
                            {s.courseCode}
                        </span>
                        {s.aggregate?.isComplete && (
                            <span className="tabular-nums text-xs text-zinc-400">
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
/* Course panel — sticky sidebar from lg                                      */
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
        <section className="grid gap-5 lg:grid-cols-[320px_minmax(0,1fr)] lg:items-start">
            {/* Sidebar: stays in view while the unit list scrolls.
                Adjust `lg:top-4` if your app shell has a sticky header. */}
            <aside
                className="space-y-4 lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto lg:overscroll-contain lg:pr-2
                    lg:[scrollbar-width:thin] lg:[scrollbar-color:#d4d4d8_transparent]
                    lg:dark:[scrollbar-color:#3f3f46_transparent]
                    lg:[&::-webkit-scrollbar]:w-1.5
                    lg:[&::-webkit-scrollbar-track]:bg-transparent
                    lg:[&::-webkit-scrollbar-thumb]:rounded-sm
                    lg:[&::-webkit-scrollbar-thumb]:bg-zinc-300
                    lg:dark:[&::-webkit-scrollbar-thumb]:bg-zinc-700
                    lg:[&::-webkit-scrollbar-thumb:hover]:bg-zinc-400
                    lg:dark:[&::-webkit-scrollbar-thumb:hover]:bg-zinc-600"
            >
                <div className={`${card} p-4`}>
                    <p className="font-mono text-xs font-semibold text-[#082B66] dark:text-orange-400">
                        {courseCode}
                    </p>
                    <h2 className="mt-0.5 text-base font-semibold leading-snug text-zinc-900 dark:text-white">
                        {courseName}
                    </h2>
                    {admissionNumber && (
                        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                            Adm. No. {admissionNumber}
                        </p>
                    )}

                    {aggregate && (
                        <ScoreSummary
                            aggregate={aggregate}
                            possibleUnits={possibleUnits}
                        />
                    )}

                    {/* Desktop actions */}
                    <div className="mt-4 hidden gap-2 border-t border-zinc-100 pt-4 lg:flex lg:flex-col dark:border-zinc-800">
                        <button
                            type="button"
                            onClick={onDownload}
                            disabled={!aggregate || downloading}
                            title={
                                aggregate
                                    ? "Download a PDF results slip"
                                    : "Record marks first to generate a slip"
                            }
                            className={`${btnPrimary} h-9 w-full`}
                        >
                            {downloading ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <Download className="h-4 w-4" />
                            )}
                            Download results slip
                        </button>
                        <Link
                            href={sheetHref}
                            className={`${btnSecondary} h-9 w-full`}
                        >
                            <ClipboardList className="h-4 w-4" />
                            Open mark sheet
                        </Link>
                    </div>
                </div>

                <GradingScale />
            </aside>

            <div className="min-w-0 space-y-4">
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
        <div className="mt-4 border-t border-zinc-100 pt-4 dark:border-zinc-800">
            <div className="flex items-center gap-4">
                <div className="relative h-24 w-24 shrink-0">
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
                            strokeDasharray={
                                aggregate.isComplete ? undefined : "3 5"
                            }
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
                    <div className="absolute inset-0 flex items-center justify-center">
                        {aggregate.isComplete ? (
                            <span className="text-xl font-semibold tabular-nums text-[#082B66] dark:text-white">
                                {fmt(aggregate.totalScore)}
                                <span className="text-xs">%</span>
                            </span>
                        ) : (
                            <span className="px-2 text-center text-xs font-medium text-zinc-500 dark:text-zinc-400">
                                Incomplete
                            </span>
                        )}
                    </div>
                </div>

                <div className="min-w-0 flex-1">
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        Overall grade
                    </p>
                    <GradeBadge
                        grade={aggregate.grade}
                        className="mt-1 !px-2.5 !py-1 !text-sm"
                    />
                </div>
            </div>

            <div className="mt-4">
                <div className="mb-1.5 flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
                    <span>Units complete</span>
                    <span className="font-semibold tabular-nums text-zinc-700 dark:text-zinc-200">
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
    );
}

/* -------------------------------------------------------------------------- */
/* Grading scale (collapsible)                                                */
/* -------------------------------------------------------------------------- */

function GradingScale() {
    return (
        <details className={`${card} group`}>
            <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 text-sm font-semibold text-zinc-800 dark:text-zinc-100 [&::-webkit-details-marker]:hidden">
                <Award className="h-4 w-4 text-orange-500 dark:text-orange-400" />
                Grading scale
                <ChevronDown className="ml-auto h-4 w-4 text-zinc-400 transition group-open:rotate-180" />
            </summary>

            <div className="border-t border-zinc-100 p-4 dark:border-zinc-800">
                <ul className="space-y-1.5">
                    {GRADING_SCALE.map((g) => (
                        <li
                            key={g.label}
                            className="flex items-center justify-between gap-2"
                        >
                            <span className="text-xs tabular-nums text-zinc-600 dark:text-zinc-400">
                                {g.range}%
                            </span>
                            <GradeBadge grade={g.label} />
                        </li>
                    ))}
                </ul>
                <p className="mt-3 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
                    Each unit combines CATs and practicals (30%) with the final
                    exam (70%). A unit missing either is Incomplete, and a
                    course is graded only once every unit is complete.
                </p>
            </div>
        </details>
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
                    {incomplete} of {aggregate.units.length} unit
                    {aggregate.units.length === 1 ? " is" : "s are"} missing
                    marks
                </p>
                <p className="mt-0.5 text-xs">
                    A CAT in the sequence or the final exam is missing. Totals
                    and grades appear once every unit is complete.
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
                Record marks for this course&apos;s units to see the score and
                grade here.
            </p>
            <Link href={sheetHref} className={`${btnPrimary} mt-4 ${btnSize}`}>
                <ClipboardList className="h-4 w-4" />
                Record marks
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

    const toggle = (active: boolean) =>
        `h-9 px-3 transition sm:h-8 ${
            active
                ? "bg-[#082B66] text-white dark:bg-orange-400 dark:text-zinc-900"
                : "bg-white text-zinc-600 hover:bg-zinc-50 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
        }`;

    return (
        <section className={`${card} overflow-hidden`}>
            <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
                <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">
                        Unit results
                    </h3>
                    <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                        CAT &amp; practicals out of 30, final exam out of 70
                    </p>
                </div>

                {incompleteCount > 0 && (
                    <div
                        role="group"
                        aria-label="Filter units"
                        className="inline-flex overflow-hidden rounded-sm border border-zinc-200 text-xs font-medium dark:border-zinc-700"
                    >
                        <button
                            type="button"
                            onClick={() => setOnlyIncomplete(false)}
                            aria-pressed={!onlyIncomplete}
                            className={toggle(!onlyIncomplete)}
                        >
                            All ({aggregate.units.length})
                        </button>
                        <button
                            type="button"
                            onClick={() => setOnlyIncomplete(true)}
                            aria-pressed={onlyIncomplete}
                            className={`${toggle(onlyIncomplete)} border-l border-zinc-200 dark:border-zinc-700`}
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
                    <thead className="border-b border-zinc-200 text-xs font-medium text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
                        <tr>
                            <th className="px-4 py-2.5 font-medium">Unit</th>
                            <th className="px-4 py-2.5 text-right font-medium">
                                CAT avg
                            </th>
                            <th className="px-4 py-2.5 text-right font-medium">
                                CAT / Prac
                            </th>
                            <th className="px-4 py-2.5 text-right font-medium">
                                Final
                            </th>
                            <th className="w-44 px-4 py-2.5 font-medium 2xl:w-56">
                                Total
                            </th>
                            <th className="px-4 py-2.5 font-medium">Grade</th>
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
        <p className="mt-1.5 flex items-start gap-1 text-xs font-medium text-amber-700 dark:text-amber-400">
            <AlertCircle className="mt-px h-3.5 w-3.5 shrink-0" />
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
            <p className="text-xs text-zinc-500 dark:text-zinc-400">{label}</p>
            <p
                className={`mt-0.5 tabular-nums ${
                    strong
                        ? "text-base font-semibold text-zinc-900 dark:text-white"
                        : "text-sm font-semibold text-zinc-800 dark:text-zinc-100"
                }`}
            >
                {value === null ? "—" : fmt(value)}
                <span className="ml-0.5 text-xs font-normal text-zinc-400">
                    /{max}
                </span>
            </p>
            <div className="mt-1.5">
                <Bar value={value} max={max} tone={tone} />
            </div>
            {sub && (
                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                    {sub}
                </p>
            )}
        </div>
    );
}

function UnitCard({ unit }: { unit: UnitAggregate }) {
    const ok = unit.isComplete;
    return (
        <li className="p-4">
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <p className="font-mono text-xs font-semibold text-[#082B66] dark:text-orange-400">
                        {unit.unitCode}
                    </p>
                    <p className="mt-0.5 text-sm leading-snug text-zinc-700 dark:text-zinc-300">
                        {unit.unitName}
                    </p>
                </div>
                <GradeBadge grade={unit.grade} className="shrink-0" />
            </div>

            <div className="mt-3 grid grid-cols-3 gap-3">
                <Metric
                    label="CAT / Prac"
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
            <td className="px-4 py-3">
                <div className="font-mono text-xs font-semibold text-[#082B66] dark:text-orange-400">
                    {unit.unitCode}
                </div>
                <div className="text-sm text-zinc-700 dark:text-zinc-300">
                    {unit.unitName}
                </div>
                <MissingNote unit={unit} />
            </td>
            <td className="px-4 py-3 text-right text-sm tabular-nums text-zinc-600 dark:text-zinc-300">
                {unit.hasCatPractical ? `${fmt(unit.catPracticalAvg)}%` : "—"}
            </td>
            <td className="px-4 py-3 text-right text-sm font-medium tabular-nums text-zinc-800 dark:text-zinc-100">
                {ok ? `${fmt(unit.catPracticalScore)} / 30` : "—"}
            </td>
            <td className="px-4 py-3 text-right text-sm font-medium tabular-nums text-zinc-800 dark:text-zinc-100">
                {ok ? `${fmt(unit.finalExamScore)} / 70` : "—"}
            </td>
            <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                    <span className="w-14 shrink-0 text-sm font-semibold tabular-nums text-zinc-900 dark:text-white">
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
            <td className="px-4 py-3">
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
        <div className="grid gap-5 lg:grid-cols-[320px_minmax(0,1fr)] lg:items-start">
            <div className="h-72 animate-pulse rounded-sm border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900" />
            <div className="space-y-3 rounded-sm border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
                {[...Array(5)].map((_, i) => (
                    <div
                        key={i}
                        className="animate-pulse space-y-2 border-b border-zinc-100 pb-3 dark:border-zinc-800"
                    >
                        <div className="h-4 w-1/3 rounded-sm bg-zinc-200 dark:bg-zinc-800" />
                        <div className="h-3 w-2/3 rounded-sm bg-zinc-200 dark:bg-zinc-800" />
                        <div className="h-5 w-full rounded-sm bg-zinc-100 dark:bg-zinc-800/60" />
                    </div>
                ))}
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
                Add an enrollment from the student profile to start recording
                results.
            </p>
            <div className="mx-auto mt-4 flex max-w-sm flex-col gap-2 sm:max-w-none sm:flex-row sm:justify-center">
                <Link
                    href={`/students/${studentId}`}
                    className={`${btnSecondary} ${btnSize}`}
                >
                    <User className="h-4 w-4" />
                    Student profile
                </Link>
                <Link href="/results" className={`${btnSecondary} ${btnSize}`}>
                    <ArrowLeft className="h-4 w-4" />
                    All results
                </Link>
            </div>
        </div>
    );
}