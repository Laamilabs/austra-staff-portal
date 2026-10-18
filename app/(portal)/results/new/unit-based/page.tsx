"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
    AlertCircle,
    ArrowLeft,
    ArrowRight,
    ArrowDownUp,
    BookOpen,
    CalendarDays,
    Check,
    ClipboardList,
    GraduationCap,
    Loader2,
    Search,
    Users,
    X,
} from "lucide-react";

import SelectCourse from "@/app/(portal)/courses/selectCourse";
import { Course, courseApi } from "@/app/types/courses";
import { Student, studentApi } from "@/app/types/students";
import { Unit, unitApi } from "@/app/types/units";

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

interface StudentRow {
    student: Student;
    admissionNumber: string;
    dateOfAdmission: string;
}

type SortOption =
    | "name-asc"
    | "name-desc"
    | "date-asc"
    | "date-desc";

const SORT_LABELS: Record<SortOption, string> = {
    "name-asc": "Name (A → Z)",
    "name-desc": "Name (Z → A)",
    "date-asc": "Admission date (oldest first)",
    "date-desc": "Admission date (newest first)",
};

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function extractId(ref: unknown): string | null {
    if (!ref) return null;
    if (typeof ref === "string") return ref;
    if (
        typeof ref === "object" &&
        "_id" in (ref as Record<string, unknown>)
    ) {
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

/** Year bucket for a date-of-admission value. Falls back to "Unknown". */
function admissionYear(dateStr?: string): string {
    if (!dateStr) return "Unknown";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "Unknown";
    return String(d.getFullYear());
}

/** Normalize any date-ish string to `yyyy-MM-dd` (or "" when invalid). */
function toDateOnly(dateStr?: string): string {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "";
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
}

/** Human-readable date, or an em dash when absent / invalid. */
function formatDate(dateStr?: string): string {
    if (!dateStr) return "—";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "—";
    return d.toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
    });
}

/** Newest year first; "Unknown" always sorts last. */
function compareYearBucketsDesc(a: string, b: string): number {
    if (a === "Unknown") return 1;
    if (b === "Unknown") return -1;
    return b.localeCompare(a, undefined, { numeric: true });
}

/** Oldest year first; "Unknown" always sorts last. */
function compareYearBucketsAsc(a: string, b: string): number {
    if (a === "Unknown") return 1;
    if (b === "Unknown") return -1;
    return a.localeCompare(b, undefined, { numeric: true });
}

/* -------------------------------------------------------------------------- */
/* Page                                                                       */
/* -------------------------------------------------------------------------- */

export default function UnitBasedResultsPage() {
    const [courses, setCourses] = useState<Course[]>([]);
    const [units, setUnits] = useState<Unit[]>([]);
    const [students, setStudents] = useState<Student[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);

    const [selectedCourseId, setSelectedCourseId] = useState("");
    const [selectedUnitId, setSelectedUnitId] = useState("");
    const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(
        new Set(),
    );
    const [studentSearch, setStudentSearch] = useState("");
    const [selectedYear, setSelectedYear] = useState("");
    const [admissionFrom, setAdmissionFrom] = useState("");
    const [admissionTo, setAdmissionTo] = useState("");
    const [sortBy, setSortBy] = useState<SortOption>("name-asc");

    /* ------------------------------ Fetch ------------------------------ */

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                setLoading(true);
                setLoadError(null);
                const [coursesRes, unitsRes, studentsRes] = await Promise.all([
                    courseApi.getAll(),
                    unitApi.getAll(),
                    studentApi.getAll(),
                ]);
                if (cancelled) return;
                setCourses(coursesRes.data ?? []);
                setUnits(unitsRes.data ?? []);
                setStudents(studentsRes.data ?? []);
            } catch (err: any) {
                if (cancelled) return;
                setLoadError(
                    err?.response?.data?.message ??
                    err?.message ??
                    "Failed to load courses, units, and students.",
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

    const unitsForCourse: Unit[] = useMemo(() => {
        if (!selectedCourseId) return [];
        return units
            .filter((u) => extractId(u.courseId) === selectedCourseId)
            .sort((a, b) =>
                a.code.localeCompare(b.code, undefined, {
                    numeric: true,
                    sensitivity: "base",
                }),
            );
    }, [units, selectedCourseId]);

    const studentsInCourse: StudentRow[] = useMemo(() => {
        if (!selectedCourseId) return [];

        const rows: StudentRow[] = [];
        for (const s of students) {
            const enrollment = s.courses.find(
                (c) => extractId(c.courseId) === selectedCourseId,
            );
            if (enrollment) {
                rows.push({
                    student: s,
                    admissionNumber: enrollment.admissionNumber ?? "",
                    dateOfAdmission: enrollment.dateOfAdmission ?? "",
                });
            }
        }
        return rows;
    }, [students, selectedCourseId]);

    /** Distinct admission years present in the current course. */
    const admissionYears: string[] = useMemo(() => {
        const set = new Set<string>();
        for (const r of studentsInCourse) {
            set.add(admissionYear(r.dateOfAdmission));
        }
        return Array.from(set).sort(compareYearBucketsDesc);
    }, [studentsInCourse]);

    const hasActiveFilters =
        !!selectedYear || !!admissionFrom || !!admissionTo || !!studentSearch;

    const filteredStudents: StudentRow[] = useMemo(() => {
        const q = studentSearch.toLowerCase().trim();
        return studentsInCourse.filter(
            ({ student, admissionNumber, dateOfAdmission }) => {
                if (
                    selectedYear &&
                    admissionYear(dateOfAdmission) !== selectedYear
                ) {
                    return false;
                }

                if (admissionFrom || admissionTo) {
                    const d = toDateOnly(dateOfAdmission);
                    if (!d) return false;
                    if (admissionFrom && d < admissionFrom) return false;
                    if (admissionTo && d > admissionTo) return false;
                }

                if (!q) return true;
                const name = studentFullName(student).toLowerCase();
                return (
                    name.includes(q) ||
                    admissionNumber.toLowerCase().includes(q)
                );
            },
        );
    }, [
        studentsInCourse,
        studentSearch,
        selectedYear,
        admissionFrom,
        admissionTo,
    ]);

    /**
     * Rows grouped by admission year.
     *
     * - Year buckets: ascending when sorting by oldest-first date,
     *   descending (newest first) otherwise.
     * - Rows within a bucket follow the selected sort.
     */
    const groupedStudents: { year: string; rows: StudentRow[] }[] =
        useMemo(() => {
            const map = new Map<string, StudentRow[]>();
            for (const row of filteredStudents) {
                const year = admissionYear(row.dateOfAdmission);
                const bucket = map.get(year);
                if (bucket) bucket.push(row);
                else map.set(year, [row]);
            }

            const sortRows = (rows: StudentRow[]) => {
                rows.sort((a, b) => {
                    switch (sortBy) {
                        case "name-asc":
                        case "name-desc": {
                            const cmp = studentFullName(a.student).localeCompare(
                                studentFullName(b.student),
                                undefined,
                                { sensitivity: "base" },
                            );
                            return sortBy === "name-asc" ? cmp : -cmp;
                        }
                        case "date-asc":
                        case "date-desc": {
                            const da = toDateOnly(a.dateOfAdmission);
                            const db = toDateOnly(b.dateOfAdmission);
                            // Rows with missing dates always sink to the bottom
                            if (!da && !db) return 0;
                            if (!da) return 1;
                            if (!db) return -1;
                            const cmp = da.localeCompare(db);
                            return sortBy === "date-asc" ? cmp : -cmp;
                        }
                    }
                });
            };

            const yearKeys = Array.from(map.keys());
            const yearComparator =
                sortBy === "date-asc"
                    ? compareYearBucketsAsc
                    : compareYearBucketsDesc;

            return yearKeys.sort(yearComparator).map((year) => {
                const rows = map.get(year)!;
                sortRows(rows);
                return { year, rows };
            });
        }, [filteredStudents, sortBy]);

    const selectedRows: StudentRow[] = useMemo(
        () =>
            studentsInCourse.filter((r) =>
                selectedStudentIds.has(r.student._id),
            ),
        [studentsInCourse, selectedStudentIds],
    );

    const selectedCourse = useMemo(
        () => courses.find((c) => c._id === selectedCourseId) ?? null,
        [courses, selectedCourseId],
    );

    const selectedUnit = useMemo(
        () => unitsForCourse.find((u) => u._id === selectedUnitId) ?? null,
        [unitsForCourse, selectedUnitId],
    );

    /* --------------------------- Selection ----------------------------- */

    const allVisibleSelected =
        filteredStudents.length > 0 &&
        filteredStudents.every((r) => selectedStudentIds.has(r.student._id));

    const toggleStudent = (id: string) => {
        setSelectedStudentIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const toggleSelectAllVisible = () => {
        setSelectedStudentIds((prev) => {
            const next = new Set(prev);
            if (allVisibleSelected) {
                for (const r of filteredStudents) next.delete(r.student._id);
            } else {
                for (const r of filteredStudents) next.add(r.student._id);
            }
            return next;
        });
    };

    const clearSelection = () => setSelectedStudentIds(new Set());

    const clearFilters = () => {
        setStudentSearch("");
        setSelectedYear("");
        setAdmissionFrom("");
        setAdmissionTo("");
    };

    /* ------------------------- Change handlers ------------------------- */

    const handleCourseChange = (courseId: string) => {
        setSelectedCourseId(courseId);
        setSelectedUnitId("");
        setSelectedStudentIds(new Set());
        setStudentSearch("");
        setSelectedYear("");
        setAdmissionFrom("");
        setAdmissionTo("");
    };

    const handleUnitChange = (unitId: string) => {
        setSelectedUnitId(unitId);
        setSelectedStudentIds(new Set());
        setStudentSearch("");
        setSelectedYear("");
        setAdmissionFrom("");
        setAdmissionTo("");
    };

    /* ------------------------------- Render ---------------------------- */

    return (
        <main className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
            <div className="mx-auto max-w-full space-y-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
                {/* BACK */}
                <Link
                    href="/results"
                    className="inline-flex items-center gap-2 text-sm font-semibold text-zinc-500 transition-colors hover:text-[#082B66] dark:text-zinc-400 dark:hover:text-orange-400"
                >
                    <ArrowLeft size={16} />
                    Back to Results
                </Link>

                {/* HEADER */}
                <header>
                    <h1 className="flex items-center gap-2 text-2xl font-bold text-zinc-900 dark:text-white">
                        <ClipboardList className="h-7 w-7 text-[#082B66] dark:text-orange-400" />
                        Record Results by Unit
                    </h1>
                    <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                        Pick a course, then a unit, then the students you want to grade.
                        Existing results load automatically for editing.
                    </p>
                </header>

                {/* LOAD ERROR */}
                {loadError && (
                    <div className="flex items-center gap-3 rounded-sm border border-red-200 bg-red-50 p-4 text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-400">
                        <AlertCircle className="h-5 w-5 shrink-0" />
                        <p className="text-sm">{loadError}</p>
                    </div>
                )}

                {/* ==================== STEP 1 — COURSE ==================== */}
                <Section step={1} title="Select Course">
                    <div className="p-5">
                        {loading ? (
                            <div className="flex items-center gap-3 text-sm text-zinc-500 dark:text-zinc-400">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Loading courses…
                            </div>
                        ) : (
                            <>
                                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-zinc-700 dark:text-zinc-300">
                                    Course
                                </label>
                                <SelectCourse
                                    value={selectedCourseId}
                                    onChange={(courseId) => handleCourseChange(courseId)}
                                    courses={courses}
                                    loading={loading}
                                    placeholder="Search or select a course…"
                                />

                                {selectedCourse && (
                                    <div className="mt-3 flex flex-wrap items-center gap-2">
                                        <span className="inline-flex items-center gap-1.5 rounded-sm bg-[#082B66]/5 px-2 py-1 text-[11px] font-semibold text-[#082B66] dark:bg-orange-400/10 dark:text-orange-400">
                                            <GraduationCap className="h-3 w-3" />
                                            {selectedCourse.courseCode}
                                        </span>
                                        <span className="text-xs text-zinc-500 dark:text-zinc-400">
                                            {unitsForCourse.length} unit
                                            {unitsForCourse.length === 1 ? "" : "s"} ·{" "}
                                            {studentsInCourse.length} student
                                            {studentsInCourse.length === 1 ? "" : "s"}
                                        </span>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </Section>

                {/* ==================== STEP 2 — UNIT ==================== */}
                {selectedCourseId && (
                    <Section step={2} title="Select Unit">
                        <div className="space-y-3 p-5">
                            {unitsForCourse.length === 0 ? (
                                <div className="flex items-start gap-2 rounded-sm border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                                    <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                                    No units are attached to{" "}
                                    <strong>{selectedCourse?.courseCode}</strong>. Create units
                                    for this course first.
                                    <Link
                                        href="/units/new"
                                        className="inline-flex items-center gap-2 text-sm font-semibold text-zinc-500 transition-colors hover:text-[#082B66] dark:text-zinc-400 dark:hover:text-orange-400"
                                    >
                                        Create Unit
                                        <ArrowRight size={16} />
                                    </Link>
                                </div>
                            ) : (
                                <>
                                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-zinc-700 dark:text-zinc-300">
                                        Unit
                                    </label>
                                    <select
                                        value={selectedUnitId}
                                        onChange={(e) => handleUnitChange(e.target.value)}
                                        className="w-full cursor-pointer rounded-sm border border-zinc-200 bg-white px-3 py-2.5 text-sm focus:border-[#082B66] focus:outline-none focus:ring-2 focus:ring-[#082B66]/30 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white dark:focus:border-orange-400 dark:focus:ring-orange-400/30"
                                    >
                                        <option value="">— Select a unit —</option>
                                        {unitsForCourse.map((u) => (
                                            <option key={u._id} value={u._id}>
                                                {u.code} — {u.name}
                                            </option>
                                        ))}
                                    </select>

                                    {selectedUnit && (
                                        <div className="flex flex-wrap items-center gap-2 pt-1">
                                            <span className="inline-flex items-center gap-1.5 rounded-sm bg-[#082B66]/5 px-2 py-1 text-[11px] font-semibold text-[#082B66] dark:bg-orange-400/10 dark:text-orange-400">
                                                <BookOpen className="h-3 w-3" />
                                                {selectedUnit.code}
                                            </span>
                                            {selectedUnit.type && (
                                                <span className="inline-flex items-center rounded-sm border border-zinc-200 px-2 py-1 text-[11px] font-semibold capitalize text-zinc-600 dark:border-zinc-700 dark:text-zinc-300">
                                                    {selectedUnit.type}
                                                </span>
                                            )}
                                            {selectedUnit.optionalUnit && (
                                                <span className="inline-flex items-center rounded-sm border border-amber-200 bg-amber-50 px-2 py-1 text-[11px] font-semibold text-amber-700 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                                                    Elective
                                                </span>
                                            )}
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </Section>
                )}

                {/* ==================== STEP 3 — STUDENTS ==================== */}
                {selectedUnitId && (
                    <Section step={3} title="Select Students">
                        {studentsInCourse.length === 0 ? (
                            <div className="p-5 text-sm text-zinc-500 dark:text-zinc-400">
                                No students are enrolled for{" "}
                                <strong>{selectedCourse?.courseCode}</strong> yet.
                            </div>
                        ) : (
                            <>
                                {/* Filters + actions */}
                                <div className="space-y-3 border-b border-zinc-100 p-5 dark:border-zinc-800">
                                    {/* Row 1 — Search, year, sort */}
                                    <div className="grid gap-2 lg:grid-cols-[1fr_auto_auto]">
                                        <div className="relative">
                                            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                                            <input
                                                type="text"
                                                value={studentSearch}
                                                onChange={(e) =>
                                                    setStudentSearch(e.target.value)
                                                }
                                                placeholder="Search name or admission no…"
                                                className="w-full rounded-sm border border-zinc-200 py-2 pl-9 pr-3 text-sm focus:border-[#082B66] focus:outline-none focus:ring-2 focus:ring-[#082B66]/30 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white dark:focus:border-orange-400 dark:focus:ring-orange-400/30"
                                            />
                                        </div>

                                        <div className="relative">
                                            <CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                                            <select
                                                value={selectedYear}
                                                onChange={(e) => {
                                                    setSelectedYear(e.target.value);
                                                    setSelectedStudentIds(new Set());
                                                }}
                                                className="w-full cursor-pointer rounded-sm border border-zinc-200 bg-white py-2 pl-9 pr-8 text-sm focus:border-[#082B66] focus:outline-none focus:ring-2 focus:ring-[#082B66]/30 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white dark:focus:border-orange-400 dark:focus:ring-orange-400/30 lg:w-48"
                                            >
                                                <option value="">All admission years</option>
                                                {admissionYears.map((y) => (
                                                    <option key={y} value={y}>
                                                        {y === "Unknown"
                                                            ? "Unknown date"
                                                            : `Admitted ${y}`}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        <div className="relative">
                                            <ArrowDownUp className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                                            <select
                                                value={sortBy}
                                                onChange={(e) =>
                                                    setSortBy(e.target.value as SortOption)
                                                }
                                                className="w-full cursor-pointer rounded-sm border border-zinc-200 bg-white py-2 pl-9 pr-8 text-sm focus:border-[#082B66] focus:outline-none focus:ring-2 focus:ring-[#082B66]/30 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white dark:focus:border-orange-400 dark:focus:ring-orange-400/30 lg:w-64"
                                            >
                                                {(Object.keys(SORT_LABELS) as SortOption[]).map(
                                                    (key) => (
                                                        <option key={key} value={key}>
                                                            Sort: {SORT_LABELS[key]}
                                                        </option>
                                                    ),
                                                )}
                                            </select>
                                        </div>
                                    </div>

                                    {/* Row 2 — Date range + actions */}
                                    <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                                        <div className="flex flex-1 flex-wrap items-center gap-2">
                                            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                                                <CalendarDays className="h-3.5 w-3.5" />
                                                Admitted between
                                            </span>
                                            <div className="w-full shrink-0 sm:w-48">
                                                <input
                                                    type="date"
                                                    value={admissionFrom}
                                                    max={admissionTo || undefined}
                                                    onChange={(e) => {
                                                        setAdmissionFrom(e.target.value);
                                                        setSelectedStudentIds(new Set());
                                                    }}
                                                    aria-label="Admission date from"
                                                    className="w-full rounded-sm border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-800 focus:border-[#082B66] focus:outline-none focus:ring-2 focus:ring-[#082B66]/30 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white dark:focus:border-orange-400 dark:focus:ring-orange-400/30"
                                                />
                                            </div>
                                            <span className="text-xs text-zinc-400">and</span>
                                            <div className="w-full shrink-0 sm:w-48">
                                                <input
                                                    type="date"
                                                    value={admissionTo}
                                                    min={admissionFrom || undefined}
                                                    onChange={(e) => {
                                                        setAdmissionTo(e.target.value);
                                                        setSelectedStudentIds(new Set());
                                                    }}
                                                    aria-label="Admission date to"
                                                    className="w-full rounded-sm border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-800 focus:border-[#082B66] focus:outline-none focus:ring-2 focus:ring-[#082B66]/30 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white dark:focus:border-orange-400 dark:focus:ring-orange-400/30"
                                                />
                                            </div>

                                            {(admissionFrom || admissionTo) && (
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setAdmissionFrom("");
                                                        setAdmissionTo("");
                                                        setSelectedStudentIds(new Set());
                                                    }}
                                                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-zinc-500 transition-colors hover:text-[#082B66] dark:text-zinc-400 dark:hover:text-orange-400"
                                                >
                                                    <X className="h-3 w-3" />
                                                    Clear range
                                                </button>
                                            )}
                                        </div>

                                        <div className="flex items-center gap-2 text-xs">
                                            <button
                                                type="button"
                                                onClick={toggleSelectAllVisible}
                                                className="inline-flex items-center gap-1.5 rounded-sm border border-zinc-300 bg-white px-3 py-1.5 font-semibold text-zinc-800 transition hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
                                            >
                                                <Check className="h-3.5 w-3.5" />
                                                {allVisibleSelected
                                                    ? "Unselect all"
                                                    : "Select all"}
                                            </button>

                                            {selectedStudentIds.size > 0 && (
                                                <button
                                                    type="button"
                                                    onClick={clearSelection}
                                                    className="inline-flex items-center gap-1.5 rounded-sm border border-zinc-300 bg-white px-3 py-1.5 font-semibold text-zinc-800 transition hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
                                                >
                                                    <X className="h-3.5 w-3.5" />
                                                    Clear
                                                </button>
                                            )}

                                            <span className="rounded-sm bg-[#082B66]/5 px-2 py-1 font-semibold text-[#082B66] dark:bg-orange-400/10 dark:text-orange-400">
                                                {selectedStudentIds.size} /{" "}
                                                {studentsInCourse.length}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Active filter summary */}
                                    {hasActiveFilters && (
                                        <div className="flex flex-wrap items-center gap-2 pt-1">
                                            <span className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                                                Showing {filteredStudents.length} of{" "}
                                                {studentsInCourse.length}
                                            </span>
                                            <button
                                                type="button"
                                                onClick={clearFilters}
                                                className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#082B66] hover:underline dark:text-orange-400"
                                            >
                                                <X className="h-3 w-3" />
                                                Clear filters
                                            </button>
                                        </div>
                                    )}
                                </div>

                                <div className="max-h-96 overflow-y-auto">
                                    {groupedStudents.length === 0 ? (
                                        <p className="px-5 py-6 text-center text-sm text-zinc-500 dark:text-zinc-400">
                                            No students match your filters.
                                        </p>
                                    ) : (
                                        groupedStudents.map(({ year, rows }) => (
                                            <div key={year}>
                                                <div className="sticky top-0 z-10 flex items-center justify-between gap-2 border-y border-zinc-100 bg-zinc-50/95 px-5 py-2 backdrop-blur dark:border-zinc-800 dark:bg-zinc-800/80">
                                                    <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-zinc-600 dark:text-zinc-300">
                                                        <CalendarDays className="h-3.5 w-3.5" />
                                                        {year === "Unknown"
                                                            ? "Unknown admission date"
                                                            : `Admitted ${year}`}
                                                    </span>
                                                    <span className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">
                                                        {rows.length} student
                                                        {rows.length === 1 ? "" : "s"}
                                                    </span>
                                                </div>

                                                <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
                                                    {rows.map(
                                                        ({
                                                            student,
                                                            admissionNumber,
                                                            dateOfAdmission,
                                                        }) => {
                                                            const checked =
                                                                selectedStudentIds.has(
                                                                    student._id,
                                                                );
                                                            return (
                                                                <li key={student._id}>
                                                                    <label
                                                                        className={`flex cursor-pointer items-center gap-4 px-5 py-3 transition-colors ${checked
                                                                            ? "bg-[#082B66]/5 dark:bg-orange-400/5"
                                                                            : "hover:bg-zinc-50 dark:hover:bg-zinc-800/40"
                                                                            }`}
                                                                    >
                                                                        <input
                                                                            type="checkbox"
                                                                            checked={checked}
                                                                            onChange={() =>
                                                                                toggleStudent(
                                                                                    student._id,
                                                                                )
                                                                            }
                                                                            className="h-4 w-4 shrink-0 cursor-pointer accent-[#082B66] dark:accent-orange-400"
                                                                        />
                                                                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-sm bg-[#082B66]/5 text-xs font-bold uppercase text-[#082B66] dark:bg-orange-400/10 dark:text-orange-400">
                                                                            {student.fullName
                                                                                .firstName?.[0] ??
                                                                                ""}
                                                                            {student.fullName
                                                                                .lastName?.[0] ??
                                                                                ""}
                                                                        </div>
                                                                        <div className="min-w-0 flex-1">
                                                                            <p className="truncate text-sm font-semibold text-zinc-900 dark:text-white">
                                                                                {studentFullName(
                                                                                    student,
                                                                                )}
                                                                            </p>
                                                                            <p className="font-mono text-[11px] text-zinc-500 dark:text-zinc-400">
                                                                                {admissionNumber ||
                                                                                    "—"}
                                                                            </p>
                                                                        </div>
                                                                        <span className="hidden shrink-0 text-[11px] text-zinc-500 dark:text-zinc-400 sm:block">
                                                                            {formatDate(
                                                                                dateOfAdmission,
                                                                            )}
                                                                        </span>
                                                                    </label>
                                                                </li>
                                                            );
                                                        },
                                                    )}
                                                </ul>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </>
                        )}
                    </Section>
                )}

                {/* ==================== STEP 4 — SHEET ==================== */}
                {selectedUnitId && selectedRows.length > 0 && (
                    <Section
                        step={4}
                        title="Enter & Edit Marks"
                        aside={
                            <span className="inline-flex items-center gap-1.5 rounded-sm border border-zinc-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200">
                                <Users className="h-3 w-3" />
                                {selectedRows.length}{" "}
                                {selectedRows.length === 1 ? "student" : "students"}
                            </span>
                        }
                    >
                        <div className="p-5">
                            <div className="flex flex-col items-start gap-4 rounded-sm border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-800/50 sm:flex-row sm:items-center sm:justify-between">
                                <div className="flex items-start gap-3">
                                    <ClipboardList className="mt-0.5 h-5 w-5 text-[#082B66] dark:text-orange-400" />
                                    <div>
                                        <p className="text-sm font-semibold text-zinc-900 dark:text-white">
                                            Ready to enter marks
                                        </p>
                                        <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                                            {selectedRows.length} student
                                            {selectedRows.length === 1 ? "" : "s"} selected ·{" "}
                                            {selectedUnit?.code} — {selectedUnit?.name}
                                        </p>
                                    </div>
                                </div>
                                <Link
                                    href={{
                                        pathname: "/results/new/unit-based/sheet",
                                        query: {
                                            unitId: selectedUnitId,
                                            courseId: selectedCourseId,
                                            studentIds: Array.from(
                                                selectedStudentIds,
                                            ).join(","),
                                        },
                                    }}
                                    className="inline-flex items-center gap-2 rounded-sm bg-[#082B66] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#082B66]/90 dark:bg-orange-400 dark:text-zinc-900 dark:hover:bg-orange-400/90"
                                >
                                    Open Mark Entry Sheet
                                    <ArrowRight className="h-4 w-4" />
                                </Link>
                            </div>
                        </div>
                    </Section>
                )}
            </div>
        </main>
    );
}

/* -------------------------------------------------------------------------- */
/* Section wrapper                                                            */
/* -------------------------------------------------------------------------- */

function Section({
    step,
    title,
    aside,
    children,
}: {
    step: number;
    title: string;
    aside?: React.ReactNode;
    children: React.ReactNode;
}) {
    return (
        <section className="overflow-hidden rounded-sm border border-zinc-200 border-t-4 border-t-orange-400 bg-white shadow-sm dark:border-zinc-800 dark:border-t-orange-400 dark:bg-zinc-900">
            <header className="flex items-center justify-between gap-3 border-b border-zinc-100 px-5 py-3 dark:border-zinc-800">
                <div className="flex items-center gap-3">
                    <span className="flex h-6 w-6 items-center justify-center rounded-sm bg-[#082B66] text-[11px] font-bold text-white dark:bg-orange-400 dark:text-zinc-900">
                        {step}
                    </span>
                    <h2 className="text-sm font-bold text-[#082B66] dark:text-white">
                        {title}
                    </h2>
                </div>
                {aside}
            </header>
            {children}
        </section>
    );
}