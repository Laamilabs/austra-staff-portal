"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Building2,
  Search,
  RefreshCw,
  Plus,
  AlertCircle,
} from "lucide-react";

import { departmentApi, Department } from "@/app/types/department";
import DepartmentCard from "./DepartmentCard";
import RequireRoleInline from "@/app/components/navigation/RequiredRoleInline";

/* Grid recipe — keep this consistent between the live grid and the skeleton:
 *   mobile      → 1 column
 *   md and up   → 2 columns
 *   2xl and up  → 3 columns
 */
const GRID_CLASSES =
  "grid grid-cols-1 gap-5 md:grid-cols-2 3xl:grid-cols-3";

export default function DepartmentsPage() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchDepartments = useCallback(async (isRefresh = false) => {
    try {
      setError(null);

      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const response = await departmentApi.getAll();
      setDepartments(response.data);
    } catch (err: any) {
      console.error("Failed to fetch departments:", err);

      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to load departments."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchDepartments();
  }, [fetchDepartments]);

  const filteredDepartments = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return departments;
    }

    return departments.filter((department) => {
      return (
        department.name?.toLowerCase().includes(query) ||
        department.description?.toLowerCase().includes(query) ||
        department.hod?.name?.toLowerCase().includes(query)
      );
    });
  }, [departments, search]);

  const handleDelete = async (department: Department) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${department.name}"?`
    );

    if (!confirmed) {
      return;
    }

    try {
      setDeletingId(department._id);
      setError(null);

      await departmentApi.delete(department._id);

      setDepartments((current) =>
        current.filter((item) => item._id !== department._id)
      );
    } catch (err: any) {
      console.error("Failed to delete department:", err);

      setError(
        err?.response?.data?.message ||
          err?.message ||
          `Failed to delete ${department.name}.`
      );
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <main className="min-h-full bg-zinc-50/10 dark:bg-zinc-950/10">
      <div className="mx-auto max-w-400 px-4 py-6 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
              <Building2 className="h-4 w-4" />
              <span>Academic Management</span>
            </div>

            <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white sm:text-3xl">
              Departments
            </h1>

            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              Manage academic departments, courses and faculty.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => fetchDepartments(true)}
              disabled={refreshing}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-700 shadow-sm transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
            >
              <RefreshCw
                className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
              />
              Refresh
            </button>
            <RequireRoleInline role="admin">
              <Link
                href="/departments/new"
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-zinc-900 px-4 text-sm font-medium text-white shadow-sm transition hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
              >
                <Plus className="h-4 w-4" />
                Add Department
              </Link>
            </RequireRoleInline>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />

            <div className="flex-1">
              <p className="font-medium">Something went wrong</p>
              <p className="mt-1 text-sm opacity-90">{error}</p>
            </div>

            <button
              type="button"
              onClick={() => fetchDepartments()}
              className="text-sm font-medium underline underline-offset-2 hover:no-underline"
            >
              Retry
            </button>
          </div>
        )}

        {/* Search */}
        <div className="mb-6">
          <div className="relative max-w-xl">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />

            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search departments..."
              className="h-11 w-full rounded-xl border border-zinc-200 bg-white pl-10 pr-4 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200 dark:border-zinc-800 dark:bg-zinc-900 dark:text-white dark:focus:border-zinc-600 dark:focus:ring-zinc-800"
            />
          </div>
        </div>

        {/* Loading / Empty / Grid */}
        {loading ? (
          <DepartmentSkeleton />
        ) : filteredDepartments.length === 0 ? (
          <EmptyState search={search} />
        ) : (
          <div className={GRID_CLASSES}>
            {filteredDepartments.map((department) => (
              <DepartmentCard
                key={department._id}
                department={department}
                deleting={deletingId === department._id}
                onDelete={() => handleDelete(department)}
              />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

/* -------------------------------------------------------------------------- */
/* Empty State                                                                */
/* -------------------------------------------------------------------------- */

function EmptyState({ search }: { search: string }) {
  return (
    <div className="flex min-h-90 flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-300 bg-white px-6 text-center dark:border-zinc-700 dark:bg-zinc-900">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800">
        <Building2 className="h-6 w-6 text-zinc-500 dark:text-zinc-400" />
      </div>

      <h2 className="mt-4 text-base font-semibold text-zinc-900 dark:text-white">
        {search ? "No departments found" : "No departments yet"}
      </h2>

      <p className="mt-1 max-w-sm text-sm text-zinc-500 dark:text-zinc-400">
        {search
          ? `No departments match "${search}". Try a different search term.`
          : "Departments will appear here once they have been created."}
      </p>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Loading Skeleton                                                           */
/* -------------------------------------------------------------------------- */

function DepartmentSkeleton() {
  return (
    <div className={GRID_CLASSES}>
      {Array.from({ length: 6 }).map((_, index) => (
        <div
          key={index}
          className="overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"
        >
          <div className="animate-pulse p-5">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-zinc-200 dark:bg-zinc-800" />

              <div className="flex-1">
                <div className="h-4 w-2/3 rounded bg-zinc-200 dark:bg-zinc-800" />
                <div className="mt-2 h-3 w-1/3 rounded bg-zinc-200 dark:bg-zinc-800" />
              </div>
            </div>

            <div className="mt-5 space-y-2">
              <div className="h-3 w-full rounded bg-zinc-200 dark:bg-zinc-800" />
              <div className="h-3 w-4/5 rounded bg-zinc-200 dark:bg-zinc-800" />
            </div>
          </div>

          <div className="grid grid-cols-2 border-t border-zinc-100 dark:border-zinc-800">
            <div className="animate-pulse p-4">
              <div className="h-3 w-16 rounded bg-zinc-200 dark:bg-zinc-800" />
              <div className="mt-2 h-5 w-8 rounded bg-zinc-200 dark:bg-zinc-800" />
            </div>

            <div className="animate-pulse border-l border-zinc-100 p-4 dark:border-zinc-800">
              <div className="h-3 w-16 rounded bg-zinc-200 dark:bg-zinc-800" />
              <div className="mt-2 h-5 w-8 rounded bg-zinc-200 dark:bg-zinc-800" />
            </div>
          </div>

          <div className="animate-pulse border-t border-zinc-100 p-4 dark:border-zinc-800">
            <div className="h-3 w-28 rounded bg-zinc-200 dark:bg-zinc-800" />
            <div className="mt-2 h-4 w-40 rounded bg-zinc-200 dark:bg-zinc-800" />
          </div>
        </div>
      ))}
    </div>
  );
}