"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Plus,
  Search,
  Users,
  RefreshCw,
  UserCheck,
  UserX,
  UserPlus,
  X,
  Check,
} from "lucide-react";

import api from "@/app/lib/api";
import { User } from "@/app/lib/types";
import { Faculty } from "@/app/types/faculty";
import RequireRoleInline from "@/app/components/navigation/RequiredRoleInline";

export default function FacultyPage() {
  const [faculty, setFaculty] = useState<Faculty[]>([]);
  const [unlinkedUsers, setUnlinkedUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("all");

  // Assign user modal state
  const [selectedFaculty, setSelectedFaculty] = useState<Faculty | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [assigning, setAssigning] = useState(false);
  const [assignError, setAssignError] = useState("");

  const fetchFaculty = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await api.get<Faculty[]>("/faculty");
      setFaculty(response.data);
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
        "Failed to load faculty members. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  const fetchUnlinkedUsers = async () => {
    try {
      const response = await api.get<User[]>("/users");
      setUnlinkedUsers(response.data);
    } catch {
      // Non-critical background fetch; fallback to empty if endpoint isn't present
      setUnlinkedUsers([]);
    }
  };

  useEffect(() => {
    fetchFaculty();
    fetchUnlinkedUsers();
  }, []);


 const departments = useMemo(() => {
  const map = new Map<string, string>();

  faculty.forEach((member) => {
    if (
      member.department &&
      typeof member.department === "object" &&
      member.department._id
    ) {
      map.set(member.department._id, member.department.name);
    }
  });

  return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
}, [faculty]);

const filteredFaculty = useMemo(() => {
  const query = search.trim().toLowerCase();

  return faculty.filter((member) => {
    const matchesDepartment =
      departmentFilter === "all" ||
      getDepartmentId(member) === departmentFilter;

    if (!matchesDepartment) return false;
    if (!query) return true;

    const userAccount = getUserAccount(member);

    return [
      member.name,
      member.staffNo,
      member.qualification,
      member.expertise,
      member.description,
      getDepartmentName(member),
      userAccount?.name ?? "",
      userAccount?.email ?? "",
    ]
      .filter(Boolean)
      .some((value) => value.toLowerCase().includes(query));
  });
}, [faculty, search, departmentFilter]);

const getDepartmentId = (member: Faculty): string | null => {
  if (!member.department) return null;
  return typeof member.department === "object"
    ? member.department._id
    : member.department;
};

const getDepartmentName = (member: Faculty) => {
  if (member.department && typeof member.department === "object") {
    return member.department.name;
  }
  return "No department";
};

const getUserAccount = (member: Faculty): User | null => {
  if (member.user && typeof member.user === "object") {
    return member.user;
  }
  return null;
};

  return (
    <main className="min-h-full bg-zinc-50 dark:bg-zinc-950">
      <div className="mx-auto max-w-full px-4 py-6 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-sm bg-[#082B66]/10 text-[#082B66] dark:bg-[#082B66]/30 dark:text-orange-400">
                <Users className="h-5 w-5" />
              </div>

              <div>
                <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-white">
                  Faculty
                </h1>

                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  Manage academic staff and their linked user accounts.
                </p>
              </div>
            </div>
          </div>
          <RequireRoleInline role="admin">
            <Link
              href="/faculty/new"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-sm bg-[#082B66] px-4 text-sm font-medium text-white transition hover:bg-[#082B66]/90 dark:bg-orange-400 dark:text-zinc-950 dark:hover:bg-orange-300"
            >
              <Plus className="h-4 w-4" />
              Add Faculty
            </Link>
          </RequireRoleInline>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-5 flex items-center justify-between gap-4 rounded-sm border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
            <span>{error}</span>

            <button
              type="button"
              onClick={fetchFaculty}
              className="inline-flex shrink-0 items-center gap-2 rounded-sm border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 dark:border-red-900 dark:bg-red-950 dark:text-red-300"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Retry
            </button>
          </div>
        )}

        {/* Filters */}
        <div className="mb-5 rounded-sm border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex flex-col gap-3 lg:flex-row">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />

              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search faculty by name, staff number, email, expertise..."
                className="h-10 w-full rounded-sm border border-zinc-200 bg-zinc-50 pl-10 pr-4 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-[#082B66] focus:ring-2 focus:ring-[#082B66]/10 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white dark:focus:border-orange-400 dark:focus:ring-orange-400/10"
              />
            </div>

            {/* Department Filter */}
            <select
              value={departmentFilter}
              onChange={(event) =>
                setDepartmentFilter(event.target.value)
              }
              className="h-10 rounded-sm border border-zinc-200 bg-zinc-50 px-3 text-sm text-zinc-700 outline-none focus:border-[#082B66] focus:ring-2 focus:ring-[#082B66]/10 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-300 dark:focus:border-orange-400 dark:focus:ring-orange-400/10"
            >
              <option value="all">All Departments</option>

              {departments.map((department) => (
                <option
                  key={department.id}
                  value={department.id}
                >
                  {department.name}
                </option>
              ))}
            </select>

            {/* Refresh */}
            <button
              type="button"
              onClick={fetchFaculty}
              disabled={loading}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-sm border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              <RefreshCw
                className={`h-4 w-4 ${loading ? "animate-spin" : ""
                  }`}
              />
              Refresh
            </button>
          </div>
        </div>
        {/* Results Count */}
        {!loading && filteredFaculty.length > 0 && (
          <div className="mt-3 text-right text-xs text-zinc-500 dark:text-zinc-400">
            Showing {filteredFaculty.length} of {faculty.length} faculty
            member{faculty.length === 1 ? "" : "s"}
          </div>
        )}
        {/* Content */}
        <div className="overflow-hidden rounded-sm border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          {loading ? (
            <FacultyTableSkeleton />
          ) : filteredFaculty.length === 0 ? (
            <EmptyState
              hasFilters={Boolean(
                search || departmentFilter !== "all",
              )}
              onClear={() => {
                setSearch("");
                setDepartmentFilter("all");
              }}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-225">
                <thead>
                  <tr className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950/50">
                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                      Faculty
                    </th>

                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                      Staff No.
                    </th>

                    <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                      Department
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {filteredFaculty.map((member) => {
                    const userAccount = getUserAccount(member);

                    return (
                      <tr
                        key={member._id}
                        className="transition hover:bg-zinc-50 dark:hover:bg-zinc-800/40"
                      >
                        {/* Faculty Name */}
                        <td className="px-5 py-4">
                          <Link
                            href={`/faculty/${member._id}`}
                            className="group flex items-center gap-3"
                          >
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-sm bg-[#082B66]/10 text-sm font-semibold text-[#082B66] transition group-hover:bg-[#082B66]/20 dark:bg-[#082B66]/30 dark:text-orange-400 dark:group-hover:bg-[#082B66]/50">
                              {getInitials(member.name)}
                            </div>

                            <div className="min-w-0">
                              <p className="truncate font-medium text-zinc-900 transition group-hover:text-[#082B66] dark:text-white dark:group-hover:text-orange-400">
                                {member.name}
                              </p>
                              {userAccount?.email && (
                                <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
                                  {userAccount.email}
                                </p>
                              )}
                            </div>
                          </Link>
                        </td>

                        {/* Staff Number */}
                        <td className="px-5 py-4">
                          <span className="text-sm text-zinc-700 dark:text-zinc-300">
                            {member.staffNo || "—"}
                          </span>
                        </td>

                        {/* Department */}
                        <td className="px-5 py-4">
                          <div className="max-w-70">
                            <p className="truncate text-sm font-medium text-zinc-800 dark:text-zinc-200">
                              {getDepartmentName(member)}
                            </p>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

/* -------------------------------------------------------------------------- */
/* Components                                                                 */
/* -------------------------------------------------------------------------- */

function FacultyTableSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="h-12 border-b border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950/50" />

      {Array.from({ length: 6 }).map((_, index) => (
        <div
          key={index}
          className="flex items-center gap-6 border-b border-zinc-100 px-5 py-4 dark:border-zinc-800"
        >
          <div className="flex min-w-55 items-center gap-3">
            <div className="h-10 w-10 shrink-0 rounded-sm bg-zinc-200 dark:bg-zinc-800" />
            <div className="h-4 w-40 rounded-sm bg-zinc-200 dark:bg-zinc-800" />
          </div>

          <div className="h-4 w-24 rounded-sm bg-zinc-200 dark:bg-zinc-800" />
          <div className="h-4 w-48 rounded-sm bg-zinc-200 dark:bg-zinc-800" />
          <div className="h-4 w-32 rounded-sm bg-zinc-200 dark:bg-zinc-800" />
          <div className="ml-auto h-7 w-20 rounded-sm bg-zinc-200 dark:bg-zinc-800" />
        </div>
      ))}
    </div>
  );
}

function EmptyState({
  hasFilters,
  onClear,
}: {
  hasFilters: boolean;
  onClear: () => void;
}) {
  return (
    <div className="flex min-h-90 flex-col items-center justify-center px-6 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-sm bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
        <Users className="h-6 w-6" />
      </div>

      <h3 className="text-base font-semibold text-zinc-900 dark:text-white">
        {hasFilters
          ? "No faculty found"
          : "No faculty members yet"}
      </h3>

      <p className="mt-1 max-w-sm text-sm text-zinc-500 dark:text-zinc-400">
        {hasFilters
          ? "Try changing your search or department filter."
          : "Add your first faculty member to start managing academic staff."}
      </p>

      {hasFilters ? (
        <button
          type="button"
          onClick={onClear}
          className="mt-5 rounded-sm bg-[#082B66] px-4 py-2 text-sm font-medium text-white hover:bg-[#082B66]/90 dark:bg-orange-400 dark:text-zinc-950 dark:hover:bg-orange-300"
        >
          Clear Filters
        </button>
      ) : (
        <RequireRoleInline role="admin">
          <Link
            href="/faculty/new"
            className="mt-5 inline-flex items-center gap-2 rounded-sm bg-[#082B66] px-4 py-2 text-sm font-medium text-white hover:bg-[#082B66]/90 dark:bg-orange-400 dark:text-zinc-950 dark:hover:bg-orange-300"
          >
            <Plus className="h-4 w-4" />
            Add Faculty
          </Link>
        </RequireRoleInline>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function getInitials(name: string) {
  if (!name) {
    return "F";
  }

  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}