"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
    AlertCircle,
    BookOpen,
    Building2,
    Plus,
    RefreshCw,
    RotateCcw,
    Search,
    Star,
    X,
} from "lucide-react";

import CourseCard from "./CourseCard";
import { courseApi, type Course } from "../../types/courses";
import RequireRoleInline from "@/app/components/navigation/RequiredRoleInline";

const FOCUS_RING =
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400";

const HIDE_SCROLLBAR =
    "[scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden";

const controlCls =
    "h-10 w-full cursor-pointer rounded-sm border border-zinc-200 bg-white text-sm font-medium text-zinc-800 transition-colors hover:border-zinc-300 dark:border-white/10 dark:bg-[#0B1E3D] dark:text-zinc-100 dark:hover:border-white/20";

export default function CoursesPage() {
    const searchParams = useSearchParams();

    // Read `?department=<id>` from the URL so we can pre-apply the filter.
    const departmentFromUrl = searchParams.get("department") ?? "all";

    const [courses, setCourses] = useState<Course[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState("");

    const [search, setSearch] = useState("");
    const [departmentFilter, setDepartmentFilter] = useState(departmentFromUrl);
    const [levelFilter, setLevelFilter] = useState("all");
    const [featuredOnly, setFeaturedOnly] = useState(false);

    const searchRef = useRef<HTMLInputElement>(null);

    // Keep the filter in sync if the query param changes (e.g. navigating
    // from one department page to another without a full remount).
    useEffect(() => {
        setDepartmentFilter(departmentFromUrl);
    }, [departmentFromUrl]);

    const loadCourses = useCallback(async () => {
        try {
            setIsLoading(true);
            setError("");

            const response = await courseApi.getAll();
            setCourses(response.data);
        } catch (err) {
            console.error("Failed to load courses:", err);
            setError("Unable to load courses. Please try again.");
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        loadCourses();
    }, [loadCourses]);

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

    /* Extract unique departments */
    const departments = useMemo(() => {
        const map = new Map<string, string>();
        courses.forEach((course) => {
            if (course.department?._id && course.department?.name) {
                map.set(course.department._id, course.department.name);
            }
        });
        return Array.from(map.entries())
            .map(([id, name]) => ({ id, name }))
            .sort((a, b) => a.name.localeCompare(b.name));
    }, [courses]);

    /* Extract unique course levels */
    const levels = useMemo(() => {
        return Array.from(
            new Set(courses.map((course) => course.level).filter(Boolean))
        ).sort();
    }, [courses]);

    const query = search.trim().toLowerCase();

    const matchesSearch = useCallback(
        (course: Course) =>
            !query ||
            course.name.toLowerCase().includes(query) ||
            course.courseCode.toLowerCase().includes(query) ||
            Boolean(course.department?.name?.toLowerCase().includes(query)) ||
            course.level.toLowerCase().includes(query),
        [query]
    );

    const matchesDepartment = useCallback(
        (course: Course) =>
            departmentFilter === "all" ||
            course.department?._id === departmentFilter,
        [departmentFilter]
    );

    const matchesFeatured = useCallback(
        (course: Course) => !featuredOnly || Boolean(course.featured),
        [featuredOnly]
    );

    /* Courses matching everything except the level, so level chips show useful counts */
    const beforeLevel = useMemo(
        () =>
            courses.filter(
                (c) => matchesSearch(c) && matchesDepartment(c) && matchesFeatured(c)
            ),
        [courses, matchesSearch, matchesDepartment, matchesFeatured]
    );

    const levelCounts = useMemo(() => {
        const counts: Record<string, number> = {};
        beforeLevel.forEach((c) => {
            counts[c.level] = (counts[c.level] ?? 0) + 1;
        });
        return counts;
    }, [beforeLevel]);

    /* Filter logic */
    const filteredCourses = useMemo(
        () =>
            beforeLevel.filter(
                (course) => levelFilter === "all" || course.level === levelFilter
            ),
        [beforeLevel, levelFilter]
    );

    const hasActiveFilters =
        search.trim() !== "" ||
        departmentFilter !== "all" ||
        levelFilter !== "all" ||
        featuredOnly;

    const clearFilters = () => {
        setSearch("");
        setDepartmentFilter("all");
        setLevelFilter("all");
        setFeaturedOnly(false);
    };

    const showLevels = levels.length > 1;

    return (
        <div className="space-y-5">
            {/* Header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-sm bg-orange-400/10 text-orange-500 ring-1 ring-inset ring-orange-400/30 dark:text-orange-400">
                        <BookOpen className="h-5 w-5" strokeWidth={2} />
                    </span>
                    <div className="min-w-0">
                        <h1 className="text-xl font-bold tracking-tight text-[#0B1E3D] dark:text-white">
                            Courses
                        </h1>
                        <p className="text-sm text-zinc-500 dark:text-zinc-400">
                            Curricula, levels and department offerings.
                        </p>
                    </div>
                </div>

                <RequireRoleInline role="admin">
                    <Link
                        href="/courses/new"
                        className={`inline-flex h-10 items-center justify-center gap-2 rounded-sm bg-[#0B1E3D] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#0B1E3D]/90 active:bg-[#0B1E3D]/80 dark:bg-orange-400 dark:text-[#0B1E3D] dark:hover:bg-orange-300 dark:active:bg-orange-500 ${FOCUS_RING} focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#0B1E3D]`}
                    >
                        <Plus className="h-4 w-4 text-orange-400 dark:text-[#0B1E3D]" />
                        Add course
                    </Link>
                </RequireRoleInline>
            </div>

            {/* Command bar */}
            <div className="space-y-3">
                <div className="flex w-full flex-col gap-2 lg:flex-row lg:items-center">
                    {/* Search */}
                    <label
                        className="
    flex h-10 w-full min-w-0 items-center gap-2 rounded-sm
    border-b-2 border-transparent bg-zinc-100 px-3
    text-zinc-400 transition-colors
    lg:max-w-none lg:flex-1
    focus-within:border-orange-400 focus-within:bg-white
    focus-within:shadow-sm
    dark:bg-white/5 dark:text-zinc-500
    dark:focus-within:bg-white/10
"
                    >
                        <Search className="h-4 w-4 shrink-0" />
                        <input
                            ref={searchRef}
                            type="text"
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === "Escape") setSearch("");
                            }}
                            placeholder="Search name, code or department"
                            aria-label="Search courses"
                            autoComplete="off"
                            spellCheck={false}
                            className="min-w-0 flex-1 bg-transparent text-sm text-[#0B1E3D] outline-none placeholder:text-zinc-400 dark:text-white dark:placeholder:text-zinc-500"
                        />
                        {search ? (
                            <button
                                type="button"
                                onClick={() => {
                                    setSearch("");
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

                    {/* Department */}
                    <div className="relative w-full shrink-0 lg:w-56">
                        <Building2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-sky-600 dark:text-sky-400" />
                        <select
                            value={departmentFilter}
                            onChange={(event) => setDepartmentFilter(event.target.value)}
                            aria-label="Filter by department"
                            className={`${controlCls} pl-9 pr-2 ${FOCUS_RING}`}
                        >
                            <option value="all">All departments</option>
                            {departments.map((department) => (
                                <option key={department.id} value={department.id}>
                                    {department.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Featured toggle */}
                    <button
                        type="button"
                        onClick={() => setFeaturedOnly((v) => !v)}
                        aria-pressed={featuredOnly}
                        className={`inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-sm border px-3.5 text-sm font-medium transition-colors ${FOCUS_RING} ${featuredOnly
                            ? "border-orange-400/60 bg-orange-400/10 text-orange-700 dark:text-orange-300"
                            : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300 dark:border-white/10 dark:bg-[#0B1E3D] dark:text-zinc-200 dark:hover:border-white/20"
                            }`}
                    >
                        <Star
                            className={`h-4 w-4 ${featuredOnly
                                ? "fill-orange-400 text-orange-500 dark:text-orange-400"
                                : "text-orange-500 dark:text-orange-400"
                                }`}
                        />
                        Featured
                    </button>
                </div>

                {/* Level chips with counts */}
                {showLevels && (
                    <div
                        role="group"
                        aria-label="Filter by level"
                        className={`flex items-center gap-1.5 overflow-x-auto ${HIDE_SCROLLBAR}`}
                    >
                        {[
                            { key: "all", label: "All levels", count: beforeLevel.length },
                            ...levels.map((level) => ({
                                key: level,
                                label: level,
                                count: levelCounts[level] ?? 0,
                            })),
                        ].map(({ key, label, count }) => {
                            const active = levelFilter === key;
                            return (
                                <button
                                    key={key}
                                    type="button"
                                    onClick={() => setLevelFilter(key)}
                                    aria-pressed={active}
                                    className={`flex h-8 shrink-0 items-center gap-1.5 rounded-sm px-3 text-[13px] font-medium transition-colors ${FOCUS_RING} ${active
                                        ? "bg-[#0B1E3D] text-white dark:bg-orange-400 dark:text-[#0B1E3D]"
                                        : "bg-[#0B1E3D]/5 text-[#0B1E3D] hover:bg-[#0B1E3D]/10 dark:bg-white/8 dark:text-zinc-200 dark:hover:bg-white/12"
                                        }`}
                                >
                                    {label}
                                    <span
                                        className={`text-[11px] tabular-nums ${active
                                            ? "text-orange-400 dark:text-[#0B1E3D]/70"
                                            : "text-zinc-400 dark:text-zinc-500"
                                            }`}
                                    >
                                        {count}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                )}

                {/* Summary */}
                <div className="flex items-center justify-between gap-3 text-xs text-zinc-500 dark:text-zinc-400">
                    <p aria-live="polite">
                        {isLoading
                            ? "Loading courses…"
                            : hasActiveFilters
                                ? `${filteredCourses.length} of ${courses.length} courses`
                                : `${courses.length} ${courses.length === 1 ? "course" : "courses"}`}
                    </p>

                    {hasActiveFilters && (
                        <button
                            type="button"
                            onClick={clearFilters}
                            className={`inline-flex h-7 items-center gap-1 rounded-sm px-2 font-semibold text-orange-600 transition-colors hover:bg-orange-400/10 dark:text-orange-400 ${FOCUS_RING}`}
                        >
                            <RotateCcw className="h-3 w-3" />
                            Reset
                        </button>
                    )}
                </div>
            </div>

            {/* Error: inline info bar */}
            {error && (
                <div
                    role="alert"
                    className="flex items-center gap-3 rounded-sm border border-red-200 border-l-4 border-l-red-500 bg-red-50 p-3.5 text-red-700 dark:border-red-500/20 dark:border-l-red-500 dark:bg-red-500/10 dark:text-red-300"
                >
                    <AlertCircle className="h-5 w-5 shrink-0" />
                    <p className="min-w-0 flex-1 text-sm">{error}</p>
                    <button
                        type="button"
                        onClick={loadCourses}
                        className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-sm px-2.5 text-xs font-semibold transition-colors hover:bg-red-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 dark:hover:bg-red-500/20"
                    >
                        <RefreshCw className="h-3.5 w-3.5" />
                        Retry
                    </button>
                </div>
            )}

            {/* Skeleton Grid */}
            {isLoading && (
                <div
                    aria-busy="true"
                    aria-label="Loading courses"
                    className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4"
                >
                    {Array.from({ length: 8 }).map((_, index) => (
                        <CourseCardSkeleton key={index} />
                    ))}
                </div>
            )}

            {/* Main Content Display */}
            {!isLoading && !error && (
                <>
                    {filteredCourses.length > 0 ? (
                        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                            {filteredCourses.map((course, index) => (
                                <CourseCard
                                    key={course._id}
                                    course={course}
                                    query={search.trim()}
                                    animationDelay={index * 0.04}
                                />
                            ))}
                        </div>
                    ) : (
                        <EmptyState
                            hasFilters={hasActiveFilters}
                            onClear={clearFilters}
                        />
                    )}
                </>
            )}
        </div>
    );
}

function CourseCardSkeleton() {
    return (
        <div className="space-y-4 rounded-sm border border-zinc-200/80 bg-white/80 p-4 dark:border-white/10 dark:bg-white/4">
            <div className="flex items-center justify-between">
                <div className="h-5 w-20 animate-pulse rounded-sm bg-zinc-200 dark:bg-white/10" />
                <div className="h-5 w-16 animate-pulse rounded-sm bg-zinc-100 dark:bg-white/5" />
            </div>
            <div className="space-y-2">
                <div className="h-4 w-4/5 animate-pulse rounded-sm bg-zinc-200 dark:bg-white/10" />
                <div className="h-4 w-1/2 animate-pulse rounded-sm bg-zinc-100 dark:bg-white/5" />
            </div>
            <div className="flex items-center justify-between border-t border-zinc-200/80 pt-3 dark:border-white/10">
                <div className="h-4 w-24 animate-pulse rounded-sm bg-zinc-200 dark:bg-white/10" />
                <div className="h-4 w-12 animate-pulse rounded-sm bg-zinc-100 dark:bg-white/5" />
            </div>
        </div>
    );
}

interface EmptyStateProps {
    hasFilters: boolean;
    onClear: () => void;
}

function EmptyState({ hasFilters, onClear }: EmptyStateProps) {
    return (
        <div className="rounded-sm border border-dashed border-zinc-300 px-6 py-14 text-center dark:border-white/15">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-sm bg-orange-400/10 text-orange-500 ring-1 ring-inset ring-orange-400/30 dark:text-orange-400">
                <BookOpen className="h-6 w-6" />
            </span>

            <p className="mt-3 text-sm font-semibold text-[#0B1E3D] dark:text-white">
                {hasFilters ? "No courses match your filters" : "No courses yet"}
            </p>

            <p className="mx-auto mt-1 max-w-sm text-xs text-zinc-500 dark:text-zinc-400">
                {hasFilters
                    ? "Try a different search, or reset the filters."
                    : "There are currently no courses added to the system."}
            </p>

            {hasFilters && (
                <button
                    type="button"
                    onClick={onClear}
                    className={`mt-4 inline-flex h-9 items-center gap-1.5 rounded-sm border border-zinc-200 bg-white px-3.5 text-[13px] font-semibold text-[#0B1E3D] transition-colors hover:bg-zinc-100 dark:border-white/15 dark:bg-transparent dark:text-white dark:hover:bg-white/10 ${FOCUS_RING}`}
                >
                    <RotateCcw className="h-3.5 w-3.5" />
                    Reset filters
                </button>
            )}
        </div>
    );
}