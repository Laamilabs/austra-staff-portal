"use client";

import {
    memo,
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
    type MouseEvent,
} from "react";
import Link from "next/link";
import {
    AlertCircle,
    ArrowDown,
    ArrowUp,
    BarChart3,
    ChevronDown,
    ChevronRight,
    FileText,
    Filter,
    Info,
    Plus,
    RefreshCw,
    Search,
    SlidersHorizontal,
    Users,
    X,
    type LucideIcon,
} from "lucide-react";

import {
    AssessmentType,
    Result,
    marksToGrade,
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
type CompletionFilter = "ALL" | "COMPLETE" | "INCOMPLETE";
type SortField = "name" | "totalScore" | "unitCount" | "latest";
type SortOrder = "asc" | "desc";

/** A single card = one (student, course) aggregate. */
interface CourseRow {
    student: StudentAggregate;
    course: CourseAggregate;
}

/** Cards rendered per "page" — keeps long lists fast on phones. */
const PAGE_SIZE = 50;

/** Windows 10 system font stack. */
const WIN_FONT =
    '"Segoe UI", "Segoe UI Variable Text", system-ui, -apple-system, "Helvetica Neue", Arial, sans-serif';

const FOCUS_RING =
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400";

/** 44px touch targets on phones, compact from md. */
const controlCls =
    "h-11 w-full cursor-pointer rounded-sm border border-zinc-200 bg-white text-sm text-zinc-800 transition-colors hover:border-zinc-400 md:h-10 dark:border-white/10 dark:bg-[#0B1E3D] dark:text-zinc-100 dark:hover:border-white/30";

const btnPrimaryCls = `inline-flex h-11 items-center justify-center gap-2 rounded-sm bg-[#0B1E3D] px-3 text-[13px] font-semibold text-white transition-colors hover:bg-[#0B1E3D]/90 active:bg-[#0B1E3D]/80 sm:h-10 sm:px-4 sm:text-sm dark:bg-orange-400 dark:text-[#0B1E3D] dark:hover:bg-orange-300 dark:active:bg-orange-500 ${FOCUS_RING} focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#0B1E3D]`;

const btnSecondaryCls = `inline-flex h-11 items-center justify-center gap-2 rounded-sm border border-zinc-300 bg-white/80 px-3 text-[13px] font-semibold text-[#0B1E3D] transition-colors hover:border-zinc-400 hover:bg-white sm:h-10 sm:px-4 sm:text-sm dark:border-white/20 dark:bg-transparent dark:text-white dark:hover:bg-white/10 ${FOCUS_RING}`;

/** Flat, slightly acrylic surface — the animated lines show through. */
const panel =
    "rounded-sm border border-zinc-200 bg-white/75 backdrop-blur-sm dark:border-white/10 dark:bg-[#0B1E3D]/60";

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

type GradeKind = "distinction" | "credit" | "pass" | "fail" | "incomplete";

function gradeKind(grade: string): GradeKind {
    if (grade.includes("Distinction")) return "distinction";
    if (grade.includes("Credit")) return "credit";
    if (grade.includes("Pass")) return "pass";
    if (grade === "Incomplete") return "incomplete";
    return "fail";
}

const KIND_TONE: Record<GradeKind, string> = {
    distinction:
        "bg-emerald-500/10 text-emerald-700 ring-emerald-500/25 dark:text-emerald-300",
    credit: "bg-sky-500/10 text-sky-700 ring-sky-500/25 dark:text-sky-300",
    pass: "bg-amber-400/10 text-amber-700 ring-amber-400/30 dark:text-amber-300",
    fail: "bg-red-500/10 text-red-700 ring-red-500/25 dark:text-red-300",
    incomplete:
        "bg-zinc-500/10 text-zinc-600 ring-zinc-500/20 dark:text-zinc-300",
};

const KIND_META: Record<GradeKind, { label: string; bar: string }> = {
    distinction: { label: "Distinction", bar: "bg-emerald-500" },
    credit: { label: "Credit", bar: "bg-sky-500" },
    pass: { label: "Pass", bar: "bg-amber-400" },
    fail: { label: "Fail", bar: "bg-red-500" },
    incomplete: { label: "Incomplete", bar: "bg-zinc-400" },
};

const KIND_ORDER: GradeKind[] = [
    "distinction",
    "credit",
    "pass",
    "fail",
    "incomplete",
];

/* -------------------------------------------------------------------------- */
/* Animated background lines                                                  */
/* -------------------------------------------------------------------------- */

const GRID = 56; // px — runners travel exactly along the grid lines

const H_RUNNERS = [
    { row: 2, dur: 15, delay: 0, accent: true },
    { row: 5, dur: 21, delay: -8, accent: false },
    { row: 8, dur: 26, delay: -13, accent: true },
    { row: 11, dur: 18, delay: -4, accent: false },
    { row: 14, dur: 24, delay: -17, accent: true },
];

const V_RUNNERS = [
    { col: 3, dur: 17, delay: -2, accent: false },
    { col: 8, dur: 23, delay: -10, accent: true },
    { col: 14, dur: 19, delay: -6, accent: false },
    { col: 21, dur: 27, delay: -15, accent: true },
    { col: 29, dur: 22, delay: -9, accent: false },
];

const H_ACCENT = "bg-linear-to-r from-transparent via-orange-400/70 to-transparent";
const H_QUIET =
    "bg-linear-to-r from-transparent via-[#0B1E3D]/30 to-transparent dark:via-white/30";
const V_ACCENT = "bg-linear-to-b from-transparent via-orange-400/70 to-transparent";
const V_QUIET =
    "bg-linear-to-b from-transparent via-[#0B1E3D]/30 to-transparent dark:via-white/30";

/* -------------------------------------------------------------------------- */
/* Badges / pills                                                             */
/* -------------------------------------------------------------------------- */

function GradeBadge({ grade }: { grade: string }) {
    return (
        <span
            className={`inline-flex items-center whitespace-nowrap rounded-sm px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${KIND_TONE[gradeKind(grade)]}`}
        >
            {grade}
        </span>
    );
}

function ScorePill({ score }: { score: number }) {
    const kind = gradeKind(marksToGrade(score));
    return (
        <span
            className={`inline-flex items-center rounded-sm px-2 py-0.5 font-mono text-xs font-bold tabular-nums ring-1 ring-inset ${KIND_TONE[kind]}`}
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

/** Thin score bar; empty track for incomplete courses. */
function ScoreBar({ course }: { course: CourseAggregate }) {
    const pct = course.isComplete
        ? Math.max(0, Math.min(100, course.totalScore))
        : 0;
    const tone = KIND_META[gradeKind(course.grade)].bar;
    return (
        <div
            className="h-1 w-full overflow-hidden rounded-sm bg-zinc-200/80 dark:bg-white/10"
            aria-hidden="true"
        >
            <div
                className={`h-full rounded-sm ${tone}`}
                style={{ width: `${pct}%` }}
            />
        </div>
    );
}

function CourseBadge({ code }: { code: string }) {
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
        <span className="inline-flex shrink-0 items-center rounded-sm bg-[#0B1E3D]/5 px-1.5 py-0.5 font-mono text-[11px] font-bold uppercase tracking-wide text-[#0B1E3D] ring-1 ring-inset ring-[#0B1E3D]/10 dark:bg-orange-400/10 dark:text-orange-300 dark:ring-orange-400/25">
            {code}
        </span>
    );
}

function StudentAvatar({
    name,
    className = "h-10 w-10",
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
        <span className="inline-flex h-8 items-center gap-1 rounded-sm bg-[#0B1E3D]/5 pl-2.5 pr-1 text-xs font-medium text-[#0B1E3D] ring-1 ring-inset ring-[#0B1E3D]/10 sm:h-7 dark:bg-orange-400/10 dark:text-orange-300 dark:ring-orange-400/25">
            <span className="max-w-48 truncate">{label}</span>
            <button
                type="button"
                onClick={onRemove}
                aria-label={removeLabel}
                className={`flex h-6 w-6 items-center justify-center rounded-sm text-zinc-500 transition-colors hover:bg-orange-400/20 hover:text-orange-600 sm:h-5 sm:w-5 dark:text-zinc-400 dark:hover:text-orange-300 ${FOCUS_RING}`}
            >
                <X className="h-3 w-3" />
            </button>
        </span>
    );
}

function Segmented<T extends string>({
    value,
    onChange,
    options,
    label,
}: {
    value: T;
    onChange: (v: T) => void;
    options: { value: T; label: string }[];
    label: string;
}) {
    return (
        <div
            role="radiogroup"
            aria-label={label}
            className="grid h-11 grid-flow-col auto-cols-fr overflow-hidden rounded-sm border border-zinc-200 md:h-10 dark:border-white/10"
        >
            {options.map((o, i) => {
                const on = value === o.value;
                return (
                    <button
                        key={o.value}
                        type="button"
                        role="radio"
                        aria-checked={on}
                        onClick={() => onChange(o.value)}
                        className={`px-3 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-orange-400 ${i > 0
                            ? "border-l border-zinc-200 dark:border-white/10"
                            : ""
                            } ${on
                                ? "bg-[#0B1E3D] text-white dark:bg-orange-400 dark:text-[#0B1E3D]"
                                : "bg-white text-zinc-600 hover:bg-zinc-50 dark:bg-transparent dark:text-zinc-300 dark:hover:bg-white/10"
                            }`}
                    >
                        {o.label}
                    </button>
                );
            })}
        </div>
    );
}

/* -------------------------------------------------------------------------- */
/* Page                                                                       */
/* -------------------------------------------------------------------------- */

export default function ResultsPage() {
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
    const [completionFilter, setCompletionFilter] =
        useState<CompletionFilter>("ALL");
    const [filtersOpen, setFiltersOpen] = useState(false);

    // Sort
    const [sortBy, setSortBy] = useState<SortField>("totalScore");
    const [sortOrder, setSortOrder] = useState<SortOrder>("desc");

    // Progressive rendering
    const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

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

    // Back to the first page whenever the view changes.
    useEffect(() => {
        setVisibleCount(PAGE_SIZE);
    }, [
        searchQuery,
        assessmentFilter,
        completionFilter,
        sortBy,
        sortOrder,
    ]);

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

    // Single pass: filter → aggregate → flatten → sort → stats.
    // Keeping this in one memo means stats can never go stale relative to
    // what's actually rendered in the body.
    const { students, rows, stats, distribution } = useMemo(() => {
        const query = searchQuery.toLowerCase().trim();

        const filtered = results.filter(
            (r) =>
                assessmentFilter === "ALL" ||
                r.assessmentType === assessmentFilter,
        );

        const aggregates = aggregateByStudent(filtered, unitCourseLookup);

        // Flatten into one row per (student, course) aggregate.
        const flat: CourseRow[] = [];
        for (const s of aggregates) {
            for (const c of s.courses) {
                if (completionFilter === "COMPLETE" && !c.isComplete) continue;
                if (completionFilter === "INCOMPLETE" && c.isComplete)
                    continue;

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

        const allCourses = aggregates.flatMap((s) => s.courses);
        const completeCourses = allCourses.filter((c) => c.isComplete);
        const avg =
            completeCourses.length === 0
                ? 0
                : completeCourses.reduce((s, c) => s + c.totalScore, 0) /
                completeCourses.length;

        // Grade distribution for exactly what is on screen.
        const dist: Record<GradeKind, number> = {
            distinction: 0,
            credit: 0,
            pass: 0,
            fail: 0,
            incomplete: 0,
        };
        for (const r of flat) dist[gradeKind(r.course.grade)]++;

        return {
            students: aggregates,
            rows: flat,
            distribution: dist,
            stats: {
                totalStudents: aggregates.length,
                // Reflect the current filtered view, not the entire DB.
                totalResults: filtered.length,
                avg: Math.round(avg * 10) / 10,
                distinctions: completeCourses.filter((c) =>
                    c.grade.includes("Distinction"),
                ).length,
                incomplete: allCourses.filter((c) => !c.isComplete).length,
            },
        };
    }, [
        results,
        searchQuery,
        assessmentFilter,
        completionFilter,
        sortBy,
        sortOrder,
        unitCourseLookup,
    ]);

    const hasFilters =
        searchQuery.trim() !== "" ||
        assessmentFilter !== "ALL" ||
        completionFilter !== "ALL";

    /** Count shown on the mobile "Filters" button (search excluded). */
    const activeFilterCount =
        (assessmentFilter !== "ALL" ? 1 : 0) +
        (completionFilter !== "ALL" ? 1 : 0);

    const visibleRows = useMemo(
        () => rows.slice(0, visibleCount),
        [rows, visibleCount],
    );
    const showDistribution = !loading && !error && rows.length > 0;

    /* ------------------------------ Actions ---------------------------- */

    const clearFilters = useCallback(() => {
        setSearchQuery("");
        setAssessmentFilter("ALL");
        setCompletionFilter("ALL");
    }, []);

    const toggleSortOrder = useCallback(() => {
        setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    }, []);

    const changeSortField = useCallback((field: SortField) => {
        setSortBy(field);
        setSortOrder(defaultOrder(field));
    }, []);

    const assessmentLabel =
        assessmentFilter === AssessmentType.CAT
            ? "CAT"
            : assessmentFilter === AssessmentType.PRACTICAL
                ? "Practical"
                : "Final exam";

    /* ------------------------------- Render ---------------------------- */

    return (
        <div
            className="relative isolate mx-auto flex w-full max-w-[1920px] flex-col gap-4 sm:gap-5"
            style={{ fontFamily: WIN_FONT }}
        >
            {/* HEADER */}
            <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-start gap-3">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-sm bg-orange-400/10 text-orange-500 ring-1 ring-inset ring-orange-400/30 dark:text-orange-400">
                        <BarChart3 className="h-5 w-5" strokeWidth={2} />
                    </span>
                    <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                            <h1 className="text-2xl font-light tracking-tight text-[#0B1E3D] dark:text-white">
                                Results
                            </h1>
                            <button
                                type="button"
                                onClick={() => setShowInfo((v) => !v)}
                                aria-expanded={showInfo}
                                aria-controls="scoring-info"
                                aria-label="How scores are calculated"
                                title="How scores are calculated"
                                className={`flex h-8 w-8 items-center justify-center rounded-sm transition-colors sm:h-6 sm:w-6 ${FOCUS_RING} ${showInfo
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

                    {/* Refresh (phones/tablets) */}
                    <button
                        type="button"
                        onClick={fetchResults}
                        disabled={loading}
                        title="Refresh"
                        aria-label="Refresh results"
                        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-sm border border-zinc-200 text-zinc-500 transition-colors hover:bg-[#0B1E3D]/5 disabled:opacity-50 lg:hidden dark:border-white/10 dark:text-zinc-400 dark:hover:bg-white/10 ${FOCUS_RING}`}
                    >
                        <RefreshCw
                            className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
                        />
                    </button>
                </div>

                <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
                    {/* Refresh (desktop) */}
                    <button
                        type="button"
                        onClick={fetchResults}
                        disabled={loading}
                        title="Refresh"
                        aria-label="Refresh results"
                        className={`hidden h-10 w-10 items-center justify-center rounded-sm text-zinc-500 transition-colors hover:bg-[#0B1E3D]/5 hover:text-[#0B1E3D] disabled:opacity-50 lg:flex dark:text-zinc-400 dark:hover:bg-white/10 dark:hover:text-white ${FOCUS_RING}`}
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
                        <span className="sm:hidden">Unit marks</span>
                        <span className="hidden sm:inline">
                            Record unit marks
                        </span>
                    </Link>

                    <Link
                        href="/results/new/student-based"
                        className={btnPrimaryCls}
                    >
                        <Plus className="h-4 w-4 text-orange-400 dark:text-[#0B1E3D]" />
                        <span className="sm:hidden">Student marks</span>
                        <span className="hidden sm:inline">
                            Record student marks
                        </span>
                    </Link>
                </div>
            </header>

            {/* How scores work */}
            {showInfo && (
                <div
                    id="scoring-info"
                    className="flex gap-3 rounded-sm border border-sky-200 border-l-4 border-l-sky-500 bg-sky-50/90 p-3.5 text-sm text-sky-900 backdrop-blur-sm dark:border-sky-500/20 dark:border-l-sky-500 dark:bg-sky-500/10 dark:text-sky-100"
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
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-sm text-sky-700 transition-colors hover:bg-sky-500/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 sm:h-6 sm:w-6 dark:text-sky-300"
                    >
                        <X className="h-3.5 w-3.5" />
                    </button>
                </div>
            )}

            {/* OVERVIEW: stats (+ grade distribution beside them on lg+) */}
            <div
                className={`grid gap-2 sm:gap-3 ${showDistribution
                    ? "lg:grid-cols-[minmax(0,1fr)_20rem] xl:grid-cols-[minmax(0,1fr)_24rem] 2xl:grid-cols-[minmax(0,1fr)_30rem] lg:items-start"
                    : ""
                    }`}
            >
                {/* Two stats → two columns at every breakpoint */}
                <div className="grid grid-cols-2 gap-2 sm:gap-3">
                    <StatCard
                        label="Students"
                        value={stats.totalStudents}
                        icon={Users}
                        tone="sky"
                    />
                    <StatCard
                        label="Average score"
                        value={`${stats.avg}%`}
                        icon={BarChart3}
                        tone="orange"
                    />
                </div>

                {showDistribution && (
                    <GradeDistribution
                        distribution={distribution}
                        total={rows.length}
                    />
                )}
            </div>

            {/* COMMAND BAR */}
            <div className="space-y-3">
                <div className="flex flex-col gap-3 2xl:flex-row 2xl:items-start">
                    {/* Search + mobile filter toggle */}
                    <div className="flex items-center gap-2 2xl:max-w-md 2xl:flex-1">
                        <label className="flex h-11 min-w-0 flex-1 items-center gap-2 rounded-sm border border-zinc-300 border-b-2 bg-white/80 px-3 text-zinc-400 backdrop-blur-sm transition-colors focus-within:border-orange-400 focus-within:bg-white md:h-10 dark:border-white/15 dark:bg-white/5 dark:text-zinc-500 dark:focus-within:border-orange-400 dark:focus-within:bg-white/10">
                            <Search className="h-4 w-4 shrink-0" />
                            <input
                                ref={searchRef}
                                type="text"
                                inputMode="search"
                                enterKeyHint="search"
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
                                    className={`flex h-8 w-8 items-center justify-center rounded-sm hover:text-[#0B1E3D] sm:h-6 sm:w-6 dark:hover:text-white ${FOCUS_RING}`}
                                >
                                    <X className="h-3.5 w-3.5" />
                                </button>
                            ) : (
                                <kbd className="hidden rounded-sm border border-zinc-300 px-1.5 text-[10px] font-semibold text-zinc-400 md:block dark:border-white/15 dark:text-zinc-500">
                                    /
                                </kbd>
                            )}
                        </label>

                        <button
                            type="button"
                            onClick={() => setFiltersOpen((v) => !v)}
                            aria-expanded={filtersOpen}
                            aria-controls="filter-panel"
                            className={`relative flex h-11 shrink-0 items-center gap-2 rounded-sm border px-3.5 text-sm font-semibold transition-colors md:hidden ${FOCUS_RING} ${filtersOpen || activeFilterCount > 0
                                ? "border-[#0B1E3D] bg-[#0B1E3D]/5 text-[#0B1E3D] dark:border-orange-400 dark:bg-orange-400/10 dark:text-orange-300"
                                : "border-zinc-200 bg-white text-zinc-700 dark:border-white/10 dark:bg-transparent dark:text-zinc-200"
                                }`}
                        >
                            <SlidersHorizontal className="h-4 w-4" />
                            Filters
                            {activeFilterCount > 0 && (
                                <span className="flex h-5 min-w-5 items-center justify-center rounded-sm bg-orange-400 px-1 text-[11px] font-bold text-[#0B1E3D]">
                                    {activeFilterCount}
                                </span>
                            )}
                            <ChevronDown
                                className={`h-3.5 w-3.5 transition-transform ${filtersOpen ? "rotate-180" : ""
                                    }`}
                            />
                        </button>
                    </div>

                    {/* Filters + sort.
            < md  : collapsible grid (button above)
            md+   : inline, wrapping, full width
            2xl+  : shares the row with search */}
                    <div
                        id="filter-panel"
                        className={`${filtersOpen ? "grid" : "hidden"
                            } grid-cols-2 gap-2 rounded-sm border border-zinc-200 bg-white/70 p-2.5 backdrop-blur-sm md:flex md:flex-wrap md:items-center md:gap-2 md:border-0 md:bg-transparent md:p-0 md:backdrop-blur-none 2xl:flex-1 dark:border-white/10 dark:bg-[#0B1E3D]/60`}
                    >
                        <div className="relative md:w-48">
                            <Filter className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-sky-600 dark:text-sky-400" />
                            <select
                                value={assessmentFilter}
                                onChange={(e) =>
                                    setAssessmentFilter(e.target.value as AssessmentTypeFilter)
                                }
                                aria-label="Filter by assessment type"
                                className={`${controlCls} pl-9 pr-2 ${FOCUS_RING}`}
                            >
                                <option value="ALL">All assessments</option>
                                <option value={AssessmentType.CAT}>CAT</option>
                                <option value={AssessmentType.PRACTICAL}>Practical</option>
                                <option value={AssessmentType.FINAL_EXAM}>Final exam</option>
                            </select>
                        </div>

                        <div className="col-span-2 md:col-span-1 md:w-72">
                            <Segmented<CompletionFilter>
                                label="Filter by course completion"
                                value={completionFilter}
                                onChange={setCompletionFilter}
                                options={[
                                    { value: "ALL", label: "All" },
                                    { value: "COMPLETE", label: "Complete" },
                                    { value: "INCOMPLETE", label: "Incomplete" },
                                ]}
                            />
                        </div>

                        <div className="col-span-2 flex items-center gap-1.5 md:col-span-1 md:ml-auto">
                            <label htmlFor="results-sort" className="sr-only">
                                Sort by
                            </label>
                            <select
                                id="results-sort"
                                value={sortBy}
                                onChange={(e) => changeSortField(e.target.value as SortField)}
                                className={`${controlCls} min-w-0 flex-1 px-2.5 font-medium md:w-40 md:flex-none ${FOCUS_RING}`}
                            >
                                {(Object.keys(SORT_LABELS) as SortField[]).map((f) => (
                                    <option key={f} value={f}>
                                        Sort: {SORT_LABELS[f]}
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
                                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-sm border border-zinc-200 bg-white text-orange-500 transition-colors hover:bg-zinc-100 md:h-10 md:w-10 dark:border-white/10 dark:bg-[#0B1E3D] dark:text-orange-400 dark:hover:bg-white/10 ${FOCUS_RING}`}
                            >
                                {sortOrder === "asc" ? (
                                    <ArrowUp className="h-4 w-4" />
                                ) : (
                                    <ArrowDown className="h-4 w-4" />
                                )}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Active filter chips */}
                {hasFilters && (
                    <div className="flex flex-wrap items-center gap-2">
                        {searchQuery.trim() !== "" && (
                            <Chip
                                label={`“${searchQuery.trim()}”`}
                                onRemove={() => setSearchQuery("")}
                                removeLabel="Clear search"
                            />
                        )}
                        {assessmentFilter !== "ALL" && (
                            <Chip
                                label={assessmentLabel}
                                onRemove={() => setAssessmentFilter("ALL")}
                                removeLabel="Clear assessment filter"
                            />
                        )}
                        {completionFilter !== "ALL" && (
                            <Chip
                                label={
                                    completionFilter === "COMPLETE"
                                        ? "Complete"
                                        : "Incomplete"
                                }
                                onRemove={() => setCompletionFilter("ALL")}
                                removeLabel="Clear completion filter"
                            />
                        )}
                        <button
                            type="button"
                            onClick={clearFilters}
                            className={`h-8 rounded-sm px-2 text-xs font-semibold text-zinc-500 transition-colors hover:bg-[#0B1E3D]/5 hover:text-[#0B1E3D] sm:h-7 dark:text-zinc-400 dark:hover:bg-white/10 dark:hover:text-white ${FOCUS_RING}`}
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
                    className="flex items-center gap-3 rounded-sm border border-red-200 border-l-4 border-l-red-500 bg-red-50/90 p-3.5 text-red-700 backdrop-blur-sm dark:border-red-500/20 dark:border-l-red-500 dark:bg-red-500/10 dark:text-red-300"
                >
                    <AlertCircle className="h-5 w-5 shrink-0" />
                    <p className="min-w-0 flex-1 text-sm">{error}</p>
                    <button
                        type="button"
                        onClick={fetchResults}
                        className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-sm px-2.5 text-xs font-semibold transition-colors hover:bg-red-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 sm:h-8 dark:hover:bg-red-500/20"
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
                        {rows.length === 1
                            ? "course aggregate"
                            : "course aggregates"}
                        {/* Only show the total "recorded" count when it
                            matches the visible view — i.e. no filters. */}
                        {!hasFilters && (
                            <>
                                {" · "}
                                {results.length}{" "}
                                {results.length === 1 ? "result" : "results"}{" "}
                                recorded
                            </>
                        )}
                    </p>

                    {rows.length === 0 ? (
                        <EmptyState
                            hasResults={results.length > 0}
                            onClear={clearFilters}
                        />
                    ) : (
                        <>
                            <ul className="space-y-2">
                                {visibleRows.map(({ student, course }) => (
                                    <li
                                        key={`${student.studentId}-${course.courseId}`}
                                    >
                                        <ResultCard
                                            student={student}
                                            course={course}
                                        />
                                    </li>
                                ))}
                            </ul>

                            {/* Progressive rendering */}
                            {rows.length > visibleCount && (
                                <div className="flex flex-col items-center gap-1.5">
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setVisibleCount(
                                                (c) => c + PAGE_SIZE,
                                            )
                                        }
                                        className={`${btnSecondaryCls} w-full sm:w-auto`}
                                    >
                                        <ChevronDown className="h-4 w-4" />
                                        Show more
                                    </button>
                                    <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
                                        Showing {visibleRows.length} of{" "}
                                        {rows.length}
                                    </span>
                                </div>
                            )}
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
    className = "",
}: {
    label: string;
    value: number | string;
    icon: LucideIcon;
    tone: keyof typeof STAT_TONES;
    className?: string;
}) {
    return (
        <div
            className={`${panel} flex items-center gap-2.5 p-3 sm:gap-3 sm:p-3.5 ${className}`}
        >
            <span
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-sm ${STAT_TONES[tone]}`}
            >
                <Icon className="h-4.5 w-4.5" strokeWidth={2} />
            </span>
            <div className="min-w-0">
                <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
                    {label}
                </p>
                <p className="text-2xl font-light leading-tight tabular-nums text-[#0B1E3D] dark:text-white">
                    {value}
                </p>
            </div>
        </div>
    );
}

/** Stacked bar showing how the current view splits across grade bands. */
function GradeDistribution({
    distribution,
    total,
}: {
    distribution: Record<GradeKind, number>;
    total: number;
}) {
    return (
        <section className={`${panel} p-3.5`} aria-label="Grade distribution">
            <div className="flex items-baseline justify-between gap-2">
                <h2 className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">
                    Grade distribution
                </h2>
                <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
                    {total} course{total === 1 ? "" : "s"}
                </span>
            </div>

            <div className="mt-2.5 flex h-2 w-full gap-px overflow-hidden rounded-sm bg-zinc-200/80 dark:bg-white/10">
                {KIND_ORDER.map((k) =>
                    distribution[k] > 0 ? (
                        <div
                            key={k}
                            className={KIND_META[k].bar}
                            style={{
                                width: `${(distribution[k] / total) * 100}%`,
                            }}
                            title={`${KIND_META[k].label}: ${distribution[k]}`}
                        />
                    ) : null,
                )}
            </div>

            <ul className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1.5">
                {KIND_ORDER.map((k) => (
                    <li
                        key={k}
                        className="flex items-center gap-1.5 text-[11px] text-zinc-600 dark:text-zinc-300"
                    >
                        <span
                            className={`h-2 w-2 rounded-sm ${KIND_META[k].bar}`}
                        />
                        {KIND_META[k].label}
                        <span className="font-mono font-semibold tabular-nums text-[#0B1E3D] dark:text-white">
                            {distribution[k]}
                        </span>
                    </li>
                ))}
            </ul>
        </section>
    );
}

function Metric({
    label,
    value,
    className = "",
}: {
    label: string;
    value: string | number;
    className?: string;
}) {
    return (
        <div className={className}>
            <dt className="text-[11px] text-zinc-500 dark:text-zinc-400">
                {label}
            </dt>
            <dd className="text-sm font-semibold tabular-nums text-zinc-800 dark:text-zinc-100">
                {value}
            </dd>
        </div>
    );
}

/**
 * One full-width result card. The whole card is a link.
 * Hover shows a soft "reveal" glow that follows the pointer (Windows 10 style).
 */
const ResultCard = memo(function ResultCard({ student, course }: CourseRow) {
    const onMove = (e: MouseEvent<HTMLAnchorElement>) => {
        const el = e.currentTarget;
        const r = el.getBoundingClientRect();
        el.style.setProperty("--rx", `${e.clientX - r.left}px`);
        el.style.setProperty("--ry", `${e.clientY - r.top}px`);
    };

    const accent = KIND_META[gradeKind(course.grade)].bar;

    return (
        <Link
            href={`/results/${student.studentId}`}
            onMouseMove={onMove}
            className={`group relative block overflow-hidden rounded-sm border border-zinc-200 bg-white/80 backdrop-blur-sm transition-colors hover:border-orange-400/60 hover:bg-white active:bg-zinc-50 dark:border-white/10 dark:bg-[#0B1E3D]/60 dark:hover:border-orange-400/50 dark:hover:bg-[#0B1E3D]/85 dark:active:bg-[#0B1E3D] ${FOCUS_RING}`}
        >
            {/* grade accent edge */}
            <span
                aria-hidden
                className={`absolute inset-y-0 left-0 w-1 transition-[width] duration-150 group-hover:w-1.5 ${accent}`}
            />

            {/* pointer-following reveal glow */}
            <span
                aria-hidden
                className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-150 group-hover:opacity-100 bg-[radial-gradient(220px_circle_at_var(--rx,50%)_var(--ry,50%),rgba(251,146,60,0.14),transparent_70%)]"
            />

            <div className="relative flex flex-col gap-3 py-3 pl-5 pr-3.5 md:flex-row md:items-center md:gap-6 md:pr-4">
                {/* Student */}
                <div className="flex min-w-0 items-center gap-3 md:w-64 md:shrink-0 lg:w-72">
                    <StudentAvatar name={student.studentName} />
                    <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-[#0B1E3D] dark:text-white">
                            {student.studentName}
                        </p>
                        <p className="truncate font-mono text-[11px] text-zinc-500 dark:text-zinc-400">
                            {student.admissionNumber}
                        </p>
                    </div>

                    {/* phones: score sits beside the name */}
                    <div className="md:hidden">
                        {course.isComplete ? (
                            <ScorePill score={course.totalScore} />
                        ) : (
                            <IncompletePill />
                        )}
                    </div>
                    <ChevronRight
                        aria-hidden
                        className="h-4 w-4 shrink-0 text-zinc-300 md:hidden dark:text-zinc-600"
                    />
                </div>

                {/* Course */}
                <div className="flex min-w-0 items-center gap-2 pl-13 md:min-w-48 md:flex-1 md:pl-0">
                    <CourseBadge code={course.courseCode} />
                    <span className="min-w-0 flex-1 truncate text-xs text-zinc-600 dark:text-zinc-300">
                        {course.courseName}
                    </span>
                </div>

                {/* Metrics */}
                <dl className="flex items-center gap-6 pl-13 md:pl-0">
                    <Metric
                        label="Units"
                        value={course.unitCount}
                        className="md:w-12"
                    />
                    <Metric
                        label="Results"
                        value={course.resultCount}
                        className="md:w-14"
                    />
                    <Metric
                        label="Latest"
                        value={formatDate(course.latestAt)}
                        className="hidden xl:block xl:w-28"
                    />
                </dl>

                {/* Score + grade */}
                <div className="flex items-center gap-3 pl-13 md:w-72 md:shrink-0 md:pl-0">
                    <div className="hidden md:block">
                        {course.isComplete ? (
                            <ScorePill score={course.totalScore} />
                        ) : (
                            <IncompletePill />
                        )}
                    </div>
                    <div className="min-w-0 flex-1">
                        <ScoreBar course={course} />
                    </div>
                    <GradeBadge grade={course.grade} />
                </div>

                {/* Open */}
                <ChevronRight
                    aria-hidden
                    className="hidden h-4 w-4 shrink-0 text-zinc-300 transition-all group-hover:translate-x-0.5 group-hover:text-orange-500 md:block dark:text-zinc-600 dark:group-hover:text-orange-400"
                />
            </div>
        </Link>
    );
});

function Skeleton() {
    return (
        <div
            aria-busy="true"
            aria-label="Loading results"
            className="space-y-2"
        >
            {[...Array(8)].map((_, i) => (
                <div
                    key={i}
                    className="flex items-center gap-4 rounded-sm border border-zinc-200 bg-white/75 px-4 py-3 backdrop-blur-sm dark:border-white/10 dark:bg-[#0B1E3D]/60"
                >
                    <div className="h-10 w-10 shrink-0 animate-pulse rounded-sm bg-zinc-200 dark:bg-white/10" />
                    <div className="flex-1 space-y-2">
                        <div className="h-3.5 w-40 max-w-full animate-pulse rounded-sm bg-zinc-200 dark:bg-white/10" />
                        <div className="h-3 w-24 animate-pulse rounded-sm bg-zinc-100 dark:bg-white/5" />
                    </div>
                    <div className="hidden h-5 w-16 animate-pulse rounded-sm bg-zinc-100 sm:block dark:bg-white/5" />
                    <div className="hidden h-5 w-20 animate-pulse rounded-sm bg-zinc-100 sm:block dark:bg-white/5" />
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
        <div className="rounded-sm border border-dashed border-zinc-300 bg-white/60 px-6 py-14 text-center backdrop-blur-sm dark:border-white/15 dark:bg-[#0B1E3D]/40">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-sm bg-orange-400/10 text-orange-500 ring-1 ring-inset ring-orange-400/30 dark:text-orange-400">
                <FileText className="h-6 w-6" />
            </span>
            <p className="mt-3 text-sm font-semibold text-[#0B1E3D] dark:text-white">
                {hasResults
                    ? "No course results match your filters"
                    : "No results yet"}
            </p>
            <p className="mx-auto mt-1 max-w-sm text-xs text-zinc-500 dark:text-zinc-400">
                {hasResults
                    ? "Try a different search, or remove some filters."
                    : "Once assessments are recorded they will appear here."}
            </p>

            <div className="mx-auto mt-4 flex max-w-xs justify-center">
                {hasResults ? (
                    <button
                        type="button"
                        onClick={onClear}
                        className={`${btnSecondaryCls} w-full sm:w-auto`}
                    >
                        <X className="h-3.5 w-3.5" />
                        Clear all filters
                    </button>
                ) : (
                    <Link
                        href="/results/new"
                        className={`${btnPrimaryCls} w-full sm:w-auto`}
                    >
                        <Plus className="h-4 w-4 text-orange-400 dark:text-[#0B1E3D]" />
                        Record first result
                    </Link>
                )}
            </div>
        </div>
    );
}