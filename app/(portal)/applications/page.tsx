// app/(portal)/applications/page.tsx
"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
    AlertCircle,
    CheckCircle2,
    ChevronRight,
    Clock,
    FileText,
    Globe,
    Hourglass,
    LayoutList,
    MinusCircle,
    Plus,
    RefreshCw,
    Search,
    X,
    XCircle,
    type LucideIcon,
} from "lucide-react";
import {
    applicationApi,
    type Application,
    type ApplicationStatus,
} from "../../types/application";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

type SortKey = "newest" | "oldest" | "applicant-asc" | "applicant-desc" | "status";
type StatusFilter = ApplicationStatus | "all";

const PAGE_SIZE = 25;

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
    { value: "newest", label: "Newest first" },
    { value: "oldest", label: "Waiting longest" },
    { value: "applicant-asc", label: "Applicant A to Z" },
    { value: "applicant-desc", label: "Applicant Z to A" },
    { value: "status", label: "Needs attention first" },
];

const STATUS_META: Record<
    ApplicationStatus,
    { label: string; icon: LucideIcon; badge: string; tile: string }
> = {
    pending: {
        label: "Pending",
        icon: Clock,
        badge: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
        tile: "text-amber-600 dark:text-amber-400",
    },
    under_review: {
        label: "Under review",
        icon: Search,
        badge: "bg-sky-500/10 text-sky-700 dark:text-sky-300",
        tile: "text-sky-600 dark:text-sky-400",
    },
    approved: {
        label: "Approved",
        icon: CheckCircle2,
        badge: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
        tile: "text-emerald-600 dark:text-emerald-400",
    },
    waitlisted: {
        label: "Waitlisted",
        icon: Hourglass,
        badge: "bg-violet-500/10 text-violet-700 dark:text-violet-300",
        tile: "text-violet-600 dark:text-violet-400",
    },
    rejected: {
        label: "Rejected",
        icon: XCircle,
        badge: "bg-rose-500/10 text-rose-700 dark:text-rose-300",
        tile: "text-rose-600 dark:text-rose-400",
    },
    withdrawn: {
        label: "Withdrawn",
        icon: MinusCircle,
        badge: "bg-zinc-500/10 text-zinc-600 dark:text-zinc-300",
        tile: "text-zinc-500 dark:text-zinc-400",
    },
};

// Also the "needs attention first" sort order
const STATUS_ORDER: ApplicationStatus[] = [
    "pending",
    "under_review",
    "waitlisted",
    "approved",
    "rejected",
    "withdrawn",
];

const STUDY_MODE_LABELS: Record<string, string> = {
    on_campus: "On campus",
    online: "Online",
    hybrid: "Hybrid",
};

const SURFACE =
    "rounded-sm border border-zinc-200 bg-white shadow-sm dark:border-white/10 dark:bg-[#0B1E3D]/50";
const FOCUS =
    "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-400";
const CONTROL =
    "h-10 rounded-sm border border-zinc-300 border-b-zinc-500 bg-white/80 text-sm text-[#0B1E3D] transition-shadow focus:border-b-orange-400 focus:outline-none focus:shadow-[0_1px_0_0_#FB923C] dark:border-white/10 dark:border-b-white/40 dark:bg-white/5 dark:text-white dark:focus:border-b-orange-400";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function applicantName(a: Application): string {
    if (a.applicant?.fullName) return a.applicant.fullName;
    const parts = [a.applicant?.firstName, a.applicant?.lastName].filter(Boolean);
    return parts.join(" ") || "Unnamed applicant";
}

function initials(name: string): string {
    return (
        name
            .split(/\s+/)
            .filter(Boolean)
            .slice(0, 2)
            .map((p) => p[0]?.toUpperCase())
            .join("") || "?"
    );
}

function courseLabel(course: Application["course"]): string {
    if (!course) return "Course unavailable";
    if (typeof course === "string") return course;
    return course.name ?? course.courseCode ?? "Untitled course";
}

function courseCode(course: Application["course"]): string | null {
    if (!course || typeof course === "string") return null;
    return course.courseCode ?? null;
}

function formatDate(value?: string | null): string {
    if (!value) return "—";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "2-digit" });
}

function daysSince(value?: string | null): number | null {
    if (!value) return null;
    const t = new Date(value).getTime();
    if (Number.isNaN(t)) return null;
    return Math.max(0, Math.floor((Date.now() - t) / 86_400_000));
}

function relative(days: number | null): string {
    if (days === null) return "";
    if (days === 0) return "Today";
    if (days === 1) return "Yesterday";
    return `${days} days ago`;
}

function unwrapList<T>(response: unknown): T[] {
    if (Array.isArray(response)) return response as T[];
    const maybe = response as { data?: T[] } | null | undefined;
    return maybe?.data ?? [];
}

const isStatus = (v: string | null): v is ApplicationStatus =>
    !!v && (STATUS_ORDER as string[]).includes(v);

// ---------------------------------------------------------------------------
// Page (Suspense is required because the view reads the URL)
// ---------------------------------------------------------------------------

export default function ApplicationsPage() {
    return (
        <Suspense fallback={<Shell><div className="mx-auto max-w-full py-6 sm:px-6 lg:px-8"><ListSkeleton /></div></Shell>}>
            <ApplicationsView />
        </Suspense>
    );
}

function ApplicationsView() {
    const router = useRouter();
    const pathname = usePathname();
    const params = useSearchParams();

    const [applications, setApplications] = useState<Application[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Filters live in the URL so links from the dashboard work, the back button
    // restores them, and a filtered view can be shared.
    const initialStatus = params.get("status");
    const [statusFilter, setStatusFilter] = useState<StatusFilter>(
        isStatus(initialStatus) ? initialStatus : "all",
    );
    const [search, setSearch] = useState(params.get("q") ?? "");
    const [sortKey, setSortKey] = useState<SortKey>("newest");
    const [visible, setVisible] = useState(PAGE_SIZE);

    const searchRef = useRef<HTMLInputElement>(null);

    // ----- data -------------------------------------------------------------
    const load = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await applicationApi.getAll();
            setApplications(unwrapList<Application>(response));
        } catch (err) {
            console.error("[applications] failed to load", err);
            setError("We couldn't load applications. Check your connection and try again.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    // ----- URL sync ---------------------------------------------------------
    useEffect(() => {
        const next = new URLSearchParams();
        if (statusFilter !== "all") next.set("status", statusFilter);
        if (search.trim()) next.set("q", search.trim());
        const qs = next.toString();
        if (qs === params.toString()) return;
        router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [statusFilter, search]);

    // Reset paging whenever the result set changes
    useEffect(() => setVisible(PAGE_SIZE), [statusFilter, search, sortKey]);

    // "/" jumps to search
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            const tag = (e.target as HTMLElement)?.tagName;
            if (e.key === "/" && tag !== "INPUT" && tag !== "TEXTAREA" && tag !== "SELECT") {
                e.preventDefault();
                searchRef.current?.focus();
            }
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, []);

    // ----- derived ----------------------------------------------------------
    // Search first, so the status tabs show how many matches each one holds.
    const searched = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return applications;
        return applications.filter((a) =>
            [
                a.applicationNumber,
                applicantName(a),
                a.applicant?.email,
                a.applicant?.phone,
                typeof a.course === "object" && a.course ? a.course.name : "",
                typeof a.course === "object" && a.course ? a.course.courseCode : "",
            ]
                .filter(Boolean)
                .join(" ")
                .toLowerCase()
                .includes(q),
        );
    }, [applications, search]);

    const counts = useMemo(() => {
        const c: Record<StatusFilter, number> = {
            all: searched.length,
            pending: 0,
            under_review: 0,
            approved: 0,
            waitlisted: 0,
            rejected: 0,
            withdrawn: 0,
        };
        searched.forEach((a) => {
            if (a.status in c) c[a.status] += 1;
        });
        return c;
    }, [searched]);

    const filtered = useMemo(() => {
        const list =
            statusFilter === "all" ? [...searched] : searched.filter((a) => a.status === statusFilter);
        const time = (a: Application) => new Date(a.createdAt ?? 0).getTime();

        return list.sort((a, b) => {
            switch (sortKey) {
                case "newest":
                    return time(b) - time(a);
                case "oldest":
                    return time(a) - time(b);
                case "applicant-asc":
                    return applicantName(a).localeCompare(applicantName(b));
                case "applicant-desc":
                    return applicantName(b).localeCompare(applicantName(a));
                case "status":
                    return (
                        STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status) || time(a) - time(b)
                    );
                default:
                    return 0;
            }
        });
    }, [searched, statusFilter, sortKey]);

    const shown = filtered.slice(0, visible);
    const hasActiveFilters = search.trim() !== "" || statusFilter !== "all" || sortKey !== "newest";

    function clearFilters() {
        setSearch("");
        setStatusFilter("all");
        setSortKey("newest");
    }

    // ----- render -----------------------------------------------------------
    return (
        <Shell>
            <div className="mx-auto max-w-full py-6 sm:px-6 lg:px-8">
                {/* Header */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                        <span className="flex h-10 w-10 items-center justify-center rounded-sm bg-orange-400/20 text-orange-600 dark:text-orange-400">
                            <LayoutList className="h-5 w-5" />
                        </span>
                        <div>
                            <h1 className="text-xl font-semibold tracking-tight text-[#0B1E3D] dark:text-white">
                                Applications
                            </h1>
                            <p className="text-sm text-zinc-500 dark:text-zinc-400">
                                {loading
                                    ? "Loading…"
                                    : `${applications.length.toLocaleString()} total · ${(counts.pending + counts.under_review).toLocaleString()} need a decision`}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={load}
                            disabled={loading}
                            aria-label="Refresh applications"
                            className={`flex h-10 w-10 items-center justify-center rounded-sm border border-zinc-300 text-zinc-600 hover:bg-zinc-100 disabled:opacity-50 dark:border-white/15 dark:text-zinc-300 dark:hover:bg-white/10 ${FOCUS}`}
                        >
                            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                        </button>
                        <Link
                            href="/applications/new"
                            className={`inline-flex h-10 items-center gap-2 rounded-sm bg-orange-400 px-4 text-sm font-semibold text-[#0B1E3D] transition hover:bg-orange-300 ${FOCUS}`}
                        >
                            <Plus className="h-4 w-4" />
                            New application
                        </Link>
                    </div>
                </div>

                {/* Status tabs: filter and summary in one control */}
                <div
                    role="group"
                    aria-label="Filter by status"
                    className="mt-5 flex gap-1 overflow-x-auto border-b border-zinc-200 pb-px dark:border-white/10 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                >
                    <StatusTab
                        label="All"
                        count={counts.all}
                        active={statusFilter === "all"}
                        onClick={() => setStatusFilter("all")}
                    />
                    {STATUS_ORDER.map((s) => (
                        <StatusTab
                            key={s}
                            label={STATUS_META[s].label}
                            icon={STATUS_META[s].icon}
                            iconClass={STATUS_META[s].tile}
                            count={counts[s]}
                            active={statusFilter === s}
                            onClick={() => setStatusFilter(s)}
                        />
                    ))}
                </div>

                {/* Toolbar */}
                <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                    <div className="relative flex-1">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-sky-500" />
                        <label htmlFor="app-search" className="sr-only">
                            Search applications
                        </label>
                        <input
                            id="app-search"
                            ref={searchRef}
                            type="search"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            onKeyDown={(e) => e.key === "Escape" && setSearch("")}
                            placeholder="Search by name, email, phone, application number or course"
                            className={`${CONTROL} w-full pl-9 pr-16 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 [&::-webkit-search-cancel-button]:hidden`}
                        />
                        {search ? (
                            <button
                                type="button"
                                onClick={() => {
                                    setSearch("");
                                    searchRef.current?.focus();
                                }}
                                aria-label="Clear search"
                                className={`absolute right-1.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-sm text-zinc-500 hover:bg-zinc-900/5 dark:text-zinc-400 dark:hover:bg-white/10 ${FOCUS}`}
                            >
                                <X className="h-4 w-4" />
                            </button>
                        ) : (
                            <kbd className="pointer-events-none absolute right-2.5 top-1/2 hidden -translate-y-1/2 rounded-sm border border-zinc-300 px-1.5 text-xs text-zinc-400 sm:block dark:border-white/15">
                                /
                            </kbd>
                        )}
                    </div>

                    <label htmlFor="sort-key" className="sr-only">
                        Sort applications
                    </label>
                    <select
                        id="sort-key"
                        value={sortKey}
                        onChange={(e) => setSortKey(e.target.value as SortKey)}
                        className={`${CONTROL} px-3 sm:w-52`}
                    >
                        {SORT_OPTIONS.map((o) => (
                            <option key={o.value} value={o.value}>
                                {o.label}
                            </option>
                        ))}
                    </select>

                    {hasActiveFilters && (
                        <button
                            type="button"
                            onClick={clearFilters}
                            className={`h-10 rounded-sm px-3 text-sm font-medium text-orange-600 hover:bg-orange-400/10 dark:text-orange-400 ${FOCUS}`}
                        >
                            Clear filters
                        </button>
                    )}
                </div>

                {/* Results */}
                <div className="mt-4" aria-live="polite">
                    {loading ? (
                        <ListSkeleton />
                    ) : error ? (
                        <ErrorState message={error} onRetry={load} />
                    ) : filtered.length === 0 ? (
                        <EmptyState hasApplications={applications.length > 0} onClear={clearFilters} />
                    ) : (
                        <>
                            {/* Table, md and up */}
                            <div className={`${SURFACE} hidden overflow-x-auto md:block`}>
                                <table className="min-w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-zinc-200 text-left text-xs font-medium text-zinc-500 dark:border-white/10 dark:text-zinc-400">
                                            <th scope="col" className="px-4 py-3">Application</th>
                                            <th scope="col" className="px-4 py-3">Applicant</th>
                                            <th scope="col" className="px-4 py-3">Course</th>
                                            <th scope="col" className="px-4 py-3">Status</th>
                                            <th scope="col" className="px-4 py-3">Submitted</th>
                                            <th scope="col" className="w-10 px-2 py-3"><span className="sr-only">Open</span></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-zinc-100 dark:divide-white/5">
                                        {shown.map((app) => (
                                            <Row key={app._id} app={app} onOpen={() => router.push(`/applications/${app._id}`)} />
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Cards, below md */}
                            <ul className="space-y-2 md:hidden">
                                {shown.map((app) => (
                                    <CardItem key={app._id} app={app} />
                                ))}
                            </ul>

                            <div className="mt-4 flex flex-col items-center gap-2">
                                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                                    Showing {shown.length.toLocaleString()} of {filtered.length.toLocaleString()}
                                    {filtered.length !== applications.length &&
                                        ` (${applications.length.toLocaleString()} total)`}
                                </p>
                                {shown.length < filtered.length && (
                                    <button
                                        type="button"
                                        onClick={() => setVisible((v) => v + PAGE_SIZE)}
                                        className={`h-9 rounded-sm border border-zinc-300 px-4 text-sm font-medium text-[#0B1E3D] hover:bg-zinc-100 dark:border-white/15 dark:text-white dark:hover:bg-white/10 ${FOCUS}`}
                                    >
                                        Show {Math.min(PAGE_SIZE, filtered.length - shown.length)} more
                                    </button>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </div>
        </Shell>
    );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function Shell({ children }: { children: React.ReactNode }) {
    return <div className="min-h-screen bg-[#EEF2F9] dark:bg-[#050D1B]">{children}</div>;
}

function StatusTab({
    label,
    count,
    active,
    onClick,
    icon: Icon,
    iconClass,
}: {
    label: string;
    count: number;
    active: boolean;
    onClick: () => void;
    icon?: LucideIcon;
    iconClass?: string;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            aria-pressed={active}
            className={`relative flex shrink-0 items-center gap-2 rounded-t-sm px-3 py-2.5 text-sm transition-colors ${FOCUS} ${
                active
                    ? "font-semibold text-[#0B1E3D] dark:text-white"
                    : "text-zinc-500 hover:bg-zinc-900/5 dark:text-zinc-400 dark:hover:bg-white/5"
            }`}
        >
            {Icon && <Icon className={`h-4 w-4 ${iconClass ?? ""}`} />}
            {label}
            <span
                className={`rounded-sm px-1.5 text-xs font-medium ${
                    active
                        ? "bg-orange-400 text-[#0B1E3D]"
                        : "bg-zinc-200/70 text-zinc-600 dark:bg-white/10 dark:text-zinc-300"
                }`}
            >
                {count.toLocaleString()}
            </span>
            {active && <span className="absolute inset-x-2 -bottom-px h-[3px] rounded-sm bg-orange-400" />}
        </button>
    );
}

function StatusBadge({ status }: { status: ApplicationStatus }) {
    const meta = STATUS_META[status] ?? STATUS_META.withdrawn;
    const Icon = meta.icon;
    return (
        <span className={`inline-flex items-center gap-1.5 rounded-sm px-2 py-0.5 text-xs font-medium ${meta.badge}`}>
            <Icon className="h-3.5 w-3.5" />
            {meta.label ?? status}
        </span>
    );
}

function Avatar({ name }: { name: string }) {
    return (
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-sm bg-[#0B1E3D] text-xs font-bold text-orange-400 dark:bg-orange-400 dark:text-[#0B1E3D]">
            {initials(name)}
        </span>
    );
}

// Open applications that have waited a week or more get a visible nudge
function Waiting({ app }: { app: Application }) {
    const open = app.status === "pending" || app.status === "under_review";
    const days = daysSince(app.createdAt);
    if (!open || days === null || days < 7) return null;
    return (
        <span className="mt-0.5 flex items-center gap-1 text-xs font-medium text-amber-600 dark:text-amber-400">
            <Clock className="h-3 w-3" />
            Waiting {days} days
        </span>
    );
}

function Row({ app, onOpen }: { app: Application; onOpen: () => void }) {
    const code = courseCode(app.course);
    const name = applicantName(app);
    return (
        <tr onClick={onOpen} className="cursor-pointer transition-colors hover:bg-orange-400/5 dark:hover:bg-white/5">
            <td className="whitespace-nowrap px-4 py-3">
                <Link
                    href={`/applications/${app._id}`}
                    onClick={(e) => e.stopPropagation()}
                    className={`rounded-sm font-medium text-[#0B1E3D] hover:underline dark:text-white ${FOCUS}`}
                >
                    {app.applicationNumber}
                </Link>
                {app.isInternational && (
                    <span className="ml-2 inline-flex items-center gap-1 rounded-sm bg-indigo-500/10 px-1.5 py-0.5 text-[11px] font-medium text-indigo-700 dark:text-indigo-300">
                        <Globe className="h-3 w-3" />
                        Intl
                    </span>
                )}
            </td>
            <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                    <Avatar name={name} />
                    <div className="min-w-0">
                        <div className="truncate font-medium text-[#0B1E3D] dark:text-white">{name}</div>
                        <div className="truncate text-xs text-zinc-500 dark:text-zinc-400">
                            {app.applicant?.email ?? "No email"}
                        </div>
                    </div>
                </div>
            </td>
            <td className="px-4 py-3">
                <div className="text-[#0B1E3D] dark:text-zinc-100">{courseLabel(app.course)}</div>
                <div className="text-xs text-zinc-500 dark:text-zinc-400">
                    {[code, STUDY_MODE_LABELS[app.studyMode] ?? app.studyMode].filter(Boolean).join(" · ")}
                </div>
            </td>
            <td className="whitespace-nowrap px-4 py-3">
                <StatusBadge status={app.status} />
            </td>
            <td className="whitespace-nowrap px-4 py-3">
                <div className="text-zinc-700 dark:text-zinc-200" title={formatDate(app.createdAt)}>
                    {relative(daysSince(app.createdAt)) || formatDate(app.createdAt)}
                </div>
                <Waiting app={app} />
            </td>
            <td className="px-2 py-3 text-zinc-400">
                <ChevronRight className="h-4 w-4" />
            </td>
        </tr>
    );
}

function CardItem({ app }: { app: Application }) {
    const name = applicantName(app);
    const code = courseCode(app.course);
    return (
        <li>
            <Link
                href={`/applications/${app._id}`}
                className={`${SURFACE} flex items-start gap-3 p-3 ${FOCUS}`}
            >
                <Avatar name={name} />
                <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                        <span className="truncate font-medium text-[#0B1E3D] dark:text-white">{name}</span>
                        <StatusBadge status={app.status} />
                    </div>
                    <p className="truncate text-sm text-zinc-600 dark:text-zinc-300">
                        {courseLabel(app.course)}
                        {code ? ` (${code})` : ""}
                    </p>
                    <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                        {app.applicationNumber} · {relative(daysSince(app.createdAt)) || formatDate(app.createdAt)}
                    </p>
                    <Waiting app={app} />
                </div>
            </Link>
        </li>
    );
}

function ListSkeleton() {
    const bar = "animate-pulse rounded-sm bg-zinc-200 dark:bg-white/10";
    return (
        <div className={`${SURFACE} divide-y divide-zinc-100 dark:divide-white/5`} aria-busy="true" aria-label="Loading applications">
            {Array.from({ length: 7 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 px-4 py-3.5">
                    <div className={`h-9 w-9 ${bar}`} />
                    <div className="flex-1 space-y-2">
                        <div className={`h-4 w-48 ${bar}`} />
                        <div className={`h-3 w-64 max-w-full ${bar}`} />
                    </div>
                    <div className={`hidden h-5 w-24 sm:block ${bar}`} />
                </div>
            ))}
        </div>
    );
}

function EmptyState({ hasApplications, onClear }: { hasApplications: boolean; onClear: () => void }) {
    return (
        <div className={`${SURFACE} flex flex-col items-center gap-3 px-6 py-16 text-center`}>
            <span className="flex h-12 w-12 items-center justify-center rounded-sm bg-sky-500/15 text-sky-600 dark:text-sky-400">
                <FileText className="h-6 w-6" />
            </span>
            <h3 className="text-sm font-semibold text-[#0B1E3D] dark:text-white">
                {hasApplications ? "No applications match" : "No applications yet"}
            </h3>
            <p className="max-w-sm text-sm text-zinc-500 dark:text-zinc-400">
                {hasApplications
                    ? "Try a different search or status, or clear the filters to see everything."
                    : "When someone applies through the portal, their application will show up here."}
            </p>
            {hasApplications ? (
                <button
                    type="button"
                    onClick={onClear}
                    className={`mt-1 h-9 rounded-sm bg-orange-400 px-4 text-sm font-semibold text-[#0B1E3D] hover:bg-orange-300 ${FOCUS}`}
                >
                    Clear filters
                </button>
            ) : (
                <Link
                    href="/applications/new"
                    className={`mt-1 inline-flex h-9 items-center gap-2 rounded-sm bg-orange-400 px-4 text-sm font-semibold text-[#0B1E3D] hover:bg-orange-300 ${FOCUS}`}
                >
                    <Plus className="h-4 w-4" />
                    Add the first application
                </Link>
            )}
        </div>
    );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
    return (
        <div role="alert" className={`${SURFACE} flex flex-col items-center gap-3 px-6 py-16 text-center`}>
            <span className="flex h-12 w-12 items-center justify-center rounded-sm bg-rose-500/15 text-rose-500">
                <AlertCircle className="h-6 w-6" />
            </span>
            <h3 className="text-sm font-semibold text-[#0B1E3D] dark:text-white">Couldn't load applications</h3>
            <p className="max-w-sm text-sm text-zinc-500 dark:text-zinc-400">{message}</p>
            <button
                type="button"
                onClick={onRetry}
                className={`mt-1 inline-flex h-9 items-center gap-2 rounded-sm bg-orange-400 px-4 text-sm font-semibold text-[#0B1E3D] hover:bg-orange-300 ${FOCUS}`}
            >
                <RefreshCw className="h-4 w-4" />
                Try again
            </button>
        </div>
    );
}