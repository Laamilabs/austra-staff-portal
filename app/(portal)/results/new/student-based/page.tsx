"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
    AlertCircle,
    ArrowLeft,
    ArrowRight,
    ChevronDown,
    Loader2,
    Search,
    Users,
    X,
} from "lucide-react";

import SelectCourse from "@/app/(portal)/courses/selectCourse";
import { Course, courseApi } from "@/app/types/courses";
import { Student, studentApi } from "@/app/types/students";

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function extractId(ref: unknown): string | null {
    if (!ref) return null;
    if (typeof ref === "string") return ref;
    if (typeof ref === "object" && "_id" in (ref as Record<string, unknown>)) {
        return String((ref as { _id: string })._id);
    }
    return null;
}

function studentFullName(s: Student): string {
    return [s.fullName.firstName, s.fullName.middleName, s.fullName.lastName]
        .filter(Boolean)
        .join(" ")
        .trim();
}

function initialsOf(s: Student): string {
    const first = s.fullName.firstName?.[0] ?? "";
    const last = s.fullName.lastName?.[0] ?? "";
    return `${first}${last}`.toUpperCase() || "?";
}

interface Enrollment {
    courseId: string;
    courseCode: string;
    courseName: string;
    courseLabel: string;
    admissionNumber: string;
}

function enrollmentsOf(
    student: Student,
    coursesById: Map<string, Course>,
): Enrollment[] {
    const out: Enrollment[] = [];
    for (const c of student.courses ?? []) {
        const cid = extractId(c.courseId);
        if (!cid) continue;
        const course = coursesById.get(cid);
        const courseCode = course?.courseCode ?? "";
        const courseName = course?.name ?? "Unknown course";
        out.push({
            courseId: cid,
            courseCode,
            courseName,
            courseLabel: course ? `${courseCode} — ${courseName}` : courseName,
            admissionNumber: c.admissionNumber ?? "",
        });
    }
    return out;
}

interface Row {
    student: Student;
    enrollments: Enrollment[];
}

const sheetHref = (studentId: string, courseId: string) =>
    `/results/new/student-based/units-sheet?studentId=${encodeURIComponent(
        studentId,
    )}&courseId=${encodeURIComponent(courseId)}`;

const SORT_OPTIONS = [
    { value: "name-asc", label: "Name (A–Z)" },
    { value: "name-desc", label: "Name (Z–A)" },
    { value: "adm-asc", label: "Adm. No. (low–high)" },
    { value: "adm-desc", label: "Adm. No. (high–low)" },
] as const;
type SortValue = (typeof SORT_OPTIONS)[number]["value"];

const PAGE_SIZE = 30;

const labelCls =
    "mb-1.5 block text-xs font-medium text-zinc-600 dark:text-zinc-400";
const focusRing =
    "focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-orange-400";

/* -------------------------------------------------------------------------- */
/* Student row                                                                */
/* -------------------------------------------------------------------------- */

function Avatar({ student, muted }: { student: Student; muted?: boolean }) {
    return (
        <span
            aria-hidden="true"
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-sm bg-blue-950 text-sm font-semibold text-orange-400 ${
                muted ? "opacity-40" : ""
            }`}
        >
            {initialsOf(student)}
        </span>
    );
}

function Identity({ student, muted }: { student: Student; muted?: boolean }) {
    return (
        <span className="min-w-0 flex-1">
            <span
                className={`block truncate text-sm font-semibold ${
                    muted
                        ? "text-zinc-500"
                        : "text-zinc-900 dark:text-zinc-100"
                }`}
            >
                {studentFullName(student)}
            </span>
            <span className="block truncate text-xs text-zinc-500 dark:text-zinc-400">
                {student.contact?.email || "No email"}
            </span>
        </span>
    );
}

function CodeBadge({ code }: { code: string }) {
    if (!code) return null;
    return (
        <span className="inline-flex rounded-sm bg-blue-950 px-1.5 py-0.5 font-mono text-xs font-semibold text-orange-400">
            {code}
        </span>
    );
}

function StudentRow({
    row,
    courseFilter,
    expanded,
    onToggle,
}: {
    row: Row;
    courseFilter: Course | null;
    expanded: boolean;
    onToggle: () => void;
}) {
    const { student, enrollments } = row;

    // One-click target: the filtered course, or the only enrollment.
    const direct = courseFilter
        ? enrollments.find((e) => e.courseId === courseFilter._id)
        : enrollments.length === 1
          ? enrollments[0]
          : undefined;

    const rowBase = `flex w-full items-center gap-4 px-4 py-3 text-left transition-colors sm:px-5 ${focusRing}`;

    /* No enrollments: nothing to open */
    if (enrollments.length === 0) {
        return (
            <li className={`${rowBase} cursor-default`}>
                <Avatar student={student} muted />
                <Identity student={student} muted />
                <span className="text-xs text-zinc-500 dark:text-zinc-400">
                    Not enrolled
                </span>
            </li>
        );
    }

    /* One course: the whole row opens the mark sheet */
    if (direct) {
        return (
            <li>
                <Link
                    href={sheetHref(student._id, direct.courseId)}
                    className={`${rowBase} group hover:bg-zinc-50 dark:hover:bg-zinc-800/50`}
                >
                    <Avatar student={student} />
                    <Identity student={student} />
                    <span className="flex shrink-0 flex-col items-end gap-0.5">
                        <CodeBadge code={direct.courseCode} />
                        <span className="font-mono text-xs text-zinc-500 dark:text-zinc-400">
                            {direct.admissionNumber || "—"}
                        </span>
                    </span>
                    <ArrowRight
                        size={16}
                        className="shrink-0 text-zinc-400 transition-transform group-hover:translate-x-0.5 group-hover:text-orange-500"
                    />
                </Link>
            </li>
        );
    }

    /* Several courses: expand to pick one, each option opens its sheet */
    return (
        <li className={expanded ? "bg-zinc-50 dark:bg-zinc-950/40" : ""}>
            <button
                type="button"
                onClick={onToggle}
                aria-expanded={expanded}
                className={`${rowBase} hover:bg-zinc-50 dark:hover:bg-zinc-800/50`}
            >
                <Avatar student={student} />
                <Identity student={student} />
                <span className="shrink-0 text-xs font-medium text-zinc-600 dark:text-zinc-300">
                    {enrollments.length} courses
                </span>
                <ChevronDown
                    size={16}
                    className={`shrink-0 text-zinc-400 transition-transform ${
                        expanded ? "rotate-180 text-orange-500" : ""
                    }`}
                />
            </button>

            {expanded && (
                <ul className="space-y-1.5 px-4 pb-4 sm:pl-[4.75rem] sm:pr-5">
                    {enrollments.map((e) => (
                        <li key={e.courseId}>
                            <Link
                                href={sheetHref(student._id, e.courseId)}
                                className="group flex items-center gap-3 rounded-sm border border-zinc-200 bg-white px-3 py-2.5 transition-colors hover:border-blue-950 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:border-orange-400"
                            >
                                <CodeBadge code={e.courseCode} />
                                <span className="min-w-0 flex-1 truncate text-sm text-zinc-800 dark:text-zinc-100">
                                    {e.courseName}
                                </span>
                                <span className="shrink-0 font-mono text-xs text-zinc-500 dark:text-zinc-400">
                                    {e.admissionNumber || "—"}
                                </span>
                                <ArrowRight
                                    size={15}
                                    className="shrink-0 text-zinc-400 transition-transform group-hover:translate-x-0.5 group-hover:text-orange-500"
                                />
                            </Link>
                        </li>
                    ))}
                </ul>
            )}
        </li>
    );
}

/* -------------------------------------------------------------------------- */
/* Page                                                                       */
/* -------------------------------------------------------------------------- */

export default function StudentBasedResultsPage() {
    const [courses, setCourses] = useState<Course[]>([]);
    const [students, setStudents] = useState<Student[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);

    const [search, setSearch] = useState("");
    const [courseFilter, setCourseFilter] = useState<Course | null>(null);
    const [sort, setSort] = useState<SortValue>("name-asc");
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

    /* ------------------------------ Fetch ------------------------------ */

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                setLoading(true);
                setLoadError(null);
                const [coursesRes, studentsRes] = await Promise.all([
                    courseApi.getAll(),
                    studentApi.getAll(),
                ]);
                if (cancelled) return;
                setCourses(coursesRes.data ?? []);
                setStudents(studentsRes.data ?? []);
            } catch (err: any) {
                if (cancelled) return;
                setLoadError(
                    err?.response?.data?.message ??
                        err?.message ??
                        "Failed to load courses and students.",
                );
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, []);

    /* --------------------------- Derived data -------------------------- */

    const coursesById = useMemo(() => {
        const map = new Map<string, Course>();
        for (const c of courses) map.set(c._id, c);
        return map;
    }, [courses]);

    const rows: Row[] = useMemo(
        () =>
            students.map((student) => ({
                student,
                enrollments: enrollmentsOf(student, coursesById),
            })),
        [students, coursesById],
    );

    const filteredRows = useMemo(() => {
        const q = search.toLowerCase().trim();

        const filtered = rows.filter(({ student, enrollments }) => {
            if (
                courseFilter &&
                !enrollments.some((e) => e.courseId === courseFilter._id)
            ) {
                return false;
            }
            if (!q) return true;

            if (studentFullName(student).toLowerCase().includes(q)) return true;
            if ((student.contact?.email?.toLowerCase() ?? "").includes(q))
                return true;
            return enrollments.some(
                (e) =>
                    e.admissionNumber.toLowerCase().includes(q) ||
                    e.courseLabel.toLowerCase().includes(q),
            );
        });

        // With a course filter, sort by the admission number for that course.
        const admOf = (r: Row) =>
            (courseFilter
                ? r.enrollments.find((e) => e.courseId === courseFilter._id)
                : r.enrollments[0]
            )?.admissionNumber ?? "";

        const [field, dir] = sort.split("-") as ["name" | "adm", "asc" | "desc"];
        filtered.sort((a, b) => {
            const cmp =
                field === "name"
                    ? studentFullName(a.student).localeCompare(
                          studentFullName(b.student),
                          undefined,
                          { sensitivity: "base" },
                      )
                    : admOf(a).localeCompare(admOf(b), undefined, {
                          numeric: true,
                          sensitivity: "base",
                      });
            return dir === "asc" ? cmp : -cmp;
        });

        return filtered;
    }, [rows, search, courseFilter, sort]);

    // Reset paging and collapse rows whenever the list changes shape.
    useEffect(() => {
        setVisibleCount(PAGE_SIZE);
        setExpandedId(null);
    }, [search, courseFilter, sort]);

    const visibleRows = filteredRows.slice(0, visibleCount);
    const hasFilters = Boolean(search) || courseFilter !== null;

    const clearFilters = () => {
        setSearch("");
        setCourseFilter(null);
    };

    /* ------------------------------- Render ---------------------------- */

    return (
        <main className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
            <div className="mx-auto max-w-full space-y-5 py-6 sm:px-6 lg:py-8">
                <Link
                    href="/results"
                    className="inline-flex items-center gap-2 text-sm font-medium text-zinc-600 transition-colors hover:text-blue-950 dark:text-zinc-400 dark:hover:text-orange-400"
                >
                    <ArrowLeft size={16} />
                    All results
                </Link>

                <header className="border-l-4 border-orange-400 pl-4">
                    <h1 className="text-2xl font-semibold text-zinc-900 dark:text-white">
                        Record results
                    </h1>
                    <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
                        Choose a student to open their mark sheet.
                    </p>
                </header>

                {loadError && (
                    <div
                        role="alert"
                        className="flex items-center gap-3 rounded-sm border border-red-200 bg-red-50 px-4 py-3 text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300"
                    >
                        <AlertCircle className="h-5 w-5 shrink-0" />
                        <p className="text-sm">{loadError}</p>
                    </div>
                )}

                {/* Toolbar */}
                <section className="grid gap-3 rounded-sm border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900 md:grid-cols-[minmax(0,1fr)_14rem_11rem]">
                    <div>
                        <label className={labelCls} htmlFor="student-search">
                            Search
                        </label>
                        <div className="relative">
                            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                            <input
                                id="student-search"
                                type="text"
                                value={search}
                                disabled={loading}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Name, email or admission no."
                                className="h-10 w-full rounded-sm border border-zinc-300 bg-white pl-9 pr-9 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-400/30 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                            />
                            {search && (
                                <button
                                    type="button"
                                    onClick={() => setSearch("")}
                                    aria-label="Clear search"
                                    className="absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-sm text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                                >
                                    <X size={14} />
                                </button>
                            )}
                        </div>
                    </div>

                    <div>
                        <span className={labelCls}>Course</span>
                        <SelectCourse
                            value={courseFilter?._id ?? ""}
                            disabled={loading}
                            onChange={(_, course) =>
                                setCourseFilter(course ?? null)
                            }
                            placeholder="All courses"
                        />
                    </div>

                    <div>
                        <label className={labelCls} htmlFor="student-sort">
                            Sort by
                        </label>
                        <select
                            id="student-sort"
                            value={sort}
                            disabled={loading}
                            onChange={(e) => setSort(e.target.value as SortValue)}
                            className="h-10 w-full rounded-sm border border-zinc-300 bg-white px-3 text-sm text-zinc-900 focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-400/30 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                        >
                            {SORT_OPTIONS.map((o) => (
                                <option key={o.value} value={o.value}>
                                    {o.label}
                                </option>
                            ))}
                        </select>
                    </div>
                </section>

                {/* List */}
                <section className="overflow-hidden rounded-sm border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
                    <div className="flex items-center justify-between gap-3 border-b border-zinc-200 px-4 py-2.5 text-xs text-zinc-500 dark:border-zinc-800 dark:text-zinc-400 sm:px-5">
                        <span>
                            {loading
                                ? "Loading…"
                                : hasFilters
                                  ? `${filteredRows.length} of ${students.length} students`
                                  : `${students.length} student${
                                        students.length === 1 ? "" : "s"
                                    }`}
                        </span>
                        {hasFilters && (
                            <button
                                type="button"
                                onClick={clearFilters}
                                className="inline-flex items-center gap-1 font-medium text-blue-950 hover:underline dark:text-orange-400"
                            >
                                <X size={12} />
                                Clear filters
                            </button>
                        )}
                    </div>

                    {loading ? (
                        <div className="flex items-center justify-center gap-2 px-5 py-14 text-sm text-zinc-500 dark:text-zinc-400">
                            <Loader2 className="h-4 w-4 animate-spin text-orange-400" />
                            Loading students…
                        </div>
                    ) : filteredRows.length === 0 ? (
                        <div className="flex flex-col items-center gap-2 px-6 py-14 text-center">
                            <Users className="h-8 w-8 text-zinc-300 dark:text-zinc-600" />
                            <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">
                                {hasFilters
                                    ? "No students match"
                                    : "No students yet"}
                            </p>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400">
                                {hasFilters
                                    ? "Try a different search or course."
                                    : "Register a student to get started."}
                            </p>
                        </div>
                    ) : (
                        <>
                            <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
                                {visibleRows.map((row) => (
                                    <StudentRow
                                        key={row.student._id}
                                        row={row}
                                        courseFilter={courseFilter}
                                        expanded={expandedId === row.student._id}
                                        onToggle={() =>
                                            setExpandedId((id) =>
                                                id === row.student._id
                                                    ? null
                                                    : row.student._id,
                                            )
                                        }
                                    />
                                ))}
                            </ul>

                            {filteredRows.length > visibleRows.length && (
                                <div className="border-t border-zinc-100 p-3 text-center dark:border-zinc-800">
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setVisibleCount((c) => c + PAGE_SIZE)
                                        }
                                        className="rounded-sm border border-zinc-300 bg-white px-4 py-2 text-xs font-medium text-zinc-800 hover:bg-zinc-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
                                    >
                                        Show{" "}
                                        {Math.min(
                                            PAGE_SIZE,
                                            filteredRows.length -
                                                visibleRows.length,
                                        )}{" "}
                                        more
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </section>
            </div>
        </main>
    );
}