"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
    AlertCircle,
    ArrowDown,
    ArrowUp,
    Award,
    BarChart3,
    ChevronRight,
    FileText,
    Filter,
    Info,
    ListChecks,
    Plus,
    RefreshCw,
    Search,
    Users,
    X,
    type LucideIcon,
} from "lucide-react";

import {
    AssessmentType,
    Result,
    ResultStatus,
    resultApi,
} from "@/app/types/results";
import { courseApi, type Course } from "@/app/types/courses";
import { unitApi, type Unit } from "@/app/types/units";

import {
    CourseAggregate,
    CourseRef,
    StudentAggregate,
    UnitCourseLookup,
    aggregateByStudent,
} from "./utils";

/* -------------------------------------------------------------------------- */
/* Types & tokens                                                             */
/* -------------------------------------------------------------------------- */

type AssessmentTypeFilter = "ALL" | AssessmentType;
type StatusFilter = "ALL" | ResultStatus;
type SortField = "name" | "totalScore" | "unitCount" | "latest";
type SortOrder = "asc" | "desc";

/** A single row = one (student, course) aggregate. */
interface CourseRow {
    student: StudentAggregate;
    course: CourseAggregate;
}

const FOCUS_RING =
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400";

const controlCls =
    "h-10 w-full cursor-pointer rounded-sm border border-zinc-200 bg-white text-sm text-zinc-800 transition-colors hover:border-zinc-300 dark:border-white/10 dark:bg-[#0B1E3D] dark:text-zinc-100 dark:hover:border-white/20";

const btnPrimaryCls = `inline-flex h-10 items-center justify-center gap-2 rounded-sm bg-[#0B1E3D] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#0B1E3D]/90 active:bg-[#0B1E3D]/80 dark:bg-orange-400 dark:text-[#0B1E3D] dark:hover:bg-orange-300 dark:active:bg-orange-500 ${FOCUS_RING} focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#0B1E3D]`;

const btnSecondaryCls = `inline-flex h-10 items-center justify-center gap-2 rounded-sm border border-zinc-200 bg-white px-4 text-sm font-semibold text-[#0B1E3D] transition-colors hover:bg-zinc-100 dark:border-white/15 dark:bg-transparent dark:text-white dark:hover:bg-white/10 ${FOCUS_RING}`;

const SORT_LABELS: Record<SortField, string> = {
    totalScore: "Total score",
    name: "Name",
    unitCount: "Units",
    latest: "Latest",
};

/** Alphabetical sorts start ascending; everything else starts highest/newest first. */
const defaultOrder = (field: SortField): SortOrder =>
    field === "name" ? "asc" : "desc";

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function formatDate(value?: number): string {
    if (!value) return "—";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    });
}

function getInitials(name: string): string {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return "?";
    const first = parts[0][0] ?? "";
    const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
    return `${first}${last}`.toUpperCase();
}

/** True when a course code is a real code (not the "—" placeholder). */
function hasCourseCode(code: string): boolean {
    return code !== "—" && code.trim() !== "";
}

/* -------------------------------------------------------------------------- */
/* Badges / pills                                                             */
/* -------------------------------------------------------------------------- */

function GradeBadge({ grade }: { grade: string }) {
    const tone =
        grade === "Distinction"
            ? "bg-emerald-500/10 text-emerald-700 ring-emerald-500/25 dark:text-emerald-300"
            : grade === "Credit"
                ? "bg-sky-500/10 text-sky-700 ring-sky-500/25 dark:text-sky-300"
                : grade === "Pass"
                    ? "bg-amber-400/10 text-amber-700 ring-amber-400/30 dark:text-amber-300"
                    : grade === "Incomplete"
                        ? "bg-zinc-500/10 text-zinc-600 ring-zinc-500/20 dark:text-zinc-300"
                        : "bg-red-500/10 text-red-700 ring-red-500/25 dark:text-red-300";

    return (
        <span
            className={`inline-flex items-center rounded-sm px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${tone}`}
        >
            {grade}
        </span>
    );
}

function ScorePill({ score }: { score: number }) {
    const tone =
        score >= 70
            ? "bg-emerald-500/10 text-emerald-700 ring-emerald-500/25 dark:text-emerald-300"
            : score >= 60
                ? "bg-sky-500/10 text-sky-700 ring-sky-500/25 dark:text-sky-300"
                : score >= 40
                    ? "bg-amber-400/10 text-amber-700 ring-amber-400/30 dark:text-amber-300"
                    : "bg-red-500/10 text-red-700 ring-red-500/25 dark:text-red-300";

    return (
        <span
            className={`inline-flex items-center rounded-sm px-2 py-0.5 font-mono text-xs font-bold tabular-nums ring-1 ring-inset ${tone}`}
        >
            {score.toFixed(1)}%
        </span>
    );
}

function IncompletePill() {
    return (
        <span
            className="inline-flex items-center rounded-sm bg-zinc-500/10 px-2 py-0.5 font-mono text-xs font-bold text-zinc-500 ring-1 ring-inset ring-zinc-500/20 dark:text-zinc-400"
            title="Missing required assessment marks"
        >
            —
        </span>
    );
}

function CourseBadge({ code }: { code: string }) {
    // The `aggregateByStudent` helper returns "—" when a unit has no
    // resolvable course. Render that as a muted placeholder instead of
    // a styled code pill.
    if (!hasCourseCode(code)) {
        return (
            <span
                className="inline-flex items-center rounded-sm bg-zinc-500/10 px-1.5 py-0.5 font-mono text-[11px] font-bold text-zinc-400 ring-1 ring-inset ring-zinc-500/20 dark:text-zinc-500"
                title="Course could not be resolved"
            >
                —
            </span>
        );
    }
    return (
        <span className="inline-flex items-center rounded-sm bg-[#0B1E3D]/5 px-1.5 py-0.5 font-mono text-[11px] font-bold uppercase tracking-wide text-[#0B1E3D] ring-1 ring-inset ring-[#0B1E3D]/10 dark:bg-orange-400/10 dark:text-orange-300 dark:ring-orange-400/25">
            {code}
        </span>
    );
}

function StudentAvatar({
    name,
    className = "h-9 w-9",
}: {
    name: string;
    className?: string;
}) {
    return (
        <span
            className={`flex shrink-0 items-center justify-center rounded-sm bg-[#0B1E3D] text-xs font-bold text-orange-400 ring-1 ring-inset ring-orange-400/30 ${className}`}
        >
            {getInitials(name)}
        </span>
    );
}

function Chip({
    label,
    onRemove,
    removeLabel,
}: {
    label: string;
    onRemove: () => void;
    removeLabel: string;
}) {
    return (
        <span className="inline-flex h-7 items-center gap-1 rounded-sm bg-[#0B1E3D]/5 pl-2.5 pr-1 text-xs font-medium text-[#0B1E3D] ring-1 ring-inset ring-[#0B1E3D]/10 dark:bg-orange-400/10 dark:text-orange-300 dark:ring-orange-400/25">
            <span className="max-w-48 truncate">{label}</span>
            <button
                type="button"
                onClick={onRemove}
                aria-label={removeLabel}
                className={`flex h-5 w-5 items-center justify-center rounded-sm text-zinc-500 transition-colors hover:bg-orange-400/20 hover:text-orange-600 dark:text-zinc-400 dark:hover:text-orange-300 ${FOCUS_RING}`}
            >
                <X className="h-3 w-3" />
            </button>
        </span>
    );
}

/* -------------------------------------------------------------------------- */
/* Page                                                                       */
/* -------------------------------------------------------------------------- */

export default function ResultsPage() {
    const router = useRouter();

    const [results, setResults] = useState<Result[]>([]);
    const [units, setUnits] = useState<Unit[]>([]);
    const [courses, setCourses] = useState<Course[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showInfo, setShowInfo] = useState(false);

    // Filters
    const [searchQuery, setSearchQuery] = useState("");
    const [assessmentFilter, setAssessmentFilter] =
        useState<AssessmentTypeFilter>("ALL");
    const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");

    // Sort
    const [sortBy, setSortBy] = useState<SortField>("totalScore");
    const [sortOrder, setSortOrder] = useState<SortOrder>("desc");

    const searchRef = useRef<HTMLInputElement>(null);

    /* ------------------------------ Fetch ------------------------------ */

    const fetchResults = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            // Results are the critical payload. Units + courses are only
            // used to resolve each result's unit -> course, so a failure
            // there degrades to "Unknown course" instead of blanking the page.
            const [resultsRes, unitsRes, coursesRes] = await Promise.allSettled(
                [resultApi.getAll(), unitApi.getAll(), courseApi.getAll()],
            );

            if (resultsRes.status === "rejected") throw resultsRes.reason;

            setResults(resultsRes.value.data || []);
            setUnits(
                unitsRes.status === "fulfilled"
                    ? unitsRes.value.data || []
                    : [],
            );
            setCourses(
                coursesRes.status === "fulfilled"
                    ? coursesRes.value.data || []
                    : [],
            );
        } catch (err: unknown) {
            console.error("Failed to fetch results:", err);
            const message =
                err && typeof err === "object" && "response" in err
                    ? (err as { response?: { data?: { message?: string } } })
                        .response?.data?.message
                    : null;
            setError(message || "Failed to load results. Please try again.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchResults();
    }, [fetchResults]);

    // "/" jumps to search, like a file explorer.
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            const el = document.activeElement as HTMLElement | null;
            const typing =
                el &&
                (el.tagName === "INPUT" ||
                    el.tagName === "TEXTAREA" ||
                    el.tagName === "SELECT" ||
                    el.isContentEditable);
            if (e.key === "/" && !typing && !e.ctrlKey && !e.metaKey) {
                e.preventDefault();
                searchRef.current?.focus();
            }
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, []);

    /* --------------------------- Derived data -------------------------- */

    // unitId -> { courseId, courseCode, courseName }
    //
    // resultApi.getAll() populates unitId with only { _id, name, code }, so
    // we stitch courses back on using the units + courses endpoints.
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

    const { students, rows } = useMemo(() => {
        const query = searchQuery.toLowerCase().trim();

        const filtered = results.filter((r) => {
            const matchesAssessment =
                assessmentFilter === "ALL" ||
                r.assessmentType === assessmentFilter;
            const matchesStatus =
                statusFilter === "ALL" || r.status === statusFilter;
            return matchesAssessment && matchesStatus;
        });

        const aggregates = aggregateByStudent(filtered, unitCourseLookup);

        // Flatten into one row per (student, course) aggregate.
        const flat: CourseRow[] = [];
        for (const s of aggregates) {
            for (const c of s.courses) {
                if (query) {
                    const haystack = [
                        s.studentName,
                        s.admissionNumber,
                        c.courseCode,
                        c.courseName,
                        ...c.units.map((u) => `${u.unitCode} ${u.unitName}`),
                    ]
                        .join(" ")
                        .toLowerCase();
                    if (!haystack.includes(query)) continue;
                }
                flat.push({ student: s, course: c });
            }
        }

        flat.sort((a, b) => {
            let cmp = 0;
            switch (sortBy) {
                case "name":
                    cmp = a.student.studentName.localeCompare(
                        b.student.studentName,
                        undefined,
                        { sensitivity: "base" },
                    );
                    if (cmp === 0) {
                        cmp = a.course.courseCode.localeCompare(
                            b.course.courseCode,
                            undefined,
                            { sensitivity: "base" },
                        );
                    }
                    break;
                case "unitCount":
                    cmp = a.course.unitCount - b.course.unitCount;
                    break;
                case "latest":
                    cmp = a.course.latestAt - b.course.latestAt;
                    break;
                case "totalScore":
                default:
                    cmp = a.course.totalScore - b.course.totalScore;
                    break;
            }
            return sortOrder === "asc" ? cmp : -cmp;
        });

        return { students: aggregates, rows: flat };
    }, [
        results,
        searchQuery,
        assessmentFilter,
        statusFilter,
        sortBy,
        sortOrder,
        unitCourseLookup,
    ]);

    const stats = useMemo(() => {
        const totalStudents = students.length;
        const totalResults = results.length;

        const allCourses = students.flatMap((s) => s.courses);
        const completeCourses = allCourses.filter((c) => c.isComplete);

        const avg =
            completeCourses.length === 0
                ? 0
                : completeCourses.reduce((s, c) => s + c.totalScore, 0) /
                completeCourses.length;

        const distinctions = completeCourses.filter(
            (c) => c.grade === "Distinction",
        ).length;

        const incomplete = allCourses.filter((c) => !c.isComplete).length;

        return {
            totalStudents,
            totalResults,
            avg: Math.round(avg * 10) / 10,
            distinctions,
            incomplete,
        };
    }, [students, results]);

    const hasFilters =
        searchQuery.trim() !== "" ||
        assessmentFilter !== "ALL" ||
        statusFilter !== "ALL";

    const clearFilters = () => {
        setSearchQuery("");
        setAssessmentFilter("ALL");
        setStatusFilter("ALL");
    };

    const toggleSortOrder = () =>
        setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));

    const changeSortField = (field: SortField) => {
        setSortBy(field);
        setSortOrder(defaultOrder(field));
    };

    /** Column header click: toggle direction on the active column, else switch to it. */
    const handleHeaderSort = (field: SortField) => {
        if (sortBy === field) toggleSortOrder();
        else changeSortField(field);
    };

    const assessmentLabel =
        assessmentFilter === AssessmentType.CAT
            ? "CAT"
            : assessmentFilter === AssessmentType.PRACTICAL
                ? "Practical"
                : "Final exam";

    /* ------------------------------- Render ---------------------------- */

    return (
        <div className="space-y-5">
            {/* HEADER */}
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-center gap-3">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-sm bg-orange-400/10 text-orange-500 ring-1 ring-inset ring-orange-400/30 dark:text-orange-400">
                        <BarChart3 className="h-5 w-5" strokeWidth={2} />
                    </span>
                    <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                            <h1 className="text-xl font-bold tracking-tight text-[#0B1E3D] dark:text-white">
                                Results
                            </h1>
                            <button
                                type="button"
                                onClick={() => setShowInfo((v) => !v)}
                                aria-expanded={showInfo}
                                aria-controls="scoring-info"
                                aria-label="How scores are calculated"
                                title="How scores are calculated"
                                className={`flex h-6 w-6 items-center justify-center rounded-sm transition-colors ${FOCUS_RING} ${showInfo
                                    ? "bg-sky-500/10 text-sky-600 dark:text-sky-400"
                                    : "text-zinc-400 hover:bg-[#0B1E3D]/5 hover:text-sky-600 dark:text-zinc-500 dark:hover:bg-white/10 dark:hover:text-sky-400"
                                    }`}
                            >
                                <Info className="h-4 w-4" />
                            </button>
                        </div>
                        <p className="text-sm text-zinc-500 dark:text-zinc-400">
                            Student scores per course, across CATs, practicals
                            and final exams.
                        </p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <button
                        type="button"
                        onClick={fetchResults}
                        disabled={loading}
                        title="Refresh"
                        aria-label="Refresh results"
                        className={`flex h-10 w-10 items-center justify-center rounded-sm text-zinc-500 transition-colors hover:bg-[#0B1E3D]/5 hover:text-[#0B1E3D] disabled:opacity-50 dark:text-zinc-400 dark:hover:bg-white/10 dark:hover:text-white ${FOCUS_RING}`}
                    >
                        <RefreshCw
                            className={`h-4.5 w-4.5 ${loading ? "animate-spin" : ""}`}
                        />
                    </button>

                    <Link
                        href="/results/new/unit-based"
                        className={btnSecondaryCls}
                    >
                        <Plus className="h-4 w-4 text-orange-500 dark:text-orange-400" />
                        Record unit marks
                    </Link>

                    <Link
                        href="/results/new/student-based"
                        className={btnPrimaryCls}
                    >
                        <Plus className="h-4 w-4 text-orange-400 dark:text-[#0B1E3D]" />
                        Record student marks
                    </Link>
                </div>
            </div>

            {/* How scores work */}
            {showInfo && (
                <div
                    id="scoring-info"
                    className="flex gap-3 rounded-sm border border-sky-200 border-l-4 border-l-sky-500 bg-sky-50 p-3.5 text-sm text-sky-900 dark:border-sky-500/20 dark:border-l-sky-500 dark:bg-sky-500/10 dark:text-sky-100"
                >
                    <Info className="mt-0.5 h-4 w-4 shrink-0 text-sky-600 dark:text-sky-400" />
                    <p className="min-w-0 flex-1">
                        Each unit combines CATs and practicals (30%) with the
                        final exam (70%). Scores are aggregated{" "}
                        <strong>per course</strong> — a student enrolled in
                        two programmes gets two independent totals. Units with
                        missing CATs or no final exam are marked Incomplete.
                    </p>
                    <button
                        type="button"
                        onClick={() => setShowInfo(false)}
                        aria-label="Dismiss"
                        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-sm text-sky-700 transition-colors hover:bg-sky-500/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 dark:text-sky-300"
                    >
                        <X className="h-3.5 w-3.5" />
                    </button>
                </div>
            )}

            {/* STATS */}
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
                <StatCard
                    label="Students"
                    value={stats.totalStudents}
                    icon={Users}
                    tone="sky"
                />
                <StatCard
                    label="Total results"
                    value={stats.totalResults}
                    icon={FileText}
                    tone="violet"
                />
                <StatCard
                    label="Average score"
                    value={`${stats.avg}%`}
                    icon={BarChart3}
                    tone="orange"
                />
                <StatCard
                    label="Distinctions"
                    value={stats.distinctions}
                    icon={Award}
                    tone="emerald"
                />
                <StatCard
                    label="Incomplete courses"
                    value={stats.incomplete}
                    icon={AlertCircle}
                    tone="amber"
                />
            </div>

            {/* COMMAND BAR */}
            <div className="space-y-3">
                <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
                    {/* Search */}
                    <label
                        className="
                            flex h-10 w-full items-center gap-2 rounded-sm border-b-2 border-transparent
                            bg-zinc-100 px-3 text-zinc-400 transition-colors lg:max-w-sm
                            focus-within:border-orange-400 focus-within:bg-white focus-within:shadow-sm
                            dark:bg-white/5 dark:text-zinc-500 dark:focus-within:bg-white/10
                        "
                    >
                        <Search className="h-4 w-4 shrink-0" />
                        <input
                            ref={searchRef}
                            type="text"
                            placeholder="Search student, adm. no, course, unit"
                            aria-label="Search results"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === "Escape") setSearchQuery("");
                            }}
                            autoComplete="off"
                            spellCheck={false}
                            className="min-w-0 flex-1 bg-transparent text-sm text-[#0B1E3D] outline-none placeholder:text-zinc-400 dark:text-white dark:placeholder:text-zinc-500"
                        />
                        {searchQuery ? (
                            <button
                                type="button"
                                onClick={() => {
                                    setSearchQuery("");
                                    searchRef.current?.focus();
                                }}
                                aria-label="Clear search"
                                className={`flex h-6 w-6 items-center justify-center rounded-sm hover:text-[#0B1E3D] dark:hover:text-white ${FOCUS_RING}`}
                            >
                                <X className="h-3.5 w-3.5" />
                            </button>
                        ) : (
                            <kbd className="hidden rounded-sm border border-zinc-300 px-1.5 text-[10px] font-semibold text-zinc-400 dark:border-white/15 dark:text-zinc-500 sm:block">
                                /
                            </kbd>
                        )}
                    </label>

                    {/* Filters */}
                    <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
                        <div className="relative sm:w-48">
                            <Filter className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-sky-600 dark:text-sky-400" />
                            <select
                                value={assessmentFilter}
                                onChange={(e) =>
                                    setAssessmentFilter(
                                        e.target.value as AssessmentTypeFilter,
                                    )
                                }
                                aria-label="Filter by assessment type"
                                className={`${controlCls} pl-9 pr-2 ${FOCUS_RING}`}
                            >
                                <option value="ALL">All assessments</option>
                                <option value={AssessmentType.CAT}>CAT</option>
                                <option value={AssessmentType.PRACTICAL}>
                                    Practical
                                </option>
                                <option value={AssessmentType.FINAL_EXAM}>
                                    Final exam
                                </option>
                            </select>
                        </div>

                        <div className="relative sm:w-44">
                            <ListChecks className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-violet-600 dark:text-violet-400" />
                            <select
                                value={statusFilter}
                                onChange={(e) =>
                                    setStatusFilter(e.target.value as StatusFilter)
                                }
                                aria-label="Filter by status"
                                className={`${controlCls} pl-9 pr-2 ${FOCUS_RING}`}
                            >
                                <option value="ALL">All statuses</option>
                                <option value={ResultStatus.COMPLETED}>
                                    Completed
                                </option>
                                <option value={ResultStatus.PENDING}>
                                    Pending
                                </option>
                            </select>
                        </div>
                    </div>

                    {/* Sort */}
                    <div className="flex items-center gap-1.5 lg:ml-auto">
                        <label htmlFor="results-sort" className="sr-only">
                            Sort by
                        </label>
                        <select
                            id="results-sort"
                            value={sortBy}
                            onChange={(e) =>
                                changeSortField(e.target.value as SortField)
                            }
                            className={`${controlCls} min-w-0 flex-1 px-2.5 font-medium lg:w-40 lg:flex-none ${FOCUS_RING}`}
                        >
                            {(Object.keys(SORT_LABELS) as SortField[]).map((f) => (
                                <option key={f} value={f}>
                                    {SORT_LABELS[f]}
                                </option>
                            ))}
                        </select>

                        <button
                            type="button"
                            onClick={toggleSortOrder}
                            title={sortOrder === "asc" ? "Ascending" : "Descending"}
                            aria-label={
                                sortOrder === "asc"
                                    ? "Ascending. Switch to descending"
                                    : "Descending. Switch to ascending"
                            }
                            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-sm border border-zinc-200 bg-white text-orange-500 transition-colors hover:bg-zinc-100 dark:border-white/10 dark:bg-[#0B1E3D] dark:text-orange-400 dark:hover:bg-white/10 ${FOCUS_RING}`}
                        >
                            {sortOrder === "asc" ? (
                                <ArrowUp className="h-4 w-4" />
                            ) : (
                                <ArrowDown className="h-4 w-4" />
                            )}
                        </button>
                    </div>
                </div>

                {/* Active filter chips */}
                {hasFilters && (
                    <div className="flex flex-wrap items-center gap-2">
                        {searchQuery.trim() && (
                            <Chip
                                label={`Search: “${searchQuery.trim()}”`}
                                removeLabel="Remove search filter"
                                onRemove={() => setSearchQuery("")}
                            />
                        )}
                        {assessmentFilter !== "ALL" && (
                            <Chip
                                label={`Assessment: ${assessmentLabel}`}
                                removeLabel="Remove assessment filter"
                                onRemove={() => setAssessmentFilter("ALL")}
                            />
                        )}
                        {statusFilter !== "ALL" && (
                            <Chip
                                label={`Status: ${statusFilter === ResultStatus.COMPLETED
                                    ? "Completed"
                                    : "Pending"
                                    }`}
                                removeLabel="Remove status filter"
                                onRemove={() => setStatusFilter("ALL")}
                            />
                        )}
                        <button
                            type="button"
                            onClick={clearFilters}
                            className={`h-7 rounded-sm px-2 text-xs font-semibold text-orange-600 transition-colors hover:bg-orange-400/10 dark:text-orange-400 ${FOCUS_RING}`}
                        >
                            Clear all
                        </button>
                    </div>
                )}
            </div>

            {/* ERROR */}
            {error && (
                <div
                    role="alert"
                    className="flex items-center gap-3 rounded-sm border border-red-200 border-l-4 border-l-red-500 bg-red-50 p-3.5 text-red-700 dark:border-red-500/20 dark:border-l-red-500 dark:bg-red-500/10 dark:text-red-300"
                >
                    <AlertCircle className="h-5 w-5 shrink-0" />
                    <p className="min-w-0 flex-1 text-sm">{error}</p>
                    <button
                        type="button"
                        onClick={fetchResults}
                        className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-sm px-2.5 text-xs font-semibold transition-colors hover:bg-red-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 dark:hover:bg-red-500/20"
                    >
                        <RefreshCw className="h-3.5 w-3.5" />
                        Retry
                    </button>
                </div>
            )}

            {/* BODY */}
            {loading ? (
                <Skeleton />
            ) : error ? null : (
                <>
                    <p
                        aria-live="polite"
                        className="text-xs text-zinc-500 dark:text-zinc-400"
                    >
                        {students.length}{" "}
                        {students.length === 1 ? "student" : "students"}
                        {" · "}
                        {rows.length}{" "}
                        {rows.length === 1 ? "course aggregate" : "course aggregates"}
                        {" · "}
                        {results.length}{" "}
                        {results.length === 1 ? "result" : "results"} recorded
                    </p>

                    {rows.length === 0 ? (
                        <EmptyState
                            hasResults={results.length > 0}
                            onClear={clearFilters}
                        />
                    ) : (
                        <>
                            {/* Mobile: compact list */}
                            <ul className="divide-y divide-zinc-200/80 overflow-hidden rounded-sm border border-zinc-200/80 dark:divide-white/10 dark:border-white/10 md:hidden">
                                {rows.map(({ student, course }) => (
                                    <li
                                        key={`${student.studentId}-${course.courseId}`}
                                    >
                                        <Link
                                            href={`/results/${student.studentId}`}
                                            className={`flex items-center gap-3 px-3.5 py-3 transition-colors hover:bg-[#0B1E3D]/4 dark:hover:bg-white/6 ${FOCUS_RING} focus-visible:ring-inset`}
                                        >
                                            <StudentAvatar name={student.studentName} />
                                            <span className="min-w-0 flex-1">
                                                <span className="flex items-center gap-1.5">
                                                    <span className="truncate text-sm font-semibold text-[#0B1E3D] dark:text-white">
                                                        {student.studentName}
                                                    </span>
                                                    <CourseBadge code={course.courseCode} />
                                                </span>
                                                <span className="block truncate font-mono text-[11px] text-zinc-500 dark:text-zinc-400">
                                                    {student.admissionNumber} ·{" "}
                                                    {course.unitCount}{" "}
                                                    {course.unitCount === 1
                                                        ? "unit"
                                                        : "units"}
                                                </span>
                                            </span>
                                            <span className="flex shrink-0 flex-col items-end gap-1">
                                                {course.isComplete ? (
                                                    <ScorePill score={course.totalScore} />
                                                ) : (
                                                    <IncompletePill />
                                                )}
                                                <GradeBadge grade={course.grade} />
                                            </span>
                                        </Link>
                                    </li>
                                ))}
                            </ul>

                            {/* Desktop: details table */}
                            <ResultsTable
                                rows={rows}
                                sortBy={sortBy}
                                sortOrder={sortOrder}
                                onSort={handleHeaderSort}
                                onRowClick={(r) =>
                                    router.push(`/results/${r.student.studentId}`)
                                }
                            />
                        </>
                    )}
                </>
            )}
        </div>
    );
}

/* -------------------------------------------------------------------------- */
/* Sub-components                                                             */
/* -------------------------------------------------------------------------- */

const STAT_TONES = {
    sky: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
    violet: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
    orange: "bg-orange-400/10 text-orange-500 dark:text-orange-400",
    emerald: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    amber: "bg-amber-400/10 text-amber-600 dark:text-amber-400",
} as const;

function StatCard({
    label,
    value,
    icon: Icon,
    tone,
}: {
    label: string;
    value: number | string;
    icon: LucideIcon;
    tone: keyof typeof STAT_TONES;
}) {
    return (
        <div className="flex items-center gap-3 rounded-sm border border-zinc-200/80 bg-white/80 p-3.5 dark:border-white/10 dark:bg-white/4">
            <span
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-sm ${STAT_TONES[tone]}`}
            >
                <Icon className="h-4.5 w-4.5" strokeWidth={2} />
            </span>
            <div className="min-w-0">
                <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
                    {label}
                </p>
                <p className="text-xl font-bold leading-tight tabular-nums text-[#0B1E3D] dark:text-white">
                    {value}
                </p>
            </div>
        </div>
    );
}

function SortableTh({
    label,
    field,
    sortBy,
    sortOrder,
    onSort,
}: {
    label: string;
    field: SortField;
    sortBy: SortField;
    sortOrder: SortOrder;
    onSort: (field: SortField) => void;
}) {
    const active = sortBy === field;
    return (
        <th
            scope="col"
            aria-sort={
                active ? (sortOrder === "asc" ? "ascending" : "descending") : "none"
            }
            className="px-4 py-2"
        >
            <button
                type="button"
                onClick={() => onSort(field)}
                className={`-mx-1.5 inline-flex h-7 items-center gap-1 rounded-sm px-1.5 text-xs font-semibold transition-colors hover:bg-[#0B1E3D]/5 dark:hover:bg-white/10 ${FOCUS_RING} ${active
                    ? "text-[#0B1E3D] dark:text-white"
                    : "text-zinc-500 dark:text-zinc-400"
                    }`}
            >
                {label}
                {active &&
                    (sortOrder === "asc" ? (
                        <ArrowUp className="h-3 w-3 text-orange-500 dark:text-orange-400" />
                    ) : (
                        <ArrowDown className="h-3 w-3 text-orange-500 dark:text-orange-400" />
                    ))}
            </button>
        </th>
    );
}

function ResultsTable({
    rows,
    sortBy,
    sortOrder,
    onSort,
    onRowClick,
}: {
    rows: CourseRow[];
    sortBy: SortField;
    sortOrder: SortOrder;
    onSort: (field: SortField) => void;
    onRowClick: (r: CourseRow) => void;
}) {
    return (
        <div className="hidden overflow-hidden rounded-sm border border-zinc-200/80 bg-white/80 dark:border-white/10 dark:bg-white/4 md:block">
            <table className="w-full border-collapse text-left text-sm">
                <thead className="border-b border-zinc-200/80 bg-zinc-50 dark:border-white/10 dark:bg-white/4">
                    <tr>
                        <SortableTh
                            label="Student"
                            field="name"
                            sortBy={sortBy}
                            sortOrder={sortOrder}
                            onSort={onSort}
                        />
                        <th
                            scope="col"
                            className="px-4 py-2 text-xs font-semibold text-zinc-500 dark:text-zinc-400"
                        >
                            Course
                        </th>
                        <SortableTh
                            label="Units"
                            field="unitCount"
                            sortBy={sortBy}
                            sortOrder={sortOrder}
                            onSort={onSort}
                        />
                        <th
                            scope="col"
                            className="px-4 py-2 text-xs font-semibold text-zinc-500 dark:text-zinc-400"
                        >
                            Results
                        </th>
                        <SortableTh
                            label="Total score"
                            field="totalScore"
                            sortBy={sortBy}
                            sortOrder={sortOrder}
                            onSort={onSort}
                        />
                        <th
                            scope="col"
                            className="px-4 py-2 text-xs font-semibold text-zinc-500 dark:text-zinc-400"
                        >
                            Grade
                        </th>
                        <SortableTh
                            label="Latest"
                            field="latest"
                            sortBy={sortBy}
                            sortOrder={sortOrder}
                            onSort={onSort}
                        />
                        <th scope="col" className="w-10 px-2 py-2">
                            <span className="sr-only">Open</span>
                        </th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200/80 dark:divide-white/10">
                    {rows.map(({ student, course }) => (
                        <tr
                            key={`${student.studentId}-${course.courseId}`}
                            onClick={() => onRowClick({ student, course })}
                            className="group relative cursor-pointer transition-colors hover:bg-[#0B1E3D]/4 dark:hover:bg-white/6"
                        >
                            <td className="relative px-4 py-2.5">
                                {/* Hover pill, same as the sidebar */}
                                <span
                                    aria-hidden
                                    className="absolute left-0 top-1/2 h-4 w-0.75 origin-center -translate-y-1/2 scale-y-0 rounded-sm bg-orange-400 transition-transform duration-200 group-hover:scale-y-100 group-focus-within:scale-y-100"
                                />
                                <div className="flex items-center gap-3">
                                    <StudentAvatar name={student.studentName} />
                                    <div className="min-w-0">
                                        <Link
                                            href={`/results/${student.studentId}`}
                                            onClick={(e) => e.stopPropagation()}
                                            className={`block truncate rounded-sm font-semibold text-[#0B1E3D] dark:text-white ${FOCUS_RING}`}
                                        >
                                            {student.studentName}
                                        </Link>
                                        <div className="font-mono text-[11px] text-zinc-500 dark:text-zinc-400">
                                            {student.admissionNumber}
                                        </div>
                                    </div>
                                </div>
                            </td>

                            <td className="px-4 py-2.5">
                                <div className="flex items-center gap-2">
                                    <CourseBadge code={course.courseCode} />
                                    <span className="truncate text-xs text-zinc-500 dark:text-zinc-400">
                                        {course.courseName}
                                    </span>
                                </div>
                            </td>

                            <td className="px-4 py-2.5 text-sm font-semibold tabular-nums text-zinc-700 dark:text-zinc-200">
                                {course.unitCount}
                            </td>

                            <td className="px-4 py-2.5 text-sm tabular-nums text-zinc-500 dark:text-zinc-400">
                                {course.resultCount}
                            </td>

                            <td className="px-4 py-2.5">
                                {course.isComplete ? (
                                    <ScorePill score={course.totalScore} />
                                ) : (
                                    <IncompletePill />
                                )}
                            </td>

                            <td className="px-4 py-2.5">
                                <GradeBadge grade={course.grade} />
                            </td>

                            <td className="px-4 py-2.5 text-xs text-zinc-500 dark:text-zinc-400">
                                {formatDate(course.latestAt)}
                            </td>

                            <td className="px-2 py-2.5">
                                <ChevronRight
                                    aria-hidden
                                    className="h-4 w-4 text-zinc-300 transition-all group-hover:translate-x-0.5 group-hover:text-orange-500 dark:text-zinc-600 dark:group-hover:text-orange-400"
                                />
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

function Skeleton() {
    return (
        <div
            aria-busy="true"
            aria-label="Loading results"
            className="divide-y divide-zinc-200/80 overflow-hidden rounded-sm border border-zinc-200/80 bg-white/80 dark:divide-white/10 dark:border-white/10 dark:bg-white/4"
        >
            {[...Array(8)].map((_, i) => (
                <div key={i} className="flex items-center gap-4 px-4 py-3">
                    <div className="h-9 w-9 shrink-0 animate-pulse rounded-sm bg-zinc-200 dark:bg-white/10" />
                    <div className="flex-1 space-y-2">
                        <div className="h-3.5 w-40 max-w-full animate-pulse rounded-sm bg-zinc-200 dark:bg-white/10" />
                        <div className="h-3 w-24 animate-pulse rounded-sm bg-zinc-100 dark:bg-white/5" />
                    </div>
                    <div className="hidden h-5 w-16 animate-pulse rounded-sm bg-zinc-100 dark:bg-white/5 sm:block" />
                    <div className="hidden h-5 w-20 animate-pulse rounded-sm bg-zinc-100 dark:bg-white/5 sm:block" />
                </div>
            ))}
        </div>
    );
}

function EmptyState({
    hasResults,
    onClear,
}: {
    hasResults: boolean;
    onClear: () => void;
}) {
    return (
        <div className="rounded-sm border border-dashed border-zinc-300 px-6 py-14 text-center dark:border-white/15">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-sm bg-orange-400/10 text-orange-500 ring-1 ring-inset ring-orange-400/30 dark:text-orange-400">
                <FileText className="h-6 w-6" />
            </span>
            <p className="mt-3 text-sm font-semibold text-[#0B1E3D] dark:text-white">
                {hasResults ? "No course results match your filters" : "No results yet"}
            </p>
            <p className="mx-auto mt-1 max-w-sm text-xs text-zinc-500 dark:text-zinc-400">
                {hasResults
                    ? "Try a different search, or remove some filters."
                    : "Once assessments are recorded they will appear here."}
            </p>

            <div className="mt-4 flex justify-center">
                {hasResults ? (
                    <button
                        type="button"
                        onClick={onClear}
                        className={`inline-flex h-9 items-center gap-1.5 rounded-sm border border-zinc-200 bg-white px-3.5 text-[13px] font-semibold text-[#0B1E3D] transition-colors hover:bg-zinc-100 dark:border-white/15 dark:bg-transparent dark:text-white dark:hover:bg-white/10 ${FOCUS_RING}`}
                    >
                        <X className="h-3.5 w-3.5" />
                        Clear all filters
                    </button>
                ) : (
                    <Link href="/results/new" className={btnPrimaryCls}>
                        <Plus className="h-4 w-4 text-orange-400 dark:text-[#0B1E3D]" />
                        Record first result
                    </Link>
                )}
            </div>
        </div>
    );
}