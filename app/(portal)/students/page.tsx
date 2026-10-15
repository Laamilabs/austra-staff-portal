"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  GraduationCap,
  LayoutGrid,
  List,
  Loader2,
  Plus,
  RotateCw,
  Search,
  Users,
  X,
} from "lucide-react";

import { studentApi, Student } from "@/app/types/students";
import { resolveCourseByAdmissionNumber } from "./components/resolve-course";
import SelectCourse from "@/app/(portal)/courses/selectCourse";
import { Course } from "@/app/types/courses";
import { StudentCard } from "./components/StudentCard";

type SortField = "createdAt" | "name" | "admissionNumber" | "course";
type SortDirection = "asc" | "desc";
type ViewMode = "grid" | "list";

const PAGE_SIZE = 21;
const VIEW_KEY = "students:view";

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const PATIENCE_MESSAGES = [
  "Fetching student records...",
  "Gathering enrollment data...",
  "Resolving course assignments...",
  "Organizing student information...",
  "Almost there, thanks for your patience!",
  "Finalizing student directory...",
];

const SORT_OPTIONS: { field: SortField; label: string }[] = [
  { field: "createdAt", label: "Date added" },
  { field: "name", label: "Name" },
  { field: "admissionNumber", label: "Admission no." },
  { field: "course", label: "Course" },
];

interface ResolvedCourseResult {
  admissionNumber: string;
  courseName: string;
  isResolvedByAdmission: boolean;
}

type ResolveFn = (
  course: Student["courses"][number]
) => ResolvedCourseResult | null;

// ---------------------------------------------------------------------------
// Style tokens
// ---------------------------------------------------------------------------

const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400";

const selectCls =
  "min-w-0 cursor-pointer bg-transparent text-sm text-zinc-800 outline-none disabled:cursor-not-allowed disabled:opacity-50 dark:bg-[#0B1E3D] dark:text-zinc-100 dark:scheme-dark";

const btnSecondaryCls = `inline-flex h-9 items-center justify-center gap-1.5 rounded-sm border border-zinc-200 bg-white px-3 text-[13px] font-semibold text-[#0B1E3D] transition-colors hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-white dark:border-white/15 dark:bg-transparent dark:text-white dark:hover:bg-white/10 dark:disabled:hover:bg-transparent ${FOCUS_RING}`;

const btnPrimaryCls = `inline-flex h-10 items-center justify-center gap-2 rounded-sm bg-[#0B1E3D] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#0B1E3D]/90 active:bg-[#0B1E3D]/80 dark:bg-orange-400 dark:text-[#0B1E3D] dark:hover:bg-orange-300 dark:active:bg-orange-500 ${FOCUS_RING} focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#0B1E3D]`;

const CODE_CHIP =
  "shrink-0 rounded-sm bg-[#0B1E3D]/5 px-1.5 py-0.5 font-mono text-[11px] font-medium text-[#0B1E3D] ring-1 ring-inset ring-[#0B1E3D]/10 dark:bg-orange-400/10 dark:text-orange-300 dark:ring-orange-400/25";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getStudentDate(student: Student): Date | null {
  // Check student course admission details or fall back to account creation timestamp
  const dateStr = student.createdAt;
  if (!dateStr) return null;
  const date = new Date(dateStr);
  return isNaN(date.getTime()) ? null : date;
}

function formatDate(student: Student): string {
  const d = getStudentDate(student);
  if (!d) return "—";
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getStudentName(student: Student): string {
  return [
    student.fullName.firstName,
    student.fullName.middleName,
    student.fullName.lastName,
  ]
    .filter(Boolean)
    .join(" ");
}

function getInitials(student: Student): string {
  return (
    `${student.fullName.firstName?.charAt(0).toUpperCase() ?? ""}${
      student.fullName.lastName?.charAt(0).toUpperCase() ?? ""
    }` || "?"
  );
}

/** Page buttons with ellipses: 1 … 4 5 6 … 20 */
function getPageItems(current: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

  let start = Math.max(2, current - 1);
  let end = Math.min(total - 1, current + 1);
  if (current <= 3) end = Math.min(total - 1, 4);
  if (current >= total - 2) start = Math.max(2, total - 3);

  const items: (number | "…")[] = [1];
  if (start > 2) items.push("…");
  for (let i = start; i <= end; i++) items.push(i);
  if (end < total - 1) items.push("…");
  items.push(total);
  return items;
}

/** Wraps matches of `query` in a highlight so you can see why a row appeared. */
function Highlight({ text, query }: { text: string; query: string }) {
  const q = query.trim();
  if (!q) return <>{text}</>;

  const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const parts = text.split(new RegExp(`(${escaped})`, "ig"));

  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === q.toLowerCase() ? (
          <mark
            key={i}
            className="rounded-sm bg-orange-400/25 px-0.5 text-inherit"
          >
            {part}
          </mark>
        ) : (
          <React.Fragment key={i}>{part}</React.Fragment>
        )
      )}
    </>
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
        <X size={12} />
      </button>
    </span>
  );
}

// ---------------------------------------------------------------------------
// List row
// ---------------------------------------------------------------------------

const ROW_GRID =
  "md:grid md:grid-cols-[minmax(0,1.3fr)_minmax(0,1.7fr)_6.5rem_1rem] md:gap-4";

function StudentRow({
  student,
  query,
  getResolvedCourse,
}: {
  student: Student;
  query: string;
  getResolvedCourse: ResolveFn;
}) {
  const name = getStudentName(student);
  const visible = student.courses.slice(0, 2);
  const hidden = student.courses.length - visible.length;

  return (
    <Link
      href={`/students/${student._id}`}
      className={`group relative flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-[#0B1E3D]/4 dark:hover:bg-white/6 ${ROW_GRID} ${FOCUS_RING} focus-visible:ring-inset`}
    >
      {/* Hover pill, same as the sidebar */}
      <span
        aria-hidden
        className="absolute left-0 top-1/2 h-4 w-0.75 origin-center -translate-y-1/2 scale-y-0 rounded-sm bg-orange-400 transition-transform duration-200 group-hover:scale-y-100 group-focus-visible:scale-y-100"
      />

      {/* Student */}
      <span className="flex min-w-0 flex-1 items-center gap-3 md:flex-none">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-sm bg-[#0B1E3D] text-xs font-bold uppercase text-orange-400 ring-1 ring-inset ring-orange-400/30">
          {getInitials(student)}
        </span>
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold text-[#0B1E3D] dark:text-white">
            <Highlight text={name} query={query} />
          </span>
          <span className="block truncate text-xs text-zinc-500 dark:text-zinc-400">
            <Highlight text={student.contact.email} query={query} />
          </span>
        </span>
      </span>

      {/* Courses */}
      <span className="hidden min-w-0 flex-col gap-1 md:flex">
        {student.courses.length === 0 ? (
          <span className="text-xs text-zinc-400 dark:text-zinc-500">
            Not enrolled
          </span>
        ) : (
          <>
            {visible.map((course, i) => {
              const resolved = getResolvedCourse(course);
              return (
                <span key={i} className="flex min-w-0 items-center gap-2 text-xs">
                  <GraduationCap
                    size={14}
                    className="shrink-0 text-emerald-600 dark:text-emerald-400"
                  />
                  <span className="min-w-0 truncate font-medium text-zinc-700 dark:text-zinc-200">
                    <Highlight
                      text={resolved?.courseName || "Course not resolved"}
                      query={query}
                    />
                  </span>
                  <span className={CODE_CHIP}>
                    <Highlight
                      text={course.admissionNumber || "N/A"}
                      query={query}
                    />
                  </span>
                </span>
              );
            })}
            {hidden > 0 && (
              <span className="pl-6 text-xs font-medium text-orange-600 dark:text-orange-400">
                +{hidden} more {hidden === 1 ? "course" : "courses"}
              </span>
            )}
          </>
        )}
      </span>

      {/* Added */}
      <span className="hidden text-xs text-zinc-500 dark:text-zinc-400 md:block">
        {formatDate(student)}
      </span>

      <ChevronRight
        aria-hidden
        className="h-4 w-4 shrink-0 text-zinc-300 transition-all group-hover:translate-x-0.5 group-hover:text-orange-500 dark:text-zinc-600 dark:group-hover:text-orange-400"
      />
    </Link>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function StudentsPage() {
  const router = useRouter();

  const [students, setStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const [loadingMessageIndex, setLoadingMessageIndex] = useState(0);

  const [search, setSearch] = useState("");
  const [courseFilter, setCourseFilter] = useState<Course | null>(null);
  const [yearFilter, setYearFilter] = useState<string>("");
  const [monthFilter, setMonthFilter] = useState<string>("");

  const [sortField, setSortField] = useState<SortField>("createdAt");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const [view, setView] = useState<ViewMode>("grid");
  const [currentPage, setCurrentPage] = useState(1);

  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isLoading) return;

    const interval = setInterval(() => {
      setLoadingMessageIndex((prev) => (prev + 1) % PATIENCE_MESSAGES.length);
    }, 2800);

    return () => clearInterval(interval);
  }, [isLoading]);

  const fetchStudents = useCallback(async () => {
    try {
      setIsLoading(true);
      setError("");

      const response = await studentApi.getAll();
      setStudents(response.data);
    } catch (err) {
      console.error(err);
      setError("Failed to load students. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  // Remember grid / list choice.
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(VIEW_KEY);
      if (saved === "grid" || saved === "list") setView(saved);
    } catch {
      /* ignore */
    }
  }, []);

  const changeView = (next: ViewMode) => {
    setView(next);
    try {
      window.localStorage.setItem(VIEW_KEY, next);
    } catch {
      /* ignore */
    }
  };

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

  // Compute distinct years from students list
  const availableYears = useMemo(() => {
    const yearsSet = new Set<string>();
    students.forEach((student) => {
      const date = getStudentDate(student);
      if (date) {
        yearsSet.add(date.getFullYear().toString());
      }
    });
    return Array.from(yearsSet).sort((a, b) => b.localeCompare(a));
  }, [students]);

  const getResolvedCourse: ResolveFn = (course) => {
    const courseId = course.courseId;

    if (!courseId) {
      const resolved = resolveCourseByAdmissionNumber(course.admissionNumber);
      if (!resolved) return null;

      return {
        admissionNumber: course.admissionNumber,
        courseName: resolved.courseName,
        isResolvedByAdmission: true,
      };
    }

    if (typeof courseId !== "string") {
      if (courseId.name) {
        return {
          admissionNumber: course.admissionNumber,
          courseName: courseId.name,
          isResolvedByAdmission: false,
        };
      }

      const resolved = resolveCourseByAdmissionNumber(course.admissionNumber);
      if (!resolved) return null;

      return {
        admissionNumber: course.admissionNumber,
        courseName: resolved.courseName,
        isResolvedByAdmission: true,
      };
    }

    const resolved = resolveCourseByAdmissionNumber(course.admissionNumber);
    if (resolved) {
      return {
        admissionNumber: course.admissionNumber,
        courseName: resolved.courseName,
        isResolvedByAdmission: true,
      };
    }

    return {
      admissionNumber: course.admissionNumber,
      courseName: courseId,
      isResolvedByAdmission: false,
    };
  };

  const getCourseDisplayName = (course: Student["courses"][number]) => {
    const resolved = getResolvedCourse(course);
    return resolved?.courseName || "Course not resolved";
  };

  const getStudentCourseNames = (student: Student) => {
    return student.courses
      .map((course) => getCourseDisplayName(course))
      .filter(Boolean);
  };

  const getRawCourseId = (
    course: Student["courses"][number]
  ): string | null => {
    const courseId = course.courseId;

    if (!courseId) return null;
    if (typeof courseId === "string") return courseId;
    if (typeof courseId === "object" && "_id" in courseId && courseId._id) {
      return String(courseId._id);
    }

    return null;
  };

  const filteredStudents = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    const result = students.filter((student) => {
      const fullName = getStudentName(student);

      const admissionNumbers = student.courses
        .map((course) => course.admissionNumber)
        .filter(Boolean)
        .join(" ");

      const courseNames = getStudentCourseNames(student).join(" ");

      const matchesSearch =
        !normalizedSearch ||
        fullName.toLowerCase().includes(normalizedSearch) ||
        student.contact.email.toLowerCase().includes(normalizedSearch) ||
        admissionNumbers.toLowerCase().includes(normalizedSearch) ||
        courseNames.toLowerCase().includes(normalizedSearch);

      const matchesCourse =
        !courseFilter ||
        student.courses.some((course) => {
          const rawId = getRawCourseId(course);
          if (rawId && rawId === courseFilter._id) return true;

          const resolved = getResolvedCourse(course);
          return resolved?.courseName === courseFilter.name;
        });

      const date = getStudentDate(student);

      const matchesYear =
        !yearFilter || (date && date.getFullYear().toString() === yearFilter);

      const matchesMonth =
        !monthFilter ||
        (date && (date.getMonth() + 1).toString() === monthFilter);

      return matchesSearch && matchesCourse && matchesYear && matchesMonth;
    });

    result.sort((a, b) => {
      if (sortField === "createdAt") {
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return sortDirection === "asc" ? timeA - timeB : timeB - timeA;
      }

      let valueA = "";
      let valueB = "";

      switch (sortField) {
        case "name":
          valueA = getStudentName(a);
          valueB = getStudentName(b);
          break;

        case "admissionNumber":
          valueA = a.courses.map((c) => c.admissionNumber).join(", ");
          valueB = b.courses.map((c) => c.admissionNumber).join(", ");
          break;

        case "course": {
          const courseA = a.courses[0]
            ? getResolvedCourse(a.courses[0])
            : null;

          const courseB = b.courses[0]
            ? getResolvedCourse(b.courses[0])
            : null;

          valueA = courseA?.courseName || "";
          valueB = courseB?.courseName || "";
          break;
        }
      }

      const comparison = valueA
        .toLowerCase()
        .localeCompare(valueB.toLowerCase());

      return sortDirection === "asc" ? comparison : -comparison;
    });

    return result;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    students,
    search,
    courseFilter,
    yearFilter,
    monthFilter,
    sortField,
    sortDirection,
  ]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredStudents.length / PAGE_SIZE)
  );

  const paginatedStudents = filteredStudents.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [search, courseFilter, yearFilter, monthFilter, sortField, sortDirection]);

  const goToPage = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSortField = (field: SortField) => {
    setSortField(field);
    setSortDirection(field === "createdAt" ? "desc" : "asc");
  };

  const toggleDirection = () =>
    setSortDirection((current) => (current === "asc" ? "desc" : "asc"));

  const clearFilters = () => {
    setSearch("");
    setCourseFilter(null);
    setYearFilter("");
    setMonthFilter("");
  };

  const hasFilters =
    Boolean(search) ||
    courseFilter !== null ||
    Boolean(yearFilter) ||
    Boolean(monthFilter);

  const directionLabel =
    sortDirection === "asc"
      ? "Ascending. Switch to descending"
      : "Descending. Switch to ascending";

  const gridCls = "grid grid-cols-1 gap-3 sm:grid-cols-2 2xl:grid-cols-3";
  const listCls =
    "divide-y divide-zinc-200/80 overflow-hidden rounded-sm border border-zinc-200/80 bg-white/80 dark:divide-white/10 dark:border-white/10 dark:bg-white/4";

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-sm bg-orange-400/10 text-orange-500 ring-1 ring-inset ring-orange-400/30 dark:text-orange-400">
            <Users size={20} strokeWidth={2} />
          </span>
          <div className="min-w-0">
            <h1 className="text-xl font-bold tracking-tight text-[#0B1E3D] dark:text-white">
              Students
            </h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Manage and view student records.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => router.push("/students/new")}
          className={btnPrimaryCls}
        >
          <Plus size={16} className="text-orange-400 dark:text-[#0B1E3D]" />
          Register student
        </button>
      </div>

      {/* Command bar: stays in view on large screens while you scroll */}
      <div className="space-y-2.5 lg:sticky lg:top-0 lg:z-20 lg:-mx-8 lg:border-b lg:border-zinc-200/80 lg:bg-white/90 lg:px-8 lg:py-3 lg:backdrop-blur-md dark:lg:border-white/10 dark:lg:bg-[#0B1E3D]/90">
        {/* Row 1: search, sort, layout */}
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
          <label
            className="
              flex h-10 w-full items-center gap-2 rounded-sm border-b-2 border-transparent
              bg-zinc-100 px-3 text-zinc-400 transition-colors lg:max-w-lg lg:flex-1
              focus-within:border-orange-400 focus-within:bg-white focus-within:shadow-sm
              dark:bg-white/5 dark:text-zinc-500 dark:focus-within:bg-white/10
            "
          >
            <Search size={16} className="shrink-0" />

            <input
              ref={searchRef}
              type="text"
              value={search}
              disabled={isLoading}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") setSearch("");
              }}
              placeholder="Search name, email, admission no., course"
              aria-label="Search students"
              autoComplete="off"
              spellCheck={false}
              className="min-w-0 flex-1 bg-transparent text-sm text-[#0B1E3D] outline-none placeholder:text-zinc-400 disabled:cursor-not-allowed disabled:opacity-60 dark:text-white dark:placeholder:text-zinc-500"
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
                <X size={14} />
              </button>
            ) : (
              <kbd className="hidden rounded-sm border border-zinc-300 px-1.5 text-[10px] font-semibold text-zinc-400 dark:border-white/15 dark:text-zinc-500 sm:block">
                /
              </kbd>
            )}
          </label>

          <div className="flex items-center gap-2 lg:ml-auto">
            {/* Sort */}
            <label htmlFor="students-sort" className="sr-only">
              Sort students by
            </label>
            <div className="flex h-10 min-w-0 flex-1 items-center rounded-sm border border-zinc-200 bg-white pl-1 transition-colors focus-within:border-orange-400 focus-within:ring-2 focus-within:ring-orange-400/25 dark:border-white/10 dark:bg-[#0B1E3D] lg:w-52 lg:flex-none">
              <button
                type="button"
                onClick={toggleDirection}
                disabled={isLoading}
                aria-label={directionLabel}
                title={sortDirection === "asc" ? "Ascending" : "Descending"}
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-sm text-orange-500 transition-colors hover:bg-[#0B1E3D]/5 disabled:opacity-50 dark:text-orange-400 dark:hover:bg-white/10 ${FOCUS_RING}`}
              >
                {sortDirection === "asc" ? (
                  <ArrowUp size={16} />
                ) : (
                  <ArrowDown size={16} />
                )}
              </button>
              <select
                id="students-sort"
                value={sortField}
                disabled={isLoading}
                onChange={(e) => handleSortField(e.target.value as SortField)}
                className={`${selectCls} h-full flex-1 pl-1 pr-2 font-medium`}
              >
                {SORT_OPTIONS.map((option) => (
                  <option key={option.field} value={option.field}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Layout */}
            <div
              role="group"
              aria-label="Layout"
              className="flex shrink-0 items-center gap-0.5 rounded-sm bg-zinc-100 p-0.5 dark:bg-white/5"
            >
              {(
                [
                  { key: "grid", label: "Grid view", icon: LayoutGrid },
                  { key: "list", label: "List view", icon: List },
                ] as const
              ).map(({ key, label, icon: Icon }) => {
                const active = view === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => changeView(key)}
                    aria-pressed={active}
                    aria-label={label}
                    title={label}
                    className={`flex h-9 w-9 items-center justify-center rounded-sm transition-colors ${FOCUS_RING} ${
                      active
                        ? "bg-white text-orange-500 shadow-sm dark:bg-white/10 dark:text-orange-400"
                        : "text-zinc-500 hover:bg-white/60 hover:text-[#0B1E3D] dark:text-zinc-400 dark:hover:bg-white/5 dark:hover:text-white"
                    }`}
                  >
                    <Icon size={16} />
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Row 2: course + date added */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="min-w-0 flex-1">
            <SelectCourse
              value={courseFilter?._id ?? ""}
              disabled={isLoading}
              onChange={(_, course) => setCourseFilter(course ?? null)}
              placeholder="All courses"
            />
          </div>

          {/* Year + month as one joined control */}
          <div
            role="group"
            aria-label="Date added"
            className="flex h-10 w-full shrink-0 items-center rounded-sm border border-zinc-200 bg-white pl-3 transition-colors focus-within:border-orange-400 focus-within:ring-2 focus-within:ring-orange-400/25 dark:border-white/10 dark:bg-[#0B1E3D] sm:w-72"
          >
            <CalendarDays
              size={15}
              className="shrink-0 text-sky-600 dark:text-sky-400"
            />

            <select
              value={yearFilter}
              disabled={isLoading}
              onChange={(e) => setYearFilter(e.target.value)}
              aria-label="Filter by year"
              className={`${selectCls} h-full w-24 shrink-0 px-2`}
            >
              <option value="">Any year</option>
              {availableYears.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>

            <span
              aria-hidden
              className="h-5 w-px shrink-0 bg-zinc-200 dark:bg-white/10"
            />

            <select
              value={monthFilter}
              disabled={isLoading}
              onChange={(e) => setMonthFilter(e.target.value)}
              aria-label="Filter by month"
              className={`${selectCls} h-full flex-1 px-2`}
            >
              <option value="">Any month</option>
              {MONTH_NAMES.map((name, idx) => (
                <option key={name} value={(idx + 1).toString()}>
                  {name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Row 3: result count + active filter chips */}
        {!isLoading && !error && (
          <div className="flex flex-wrap items-center gap-2">
            <p
              aria-live="polite"
              className="mr-1 text-xs text-zinc-500 dark:text-zinc-400"
            >
              {hasFilters
                ? `${filteredStudents.length} of ${students.length} students`
                : `${students.length} ${students.length === 1 ? "student" : "students"}`}
            </p>

            {search && (
              <Chip
                label={`Search: “${search}”`}
                removeLabel="Remove search filter"
                onRemove={() => setSearch("")}
              />
            )}

            {courseFilter && (
              <Chip
                label={`Course: ${courseFilter.name}`}
                removeLabel="Remove course filter"
                onRemove={() => setCourseFilter(null)}
              />
            )}

            {yearFilter && (
              <Chip
                label={`Year: ${yearFilter}`}
                removeLabel="Remove year filter"
                onRemove={() => setYearFilter("")}
              />
            )}

            {monthFilter && (
              <Chip
                label={`Month: ${MONTH_NAMES[parseInt(monthFilter, 10) - 1]}`}
                removeLabel="Remove month filter"
                onRemove={() => setMonthFilter("")}
              />
            )}

            {hasFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className={`h-7 rounded-sm px-2 text-xs font-semibold text-orange-600 transition-colors hover:bg-orange-400/10 dark:text-orange-400 ${FOCUS_RING}`}
              >
                Clear all
              </button>
            )}
          </div>
        )}
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
            onClick={fetchStudents}
            className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-sm px-2.5 text-xs font-semibold transition-colors hover:bg-red-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 dark:hover:bg-red-500/20"
          >
            <RotateCw className="h-3.5 w-3.5" />
            Retry
          </button>
        </div>
      )}

      {/* Results */}
      {isLoading ? (
        <div className="space-y-4" aria-busy="true">
          {/* Progress line with rotating message */}
          <div
            role="status"
            className="flex items-center gap-3 rounded-sm border border-zinc-200/80 bg-white/80 px-4 py-3 dark:border-white/10 dark:bg-white/4"
          >
            <Loader2
              size={18}
              className="shrink-0 animate-spin text-orange-500 dark:text-orange-400"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-[#0B1E3D] dark:text-white">
                {PATIENCE_MESSAGES[loadingMessageIndex]}
              </p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                This should only take a moment.
              </p>
            </div>
          </div>

          {view === "grid" ? (
            <div className={gridCls}>
              {Array.from({ length: 6 }).map((_, index) => (
                <div
                  key={index}
                  className="space-y-4 rounded-sm border border-zinc-200/80 bg-white/80 p-4 dark:border-white/10 dark:bg-white/4"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-11 w-11 shrink-0 animate-pulse rounded-sm bg-zinc-200 dark:bg-white/10" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3.5 w-32 animate-pulse rounded-sm bg-zinc-200 dark:bg-white/10" />
                      <div className="h-3 w-24 animate-pulse rounded-sm bg-zinc-100 dark:bg-white/5" />
                    </div>
                  </div>
                  <div className="space-y-2 border-t border-zinc-200/80 pt-3 dark:border-white/10">
                    <div className="h-4 w-full animate-pulse rounded-sm bg-zinc-100 dark:bg-white/5" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className={listCls}>
              {Array.from({ length: 8 }).map((_, index) => (
                <div key={index} className="flex items-center gap-3 px-4 py-3">
                  <div className="h-10 w-10 shrink-0 animate-pulse rounded-sm bg-zinc-200 dark:bg-white/10" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3.5 w-40 max-w-full animate-pulse rounded-sm bg-zinc-200 dark:bg-white/10" />
                    <div className="h-3 w-28 animate-pulse rounded-sm bg-zinc-100 dark:bg-white/5" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        !error && (
          <>
            {paginatedStudents.length === 0 ? (
              <div className="rounded-sm border border-dashed border-zinc-300 px-6 py-14 text-center dark:border-white/15">
                <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-sm bg-orange-400/10 text-orange-500 ring-1 ring-inset ring-orange-400/30 dark:text-orange-400">
                  <Users size={22} />
                </span>

                <p className="mt-3 text-sm font-semibold text-[#0B1E3D] dark:text-white">
                  {hasFilters ? "No students match your filters" : "No students yet"}
                </p>
                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                  {hasFilters
                    ? "Try a different search, or remove some filters."
                    : "Register a student to get started."}
                </p>

                <div className="mt-4 flex justify-center">
                  {hasFilters ? (
                    <button
                      type="button"
                      onClick={clearFilters}
                      className={btnSecondaryCls}
                    >
                      <X size={14} />
                      Clear all filters
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => router.push("/students/new")}
                      className={btnPrimaryCls}
                    >
                      <Plus size={15} className="text-orange-400 dark:text-[#0B1E3D]" />
                      Register student
                    </button>
                  )}
                </div>
              </div>
            ) : view === "grid" ? (
              <div className={gridCls}>
                {paginatedStudents.map((student) => (
                  <StudentCard
                    key={student._id}
                    student={student}
                    getResolvedCourse={getResolvedCourse}
                    onClick={() => router.push(`/students/${student._id}`)}
                  />
                ))}
              </div>
            ) : (
              <div className={listCls}>
                {/* Column header (desktop) */}
                <div
                  className={`hidden gap-4 border-b border-zinc-200/80 bg-zinc-50 px-4 py-2 text-xs font-semibold text-zinc-500 dark:border-white/10 dark:bg-white/4 dark:text-zinc-400 md:grid md:grid-cols-[minmax(0,1.3fr)_minmax(0,1.7fr)_6.5rem_1rem]`}
                >
                  <span>Student</span>
                  <span>Courses</span>
                  <span>Added</span>
                  <span />
                </div>

                <div className="divide-y divide-zinc-200/80 dark:divide-white/10">
                  {paginatedStudents.map((student) => (
                    <StudentRow
                      key={student._id}
                      student={student}
                      query={search}
                      getResolvedCourse={getResolvedCourse}
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        )
      )}

      {/* Pagination */}
      {!isLoading && !error && filteredStudents.length > 0 && (
        <nav
          aria-label="Pagination"
          className="flex flex-col gap-3 border-t border-zinc-200/80 pt-4 dark:border-white/10 sm:flex-row sm:items-center sm:justify-between"
        >
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Showing{" "}
            <span className="font-semibold text-[#0B1E3D] dark:text-white">
              {(currentPage - 1) * PAGE_SIZE + 1}–
              {Math.min(currentPage * PAGE_SIZE, filteredStudents.length)}
            </span>{" "}
            of{" "}
            <span className="font-semibold text-[#0B1E3D] dark:text-white">
              {filteredStudents.length}
            </span>
          </p>

          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={currentPage === 1}
              onClick={() => goToPage(currentPage - 1)}
              aria-label="Previous page"
              className={`${btnSecondaryCls} w-9 px-0`}
            >
              <ChevronLeft size={16} className="text-orange-500 dark:text-orange-400" />
            </button>

            {/* Numbered pages (hidden on small screens) */}
            <div className="hidden items-center gap-1 sm:flex">
              {getPageItems(currentPage, totalPages).map((item, i) =>
                item === "…" ? (
                  <span
                    key={`gap-${i}`}
                    aria-hidden
                    className="flex h-9 w-6 items-center justify-center text-zinc-400 dark:text-zinc-500"
                  >
                    …
                  </span>
                ) : (
                  <button
                    key={item}
                    type="button"
                    onClick={() => goToPage(item)}
                    aria-label={`Page ${item}`}
                    aria-current={item === currentPage ? "page" : undefined}
                    className={`h-9 min-w-9 rounded-sm px-2 text-[13px] font-semibold tabular-nums transition-colors ${FOCUS_RING} ${
                      item === currentPage
                        ? "bg-[#0B1E3D] text-white dark:bg-orange-400 dark:text-[#0B1E3D]"
                        : "text-[#0B1E3D] hover:bg-[#0B1E3D]/5 dark:text-zinc-200 dark:hover:bg-white/10"
                    }`}
                  >
                    {item}
                  </button>
                )
              )}
            </div>

            {/* Compact indicator on small screens */}
            <span
              aria-current="page"
              className="min-w-16 rounded-sm bg-[#0B1E3D]/5 px-3 py-2 text-center text-xs font-semibold tabular-nums text-[#0B1E3D] dark:bg-white/10 dark:text-white sm:hidden"
            >
              {currentPage} / {totalPages}
            </span>

            <button
              type="button"
              disabled={currentPage === totalPages}
              onClick={() => goToPage(currentPage + 1)}
              aria-label="Next page"
              className={`${btnSecondaryCls} w-9 px-0`}
            >
              <ChevronRight size={16} className="text-orange-500 dark:text-orange-400" />
            </button>
          </div>
        </nav>
      )}
    </div>
  );
}