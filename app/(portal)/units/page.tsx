"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BookOpen,
  Search,
  Filter,
  ArrowUpDown,
  Plus,
  RefreshCw,
  Tag,
  CheckCircle2,
  AlertCircle,
  FileText,
  Layers,
} from "lucide-react";

import { Unit, unitApi, UnitType } from "@/app/types/units";
import { Course, courseApi } from "@/app/types/courses";
import SelectCourse from "@/app/(portal)/courses/selectCourse";

type UnitTypeFilterOption = "ALL" | "CORE" | "BASIC" | "COMMON" | "OPTIONAL";

export default function UnitsPage() {
  const router = useRouter();

  const [units, setUnits] = useState<Unit[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedCourseId, setSelectedCourseId] = useState<string>("ALL");
  const [unitTypeFilter, setUnitTypeFilter] =
    useState<UnitTypeFilterOption>("ALL");

  // Sort state
  const [sortBy, setSortBy] = useState<"code" | "name" | "createdAt">("code");
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

  // Filter and Sort logic
  const filteredAndSortedUnits = useMemo(() => {
    return units
      .filter((unit) => {
        // Search Filter (Code, Name, or Description)
        const query = searchQuery.toLowerCase().trim();
        const matchesSearch =
          !query ||
          unit.name?.toLowerCase().includes(query) ||
          unit.code?.toLowerCase().includes(query) ||
          (unit.description && unit.description.toLowerCase().includes(query));

        // Course Filter
        const courseIdStr =
          typeof unit.courseId === "string"
            ? unit.courseId
            : unit.courseId?._id;

        const matchesCourse =
          selectedCourseId === "ALL" || courseIdStr === selectedCourseId;

        // Type Filter (Core, Basic, Common, or Elective / Optional)
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

  const toggleSortOrder = () => {
    setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
  };

  // Helper function to render Category/Type Badges
  const renderUnitTypeBadge = (type?: UnitType) => {
    const unitType = type || UnitType.CORE;

    switch (unitType) {
      case UnitType.BASIC:
        return (
          <span className="text-xs px-2 py-0.5 bg-purple-50 text-purple-700 border border-purple-200 rounded-sm flex items-center gap-1 font-medium capitalize dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800">
            <Layers className="w-3 h-3" /> Basic
          </span>
        );
      case UnitType.COMMON:
        return (
          <span className="text-xs px-2 py-0.5 bg-sky-50 text-sky-700 border border-sky-200 rounded-sm flex items-center gap-1 font-medium capitalize dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800">
            <Layers className="w-3 h-3" /> Common
          </span>
        );
      case UnitType.CORE:
      default:
        return (
          <span className="text-xs px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-sm flex items-center gap-1 font-medium capitalize dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800">
            <CheckCircle2 className="w-3 h-3" /> Core
          </span>
        );
    }
  };

  return (
    <div className="lg:p-4 max-w-full mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">
            <BookOpen className="w-7 h-7 text-[#082B66] dark:text-orange-400" />
            Academic Units
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Manage and view course modules, core subjects, basic units, and
            elective options.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchData}
            disabled={loading}
            className="p-2 border border-zinc-200 rounded-sm hover:bg-zinc-50 transition text-zinc-600 disabled:opacity-50 cursor-pointer dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
            title="Refresh Data"
            aria-label="Refresh Data"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? "animate-spin" : ""}`} />
          </button>
          <Link
            href="/units/new"
            className="flex items-center gap-2 bg-[#082B66] hover:bg-[#082B66]/90 text-white px-4 py-2 rounded-sm font-medium transition shadow-sm text-sm dark:bg-orange-400 dark:text-zinc-900 dark:hover:bg-orange-400/90"
          >
            <Plus className="w-4 h-4" />
            Add New Unit
          </Link>
        </div>
      </div>

      {/* Controls: Search, Filter, Sort */}
      <div className="bg-white p-4 rounded-sm border border-zinc-200 shadow-sm space-y-4 dark:bg-zinc-900 dark:border-zinc-800">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Search */}
          <div className="relative lg:col-span-1">
            <Search className="w-4 h-4 absolute left-3 top-3 text-zinc-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search by code or name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-zinc-200 rounded-sm focus:ring-2 focus:ring-[#082B66]/30 focus:border-[#082B66] focus:outline-none dark:border-zinc-700 dark:bg-zinc-800 dark:text-white dark:placeholder-zinc-500 dark:focus:ring-orange-400/30 dark:focus:border-orange-400"
            />
          </div>

          {/* Filter by Course (SelectCourse component) */}
          <div className="lg:col-span-1">
            <SelectCourse
              value={selectedCourseId === "ALL" ? "" : selectedCourseId}
              onChange={(courseId) => setSelectedCourseId(courseId || "ALL")}
              courses={courses}
              placeholder="All Courses"
            />
          </div>

          {/* Filter by Unit Type */}
          <div className="flex items-center gap-2">
            <select
              value={unitTypeFilter}
              onChange={(e) =>
                setUnitTypeFilter(e.target.value as UnitTypeFilterOption)
              }
              className="w-full py-2 px-3 text-sm border border-zinc-200 rounded-sm focus:ring-2 focus:ring-[#082B66]/30 focus:border-[#082B66] focus:outline-none bg-white cursor-pointer dark:border-zinc-700 dark:bg-zinc-800 dark:text-white dark:focus:ring-orange-400/30 dark:focus:border-orange-400"
            >
              <option value="ALL">All Categories / Types</option>
              <option value="CORE">Core Units</option>
              <option value="BASIC">Basic Units</option>
              <option value="COMMON">Common Units</option>
              <option value="OPTIONAL">Elective / Optional Units</option>
            </select>
          </div>

          {/* Sort By & Order */}
          <div className="flex items-center gap-2">
            <select
              value={sortBy}
              onChange={(e) =>
                setSortBy(e.target.value as "code" | "name" | "createdAt")
              }
              className="w-full py-2 px-3 text-sm border border-zinc-200 rounded-sm focus:ring-2 focus:ring-[#082B66]/30 focus:border-[#082B66] focus:outline-none bg-white cursor-pointer dark:border-zinc-700 dark:bg-zinc-800 dark:text-white dark:focus:ring-orange-400/30 dark:focus:border-orange-400"
            >
              <option value="code">Sort by Code</option>
              <option value="name">Sort by Name</option>
              <option value="createdAt">Sort by Date Added</option>
            </select>

            <button
              onClick={toggleSortOrder}
              className="p-2 border border-zinc-200 rounded-sm hover:bg-zinc-50 transition text-zinc-600 shrink-0 cursor-pointer dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
              title={`Sort ${sortOrder === "asc" ? "Ascending" : "Descending"}`}
              aria-label={`Sort ${sortOrder === "asc" ? "Ascending" : "Descending"}`}
            >
              <ArrowUpDown className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Status Bar */}
        <div className="flex items-center justify-between border-t border-zinc-100 pt-3 text-xs text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
          <span>
            Showing <strong>{filteredAndSortedUnits.length}</strong> of{" "}
            <strong>{units.length}</strong> total units
          </span>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-sm flex items-center gap-3 dark:bg-red-950/30 dark:border-red-900/50 dark:text-red-400">
          <AlertCircle className="w-5 h-5 shrink-0 text-red-500 dark:text-red-400" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      {/* Loading Skeleton */}
      {loading ? (
        <div className="bg-white border border-zinc-200 rounded-sm p-4 space-y-3 animate-pulse dark:bg-zinc-900 dark:border-zinc-800">
          {[...Array(8)].map((_, index) => (
            <div
              key={index}
              className="flex items-center gap-4 border-b border-zinc-100 dark:border-zinc-800 pb-3"
            >
              <div className="h-5 w-20 bg-zinc-200 rounded-sm dark:bg-zinc-800"></div>
              <div className="h-5 flex-1 bg-zinc-200 rounded-sm dark:bg-zinc-800"></div>
              <div className="h-5 w-40 bg-zinc-200 rounded-sm dark:bg-zinc-800"></div>
              <div className="h-5 w-24 bg-zinc-200 rounded-sm dark:bg-zinc-800"></div>
            </div>
          ))}
        </div>
      ) : filteredAndSortedUnits.length === 0 ? (
        /* Empty State */
        <div className="text-center py-12 bg-white rounded-sm border border-dashed border-zinc-300 dark:bg-zinc-900 dark:border-zinc-700">
          <FileText className="w-12 h-12 text-zinc-300 mx-auto mb-3 dark:text-zinc-700" />
          <h3 className="text-lg font-semibold text-zinc-800 dark:text-zinc-100">
            No Units Found
          </h3>
          <p className="text-sm text-zinc-500 mt-1 max-w-sm mx-auto dark:text-zinc-400">
            No units match your selected filters or search terms. Try resetting
            your search filters.
          </p>
        </div>
      ) : (
        /* Table Display */
        <div className="bg-white border border-zinc-200 rounded-sm overflow-hidden shadow-sm dark:bg-zinc-900 dark:border-zinc-800">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-600 font-medium dark:bg-zinc-800/50 dark:border-zinc-800 dark:text-zinc-400">
                <tr>
                  <th className="py-3 px-4">Code</th>
                  <th className="py-3 px-4">Unit Name</th>
                  <th className="py-3 px-4">Course</th>
                  <th className="py-3 px-4">Category / Type</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {filteredAndSortedUnits.map((unit) => {
                  const courseObj =
                    typeof unit.courseId === "object" ? unit.courseId : null;

                  return (
                    <tr
                      key={unit._id}
                      onClick={() => router.push(`/units/${unit._id}`)}
                      className="cursor-pointer hover:bg-zinc-50/70 transition dark:hover:bg-zinc-800/50"
                    >
                      <td className="py-3 px-4 font-mono text-xs font-bold text-[#082B66] dark:text-orange-400">
                        {unit.code}
                      </td>
                      <td className="py-3 px-4 font-medium text-zinc-900 dark:text-white">
                        {unit.name}
                      </td>
                      <td className="py-3 px-4 text-zinc-600 text-xs dark:text-zinc-400">
                        {courseObj
                          ? `${courseObj.courseCode} - ${courseObj.name}`
                          : "—"}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {renderUnitTypeBadge(unit.type)}

                          {unit.optionalUnit && (
                            <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-sm font-medium dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800">
                              <Tag className="w-3 h-3" /> Elective
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Link
                          href={`/units/${unit._id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="text-xs font-medium text-[#082B66] hover:text-[#082B66]/80 hover:underline dark:text-orange-400 dark:hover:text-orange-300"
                        >
                          View Details
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}