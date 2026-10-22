"use client";

import { use, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
    AlertCircle,
    ArrowLeft,
    Award,
    BookOpen,
    Building2,
    CalendarCheck,
    CalendarDays,
    CheckCircle2,
    Clock,
    Edit3,
    FileText,
    GraduationCap,
    Hash,
    Layers,
    Loader2,
    Mail,
    Phone,
    RefreshCw,
    Tag,
} from "lucide-react";

import { Student, StudentCourse, studentApi } from "@/app/types/students";
import { Course, courseApi } from "@/app/types/courses";
import { Unit, UnitType, unitApi } from "@/app/types/units";
import { Result, resultApi } from "@/app/types/results";
import {
    aggregateByStudent,
    UnitAggregate,
} from "@/app/(portal)/results/utils";

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function formatDate(value?: string | null): string {
    if (!value) return "—";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    });
}

/** Extract a plain id from a possibly-populated Course reference. */
function extractCourseId(courseId: unknown): string | null {
    if (!courseId) return null;
    if (typeof courseId === "string") return courseId;
    if (
        typeof courseId === "object" &&
        courseId !== null &&
        "_id" in (courseId as Record<string, unknown>)
    ) {
        return String((courseId as { _id: string })._id);
    }
    return null;
}

function initialsOf(student: Student): string {
    const first = student.fullName.firstName?.[0] ?? "";
    const last = student.fullName.lastName?.[0] ?? "";
    return `${first}${last}`.toUpperCase() || "?";
}

function fullNameOf(student: Student): string {
    return [
        student.fullName.firstName,
        student.fullName.middleName,
        student.fullName.lastName,
    ]
        .filter(Boolean)
        .join(" ")
        .trim();
}

/* -------------------------------------------------------------------------- */
/* Result pills                                                               */
/* -------------------------------------------------------------------------- */

function GradePill({ grade }: { grade: string }) {
    const base =
        "inline-flex items-center gap-1 rounded-sm border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider";

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

function ScorePill({ score }: { score: number }) {
    const tone =
        score >= 70
            ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800"
            : score >= 60
                ? "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800"
                : score >= 40
                    ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800"
                    : "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800";

    return (
        <span
            className={`inline-flex items-center rounded-sm border px-2 py-0.5 font-mono text-[11px] font-bold ${tone}`}
        >
            {score.toFixed(1)}%
        </span>
    );
}

/* -------------------------------------------------------------------------- */
/* Unit grouping                                                              */
/* -------------------------------------------------------------------------- */

type GroupTone = "core" | "basic" | "common" | "optional";

const GROUP_META: Record<
    GroupTone,
    {
        label: string;
        badgeCls: string;
        barCls: string;
        icon: React.ReactNode;
    }
> = {
    core: {
        label: "Core Units",
        badgeCls:
            "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800",
        barCls: "bg-emerald-500",
        icon: <CheckCircle2 className="h-3.5 w-3.5" />,
    },
    basic: {
        label: "Basic Units",
        badgeCls:
            "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800",
        barCls: "bg-purple-500",
        icon: <Layers className="h-3.5 w-3.5" />,
    },
    common: {
        label: "Common Units",
        badgeCls:
            "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800",
        barCls: "bg-sky-500",
        icon: <Layers className="h-3.5 w-3.5" />,
    },
    optional: {
        label: "Elective / Optional",
        badgeCls:
            "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800",
        barCls: "bg-amber-500",
        icon: <Tag className="h-3.5 w-3.5" />,
    },
};

function UnitGroup({
    tone,
    units,
    unitAggregates,
    studentId,
    courseId,
}: {
    tone: GroupTone;
    units: Unit[];
    unitAggregates: Map<string, UnitAggregate>;
    studentId: string;
    courseId: string;
}) {
    if (units.length === 0) return null;
    const meta = GROUP_META[tone];

    return (
        <section className="overflow-hidden rounded-sm border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <header className="flex items-center justify-between gap-3 border-b border-zinc-100 px-5 py-3 dark:border-zinc-800">
                <div className="flex items-center gap-3">
                    <span
                        className={`h-4 w-1 rounded-sm ${meta.barCls}`}
                        aria-hidden
                    />
                    <span
                        className={`inline-flex items-center gap-1.5 rounded-sm border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider ${meta.badgeCls}`}
                    >
                        {meta.icon}
                        {meta.label}
                    </span>
                </div>
                <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                    {units.length} {units.length === 1 ? "unit" : "units"}
                </span>
            </header>

            <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {units.map((u) => {
                    const agg = unitAggregates.get(u._id);
                    const isComplete = agg?.isComplete ?? false;
                    const hasAnyResult = Boolean(agg);

                    return (
                        <li
                            key={u._id}
                            className="flex flex-col gap-3 px-5 py-4 transition-colors hover:bg-zinc-50/70 dark:hover:bg-zinc-800/40 sm:flex-row sm:items-start"
                        >
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-sm bg-blue-950/5 text-blue-950 dark:bg-orange-400/10 dark:text-orange-400">
                                <BookOpen className="h-4 w-4" />
                            </div>

                            <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                                    <span className="font-mono text-xs font-bold text-blue-950 dark:text-orange-400">
                                        {u.code}
                                    </span>
                                    <span className="text-sm font-semibold text-zinc-900 dark:text-white">
                                        {u.name}
                                    </span>

                                    {u.optionalUnit && (
                                        <span className="inline-flex items-center gap-1 rounded-sm border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-700 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                                            <Tag className="h-3 w-3" />
                                            Elective
                                        </span>
                                    )}
                                </div>

                                {u.description && (
                                    <p className="mt-1 line-clamp-2 text-xs leading-5 text-zinc-500 dark:text-zinc-400">
                                        {u.description}
                                    </p>
                                )}

                                {/* Result summary row */}
                                <div className="mt-2 flex flex-wrap items-center gap-2">
                                    {!hasAnyResult ? (
                                        <span className="text-[11px] italic text-zinc-400 dark:text-zinc-500">
                                            No results recorded yet
                                        </span>
                                    ) : isComplete ? (
                                        <>
                                            <ScorePill score={agg!.total} />
                                            <GradePill grade={agg!.grade} />
                                            <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
                                                CAT/Prac{" "}
                                                {agg!.catPracticalScore.toFixed(1)}
                                                /30 · Final{" "}
                                                {agg!.finalExamScore.toFixed(1)}
                                                /70
                                            </span>
                                        </>
                                    ) : (
                                        <>
                                            <GradePill grade="Incomplete" />
                                            {agg!.missing.length > 0 && (
                                                <span className="text-[11px] text-amber-700 dark:text-amber-400">
                                                    Missing:{" "}
                                                    {agg!.missing.join(", ")}
                                                </span>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>

                            <Link
                                href={{
                                    pathname:
                                        "/results/new/student-based/units-sheet",
                                    query: { studentId, courseId },
                                }}
                                className="inline-flex shrink-0 items-center gap-1.5 self-start rounded-sm border border-zinc-300 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-zinc-800 transition hover:border-blue-950 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:border-orange-400 dark:hover:bg-zinc-800"
                            >
                                <Edit3 className="h-3 w-3" />
                                {hasAnyResult ? "Edit" : "Record"}
                            </Link>
                        </li>
                    );
                })}
            </ul>
        </section>
    );
}

/* -------------------------------------------------------------------------- */
/* Small UI primitives                                                        */
/* -------------------------------------------------------------------------- */

function InfoCell({
    label,
    value,
    icon,
}: {
    label: string;
    value?: React.ReactNode;
    icon: React.ReactNode;
}) {
    return (
        <div className="flex items-start gap-3 rounded-sm border border-zinc-200 bg-zinc-50/60 p-3 dark:border-zinc-800 dark:bg-zinc-900/60">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-sm bg-blue-950/5 text-blue-950 dark:bg-orange-400/10 dark:text-orange-400">
                {icon}
            </div>
            <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                    {label}
                </p>
                <p className="mt-0.5 truncate text-sm font-semibold text-blue-950 dark:text-white">
                    {value || "—"}
                </p>
            </div>
        </div>
    );
}

/* -------------------------------------------------------------------------- */
/* Page                                                                       */
/* -------------------------------------------------------------------------- */

interface PageProps {
    params: Promise<{ id: string; courseId: string }>;
}

export default function AcademicRecordPage({ params }: PageProps) {
    const { id: studentId, courseId } = use(params);

    const [student, setStudent] = useState<Student | null>(null);
    const [course, setCourse] = useState<Course | null>(null);
    const [units, setUnits] = useState<Unit[]>([]);
    const [results, setResults] = useState<Result[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [refreshing, setRefreshing] = useState(false);

    /* ------------------------------ Fetch ------------------------------ */

    const fetchAll = useCallback(
        async (opts?: { silent?: boolean }) => {
            if (!studentId || !courseId) return;
            const silent = opts?.silent ?? false;

            try {
                if (silent) setRefreshing(true);
                else setLoading(true);
                setError(null);

                const [studentRes, courseRes, unitsRes, resultsRes] =
                    await Promise.all([
                        studentApi.getById(studentId),
                        courseApi.getById(courseId),
                        // tolerate unit fetch failure so the page still renders
                        unitApi
                            .getByCourse(courseId)
                            .catch(() => ({ data: [] as Unit[] })),
                        // tolerate result fetch failure likewise
                        resultApi
                            .getByStudent(studentId)
                            .catch(() => ({ data: [] as Result[] })),
                    ]);

                setStudent(studentRes.data);
                setCourse(courseRes.data);
                setUnits(unitsRes.data ?? []);
                setResults(resultsRes.data ?? []);
            } catch (err: any) {
                console.error("Failed to load academic record:", err);
                setError(
                    err?.response?.data?.message ??
                    err?.message ??
                    "Failed to load academic record. Please try again.",
                );
            } finally {
                if (silent) setRefreshing(false);
                else setLoading(false);
            }
        },
        [studentId, courseId],
    );

    useEffect(() => {
        fetchAll();
    }, [fetchAll]);

    /* ------------------------------ Derived ---------------------------- */

    const enrollment: StudentCourse | null = useMemo(() => {
        if (!student) return null;
        return (
            student.courses.find(
                (c) => extractCourseId(c.courseId) === courseId,
            ) ?? null
        );
    }, [student, courseId]);

    const grouped = useMemo(() => {
        const core: Unit[] = [];
        const basic: Unit[] = [];
        const common: Unit[] = [];
        const optional: Unit[] = [];

        for (const u of units) {
            if (u.optionalUnit) {
                optional.push(u);
                continue;
            }
            const t = u.type ?? UnitType.CORE;
            if (t === UnitType.BASIC) basic.push(u);
            else if (t === UnitType.COMMON) common.push(u);
            else core.push(u);
        }

        return { core, basic, common, optional };
    }, [units]);

    const departmentName = useMemo(() => {
        if (!course?.department) return "—";
        if (typeof course.department === "object") return course.department.name;
        return "—";
    }, [course]);

    /** Per-unit aggregate, keyed by unit `_id`, computed from this student's results. */
    const unitAggregates = useMemo(() => {
        const map = new Map<string, UnitAggregate>();
        if (results.length === 0) return map;

        const agg = aggregateByStudent(results)[0];
        if (!agg) return map;

        const courseUnits = agg.courses.find((c) => c.courseId === courseId)?.units ?? [];
        for (const ua of courseUnits) {
            map.set(ua.unitId, ua);
        }
        return map;
    }, [results, courseId]);

    /** Course-wide roll-up for the hero stats. */
    const overall = useMemo(() => {
        if (units.length === 0) {
            return {
                isComplete: false,
                totalScore: 0,
                grade: "Incomplete",
                unitsWithResults: 0,
                unitsTotal: 0,
            };
        }

        const withResults = units
            .map((u) => unitAggregates.get(u._id))
            .filter((ua): ua is UnitAggregate => Boolean(ua));

        const isComplete =
            withResults.length === units.length &&
            withResults.every((ua) => ua.isComplete);

        const totalScore = isComplete
            ? withResults.reduce((s, ua) => s + ua.total, 0) /
            withResults.length
            : 0;

        return {
            isComplete,
            totalScore: Math.round(totalScore * 10) / 10,
            grade: isComplete
                ? withResults.length > 0
                    ? withResults[0].grade
                    : "Incomplete"
                : "Incomplete",
            unitsWithResults: withResults.length,
            unitsTotal: units.length,
        };
    }, [units, unitAggregates]);

    // Compute a proper grade from the aggregate when complete.
    const overallGrade = useMemo(() => {
        if (!overall.isComplete) return "Incomplete";
        const score = overall.totalScore;
        if (score >= 70) return "Distinction";
        if (score >= 60) return "Credit";
        if (score >= 40) return "Pass";
        return "Fail";
    }, [overall]);

    /* ------------------------------ Loading ---------------------------- */

    if (loading) {
        return (
            <main className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
                <div className="flex min-h-[60vh] flex-col items-center justify-center">
                    <Loader2 className="mb-2 h-8 w-8 animate-spin text-blue-950 dark:text-orange-400" />
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
                        Loading academic record…
                    </p>
                </div>
            </main>
        );
    }

    /* ------------------------------- Error ----------------------------- */

    if (error || !student || !course) {
        return (
            <main className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
                <div className="mx-auto max-w-full py-8 sm:px-6 lg:px-8">
                    <Link
                        href={`/students/${studentId}`}
                        className="inline-flex items-center gap-2 text-sm font-semibold text-zinc-500 transition-colors hover:text-blue-950 dark:text-zinc-400 dark:hover:text-orange-400"
                    >
                        <ArrowLeft size={16} />
                        Back to student
                    </Link>

                    <div className="mt-8 rounded-sm border border-red-200 border-t-4 border-t-red-600 bg-red-50 p-6 shadow-sm dark:border-red-900/50 dark:bg-red-950/20">
                        <div className="flex items-start gap-3">
                            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600 dark:text-red-400" />
                            <div>
                                <h1 className="text-lg font-bold text-red-800 dark:text-red-300">
                                    Unable to load academic record
                                </h1>
                                <p className="mt-1 text-sm leading-6 text-red-700 dark:text-red-400">
                                    {error ||
                                        "The requested record could not be found."}
                                </p>
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={() => fetchAll()}
                            className="mt-5 inline-flex items-center gap-2 rounded-sm bg-blue-950 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-900 dark:bg-orange-400 dark:text-blue-950 dark:hover:bg-orange-300"
                        >
                            <RefreshCw size={15} />
                            Try again
                        </button>
                    </div>
                </div>
            </main>
        );
    }

    /* ------------------------------- Ready ----------------------------- */

    const fullName = fullNameOf(student);
    const initials = initialsOf(student);
    const isCompleted = Boolean(enrollment?.dateOfCompletion);
    const totalUnits = units.length;

    const unitsSheetHref = {
        pathname: "/results/new/student-based/units-sheet",
        query: { studentId, courseId },
    };

    return (
        <main className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
            <div className="mx-auto max-w-full py-6 sm:px-6 lg:px-8 lg:py-8">
                {/* BACK NAV */}
                <div className="flex items-center justify-between gap-4">
                    <Link
                        href={`/students/${studentId}`}
                        className="inline-flex items-center gap-2 text-sm font-semibold text-zinc-500 transition-colors hover:text-blue-950 dark:text-zinc-400 dark:hover:text-orange-400"
                    >
                        <ArrowLeft size={16} />
                        Back to student
                    </Link>

                    <button
                        type="button"
                        onClick={() => fetchAll({ silent: true })}
                        disabled={refreshing}
                        title="Refresh"
                        aria-label="Refresh"
                        className="inline-flex h-9 w-9 items-center justify-center rounded-sm border border-zinc-200 bg-white text-zinc-600 transition-colors hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
                    >
                        <RefreshCw
                            className={`h-4 w-4 ${refreshing ? "animate-spin" : ""
                                }`}
                        />
                    </button>
                </div>

                {/* ============================ HERO ============================ */}
                <section className="mt-5 overflow-hidden rounded-sm border-b-2 border-orange-400 bg-blue-950 shadow-sm">
                    <div className="grid gap-6 p-6 md:grid-cols-[1fr_auto] md:items-center md:p-8">
                        <div className="flex items-center gap-5">
                            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-sm bg-orange-400 text-xl font-bold uppercase tracking-wider text-blue-950 lg:h-20 lg:w-20 lg:text-2xl">
                                {initials}
                            </div>

                            <div className="min-w-0">
                                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-orange-400">
                                    Academic Record
                                </p>
                                <h1 className="mt-1 truncate text-2xl font-bold leading-tight text-white md:text-3xl">
                                    {fullName}
                                </h1>

                                <div className="mt-2 flex flex-col gap-1.5 text-xs text-zinc-400 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
                                    {student.contact.email && (
                                        <span className="inline-flex items-center gap-1.5">
                                            <Mail
                                                size={12}
                                                className="text-orange-400/80"
                                            />
                                            <span className="truncate">
                                                {student.contact.email}
                                            </span>
                                        </span>
                                    )}
                                    {student.contact.phoneNumber && (
                                        <span className="inline-flex items-center gap-1.5">
                                            <Phone
                                                size={12}
                                                className="text-orange-400/80"
                                            />
                                            {student.contact.phoneNumber}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 md:justify-end">
                            {enrollment?.admissionNumber && (
                                <span className="inline-flex items-center gap-2 rounded-sm border border-white/15 bg-white/5 px-3 py-1.5 font-mono text-xs font-semibold text-orange-300">
                                    <Hash size={12} />
                                    {enrollment.admissionNumber}
                                </span>
                            )}

                            {isCompleted ? (
                                <span className="inline-flex items-center gap-1.5 rounded-sm border border-emerald-400/30 bg-emerald-400/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-300">
                                    <CalendarCheck size={12} />
                                    Completed
                                </span>
                            ) : (
                                <span className="inline-flex items-center gap-1.5 rounded-sm border border-orange-400/40 bg-orange-400/10 px-2.5 py-1 text-[11px] font-semibold text-orange-300">
                                    <Clock size={12} />
                                    Ongoing
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Overall summary strip */}
                    <div className="grid grid-cols-2 gap-3 border-t border-white/10 px-6 py-4 md:grid-cols-4 md:px-8">
                        <HeroStat
                            label="Overall Score"
                            value={
                                overall.isComplete ? (
                                    <span className="font-mono">
                                        {overall.totalScore.toFixed(1)}%
                                    </span>
                                ) : (
                                    <span className="text-zinc-500">—</span>
                                )
                            }
                        />
                        <HeroStat
                            label="Overall Grade"
                            value={<GradePill grade={overallGrade} />}
                        />
                        <HeroStat
                            label="Units Assessed"
                            value={
                                <span className="font-mono">
                                    {overall.unitsWithResults} /{" "}
                                    {overall.unitsTotal}
                                </span>
                            }
                        />
                        <HeroStat
                            label="Units in Course"
                            value={
                                <span className="font-mono">{totalUnits}</span>
                            }
                        />
                    </div>
                </section>

                {/* ==================== COURSE + ENROLLMENT ==================== */}
                <div className="mt-6 grid gap-6 lg:grid-cols-3">
                    {/* Course details */}
                    <section className="overflow-hidden rounded-sm border border-zinc-200 border-t-4 border-t-orange-400 bg-white shadow-sm dark:border-zinc-800 dark:border-t-orange-400 dark:bg-zinc-900 lg:col-span-2">
                        <header className="flex items-center gap-3 border-b border-zinc-100 px-6 py-4 dark:border-zinc-800">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-sm bg-blue-950/5 text-blue-950 dark:bg-orange-400/10 dark:text-orange-400">
                                <GraduationCap size={16} />
                            </div>
                            <div>
                                <h2 className="text-sm font-bold text-blue-950 dark:text-white">
                                    Course
                                </h2>
                                <p className="text-[11px] text-zinc-400">
                                    Program being pursued
                                </p>
                            </div>
                        </header>

                        <div className="space-y-5 p-6">
                            <div>
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className="inline-flex items-center rounded-sm bg-blue-950 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-orange-400">
                                        {course.courseCode || "—"}
                                    </span>
                                    {course.level && (
                                        <span className="inline-flex items-center rounded-sm border border-zinc-200 px-2 py-0.5 text-[11px] font-medium text-zinc-600 dark:border-zinc-700 dark:text-zinc-300">
                                            {course.level}
                                        </span>
                                    )}
                                </div>

                                <h3 className="mt-2 text-lg font-bold leading-snug text-blue-950 dark:text-white">
                                    {course.name}
                                </h3>
                            </div>

                            <dl className="grid gap-3 sm:grid-cols-3">
                                <InfoCell
                                    label="Duration"
                                    value={course.duration || "—"}
                                    icon={<Clock className="h-4 w-4" />}
                                />
                                <InfoCell
                                    label="Department"
                                    value={departmentName}
                                    icon={<Building2 className="h-4 w-4" />}
                                />
                                <InfoCell
                                    label="Level"
                                    value={course.level || "—"}
                                    icon={<Award className="h-4 w-4" />}
                                />
                            </dl>
                        </div>
                    </section>

                    {/* Enrollment details */}
                    <section className="overflow-hidden rounded-sm border border-zinc-200 border-t-4 border-t-blue-950 bg-white shadow-sm dark:border-zinc-800 dark:border-t-orange-400 dark:bg-zinc-900">
                        <header className="flex items-center gap-3 border-b border-zinc-100 px-6 py-4 dark:border-zinc-800">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-sm bg-blue-950/5 text-blue-950 dark:bg-orange-400/10 dark:text-orange-400">
                                <FileText size={16} />
                            </div>
                            <div>
                                <h2 className="text-sm font-bold text-blue-950 dark:text-white">
                                    Enrollment
                                </h2>
                                <p className="text-[11px] text-zinc-400">
                                    Dates &amp; identifiers
                                </p>
                            </div>
                        </header>

                        <dl className="space-y-4 p-6">
                            <div>
                                <dt className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                                    Admission No.
                                </dt>
                                <dd className="mt-1 font-mono text-sm font-semibold text-blue-950 dark:text-orange-400">
                                    {enrollment?.admissionNumber || "—"}
                                </dd>
                            </div>

                            <div>
                                <dt className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                                    Date of Admission
                                </dt>
                                <dd className="mt-1 inline-flex items-center gap-2 text-sm font-medium text-zinc-800 dark:text-zinc-200">
                                    <CalendarDays
                                        size={14}
                                        className="text-blue-950/70 dark:text-orange-400/80"
                                    />
                                    {formatDate(enrollment?.dateOfAdmission)}
                                </dd>
                            </div>

                            <div>
                                <dt className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                                    Date of Completion
                                </dt>
                                <dd className="mt-1 inline-flex items-center gap-2 text-sm font-medium text-zinc-800 dark:text-zinc-200">
                                    <CalendarCheck
                                        size={14}
                                        className="text-blue-950/70 dark:text-orange-400/80"
                                    />
                                    {isCompleted
                                        ? formatDate(
                                            enrollment?.dateOfCompletion,
                                        )
                                        : "Not yet completed"}
                                </dd>
                            </div>
                        </dl>
                    </section>
                </div>

                {/* ========================= UNITS ========================= */}
                <section className="mt-6">
                    <header className="mb-4 flex flex-wrap items-end justify-between gap-3">
                        <div>
                            <h2 className="flex items-center gap-2 text-base font-bold text-blue-950 dark:text-white">
                                <BookOpen className="h-5 w-5 text-orange-400" />
                                Units &amp; Results
                            </h2>
                            <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                                Per-unit scores for{" "}
                                <span className="font-mono font-semibold text-blue-950 dark:text-orange-400">
                                    {course.courseCode}
                                </span>
                                . Units with missing CATs or no final exam are
                                marked Incomplete.
                            </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                            <span className="inline-flex items-center gap-2 rounded-sm border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200">
                                {totalUnits} {totalUnits === 1 ? "Unit" : "Units"}
                            </span>

                            <Link
                                href={unitsSheetHref}
                                className="inline-flex items-center gap-2 rounded-sm bg-blue-950 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-blue-900 dark:bg-orange-400 dark:text-blue-950 dark:hover:bg-orange-300"
                            >
                                <Edit3 className="h-3.5 w-3.5" />
                                Edit Results
                            </Link>
                        </div>
                    </header>

                    {totalUnits === 0 ? (
                        <div className="flex flex-col items-center gap-3 rounded-sm border border-dashed border-zinc-300 bg-white px-6 py-12 text-center dark:border-zinc-700 dark:bg-zinc-900">
                            <div className="flex h-12 w-12 items-center justify-center rounded-sm bg-blue-950 text-orange-400">
                                <BookOpen size={22} />
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                                    No units assigned
                                </p>
                                <p className="mt-0.5 text-xs text-zinc-600 dark:text-zinc-400">
                                    This course currently has no units attached
                                    to it.
                                </p>
                            </div>
                            <Link
                                href="/units"
                                className="mt-1 inline-flex items-center gap-2 rounded-sm bg-blue-950 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-blue-900 dark:bg-orange-400 dark:text-blue-950 dark:hover:bg-orange-300"
                            >
                                <BookOpen size={13} />
                                Go to Units
                            </Link>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <UnitGroup
                                tone="core"
                                units={grouped.core}
                                unitAggregates={unitAggregates}
                                studentId={studentId}
                                courseId={courseId}
                            />
                            <UnitGroup
                                tone="basic"
                                units={grouped.basic}
                                unitAggregates={unitAggregates}
                                studentId={studentId}
                                courseId={courseId}
                            />
                            <UnitGroup
                                tone="common"
                                units={grouped.common}
                                unitAggregates={unitAggregates}
                                studentId={studentId}
                                courseId={courseId}
                            />
                            <UnitGroup
                                tone="optional"
                                units={grouped.optional}
                                unitAggregates={unitAggregates}
                                studentId={studentId}
                                courseId={courseId}
                            />
                        </div>
                    )}
                </section>
            </div>
        </main>
    );
}

/* -------------------------------------------------------------------------- */
/* Hero stat                                                                  */
/* -------------------------------------------------------------------------- */

function HeroStat({
    label,
    value,
}: {
    label: string;
    value: React.ReactNode;
}) {
    return (
        <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                {label}
            </p>
            <div className="mt-1 text-base font-bold text-white">{value}</div>
        </div>
    );
}


