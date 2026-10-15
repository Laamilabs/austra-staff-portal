"use client";

import React, {
    useState,
    useEffect,
    useMemo,
    useRef,
    useCallback,
} from "react";
import {
    AlertCircle,
    ArrowDown,
    ArrowUp,
    Check,
    ChevronDown,
    Copy,
    ExternalLink,
    FileArchive,
    FileSpreadsheet,
    FileText,
    FolderOpen,
    Globe,
    GraduationCap,
    LayoutGrid,
    Layers,
    Library,
    Link2,
    List,
    Presentation,
    RefreshCw,
    RotateCcw,
    Search,
    Video,
    X,
    type LucideIcon,
} from "lucide-react";

import { DocumentItem, documentApi } from "@/app/types/documents";
import SelectCourse from "@/app/(portal)/courses/selectCourse";

// ----------------------------------------------------------------------
// Tokens
// ----------------------------------------------------------------------

const FOCUS_RING =
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400";

const HIDE_SCROLLBAR =
    "[scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden";

const controlCls =
    "h-10 w-full cursor-pointer rounded-sm border border-zinc-200 bg-white text-sm font-medium text-zinc-800 transition-colors hover:border-zinc-300 dark:border-white/10 dark:bg-[#0B1E3D] dark:text-zinc-100 dark:hover:border-white/20";

const VIEW_KEY = "resources:view";
const COURSE_WIDE = "__course__";

// ----------------------------------------------------------------------
// Sorting
// ----------------------------------------------------------------------

type SortKey = "name-asc" | "name-desc" | "newest" | "oldest";
type ViewMode = "grid" | "list";

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
    { value: "name-asc", label: "Name (A–Z)" },
    { value: "name-desc", label: "Name (Z–A)" },
    { value: "newest", label: "Newest first" },
    { value: "oldest", label: "Oldest first" },
];

// ----------------------------------------------------------------------
// Grouping types
// ----------------------------------------------------------------------

interface UnitGroup {
    unitId: string | null;
    unitName: string | null;
    documents: DocumentItem[];
}

interface CourseGroup {
    courseId: string;
    courseName: string;
    units: UnitGroup[];
    total: number;
}

// ----------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------

function getCourse(doc: DocumentItem) {
    return doc.course && typeof doc.course === "object" && doc.course._id
        ? doc.course
        : null;
}

function getUnit(doc: DocumentItem) {
    return doc.unit && typeof doc.unit === "object" && doc.unit._id
        ? doc.unit
        : null;
}

function getHost(url: string): string {
    try {
        return new URL(url).hostname.replace(/^www\./, "");
    } catch {
        return url;
    }
}

function formatDate(value?: string | number | Date): string {
    if (!value) return "";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    });
}

interface Kind {
    label: string;
    icon: LucideIcon;
    tone: string;
}

/** Guess what a link points to, so documents are recognisable at a glance. */
function getKind(url: string): Kind {
    const u = url.toLowerCase();
    const host = getHost(u);

    if (/\.pdf(\?|#|$)/.test(u))
        return { label: "PDF", icon: FileText, tone: "bg-red-500/10 text-red-600 dark:text-red-400" };
    if (/\.docx?(\?|#|$)/.test(u) || (host.includes("docs.google.com") && u.includes("/document")))
        return { label: "Document", icon: FileText, tone: "bg-sky-500/10 text-sky-600 dark:text-sky-400" };
    if (/\.(xlsx?|csv)(\?|#|$)/.test(u) || (host.includes("docs.google.com") && u.includes("/spreadsheets")))
        return { label: "Sheet", icon: FileSpreadsheet, tone: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" };
    if (/\.pptx?(\?|#|$)/.test(u) || (host.includes("docs.google.com") && u.includes("/presentation")))
        return { label: "Slides", icon: Presentation, tone: "bg-amber-400/10 text-amber-600 dark:text-amber-400" };
    if (/(youtube\.com|youtu\.be|vimeo\.com)/.test(host) || /\.(mp4|mov|webm)(\?|#|$)/.test(u))
        return { label: "Video", icon: Video, tone: "bg-violet-500/10 text-violet-600 dark:text-violet-400" };
    if (/\.(zip|rar|7z|tar|gz)(\?|#|$)/.test(u))
        return { label: "Archive", icon: FileArchive, tone: "bg-zinc-500/10 text-zinc-600 dark:text-zinc-300" };

    return { label: "Link", icon: Link2, tone: "bg-orange-400/10 text-orange-500 dark:text-orange-400" };
}

/** Wraps matches of `query` in a highlight so you can see why a result appeared. */
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
                ),
            )}
        </>
    );
}

// ----------------------------------------------------------------------
// Resource item (grid card or list row)
// ----------------------------------------------------------------------

function ResourceItem({
    doc,
    view,
    query,
    copied,
    onCopy,
}: {
    doc: DocumentItem;
    view: ViewMode;
    query: string;
    copied: boolean;
    onCopy: (doc: DocumentItem) => void;
}) {
    const kind = getKind(doc.url);
    const Icon = kind.icon;
    const host = getHost(doc.url);
    const added = formatDate(doc.createdAt);

    const copyBtn = (
        <button
            type="button"
            onClick={() => onCopy(doc)}
            aria-label={copied ? "Link copied" : `Copy link to ${doc.name}`}
            title={copied ? "Copied" : "Copy link"}
            className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-sm transition-colors ${FOCUS_RING} ${copied
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-zinc-400 hover:bg-[#0B1E3D]/5 hover:text-[#0B1E3D] dark:text-zinc-500 dark:hover:bg-white/10 dark:hover:text-white"
                }`}
        >
            {copied ? <Check className="h-4 w-4" strokeWidth={2.4} /> : <Copy className="h-4 w-4" />}
        </button>
    );

    const link = (
        <a
            href={doc.url}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`${doc.name} (opens in a new tab)`}
            className={`absolute inset-0 rounded-sm ${FOCUS_RING}`}
        />
    );

    if (view === "list") {
        return (
            <div className="group relative flex items-center gap-3 px-3.5 py-2.5 transition-colors hover:bg-[#0B1E3D]/4 dark:hover:bg-white/6">
                {link}
                <span
                    aria-hidden
                    className="absolute left-0 top-1/2 h-4 w-0.75 origin-center -translate-y-1/2 scale-y-0 rounded-sm bg-orange-400 transition-transform duration-200 group-hover:scale-y-100"
                />
                <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-sm ${kind.tone}`}>
                    <Icon className="h-[18px] w-[18px]" />
                </span>

                <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-[#0B1E3D] dark:text-white">
                        <Highlight text={doc.name} query={query} />
                    </span>
                    <span className="block truncate text-xs text-zinc-500 dark:text-zinc-400">
                        {kind.label} · <Highlight text={host} query={query} />
                    </span>
                </span>

                {added && (
                    <span className="hidden shrink-0 text-xs text-zinc-400 dark:text-zinc-500 sm:block">
                        {added}
                    </span>
                )}

                {copyBtn}
                <ExternalLink
                    aria-hidden
                    className="h-4 w-4 shrink-0 text-zinc-300 transition-colors group-hover:text-orange-500 dark:text-zinc-600 dark:group-hover:text-orange-400"
                />
            </div>
        );
    }

    return (
        <div className="group relative flex h-full flex-col gap-3 rounded-sm border border-zinc-200/80 bg-white/80 p-3.5 transition-colors hover:border-[#0B1E3D]/40 hover:bg-white dark:border-white/10 dark:bg-white/4 dark:hover:border-orange-400/50 dark:hover:bg-white/8">
            {link}

            <div className="flex items-start justify-between gap-2">
                <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-sm ${kind.tone}`}>
                    <Icon className="h-5 w-5" />
                </span>

                <div className="-mr-1 -mt-1 flex items-center">
                    {copyBtn}
                    <ExternalLink
                        aria-hidden
                        className="mx-1.5 h-4 w-4 shrink-0 text-zinc-300 transition-colors group-hover:text-orange-500 dark:text-zinc-600 dark:group-hover:text-orange-400"
                    />
                </div>
            </div>

            <p className="line-clamp-2 text-sm font-semibold leading-snug text-[#0B1E3D] dark:text-white">
                <Highlight text={doc.name} query={query} />
            </p>

            <p className="mt-auto flex items-center gap-1.5 truncate text-xs text-zinc-500 dark:text-zinc-400">
                <span className="shrink-0 font-medium">{kind.label}</span>
                <span aria-hidden>·</span>
                <span className="truncate">
                    <Highlight text={host} query={query} />
                </span>
                {added && (
                    <>
                        <span aria-hidden>·</span>
                        <span className="shrink-0">{added}</span>
                    </>
                )}
            </p>
        </div>
    );
}

// ----------------------------------------------------------------------
// Section header (collapsible)
// ----------------------------------------------------------------------

function SectionHeader({
    icon: Icon,
    tone,
    title,
    subtitle,
    count,
    open,
    onToggle,
    query,
}: {
    icon: LucideIcon;
    tone: string;
    title: string;
    subtitle?: string;
    count: number;
    open: boolean;
    onToggle: () => void;
    query: string;
}) {
    return (
        <button
            type="button"
            onClick={onToggle}
            aria-expanded={open}
            className={`group flex w-full items-center gap-3 rounded-sm border-b border-zinc-200/80 px-1 pb-3 pt-1 text-left dark:border-white/10 ${FOCUS_RING}`}
        >
            <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-sm ${tone}`}>
                <Icon className="h-[18px] w-[18px]" />
            </span>

            <span className="min-w-0 flex-1">
                <span className="block truncate text-base font-semibold text-[#0B1E3D] dark:text-white">
                    <Highlight text={title} query={query} />
                </span>
                <span className="block text-xs text-zinc-500 dark:text-zinc-400">
                    {subtitle ?? `${count} ${count === 1 ? "resource" : "resources"}`}
                </span>
            </span>

            <span className="shrink-0 rounded-sm bg-[#0B1E3D]/5 px-2 py-0.5 text-xs font-semibold tabular-nums text-[#0B1E3D] dark:bg-white/10 dark:text-white">
                {count}
            </span>

            <ChevronDown
                className={`h-4 w-4 shrink-0 text-zinc-400 transition-transform duration-200 group-hover:text-orange-500 dark:text-zinc-500 dark:group-hover:text-orange-400 ${open ? "" : "-rotate-90"
                    }`}
            />
        </button>
    );
}

// ----------------------------------------------------------------------
// Page
// ----------------------------------------------------------------------

export default function ResourcesPage() {
    // Data states
    const [documents, setDocuments] = useState<DocumentItem[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    // Filter, search & view states
    const [searchTerm, setSearchTerm] = useState<string>("");
    const [courseFilter, setCourseFilter] = useState<string>("");
    const [unitFilter, setUnitFilter] = useState<string>("");
    const [sortBy, setSortBy] = useState<SortKey>("name-asc");
    const [view, setView] = useState<ViewMode>("list");
    const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
    const [copiedId, setCopiedId] = useState<string | null>(null);

    const searchRef = useRef<HTMLInputElement>(null);

    // --------------------------------------------------------------------
    // Fetch
    // --------------------------------------------------------------------

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            const res = await documentApi.getAll();
            setDocuments(res.data || []);
        } catch (err: any) {
            console.error("Failed to fetch resources:", err);
            setError(
                "Failed to load resources. Please check your network connection.",
            );
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

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

    // --------------------------------------------------------------------
    // Public resource documents only
    // --------------------------------------------------------------------

    const publicResources = useMemo(
        () =>
            documents.filter(
                (doc) => doc.type === "resource" && !doc.owner,
            ),
        [documents],
    );

    // Units available inside the chosen course, for the quick unit filter.
    const unitOptions = useMemo(() => {
        if (!courseFilter) return [];
        const map = new Map<string, { id: string; name: string; count: number }>();
        let courseWide = 0;

        publicResources.forEach((doc) => {
            if (getCourse(doc)?._id !== courseFilter) return;
            const unit = getUnit(doc);
            if (!unit) {
                courseWide += 1;
                return;
            }
            const existing = map.get(unit._id);
            if (existing) existing.count += 1;
            else map.set(unit._id, { id: unit._id, name: unit.name || "Untitled unit", count: 1 });
        });

        const units = Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
        return courseWide > 0
            ? [{ id: COURSE_WIDE, name: "Course-wide", count: courseWide }, ...units]
            : units;
    }, [publicResources, courseFilter]);

    // --------------------------------------------------------------------
    // Filter + sort
    // --------------------------------------------------------------------

    const query = searchTerm.trim();

    const filteredResources = useMemo(() => {
        const search = query.toLowerCase();

        const list = publicResources.filter((doc) => {
            const course = getCourse(doc);
            const unit = getUnit(doc);

            const matchesSearch =
                !search ||
                doc.name.toLowerCase().includes(search) ||
                doc.url.toLowerCase().includes(search) ||
                (course?.name?.toLowerCase().includes(search) ?? false) ||
                (unit?.name?.toLowerCase().includes(search) ?? false);

            const matchesCourse =
                !courseFilter || (course?._id === courseFilter);

            const matchesUnit =
                !courseFilter ||
                !unitFilter ||
                (unitFilter === COURSE_WIDE ? !unit : unit?._id === unitFilter);

            return matchesSearch && matchesCourse && matchesUnit;
        });

        const sorted = [...list];

        sorted.sort((a, b) => {
            switch (sortBy) {
                case "name-desc":
                    return b.name.localeCompare(a.name);
                case "newest":
                    return (
                        new Date(b.createdAt || 0).getTime() -
                        new Date(a.createdAt || 0).getTime()
                    );
                case "oldest":
                    return (
                        new Date(a.createdAt || 0).getTime() -
                        new Date(b.createdAt || 0).getTime()
                    );
                case "name-asc":
                default:
                    return a.name.localeCompare(b.name);
            }
        });

        return sorted;
    }, [publicResources, query, courseFilter, unitFilter, sortBy]);

    // --------------------------------------------------------------------
    // Group by course → unit
    // --------------------------------------------------------------------

    const { courseGroups, generalResources } = useMemo(() => {
        const courseMap = new Map<string, CourseGroup>();
        const general: DocumentItem[] = [];

        filteredResources.forEach((doc) => {
            const course = getCourse(doc);

            if (!course) {
                general.push(doc);
                return;
            }

            let group = courseMap.get(course._id);
            if (!group) {
                group = {
                    courseId: course._id,
                    courseName: course.name || "Untitled course",
                    units: [],
                    total: 0,
                };
                courseMap.set(course._id, group);
            }

            const unit = getUnit(doc);
            const unitKey = unit?._id ?? "__course-level__";

            let unitGroup = group.units.find(
                (u) => (u.unitId ?? "__course-level__") === unitKey,
            );

            if (!unitGroup) {
                unitGroup = {
                    unitId: unit?._id ?? null,
                    unitName: unit?.name ?? null,
                    documents: [],
                };
                group.units.push(unitGroup);
            }

            unitGroup.documents.push(doc);
            group.total += 1;
        });

        const grouped = Array.from(courseMap.values()).sort((a, b) =>
            a.courseName.localeCompare(b.courseName),
        );

        grouped.forEach((g) => {
            g.units.sort((a, b) => {
                if (!a.unitId && b.unitId) return -1;
                if (a.unitId && !b.unitId) return 1;
                return (a.unitName || "").localeCompare(b.unitName || "");
            });
        });

        return { courseGroups: grouped, generalResources: general };
    }, [filteredResources]);

    const hasActiveFilters =
        Boolean(query) ||
        Boolean(courseFilter) ||
        Boolean(unitFilter) ||
        sortBy !== "name-asc";

    const hasResults =
        courseGroups.length > 0 || generalResources.length > 0;

    const sectionKeys = useMemo(
        () => [
            ...courseGroups.map((g) => g.courseId),
            ...(generalResources.length > 0 ? ["__general__"] : []),
        ],
        [courseGroups, generalResources.length],
    );

    // While searching, everything is expanded so no match is hidden.
    const isOpen = (key: string) => Boolean(query) || !collapsed.has(key);

    const toggleSection = (key: string) =>
        setCollapsed((prev) => {
            const next = new Set(prev);
            if (next.has(key)) next.delete(key);
            else next.add(key);
            return next;
        });

    const allCollapsed =
        sectionKeys.length > 0 && sectionKeys.every((k) => collapsed.has(k));

    const toggleAll = () =>
        setCollapsed(allCollapsed ? new Set() : new Set(sectionKeys));

    // --------------------------------------------------------------------
    // Actions
    // --------------------------------------------------------------------

    const resetAll = () => {
        setSearchTerm("");
        setCourseFilter("");
        setUnitFilter("");
        setSortBy("name-asc");
    };

    const handleCopy = async (doc: DocumentItem) => {
        try {
            await navigator.clipboard.writeText(doc.url);
            setCopiedId(doc._id);
            window.setTimeout(
                () => setCopiedId((id) => (id === doc._id ? null : id)),
                1600,
            );
        } catch {
            /* clipboard unavailable: ignore */
        }
    };

    const gridCls = "grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4";
    const listCls =
        "divide-y divide-zinc-200/80 overflow-hidden rounded-sm border border-zinc-200/80 bg-white/80 dark:divide-white/10 dark:border-white/10 dark:bg-white/4";

    const renderItems = (docs: DocumentItem[]) => (
        <div className={view === "grid" ? gridCls : listCls}>
            {docs.map((doc) => (
                <ResourceItem
                    key={doc._id}
                    doc={doc}
                    view={view}
                    query={query}
                    copied={copiedId === doc._id}
                    onCopy={handleCopy}
                />
            ))}
        </div>
    );

    // --------------------------------------------------------------------
    // Render
    // --------------------------------------------------------------------

    return (
        <div className="space-y-5">
            {/* Page Header */}
            <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-sm bg-orange-400/10 text-orange-500 ring-1 ring-inset ring-orange-400/30 dark:text-orange-400">
                    <Library className="h-5 w-5" strokeWidth={2} />
                </span>
                <div className="min-w-0">
                    <h1 className="text-xl font-bold tracking-tight text-[#0B1E3D] dark:text-white">
                        LIBRARY
                    </h1>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
                        Shared documents, organised by course and unit.
                    </p>
                </div>
            </div>

            {/* Command bar: stays in view while scrolling long lists */}
            <div className="sticky top-16 z-20 -mx-4 space-y-3 border-b border-zinc-200/80 bg-white/90 px-4 py-3 backdrop-blur-md dark:border-white/10 dark:bg-[#0B1E3D]/90 sm:-mx-6 sm:px-6 lg:top-0 lg:-mx-8 lg:px-8">
                <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
                    {/* Search */}
                    <label
                        className="
                            flex h-10 w-full items-center gap-2 rounded-sm border-b-2 border-transparent
                            bg-zinc-100 px-3 text-zinc-400 transition-colors lg:flex-1
                            focus-within:border-orange-400 focus-within:bg-white focus-within:shadow-sm
                            dark:bg-white/5 dark:text-zinc-500 dark:focus-within:bg-white/10
                        "
                    >
                        <Search className="h-4 w-4 shrink-0" />
                        <input
                            ref={searchRef}
                            type="text"
                            placeholder="Search documents, courses, units or links"
                            aria-label="Search resources"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === "Escape") setSearchTerm("");
                            }}
                            autoComplete="off"
                            spellCheck={false}
                            className="min-w-0 flex-1 bg-transparent text-sm text-[#0B1E3D] outline-none placeholder:text-zinc-400 dark:text-white dark:placeholder:text-zinc-500"
                        />
                        {searchTerm ? (
                            <button
                                type="button"
                                onClick={() => {
                                    setSearchTerm("");
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

                    {/* Course filter */}
                    <div className="w-full lg:w-72 lg:shrink-0">
                        <SelectCourse
                            value={courseFilter}
                            onChange={(id) => {
                                setCourseFilter(id);
                                setUnitFilter("");
                            }}
                            placeholder="All courses"
                        />
                    </div>

                    {/* Sort + view */}
                    <div className="flex items-center gap-2">
                        <label htmlFor="resources-sort" className="sr-only">
                            Sort resources
                        </label>
                        <div className="relative min-w-0 flex-1 lg:w-44 lg:flex-none">
                            {sortBy === "name-desc" || sortBy === "oldest" ? (
                                <ArrowUp className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-orange-500 dark:text-orange-400" />
                            ) : (
                                <ArrowDown className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-orange-500 dark:text-orange-400" />
                            )}
                            <select
                                id="resources-sort"
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value as SortKey)}
                                className={`${controlCls} pl-9 pr-2 ${FOCUS_RING}`}
                            >
                                {SORT_OPTIONS.map((option) => (
                                    <option key={option.value} value={option.value}>
                                        {option.label}
                                    </option>
                                ))}
                            </select>
                        </div>

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
                                        className={`flex h-9 w-9 items-center justify-center rounded-sm transition-colors ${FOCUS_RING} ${active
                                            ? "bg-white text-orange-500 shadow-sm dark:bg-white/10 dark:text-orange-400"
                                            : "text-zinc-500 hover:bg-white/60 hover:text-[#0B1E3D] dark:text-zinc-400 dark:hover:bg-white/5 dark:hover:text-white"
                                            }`}
                                    >
                                        <Icon className="h-4 w-4" />
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Unit quick filter: appears once a course is chosen */}
                {courseFilter && unitOptions.length > 0 && (
                    <div
                        role="group"
                        aria-label="Filter by unit"
                        className={`flex items-center gap-1.5 overflow-x-auto ${HIDE_SCROLLBAR}`}
                    >
                        <Layers className="h-4 w-4 shrink-0 text-violet-600 dark:text-violet-400" />
                        {[{ id: "", name: "All units", count: unitOptions.reduce((s, u) => s + u.count, 0) }, ...unitOptions].map(
                            (u) => {
                                const active = unitFilter === u.id;
                                return (
                                    <button
                                        key={u.id || "all"}
                                        type="button"
                                        onClick={() => setUnitFilter(u.id)}
                                        aria-pressed={active}
                                        className={`flex h-7 shrink-0 items-center gap-1.5 rounded-sm px-2.5 text-xs font-medium transition-colors ${FOCUS_RING} ${active
                                            ? "bg-[#0B1E3D] text-white dark:bg-orange-400 dark:text-[#0B1E3D]"
                                            : "bg-[#0B1E3D]/5 text-[#0B1E3D] hover:bg-[#0B1E3D]/10 dark:bg-white/8 dark:text-zinc-200 dark:hover:bg-white/12"
                                            }`}
                                    >
                                        {u.name}
                                        <span
                                            className={`tabular-nums ${active
                                                ? "text-orange-400 dark:text-[#0B1E3D]/70"
                                                : "text-zinc-400 dark:text-zinc-500"
                                                }`}
                                        >
                                            {u.count}
                                        </span>
                                    </button>
                                );
                            },
                        )}
                    </div>
                )}

                {/* Result summary + bulk actions */}
                <div className="flex items-center justify-between gap-3 text-xs text-zinc-500 dark:text-zinc-400">
                    <p aria-live="polite">
                        {loading
                            ? "Loading resources…"
                            : hasActiveFilters
                                ? `${filteredResources.length} of ${publicResources.length} resources`
                                : `${filteredResources.length} ${filteredResources.length === 1 ? "resource" : "resources"}`}
                    </p>

                    <div className="flex items-center gap-1">
                        {!query && sectionKeys.length > 1 && (
                            <button
                                type="button"
                                onClick={toggleAll}
                                className={`h-7 rounded-sm px-2 font-semibold text-[#0B1E3D] transition-colors hover:bg-[#0B1E3D]/5 dark:text-zinc-200 dark:hover:bg-white/10 ${FOCUS_RING}`}
                            >
                                {allCollapsed ? "Expand all" : "Collapse all"}
                            </button>
                        )}
                        {hasActiveFilters && (
                            <button
                                type="button"
                                onClick={resetAll}
                                className={`inline-flex h-7 items-center gap-1 rounded-sm px-2 font-semibold text-orange-600 transition-colors hover:bg-orange-400/10 dark:text-orange-400 ${FOCUS_RING}`}
                            >
                                <RotateCcw className="h-3 w-3" />
                                Reset
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Main Content */}
            {loading ? (
                <div aria-busy="true" aria-label="Loading resources" className={view === "grid" ? gridCls : listCls}>
                    {Array.from({ length: 8 }).map((_, i) => (
                        <div
                            key={i}
                            className={
                                view === "grid"
                                    ? "space-y-3 rounded-sm border border-zinc-200/80 bg-white/80 p-3.5 dark:border-white/10 dark:bg-white/4"
                                    : "flex items-center gap-3 px-3.5 py-3"
                            }
                        >
                            <div className="h-10 w-10 animate-pulse rounded-sm bg-zinc-200 dark:bg-white/10" />
                            <div className="flex-1 space-y-2">
                                <div className="h-3.5 w-3/4 animate-pulse rounded-sm bg-zinc-200 dark:bg-white/10" />
                                <div className="h-3 w-1/2 animate-pulse rounded-sm bg-zinc-100 dark:bg-white/5" />
                            </div>
                        </div>
                    ))}
                </div>
            ) : error ? (
                <div
                    role="alert"
                    className="flex items-center gap-3 rounded-sm border border-red-200 border-l-4 border-l-red-500 bg-red-50 p-3.5 text-red-700 dark:border-red-500/20 dark:border-l-red-500 dark:bg-red-500/10 dark:text-red-300"
                >
                    <AlertCircle className="h-5 w-5 shrink-0" />
                    <p className="min-w-0 flex-1 text-sm">{error}</p>
                    <button
                        type="button"
                        onClick={fetchData}
                        className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-sm px-2.5 text-xs font-semibold transition-colors hover:bg-red-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 dark:hover:bg-red-500/20"
                    >
                        <RefreshCw className="h-3.5 w-3.5" />
                        Retry
                    </button>
                </div>
            ) : !hasResults ? (
                <div className="rounded-sm border border-dashed border-zinc-300 px-6 py-14 text-center dark:border-white/15">
                    <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-sm bg-orange-400/10 text-orange-500 ring-1 ring-inset ring-orange-400/30 dark:text-orange-400">
                        <FolderOpen className="h-6 w-6" />
                    </span>

                    <p className="mt-3 text-sm font-semibold text-[#0B1E3D] dark:text-white">
                        {hasActiveFilters ? "No resources match" : "No resources yet"}
                    </p>

                    <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                        {hasActiveFilters
                            ? "Try a different word, another course, or reset the filters."
                            : "There are no public resources available yet."}
                    </p>

                    {hasActiveFilters && (
                        <button
                            type="button"
                            onClick={resetAll}
                            className={`mt-4 inline-flex h-9 items-center gap-1.5 rounded-sm border border-zinc-200 bg-white px-3.5 text-[13px] font-semibold text-[#0B1E3D] transition-colors hover:bg-zinc-100 dark:border-white/15 dark:bg-transparent dark:text-white dark:hover:bg-white/10 ${FOCUS_RING}`}
                        >
                            <RotateCcw className="h-3.5 w-3.5" />
                            Reset filters
                        </button>
                    )}
                </div>
            ) : (
                <div className="space-y-7">
                    {/* Course Groups */}
                    {courseGroups.map((group) => {
                        const open = isOpen(group.courseId);
                        return (
                            <section key={group.courseId} className="space-y-4">
                                <SectionHeader
                                    icon={GraduationCap}
                                    tone="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                    title={group.courseName}
                                    count={group.total}
                                    open={open}
                                    onToggle={() => toggleSection(group.courseId)}
                                    query={query}
                                />

                                {open && (
                                    <div className="space-y-5">
                                        {group.units.map((unitGroup) => (
                                            <div
                                                key={unitGroup.unitId ?? "course-level"}
                                                className="space-y-2.5"
                                            >
                                                <div className="flex items-center gap-2 pl-1">
                                                    <Layers className="h-3.5 w-3.5 text-violet-600 dark:text-violet-400" />

                                                    <h3 className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">
                                                        <Highlight
                                                            text={unitGroup.unitName ?? "Course-wide"}
                                                            query={query}
                                                        />
                                                    </h3>

                                                    <span className="text-xs tabular-nums text-zinc-400 dark:text-zinc-500">
                                                        {unitGroup.documents.length}
                                                    </span>
                                                </div>

                                                {renderItems(unitGroup.documents)}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </section>
                        );
                    })}

                    {/* General (unaffiliated) resources */}
                    {generalResources.length > 0 && (
                        <section className="space-y-4">
                            <SectionHeader
                                icon={Globe}
                                tone="bg-sky-500/10 text-sky-600 dark:text-sky-400"
                                title="General resources"
                                subtitle="Not linked to a specific course"
                                count={generalResources.length}
                                open={isOpen("__general__")}
                                onToggle={() => toggleSection("__general__")}
                                query=""
                            />

                            {isOpen("__general__") && renderItems(generalResources)}
                        </section>
                    )}
                </div>
            )}
        </div>
    );
}