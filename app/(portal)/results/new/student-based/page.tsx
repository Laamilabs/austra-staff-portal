"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
    AlertCircle,
    ArrowDown,
    ArrowLeft,
    ArrowRight,
    ArrowUp,
    Check,
    ChevronDown,
    ClipboardList,
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

type SortField = "name" | "admissionNumber";
type SortDirection = "asc" | "desc";

interface Row {
    student: Student;
    enrollments: Enrollment[];
}

const PAGE_SIZE = 30;

const labelCls =
    "mb-1.5 block text-xs font-semibold uppercase tracking-wide text-zinc-700 dark:text-zinc-300";

const btnSecondaryCls =
    "inline-flex items-center justify-center gap-1.5 rounded-sm border border-zinc-300 bg-white px-3.5 py-2 text-xs font-semibold text-zinc-800 transition-colors hover:border-blue-950 hover:bg-zinc-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:border-orange-400 dark:hover:bg-zinc-800";

/* -------------------------------------------------------------------------- */
/* Step tracker                                                               */
/* -------------------------------------------------------------------------- */

const STEPS = ["Find a student", "Choose a course", "Enter marks"];

function StepTracker({ current }: { current: 1 | 2 | 3 }) {
    return (
        <ol className="grid grid-cols-3 border-t border-white/10 bg-black/10">
            {STEPS.map((label, i) => {
                const n = i + 1;
                const done = n < current;
                const active = n === current;
                return (
                    <li
                        key={label}
                        aria-current={active ? "step" : undefined}
                        className="flex items-center gap-2.5 px-4 py-3 sm:px-6"
                    >
                        <span
                            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-sm border text-xs font-semibold transition-colors ${active
                                ? "border-orange-400 bg-orange-400 text-blue-950"
                                : done
                                    ? "border-orange-400 bg-orange-400/20 text-orange-400"
                                    : "border-white/25 text-white/60"
                                }`}
                        >
                            {done ? <Check size={14} strokeWidth={3} /> : n}
                        </span>
                        <span
                            className={`truncate text-xs sm:text-sm ${active
                                ? "font-semibold text-white"
                                : done
                                    ? "text-blue-100"
                                    : "text-white/50"
                                }`}
                        >
                            {label}
                        </span>
                    </li>
                );
            })}
        </ol>
    );
}

/* -------------------------------------------------------------------------- */
/* Student row                                                                */
/* -------------------------------------------------------------------------- */

function StudentRow({
    row,
    selected,
    courseFilter,
    effectiveCourseId,
    onSelect,
    onChooseCourse,
}: {
    row: Row;
    selected: boolean;
    courseFilter: Course | null;
    effectiveCourseId: string | null;
    onSelect: () => void;
    onChooseCourse: (courseId: string) => void;
}) {
    const { student, enrollments } = row;
    const noEnrollments = enrollments.length === 0;
    const filterMatch = courseFilter
        ? enrollments.find((e) => e.courseId === courseFilter._id)
        : null;

    return (
        <li
            className={`border-l-4 transition-colors ${selected
                ? "border-l-orange-400 bg-blue-950/5 dark:bg-blue-950/30"
                : "border-l-transparent hover:bg-zinc-50 dark:hover:bg-zinc-800/40"
                }`}
        >
            <button
                type="button"
                onClick={onSelect}
                disabled={noEnrollments}
                aria-expanded={selected}
                className="flex w-full items-center gap-4 px-4 py-4 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-orange-400 disabled:cursor-not-allowed sm:px-5"
            >
                {/* Avatar */}
                <span
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-sm text-sm font-bold transition-colors ${selected
                        ? "bg-orange-400 text-blue-950"
                        : "bg-blue-950 text-orange-400"
                        } ${noEnrollments ? "opacity-50" : ""}`}
                >
                    {initialsOf(student)}
                </span>

                {/* Identity */}
                <span className="min-w-0 flex-1">
                    <span
                        className={`block truncate text-sm font-semibold ${noEnrollments
                            ? "text-zinc-500 dark:text-zinc-500"
                            : "text-blue-950 dark:text-white"
                            }`}
                    >
                        {studentFullName(student)}
                    </span>
                    <span className="block truncate text-xs text-zinc-600 dark:text-zinc-400">
                        {student.contact?.email || "No email"}
                    </span>
                </span>

                {/* Meta */}
                <span className="flex shrink-0 items-center gap-3">
                    {noEnrollments ? (
                        <span className="rounded-sm border border-dashed border-zinc-300 px-2 py-1 text-xs font-medium text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
                            No enrollments
                        </span>
                    ) : filterMatch ? (
                        <span className="hidden flex-col items-end sm:flex">
                            <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                                ADM No.
                            </span>
                            <span className="font-mono text-sm font-semibold text-blue-950 dark:text-orange-400">
                                {filterMatch.admissionNumber || "—"}
                            </span>
                        </span>
                    ) : (
                        <span className="rounded-sm border border-blue-950/20 bg-blue-950/5 px-2.5 py-1 text-xs font-semibold text-blue-950 dark:border-orange-400/30 dark:bg-orange-400/10 dark:text-orange-400">
                            {enrollments.length}{" "}
                            {enrollments.length === 1 ? "course" : "courses"}
                        </span>
                    )}

                    {!noEnrollments && (
                        <ChevronDown
                            size={18}
                            className={`text-zinc-500 transition-transform dark:text-zinc-400 ${selected ? "rotate-180 text-orange-500" : ""
                                }`}
                        />
                    )}
                </span>
            </button>

            {/* Course choice */}
            {selected && !noEnrollments && (
                <div className="border-t border-zinc-200 bg-zinc-50 px-4 py-5 dark:border-zinc-800 dark:bg-zinc-950 sm:px-5 sm:pl-21">
                    <fieldset>
                        <legend className={labelCls}>
                            {enrollments.length === 1
                                ? "Enrolled course"
                                : "Which course are you recording marks for?"}
                        </legend>

                        <div className="grid gap-3 sm:grid-cols-2">
                            {enrollments.map((e) => {
                                const checked = effectiveCourseId === e.courseId;
                                return (
                                    <label
                                        key={e.courseId}
                                        className="relative block cursor-pointer"
                                    >
                                        <input
                                            type="radio"
                                            name={`course-${student._id}`}
                                            checked={checked}
                                            onChange={() =>
                                                onChooseCourse(e.courseId)
                                            }
                                            className="peer sr-only"
                                        />
                                        <span
                                            className={`flex items-start gap-3 rounded-sm border p-3.5 transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-orange-400 ${checked
                                                ? "border-orange-400 bg-white ring-2 ring-orange-400/40 dark:bg-blue-950/60"
                                                : "border-zinc-300 bg-white hover:border-blue-950 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:border-orange-400"
                                                }`}
                                        >
                                            <span
                                                className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${checked
                                                    ? "border-orange-400 bg-orange-400 text-blue-950"
                                                    : "border-zinc-400 dark:border-zinc-600"
                                                    }`}
                                                aria-hidden="true"
                                            >
                                                {checked && (
                                                    <Check
                                                        size={12}
                                                        strokeWidth={3.5}
                                                    />
                                                )}
                                            </span>

                                            <span className="min-w-0 flex-1 space-y-1.5">
                                                {e.courseCode && (
                                                    <span className="inline-flex rounded-sm bg-blue-950 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-orange-400">
                                                        {e.courseCode}
                                                    </span>
                                                )}
                                                <span className="block text-sm font-semibold leading-snug text-blue-950 dark:text-white">
                                                    {e.courseName}
                                                </span>
                                                <span className="block text-xs text-zinc-600 dark:text-zinc-400">
                                                    ADM No.{" "}
                                                    <span className="font-mono font-semibold text-zinc-900 dark:text-zinc-100">
                                                        {e.admissionNumber || "—"}
                                                    </span>
                                                </span>
                                            </span>
                                        </span>
                                    </label>
                                );
                            })}
                        </div>
                    </fieldset>
                </div>
            )}
        </li>
    );
}

/* -------------------------------------------------------------------------- */
/* Page                                                                       */
/* -------------------------------------------------------------------------- */

export default function StudentBasedResultsPage() {
    const router = useRouter();

    const [courses, setCourses] = useState<Course[]>([]);
    const [students, setStudents] = useState<Student[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);

    const [search, setSearch] = useState("");
    const [courseFilter, setCourseFilter] = useState<Course | null>(null);
    const [sortField, setSortField] = useState<SortField>("name");
    const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

    const [selectedStudentId, setSelectedStudentId] = useState<string | null>(
        null,
    );
    const [chosenCourseId, setChosenCourseId] = useState<string | null>(null);
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
            if (courseFilter) {
                const enrolled = enrollments.some(
                    (e) => e.courseId === courseFilter._id,
                );
                if (!enrolled) return false;
            }

            if (!q) return true;

            if (studentFullName(student).toLowerCase().includes(q)) return true;
            if ((student.contact?.email?.toLowerCase() ?? "").includes(q))
                return true;

            for (const e of enrollments) {
                if (e.admissionNumber.toLowerCase().includes(q)) return true;
            }
            for (const e of enrollments) {
                if (e.courseLabel.toLowerCase().includes(q)) return true;
            }

            return false;
        });

        filtered.sort((a, b) => {
            let cmp = 0;
            if (sortField === "name") {
                cmp = studentFullName(a.student).localeCompare(
                    studentFullName(b.student),
                    undefined,
                    { sensitivity: "base" },
                );
            } else {
                const aAdm = a.enrollments[0]?.admissionNumber ?? "";
                const bAdm = b.enrollments[0]?.admissionNumber ?? "";
                cmp = aAdm.localeCompare(bAdm, undefined, {
                    numeric: true,
                    sensitivity: "base",
                });
            }
            return sortDirection === "asc" ? cmp : -cmp;
        });

        return filtered;
    }, [rows, search, courseFilter, sortField, sortDirection]);

    // Reset the "show more" window whenever the list changes shape.
    useEffect(() => {
        setVisibleCount(PAGE_SIZE);
    }, [search, courseFilter, sortField, sortDirection]);

    const visibleRows = filteredRows.slice(0, visibleCount);
    const hasFilters = Boolean(search) || courseFilter !== null;

    /* ------------------------------ Selection -------------------------- */

    // A selected student that's filtered out of view is treated as unselected.
    const selectedRow = useMemo(
        () =>
            filteredRows.find((r) => r.student._id === selectedStudentId) ??
            null,
        [filteredRows, selectedStudentId],
    );

    // Resolve which course is "chosen": explicit pick → active course
    // filter → the student's only enrollment.
    const effectiveCourseId = useMemo(() => {
        if (!selectedRow) return null;
        const ids = selectedRow.enrollments.map((e) => e.courseId);
        if (chosenCourseId && ids.includes(chosenCourseId)) return chosenCourseId;
        if (courseFilter && ids.includes(courseFilter._id))
            return courseFilter._id;
        if (ids.length === 1) return ids[0];
        return null;
    }, [selectedRow, chosenCourseId, courseFilter]);

    const selectedEnrollment =
        selectedRow?.enrollments.find((e) => e.courseId === effectiveCourseId) ??
        null;

    const currentStep: 1 | 2 | 3 = !selectedRow ? 1 : !selectedEnrollment ? 2 : 3;

    /* ------------------------------ Actions ---------------------------- */

    const selectStudent = (studentId: string) => {
        if (selectedStudentId === studentId) {
            setSelectedStudentId(null);
            setChosenCourseId(null);
            return;
        }
        setSelectedStudentId(studentId);
        setChosenCourseId(null);
    };

    const clearSelection = () => {
        setSelectedStudentId(null);
        setChosenCourseId(null);
    };

    const openSheet = () => {
        if (!selectedRow || !selectedEnrollment) return;
        router.push(
            `/results/new/student-based/units-sheet?studentId=${encodeURIComponent(
                selectedRow.student._id,
            )}&courseId=${encodeURIComponent(selectedEnrollment.courseId)}`,
        );
    };

    const toggleSort = (field: SortField) => {
        if (sortField === field) {
            setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
        } else {
            setSortField(field);
            setSortDirection("asc");
        }
    };

    const clearFilters = () => {
        setSearch("");
        setCourseFilter(null);
    };

    /* ------------------------------- Render ---------------------------- */

    return (
        <main className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
            <div className="mx-auto max-w-full space-y-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
                {/* BACK */}
                <Link
                    href="/results"
                    className="inline-flex items-center gap-2 text-sm font-semibold text-zinc-600 transition-colors hover:text-blue-950 dark:text-zinc-400 dark:hover:text-orange-400"
                >
                    <ArrowLeft size={16} />
                    Back to Results
                </Link>

                {/* HEADER + STEP TRACKER */}
                <header className="overflow-hidden rounded-sm border-b-4 border-orange-400 bg-blue-950 text-white">
                    <div className="flex flex-col gap-4 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-4">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-sm bg-orange-400 text-blue-950">
                                <ClipboardList size={22} />
                            </div>
                            <div>
                                <h1 className="text-xl font-semibold leading-tight sm:text-2xl">
                                    Record Results by Student
                                </h1>
                                <p className="text-sm text-blue-200">
                                    Pick a student, confirm the course, then
                                    enter their marks.
                                </p>
                            </div>
                        </div>

                        <span className="inline-flex shrink-0 items-center gap-2 self-start rounded-sm border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold sm:self-auto">
                            <Users size={14} />
                            {loading
                                ? "Loading…"
                                : hasFilters
                                    ? `${filteredRows.length} of ${students.length} students`
                                    : `${students.length} student${students.length === 1 ? "" : "s"
                                    }`}
                        </span>
                    </div>

                    <StepTracker current={currentStep} />
                </header>

                {/* LOAD ERROR */}
                {loadError && (
                    <div
                        role="alert"
                        className="flex items-center gap-3 rounded-sm border-l-4 border-red-500 bg-red-50 px-4 py-3 text-red-700 dark:border-red-600 dark:bg-red-950/30 dark:text-red-300"
                    >
                        <AlertCircle className="h-5 w-5 shrink-0" />
                        <p className="text-sm">{loadError}</p>
                    </div>
                )}

                {/* FIND A STUDENT */}
                <section className="rounded-sm border border-zinc-200 border-t-4 border-t-orange-400 bg-white p-4 shadow-sm dark:border-zinc-800 dark:border-t-orange-400 dark:bg-zinc-900 sm:p-5">
                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
                        {/* Search */}
                        <div className="lg:col-span-5">
                            <label className={labelCls} htmlFor="student-search">
                                Search students
                            </label>
                            <div className="relative">
                                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400 dark:text-zinc-500" />
                                <input
                                    id="student-search"
                                    type="text"
                                    value={search}
                                    disabled={loading}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder="Name, email, admission no. or course…"
                                    className="h-10 w-full rounded-sm border border-zinc-300 bg-white pl-9 pr-10 text-sm text-zinc-900 placeholder:text-zinc-400 transition-colors focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-400/30 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:placeholder:text-zinc-500"
                                />
                                {search && (
                                    <button
                                        type="button"
                                        onClick={() => setSearch("")}
                                        aria-label="Clear search"
                                        className="absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-sm text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-white"
                                    >
                                        <X size={14} />
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Course filter */}
                        <div className="lg:col-span-4">
                            <span className={labelCls}>
                                Filter by course{" "}
                                <span className="font-normal normal-case text-zinc-500 dark:text-zinc-400">
                                    (optional)
                                </span>
                            </span>
                            <SelectCourse
                                value={courseFilter?._id ?? ""}
                                disabled={loading}
                                onChange={(_, course) =>
                                    setCourseFilter(course ?? null)
                                }
                                placeholder="All courses"
                            />
                        </div>

                        {/* Sort */}
                        <div className="lg:col-span-3">
                            <span className={labelCls}>Sort by</span>
                            <div
                                role="group"
                                aria-label="Sort students"
                                className="inline-flex h-10 w-full divide-x divide-zinc-300 overflow-hidden rounded-sm border border-zinc-300 dark:divide-zinc-700 dark:border-zinc-700"
                            >
                                {(
                                    [
                                        ["name", "Name"],
                                        ["admissionNumber", "Adm. No."],
                                    ] as [SortField, string][]
                                ).map(([field, label]) => {
                                    const active = sortField === field;
                                    return (
                                        <button
                                            key={field}
                                            type="button"
                                            disabled={loading}
                                            aria-pressed={active}
                                            onClick={() => toggleSort(field)}
                                            className={`inline-flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap px-3 text-xs font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-orange-400 disabled:opacity-50 ${active
                                                ? "bg-blue-950 text-white dark:bg-orange-400 dark:text-blue-950"
                                                : "bg-white text-zinc-700 hover:bg-zinc-100 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
                                                }`}
                                        >
                                            {label}
                                            {active &&
                                                (sortDirection === "asc" ? (
                                                    <ArrowUp size={13} />
                                                ) : (
                                                    <ArrowDown size={13} />
                                                ))}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {courseFilter && (
                        <p className="mt-4 rounded-sm border-l-4 border-blue-950 bg-zinc-50 px-3 py-2 text-xs text-zinc-700 dark:border-orange-400 dark:bg-zinc-950 dark:text-zinc-300">
                            Showing students enrolled in{" "}
                            <strong className="text-blue-950 dark:text-orange-400">
                                {courseFilter.courseCode} — {courseFilter.name}
                            </strong>
                            . Selecting one will use this course automatically.
                        </p>
                    )}
                </section>

                {/* STUDENT LIST */}
                <section className="overflow-hidden rounded-sm border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                    <div className="flex items-center justify-between gap-3 border-b border-zinc-200 bg-zinc-50 px-5 py-3 dark:border-zinc-800 dark:bg-zinc-950">
                        <h2 className="text-xs font-semibold uppercase tracking-[0.15em] text-blue-950 dark:text-orange-400">
                            {currentStep === 1
                                ? "Select a student"
                                : "Selected student"}
                        </h2>

                        {hasFilters && (
                            <button
                                type="button"
                                onClick={clearFilters}
                                className="inline-flex items-center gap-1 text-xs font-semibold text-blue-950 underline-offset-2 hover:underline dark:text-orange-400"
                            >
                                <X size={12} />
                                Clear filters
                            </button>
                        )}
                    </div>

                    {loading ? (
                        <div className="flex items-center justify-center gap-2 px-5 py-14 text-sm text-zinc-600 dark:text-zinc-400">
                            <Loader2 className="h-4 w-4 animate-spin text-orange-400" />
                            Loading students…
                        </div>
                    ) : filteredRows.length === 0 ? (
                        <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
                            <div className="flex h-12 w-12 items-center justify-center rounded-sm bg-blue-950 text-orange-400">
                                <Users className="h-5 w-5" />
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                                    {hasFilters
                                        ? "No students match your filters"
                                        : "No students registered yet"}
                                </p>
                                <p className="mt-0.5 text-xs text-zinc-600 dark:text-zinc-400">
                                    {hasFilters
                                        ? "Try adjusting your search or course filter."
                                        : "Register a student to get started."}
                                </p>
                            </div>
                            {hasFilters && (
                                <button
                                    type="button"
                                    onClick={clearFilters}
                                    className={btnSecondaryCls}
                                >
                                    <X className="h-3.5 w-3.5" />
                                    Clear filters
                                </button>
                            )}
                        </div>
                    ) : (
                        <>
                            <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
                                {visibleRows.map((row) => {
                                    const selected =
                                        selectedRow?.student._id ===
                                        row.student._id;
                                    return (
                                        <StudentRow
                                            key={row.student._id}
                                            row={row}
                                            selected={selected}
                                            courseFilter={courseFilter}
                                            effectiveCourseId={
                                                selected
                                                    ? effectiveCourseId
                                                    : null
                                            }
                                            onSelect={() =>
                                                selectStudent(row.student._id)
                                            }
                                            onChooseCourse={setChosenCourseId}
                                        />
                                    );
                                })}
                            </ul>

                            {filteredRows.length > visibleRows.length && (
                                <div className="flex justify-center border-t border-zinc-200 px-5 py-4 dark:border-zinc-800">
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setVisibleCount((c) => c + PAGE_SIZE)
                                        }
                                        className={btnSecondaryCls}
                                    >
                                        Show more (
                                        {filteredRows.length - visibleRows.length}{" "}
                                        remaining)
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </section>

                {/* STICKY ACTION BAR */}
                {selectedRow && (
                    <div
                        role="region"
                        aria-label="Current selection"
                        className="sticky bottom-0 z-20 flex flex-col gap-3 rounded-sm border-t-4 border-orange-400 bg-blue-950 p-4 text-white shadow-lg shadow-blue-950/30 sm:flex-row sm:items-center sm:justify-between"
                    >
                        <div className="min-w-0">
                            <p className="text-[11px] font-semibold uppercase tracking-wider text-orange-400">
                                Recording marks for
                            </p>
                            <p className="truncate text-sm font-semibold">
                                {studentFullName(selectedRow.student)}
                            </p>
                            {selectedEnrollment ? (
                                <p className="truncate text-xs text-blue-200">
                                    {selectedEnrollment.courseLabel}
                                    {selectedEnrollment.admissionNumber && (
                                        <>
                                            {" "}
                                            ·{" "}
                                            <span className="font-mono">
                                                {selectedEnrollment.admissionNumber}
                                            </span>
                                        </>
                                    )}
                                </p>
                            ) : (
                                <p className="text-xs font-medium text-orange-300">
                                    Choose a course above to continue
                                </p>
                            )}
                        </div>

                        <div className="flex shrink-0 items-center gap-2">
                            <button
                                type="button"
                                onClick={clearSelection}
                                className="inline-flex items-center justify-center gap-1.5 rounded-sm border border-white/30 px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
                            >
                                <X size={13} />
                                Clear
                            </button>

                            <button
                                type="button"
                                onClick={openSheet}
                                disabled={!selectedEnrollment}
                                className="inline-flex flex-1 items-center justify-center gap-2 rounded-sm bg-orange-400 px-4 py-2 text-sm font-semibold text-blue-950 transition-colors hover:bg-orange-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-blue-950 disabled:cursor-not-allowed disabled:opacity-40 sm:flex-none"
                            >
                                Enter marks
                                <ArrowRight size={16} />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </main>
    );
}