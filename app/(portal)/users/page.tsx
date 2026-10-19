"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  Users,
  Search,
  UserPlus,
  ShieldCheck,
  User,
  GraduationCap,
  AlertCircle,
  ChevronRight,
  X,
  RotateCw,
  type LucideIcon,
} from "lucide-react";
import api from "@/app/lib/api";
import { User as UserType, UserRole } from "@/app/lib/types";
import RequireRole from "@/app/components/navigation/RequireRole";

/* ------------------------------------------------------------------ */
/* Config                                                              */
/* ------------------------------------------------------------------ */

const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400";

const HIDE_SCROLLBAR =
  "[scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden";

type RoleFilter = "all" | "admin" | "staff" | "student";
type SortKey = "name-asc" | "name-desc" | "role";

interface RoleStyle {
  label: string;
  icon: LucideIcon;
  /** Icon colour, used in the filter tabs and badges. */
  icon_cls: string;
  /** Badge surface + text. */
  badge: string;
}

const ROLE_STYLES: Record<string, RoleStyle> = {
  admin: {
    label: "Admin",
    icon: ShieldCheck,
    icon_cls: "text-orange-500 dark:text-orange-400",
    badge:
      "bg-orange-400/10 text-orange-700 ring-orange-400/30 dark:text-orange-300",
  },
  staff: {
    label: "Staff",
    icon: User,
    icon_cls: "text-sky-600 dark:text-sky-400",
    badge: "bg-sky-500/10 text-sky-700 ring-sky-500/25 dark:text-sky-300",
  },
  student: {
    label: "Student",
    icon: GraduationCap,
    icon_cls: "text-emerald-600 dark:text-emerald-400",
    badge:
      "bg-emerald-500/10 text-emerald-700 ring-emerald-500/25 dark:text-emerald-300",
  },
};

const FALLBACK_ROLE: RoleStyle = {
  label: "User",
  icon: User,
  icon_cls: "text-zinc-500 dark:text-zinc-400",
  badge: "bg-zinc-500/10 text-zinc-700 ring-zinc-500/20 dark:text-zinc-300",
};

const ROLE_ORDER = ["admin", "staff", "student"];

const FILTERS: { key: RoleFilter; label: string; icon: LucideIcon; icon_cls: string }[] = [
  { key: "all", label: "All", icon: Users, icon_cls: "text-indigo-600 dark:text-indigo-400" },
  { key: "admin", label: "Admin", icon: ShieldCheck, icon_cls: ROLE_STYLES.admin.icon_cls },
  { key: "staff", label: "Staff", icon: User, icon_cls: ROLE_STYLES.staff.icon_cls },
  { key: "student", label: "Student", icon: GraduationCap, icon_cls: ROLE_STYLES.student.icon_cls },
];

const roleStyle = (role: UserRole | string): RoleStyle =>
  ROLE_STYLES[String(role)] ?? { ...FALLBACK_ROLE, label: String(role) };

const getId = (u: UserType) => u.id || (u as any)._id; // Mongoose _id or virtual id

/* ------------------------------------------------------------------ */
/* Small pieces                                                        */
/* ------------------------------------------------------------------ */

function RoleBadge({ role }: { role: UserRole | string }) {
  const s = roleStyle(role);
  const Icon = s.icon;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-sm px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${s.badge}`}
    >
      <Icon className="h-3 w-3" strokeWidth={2.2} />
      {s.label}
    </span>
  );
}

function UserAvatar({
  user,
  className = "h-11 w-11 rounded-sm ring-1 ring-inset ring-orange-400/30",
}: {
  user: UserType;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);

  useEffect(() => setFailed(false), [user.profileImage]);

  const initials =
    user.name
      ?.split(" ")
      .filter(Boolean)
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "U";

  return (
    <span
      className={`
        flex shrink-0 items-center justify-center overflow-hidden
        bg-[#0B1E3D] text-sm font-bold text-orange-400
        ${className}
      `}
    >
      {user.profileImage && !failed ? (
        <img
          src={user.profileImage}
          alt={user.name}
          className="h-full w-full object-cover object-top"
          onError={() => setFailed(true)}
        />
      ) : (
        initials
      )}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

function UsersContent() {
  const [users, setUsers] = useState<UserType[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedRole, setSelectedRole] = useState<RoleFilter>("all");
  const [sort, setSort] = useState<SortKey>("name-asc");

  const searchRef = useRef<HTMLInputElement>(null);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      // Calls GET /users via NestJS UserService.findAll()
      const response = await api.get<UserType[]>("/users");
      setUsers(response.data);
    } catch (err: any) {
      console.error("Failed to fetch users:", err);
      setError(
        err.response?.data?.message || "Failed to load users. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // "/" jumps to search, like a file explorer.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = document.activeElement as HTMLElement | null;
      const typing =
        el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT" || el.isContentEditable);
      if (e.key === "/" && !typing && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: users.length };
    users.forEach((u) => {
      c[u.role] = (c[u.role] ?? 0) + 1;
    });
    return c;
  }, [users]);

  const filteredUsers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = users.filter((user) => {
      const matchesSearch =
        !q ||
        user.name.toLowerCase().includes(q) ||
        user.email.toLowerCase().includes(q);
      const matchesRole = selectedRole === "all" || user.role === selectedRole;
      return matchesSearch && matchesRole;
    });

    const byName = (a: UserType, b: UserType) =>
      a.name.localeCompare(b.name, undefined, { sensitivity: "base" });

    return [...list].sort((a, b) => {
      if (sort === "name-desc") return byName(b, a);
      if (sort === "role") {
        const ra = ROLE_ORDER.indexOf(a.role);
        const rb = ROLE_ORDER.indexOf(b.role);
        return (ra === -1 ? 99 : ra) - (rb === -1 ? 99 : rb) || byName(a, b);
      }
      return byName(a, b);
    });
  }, [users, searchQuery, selectedRole, sort]);

  const hasFilters = searchQuery.trim() !== "" || selectedRole !== "all";
  const clearFilters = () => {
    setSearchQuery("");
    setSelectedRole("all");
  };

  /* ---------------- render ---------------- */

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-sm bg-orange-400/10 text-orange-500 ring-1 ring-inset ring-orange-400/30 dark:text-orange-400">
            <Users className="h-5 w-5" strokeWidth={2} />
          </span>
          <div className="min-w-0">
            <h1 className="text-xl font-bold tracking-tight text-[#0B1E3D] dark:text-white">
              Users
            </h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Manage staff accounts and student roles.
            </p>
          </div>
        </div>

        <Link
          href="/users/new"
          className={`
            inline-flex h-10 items-center justify-center gap-2 rounded-sm px-4
            bg-[#0B1E3D] text-sm font-semibold text-white transition-colors
            hover:bg-[#0B1E3D]/90 active:bg-[#0B1E3D]/80
            dark:bg-orange-400 dark:text-[#0B1E3D] dark:hover:bg-orange-300 dark:active:bg-orange-500
            ${FOCUS_RING} focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#0B1E3D]
          `}
        >
          <UserPlus className="h-4 w-4 text-orange-400 dark:text-[#0B1E3D]" />
          <span>Add user</span>
        </Link>
      </div>

      {/* Command bar */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        {/* Search */}
        <label
          className="
            flex h-10 w-full items-center gap-2 rounded-sm border-b-2 border-transparent
            bg-zinc-100 px-3 text-zinc-400 transition-colors lg:max-w-xs
            focus-within:border-orange-400 focus-within:bg-white focus-within:shadow-sm
            dark:bg-white/5 dark:text-zinc-500 dark:focus-within:bg-white/10
          "
        >
          <Search className="h-4 w-4 shrink-0" />
          <input
            ref={searchRef}
            type="text"
            placeholder="Search name or email"
            aria-label="Search users by name or email"
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

        {/* Role filter: segmented control with counts */}
        <div
          role="group"
          aria-label="Filter by role"
          className={`flex items-center gap-0.5 overflow-x-auto rounded-sm bg-zinc-100 p-0.5 dark:bg-white/5 ${HIDE_SCROLLBAR}`}
        >
          {FILTERS.map(({ key, label, icon: Icon, icon_cls }) => {
            const active = selectedRole === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setSelectedRole(key)}
                aria-pressed={active}
                className={`
                  flex h-8 shrink-0 items-center gap-1.5 rounded-sm px-2.5 text-[13px] font-medium
                  transition-colors ${FOCUS_RING}
                  ${active
                    ? "bg-white font-semibold text-[#0B1E3D] shadow-sm dark:bg-white/10 dark:text-white"
                    : "text-zinc-600 hover:bg-white/60 hover:text-[#0B1E3D] dark:text-zinc-400 dark:hover:bg-white/5 dark:hover:text-white"
                  }
                `}
              >
                <Icon className={`h-3.5 w-3.5 ${icon_cls}`} strokeWidth={2.2} />
                {label}
                <span
                  className={`text-[11px] tabular-nums ${active
                    ? "text-orange-600 dark:text-orange-400"
                    : "text-zinc-400 dark:text-zinc-500"
                    }`}
                >
                  {counts[key] ?? 0}
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2 lg:ml-auto">
          {/* Sort */}
          <label className="sr-only" htmlFor="users-sort">
            Sort users
          </label>
          <select
            id="users-sort"
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            className={`
              h-10 rounded-sm border border-zinc-200 bg-white px-2.5 text-[13px] font-medium
              text-zinc-700 transition-colors hover:border-zinc-300
              dark:border-white/10 dark:bg-[#0B1E3D] dark:text-zinc-200 dark:hover:border-white/20
              ${FOCUS_RING}
            `}
          >
            <option value="name-asc">Name A–Z</option>
            <option value="name-desc">Name Z–A</option>
            <option value="role">Role</option>
          </select>
        </div>
      </div>

      {/* Error: inline info bar */}
      {!loading && error && (
        <div
          role="alert"
          className="flex items-center gap-3 rounded-sm border border-red-200 border-l-4 border-l-red-500 bg-red-50 p-3.5 text-red-700 dark:border-red-500/20 dark:border-l-red-500 dark:bg-red-500/10 dark:text-red-300"
        >
          <AlertCircle className="h-5 w-5 shrink-0" />
          <p className="min-w-0 flex-1 text-sm">{error}</p>
          <button
            type="button"
            onClick={fetchUsers}
            className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-sm px-2.5 text-xs font-semibold transition-colors hover:bg-red-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 dark:hover:bg-red-500/20"
          >
            <RotateCw className="h-3.5 w-3.5" />
            Retry
          </button>
        </div>
      )}

      {/* Loading: skeletons that match the list layout */}
      {loading && (
        <div
          aria-busy="true"
          aria-label="Loading users"
          className="divide-y divide-zinc-200/80 overflow-hidden rounded-sm border border-zinc-200/80 dark:divide-white/10 dark:border-white/10"
        >
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-2.5">
              <div className="h-9 w-9 animate-pulse rounded-sm bg-zinc-200 dark:bg-white/10" />
              <div className="flex-1 space-y-2">
                <div className="h-3.5 w-32 animate-pulse rounded-sm bg-zinc-200 dark:bg-white/10" />
                <div className="h-3 w-48 max-w-full animate-pulse rounded-sm bg-zinc-100 dark:bg-white/5" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Results */}
      {!loading && !error && (
        <>
          <p
            aria-live="polite"
            className="text-xs text-zinc-500 dark:text-zinc-400"
          >
            {hasFilters
              ? `${filteredUsers.length} of ${users.length} users`
              : `${users.length} ${users.length === 1 ? "user" : "users"}`}
          </p>

          {filteredUsers.length === 0 ? (
            <div className="rounded-sm border border-dashed border-zinc-300 px-6 py-14 text-center dark:border-white/15">
              <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-sm bg-orange-400/10 text-orange-500 ring-1 ring-inset ring-orange-400/30 dark:text-orange-400">
                <Users className="h-6 w-6" />
              </span>
              <p className="mt-3 text-sm font-semibold text-[#0B1E3D] dark:text-white">
                {hasFilters ? "No users match your search" : "No users yet"}
              </p>
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                {hasFilters
                  ? "Try a different name or email, or choose another role."
                  : "Add the first user to get started."}
              </p>
              {hasFilters ? (
                <button
                  type="button"
                  onClick={clearFilters}
                  className={`mt-4 inline-flex h-9 items-center rounded-sm border border-zinc-200 px-3.5 text-[13px] font-semibold text-[#0B1E3D] transition-colors hover:bg-zinc-100 dark:border-white/15 dark:text-white dark:hover:bg-white/10 ${FOCUS_RING}`}
                >
                  Clear filters
                </button>
              ) : (
                <Link
                  href="/users/new"
                  className={`mt-4 inline-flex h-9 items-center gap-2 rounded-sm bg-[#0B1E3D] px-3.5 text-[13px] font-semibold text-white transition-colors hover:bg-[#0B1E3D]/90 dark:bg-orange-400 dark:text-[#0B1E3D] dark:hover:bg-orange-300 ${FOCUS_RING}`}
                >
                  <UserPlus className="h-4 w-4" />
                  Add user
                </Link>
              )}
            </div>
          ) : (
            <div className="overflow-hidden rounded-sm border border-zinc-200/80 dark:border-white/10">
              {/* Column header */}
              <div className="hidden grid-cols-[minmax(0,1.3fr)_minmax(0,1.5fr)_8rem_1rem] gap-4 border-b border-zinc-200/80 bg-zinc-50 px-4 py-2 text-xs font-semibold text-zinc-500 dark:border-white/10 dark:bg-white/4 dark:text-zinc-400 md:grid">
                <span>Name</span>
                <span>Email</span>
                <span>Role</span>
                <span />
              </div>

              <ul className="divide-y divide-zinc-200/80 dark:divide-white/10">
                {filteredUsers.map((user) => {
                  const userId = getId(user);
                  return (
                    <li key={userId}>
                      <Link
                        href={`/users/${userId}`}
                        className={`
                          group relative flex items-center gap-3 px-4 py-2.5 transition-colors
                          hover:bg-[#0B1E3D]/4 dark:hover:bg-white/6
                          md:grid md:grid-cols-[minmax(0,1.3fr)_minmax(0,1.5fr)_8rem_1rem] md:gap-4
                          ${FOCUS_RING} focus-visible:ring-inset
                        `}
                      >
                        <span className="absolute left-0 top-1/2 h-4 w-0.75 origin-center -translate-y-1/2 scale-y-0 rounded-sm bg-orange-400 transition-transform duration-200 group-hover:scale-y-100 group-focus-visible:scale-y-100" />

                        <span className="flex min-w-0 flex-1 items-center gap-3 md:flex-none">
                          <UserAvatar user={user} className="h-9 w-9 text-xs" />
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-semibold text-[#0B1E3D] dark:text-white">
                              {user.name}
                            </span>
                            <span className="block truncate text-xs text-zinc-500 dark:text-zinc-400 md:hidden">
                              {user.email}
                            </span>
                          </span>
                        </span>

                        <span className="hidden truncate text-sm text-zinc-600 dark:text-zinc-300 md:block">
                          {user.email}
                        </span>

                        <span className="shrink-0">
                          <RoleBadge role={user.role} />
                        </span>

                        <ChevronRight className="hidden h-4 w-4 text-zinc-300 transition-all group-hover:translate-x-0.5 group-hover:text-orange-500 dark:text-zinc-600 dark:group-hover:text-orange-400 md:block" />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function UsersPage() {
  return (
    <RequireRole role="admin">
      <UsersContent />
    </RequireRole>
  );
}