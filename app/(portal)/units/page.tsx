"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowUpDown,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  FileText,
  GraduationCap,
  Layers,
  Plus,
  RefreshCw,
  Search,
  Tag,
  X,
} from "lucide-react";

import { Unit, unitApi, UnitType } from "@/app/types/units";
import { Course, courseApi } from "@/app/types/courses";
import SelectCourse from "@/app/(portal)/courses/selectCourse";

type TypeFilter = "ALL" | "CORE" | "BASIC" | "COMMON" | "OPTIONAL";
type SortKey = "code" | "name" | "createdAt";

// ---------------------------------------------------------------------------
// Tokens (match the dashboard: flat surfaces, 1px strokes, rounded-sm,
// blue + orange in both themes)
// ---------------------------------------------------------------------------

const CARD =
  "rounded-sm border border-zinc-900/[0.08] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.05)] dark:border-white/[0.09] dark:bg-[#111c36]";

const FIELD =
  "h-10 w-full rounded-sm border border-zinc-300 bg-white px-3 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-[#0A5BC4] focus:outline-none focus:ring-2 focus:ring-[#0A5BC4]/25 dark:border-white/15 dark:bg-white/[0.05] dark:text-white dark:placeholder:text-zinc-500 dark:focus:border-orange-400 dark:focus:ring-orange-400/30";

const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-1 focus-visible:ring-offset-white dark:focus-visible:ring-offset-[#111c36]";

const TYPE_META: Record<
  "CORE" | "BASIC" | "COMMON",
  { label: string; badge: string; accent: string; icon: typeof Layers }
> = {
  CORE: {
    label: "Core",
    badge:
      "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800",
    accent: "bg-emerald-500",
    icon: CheckCircle2,
  },
  BASIC: {
    label: "Basic",
    badge:
      "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/40 dark:text-violet-300 dark:border-violet-800",
    accent: "bg-violet-500",
    icon: Layers,
  },
  COMMON: {
    label: "Common",
    badge:
      "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800",
    accent: "bg-sky-500",
    icon: Layers,
  },
};

function typeKey(type?: UnitType): "CORE" | "BASIC" | "COMMON" {
  if (type === UnitType.BASIC) return "BASIC";
  if (type === UnitType.COMMON) return "COMMON";
  return "CORE";
}

function TypeBadge({ type }: { type?: UnitType }) {
  const meta = TYPE_META[typeKey(type)];
  const Icon = meta.icon;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-sm border px-2 py-0.5 text-xs font-medium ${meta.badge}`}
    >
      <Icon className="h-3 w-3" aria-hidden /> {meta.label}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Unit card — the whole card is one link (no nested interactive elements)
// ---------------------------------------------------------------------------

function UnitCard({ unit }: { unit: Unit }) {
  const course = typeof unit.courseId === "object" ? unit.courseId : null;
  const accent = TYPE_META[typeKey(unit.type)].accent;

  return (
    <li className="min-w-0">
      <Link
        href={`/units/${unit._id}`}
        className={`group relative flex h-full flex-col overflow-hidden ${CARD} p-3 pl-4 transition-colors hover:border-orange-400/70 sm:p-4 sm:pl-5 ${FOCUS_RING}`}
      >
        {/* type accent bar */}
        <span
          aria-hidden
          className={`absolute inset-y-0 left-0 w-1 ${accent}`}
        />

        <div className="flex items-start justify-between gap-2">
          <span className="rounded-sm bg-[#0A5BC4]/10 px-2 py-0.5 font-mono text-xs font-bold text-[#0A5BC4] dark:bg-orange-400/15 dark:text-orange-400">
            {unit.code}
          </span>
          <div className="flex flex-wrap justify-end gap-1">
            <TypeBadge type={unit.type} />
            {unit.optionalUnit && (
              <span className="inline-flex items-center gap-1 rounded-sm border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                <Tag className="h-3 w-3" aria-hidden /> Elective
              </span>
            )}
          </div>
        </div>

        <h3 className="mt-3 line-clamp-2 text-base font-semibold leading-snug text-[#082B66] dark:text-white">
          {unit.name}
        </h3>

        {unit.description && (
          <p className="mt-1 line-clamp-2 text-xs text-zinc-600 dark:text-zinc-400">
            {unit.description}
          </p>
        )}

        <div className="mt-auto flex items-center justify-between gap-2 border-t border-zinc-900/[0.07] pt-3 dark:border-white/10">
          <span className="flex min-w-0 items-center gap-1.5 text-xs text-zinc-600 dark:text-zinc-400">
            <GraduationCap
              className="h-3.5 w-3.5 shrink-0 text-[#0A5BC4] dark:text-[#7DB6FF]"
              aria-hidden
            />
            <span className="truncate">
              {course ? `${course.courseCode} · ${course.name}` : "No course"}
            </span>
          </span>
          <span className="inline-flex shrink-0 items-center gap-0.5 text-xs font-semibold text-[#0A5BC4] dark:text-orange-400">
            <span className="hidden sm:inline">Details</span>
            <ChevronRight
              className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
              aria-hidden
            />
          </span>
        </div>
      </Link>
    </li>
  );
}

function UnitCardSkeleton() {
  return (
    <li className={`${CARD} animate-pulse space-y-3 p-4`}>
      <div className="flex justify-between">
        <div className="h-5 w-16 rounded-sm bg-zinc-200 dark:bg-white/10" />
        <div className="h-5 w-14 rounded-sm bg-zinc-200 dark:bg-white/10" />
      </div>
      <div className="h-5 w-3/4 rounded-sm bg-zinc-200 dark:bg-white/10" />
      <div className="h-3 w-full rounded-sm bg-zinc-200 dark:bg-white/10" />
      <div className="h-4 w-1/2 rounded-sm bg-zinc-200 dark:bg-white/10" />
    </li>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function UnitsPage() {
  const [units, setUnits] = useState<Unit[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedCourseId, setSelectedCourseId] = useState<string>("ALL");
  const [unitTypeFilter, setUnitTypeFilter] = useState<TypeFilter>("ALL");

  const [sortBy, setSortBy] = useState<SortKey>("code");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [unitsRes, coursesRes] = await Promise.all([
        unitApi.getAll(),
        courseApi.getAll(),
      ]);

      setUnits(unitsRes.data || []);
      setCourses(coursesRes.data || []);
    } catch (err: unknown) {
      console.error("Failed to fetch units or courses:", err);
      const errorMessage =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: { message?: string } } }).response
              ?.data?.message
          : null;

      setError(errorMessage || "Failed to load units. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Counts for the filter chips
  const counts = useMemo(() => {
    const c = { ALL: units.length, CORE: 0, BASIC: 0, COMMON: 0, OPTIONAL: 0 };
    for (const u of units) {
      c[typeKey(u.type)] += 1;
      if (u.optionalUnit) c.OPTIONAL += 1;
    }
    return c;
  }, [units]);

  const filteredAndSortedUnits = useMemo(() => {
    return units
      .filter((unit) => {
        const query = searchQuery.toLowerCase().trim();
        const matchesSearch =
          !query ||
          unit.name?.toLowerCase().includes(query) ||
          unit.code?.toLowerCase().includes(query) ||
          (unit.description && unit.description.toLowerCase().includes(query));

        const courseIdStr =
          typeof unit.courseId === "string"
            ? unit.courseId
            : unit.courseId?._id;

        const matchesCourse =
          selectedCourseId === "ALL" || courseIdStr === selectedCourseId;

        const currentType = unit.type || UnitType.CORE;
        let matchesType = true;
        if (unitTypeFilter === "OPTIONAL") {
          matchesType = Boolean(unit.optionalUnit);
        } else if (unitTypeFilter === "CORE") {
          matchesType = currentType === UnitType.CORE;
        } else if (unitTypeFilter === "BASIC") {
          matchesType = currentType === UnitType.BASIC;
        } else if (unitTypeFilter === "COMMON") {
          matchesType = currentType === UnitType.COMMON;
        }

        return matchesSearch && matchesCourse && matchesType;
      })
      .sort((a, b) => {
        let valA = "";
        let valB = "";

        if (sortBy === "code") {
          valA = a.code || "";
          valB = b.code || "";
        } else if (sortBy === "name") {
          valA = a.name || "";
          valB = b.name || "";
        } else if (sortBy === "createdAt") {
          valA = a.createdAt || "";
          valB = b.createdAt || "";
        }

        const comparison = valA.localeCompare(valB, undefined, {
          numeric: true,
          sensitivity: "base",
        });

        return sortOrder === "asc" ? comparison : -comparison;
      });
  }, [units, searchQuery, selectedCourseId, unitTypeFilter, sortBy, sortOrder]);

  const hasActiveFilters =
    searchQuery.trim() !== "" ||
    selectedCourseId !== "ALL" ||
    unitTypeFilter !== "ALL";

  const resetFilters = () => {
    setSearchQuery("");
    setSelectedCourseId("ALL");
    setUnitTypeFilter("ALL");
  };

  const toggleSortOrder = () =>
    setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));

  const CHIPS: { key: TypeFilter; label: string }[] = [
    { key: "ALL", label: "All" },
    { key: "CORE", label: "Core" },
    { key: "BASIC", label: "Basic" },
    { key: "COMMON", label: "Common" },
    { key: "OPTIONAL", label: "Elective" },
  ];

  return (
    <div className="mx-auto w-full max-w-full space-y-3 p-3 pb-24 sm:space-y-4 sm:p-5 sm:pb-6 lg:p-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-sm bg-[#0A5BC4] text-white sm:h-11 sm:w-11">
            <BookOpen className="h-5 w-5 sm:h-6 sm:w-6" aria-hidden />
          </span>
          <div className="min-w-0">
            <h1 className="text-xl font-semibold leading-tight tracking-tight text-[#082B66] dark:text-white sm:text-2xl">
              Academic Units
            </h1>
            <p className="hidden text-sm text-zinc-600 dark:text-zinc-400 sm:block">
              Course modules, core subjects, basic units and electives.
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <button
            onClick={fetchData}
            disabled={loading}
            className={`flex h-10 w-10 cursor-pointer items-center justify-center rounded-sm border border-zinc-300 bg-white text-zinc-700 transition-colors hover:bg-zinc-50 disabled:opacity-50 dark:border-white/15 dark:bg-white/[0.05] dark:text-zinc-200 dark:hover:bg-white/10 ${FOCUS_RING}`}
            title="Refresh data"
            aria-label="Refresh data"
          >
            <RefreshCw
              className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
              aria-hidden
            />
          </button>
          <Link
            href="/units/new"
            className="hidden h-10 items-center gap-2 rounded-sm bg-orange-400 px-4 text-sm font-semibold text-[#082B66] transition-colors hover:bg-orange-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#082B66] dark:focus-visible:ring-white sm:inline-flex"
          >
            <Plus className="h-4 w-4" aria-hidden />
            Add unit
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className={`${CARD} space-y-3 p-3 sm:p-4`}>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(0,2fr)_minmax(0,2fr)_minmax(0,1.2fr)]">
          {/* Search */}
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-zinc-400"
              aria-hidden
            />
            <input
              type="text"
              placeholder="Search code, name or description…"
              aria-label="Search units"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`${FIELD} pl-9 ${searchQuery ? "pr-9" : ""}`}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                aria-label="Clear search"
                className="absolute right-1.5 top-1.5 flex h-7 w-7 cursor-pointer items-center justify-center rounded-sm text-zinc-500 hover:bg-zinc-100 dark:hover:bg-white/10"
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            )}
          </div>

          {/* Course */}
          <div>
            <SelectCourse
              value={selectedCourseId === "ALL" ? "" : selectedCourseId}
              onChange={(courseId) => setSelectedCourseId(courseId || "ALL")}
              courses={courses}
              placeholder="All courses"
            />
          </div>

          {/* Sort */}
          <div className="flex items-center gap-2 sm:col-span-2 xl:col-span-1">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortKey)}
              aria-label="Sort by"
              className={`${FIELD} cursor-pointer`}
            >
              <option value="code">Sort by code</option>
              <option value="name">Sort by name</option>
              <option value="createdAt">Sort by date added</option>
            </select>
            <button
              onClick={toggleSortOrder}
              className={`flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-sm border border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-white/15 dark:bg-white/[0.05] dark:text-zinc-200 dark:hover:bg-white/10 ${FOCUS_RING}`}
              title={sortOrder === "asc" ? "Ascending" : "Descending"}
              aria-label={`Sort ${sortOrder === "asc" ? "ascending" : "descending"}`}
            >
              <ArrowUpDown className="h-4 w-4" aria-hidden />
            </button>
          </div>
        </div>

        {/* Type chips: swipeable on mobile */}
        <div
          role="group"
          aria-label="Filter by type"
          className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {CHIPS.map(({ key, label }) => {
            const active = unitTypeFilter === key;
            return (
              <button
                key={key}
                onClick={() => setUnitTypeFilter(key)}
                aria-pressed={active}
                className={`flex h-8 shrink-0 cursor-pointer items-center gap-1.5 rounded-sm border px-3 text-xs font-semibold transition-colors ${FOCUS_RING} ${
                  active
                    ? "border-[#0A5BC4] bg-[#0A5BC4] text-white dark:border-orange-400 dark:bg-orange-400 dark:text-[#082B66]"
                    : "border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-white/15 dark:bg-white/[0.05] dark:text-zinc-200 dark:hover:bg-white/10"
                }`}
              >
                {label}
                <span
                  className={`rounded-sm px-1.5 text-[11px] ${
                    active
                      ? "bg-white/20"
                      : "bg-zinc-100 text-zinc-600 dark:bg-white/10 dark:text-zinc-300"
                  }`}
                >
                  {counts[key]}
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-zinc-900/[0.07] pt-3 text-xs text-zinc-600 dark:border-white/10 dark:text-zinc-400">
          <span>
            Showing <strong>{filteredAndSortedUnits.length}</strong> of{" "}
            <strong>{units.length}</strong> units
          </span>
          {hasActiveFilters && (
            <button
              onClick={resetFilters}
              className="cursor-pointer font-semibold text-[#0A5BC4] hover:underline dark:text-orange-400"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div
          role="alert"
          className="flex items-center gap-3 rounded-sm border border-red-200 bg-red-50 p-3 text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-400"
        >
          <AlertCircle className="h-5 w-5 shrink-0" aria-hidden />
          <p className="flex-1 text-sm">{error}</p>
          <button
            onClick={fetchData}
            className="shrink-0 cursor-pointer text-sm font-semibold underline"
          >
            Retry
          </button>
        </div>
      )}

      {/* Results */}
      {loading ? (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-3 2xl:grid-cols-4 min-[2400px]:grid-cols-5 min-[3200px]:grid-cols-6">
          {[...Array(8)].map((_, i) => (
            <UnitCardSkeleton key={i} />
          ))}
        </ul>
      ) : filteredAndSortedUnits.length === 0 ? (
        <div
          className={`${CARD} border-dashed px-4 py-12 text-center`}
        >
          <FileText
            className="mx-auto mb-3 h-12 w-12 text-zinc-300 dark:text-zinc-600"
            aria-hidden
          />
          <h3 className="text-lg font-semibold text-zinc-800 dark:text-zinc-100">
            No units found
          </h3>
          <p className="mx-auto mt-1 max-w-sm text-sm text-zinc-600 dark:text-zinc-400">
            No units match your filters or search terms.
          </p>
          {hasActiveFilters && (
            <button
              onClick={resetFilters}
              className="mt-4 inline-flex h-10 cursor-pointer items-center rounded-sm bg-[#0A5BC4] px-4 text-sm font-semibold text-white hover:bg-[#0B6BE0] dark:bg-orange-400 dark:text-[#082B66] dark:hover:bg-orange-300"
            >
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-3 2xl:grid-cols-4 min-[2400px]:grid-cols-5 min-[3200px]:grid-cols-6">
          {filteredAndSortedUnits.map((unit) => (
            <UnitCard key={unit._id} unit={unit} />
          ))}
        </ul>
      )}

      {/* Mobile add button */}
      <Link
        href="/units/new"
        className="fixed bottom-[max(1rem,env(safe-area-inset-bottom))] right-4 z-30 inline-flex h-12 items-center gap-2 rounded-sm bg-orange-400 px-4 text-sm font-bold text-[#082B66] shadow-[0_10px_24px_-8px_rgba(249,115,22,0.8)] active:scale-95 sm:hidden"
      >
        <Plus className="h-5 w-5" aria-hidden />
        Add unit
      </Link>
    </div>
  );
}