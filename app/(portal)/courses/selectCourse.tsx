"use client";

import React, {
    useState,
    useEffect,
    useRef,
    useMemo,
    useCallback,
    useId,
} from "react";
import {
    Search,
    ChevronDown,
    X,
    GraduationCap,
    Check,
    Loader2,
} from "lucide-react";
import { Course, courseApi } from "@/app/types/courses";
import { PortalDropdown } from "@/app/components/ui/portal-dropdown";

interface SelectCourseProps {
    value: string;
    onChange: (courseId: string, selectedCourse?: Course) => void;
    disabled?: boolean;
    courses?: Course[];
    loading?: boolean;
    required?: boolean;
    placeholder?: string;
    className?: string;
}

const FOCUS_RING =
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400";

/** Hides the scrollbar everywhere without disabling scrolling. */
const HIDE_SCROLLBAR =
    "[scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden";

/** Course code chip: navy tint in light mode, orange tint in dark mode. */
const CODE_CHIP =
    "shrink-0 rounded-sm bg-[#0B1E3D]/5 px-1.5 py-0.5 font-mono text-[11px] font-medium text-[#0B1E3D] ring-1 ring-inset ring-[#0B1E3D]/10 dark:bg-orange-400/10 dark:text-orange-300 dark:ring-orange-400/25";

export default function SelectCourse({
    value,
    onChange,
    disabled = false,
    courses: externalCourses,
    loading: externalLoading,
    required = false,
    placeholder = "Select or search a course...",
    className = "",
}: SelectCourseProps) {
    const [internalCourses, setInternalCourses] = useState<Course[]>([]);
    const [internalLoading, setInternalLoading] = useState<boolean>(false);
    const [isOpen, setIsOpen] = useState<boolean>(false);
    const [searchQuery, setSearchQuery] = useState<string>("");
    const [activeIndex, setActiveIndex] = useState<number>(0);
    const [edges, setEdges] = useState({ top: false, bottom: false });

    const containerRef = useRef<HTMLDivElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const triggerRef = useRef<HTMLButtonElement>(null);
    const listRef = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement | null>(null);

    const listId = useId();

    const courses = externalCourses ?? internalCourses;
    const isLoading = externalLoading ?? internalLoading;

    useEffect(() => {
        if (externalCourses === undefined) {
            const fetchCourses = async () => {
                try {
                    setInternalLoading(true);
                    const res = await courseApi.getAll();
                    setInternalCourses(res.data || []);
                } catch (err) {
                    console.error(
                        "Failed to load courses in SelectCourse:",
                        err
                    );
                } finally {
                    setInternalLoading(false);
                }
            };
            fetchCourses();
        }
    }, [externalCourses]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Node;
            const inTrigger = containerRef.current?.contains(target);
            const inDropdown = dropdownRef.current?.contains(target);
            if (!inTrigger && !inDropdown) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () =>
            document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const attachSearchRef = useCallback((el: HTMLInputElement | null) => {
        searchInputRef.current = el;
        if (el) {
            queueMicrotask(() => el.focus());
        }
    }, []);

    const selectedCourse = useMemo(
        () => courses.find((c) => c._id === value),
        [courses, value]
    );

    const filteredCourses = useMemo(() => {
        if (!searchQuery.trim()) return courses;
        const query = searchQuery.toLowerCase();
        return courses.filter((course) => {
            const nameMatch = course.name.toLowerCase().includes(query);
            const codeMatch = course.courseCode.toLowerCase().includes(query);
            return nameMatch || codeMatch;
        });
    }, [courses, searchQuery]);

    const canOpen = !disabled && !isLoading;
    const open = isOpen && canOpen;

    /* ---------------- scroll edge fades ---------------- */

    const updateEdges = useCallback(() => {
        const el = listRef.current;
        if (!el) return;
        const top = el.scrollTop > 4;
        const bottom = el.scrollTop + el.clientHeight < el.scrollHeight - 4;
        setEdges((prev) =>
            prev.top === top && prev.bottom === bottom ? prev : { top, bottom }
        );
    }, []);

    // The list lives in a portal, so measure after it has mounted / changed.
    useEffect(() => {
        if (!open) return;
        const id = window.setTimeout(updateEdges, 0);
        return () => window.clearTimeout(id);
    }, [open, filteredCourses.length, updateEdges]);

    // Start on the selected course (or the first match) whenever the list changes.
    useEffect(() => {
        if (!open) return;
        const selectedIndex = filteredCourses.findIndex((c) => c._id === value);
        setActiveIndex(selectedIndex >= 0 && !searchQuery ? selectedIndex : 0);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, searchQuery]);

    // Keep the active option visible while navigating with the keyboard.
    useEffect(() => {
        if (!open) return;
        document
            .getElementById(`${listId}-opt-${activeIndex}`)
            ?.scrollIntoView({ block: "nearest" });
    }, [activeIndex, open, listId]);

    /* ---------------- actions ---------------- */

    const closeAndFocusTrigger = () => {
        setIsOpen(false);
        setSearchQuery("");
        triggerRef.current?.focus();
    };

    const handleSelect = (course: Course) => {
        onChange(course._id, course);
        closeAndFocusTrigger();
    };

    const handleClear = (e: React.MouseEvent) => {
        e.stopPropagation();
        onChange("", undefined);
        setSearchQuery("");
    };

    const onTriggerKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
        if (!canOpen) return;
        if (e.key === "ArrowDown" || e.key === "ArrowUp") {
            e.preventDefault();
            setIsOpen(true);
        }
    };

    const onSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        const last = filteredCourses.length - 1;

        switch (e.key) {
            case "ArrowDown":
                e.preventDefault();
                setActiveIndex((i) => (last < 0 ? 0 : i >= last ? 0 : i + 1));
                break;
            case "ArrowUp":
                e.preventDefault();
                setActiveIndex((i) => (last < 0 ? 0 : i <= 0 ? last : i - 1));
                break;
            case "Home":
                e.preventDefault();
                setActiveIndex(0);
                break;
            case "End":
                e.preventDefault();
                setActiveIndex(Math.max(last, 0));
                break;
            case "Enter": {
                e.preventDefault();
                const course = filteredCourses[activeIndex];
                if (course) handleSelect(course);
                break;
            }
            case "Escape":
                e.preventDefault();
                closeAndFocusTrigger();
                break;
            case "Tab":
                setIsOpen(false);
                setSearchQuery("");
                break;
        }
    };

    // Fade the list edges instead of showing a scrollbar.
    const fade = 20;
    const maskImage = `linear-gradient(to bottom, transparent 0, #000 ${edges.top ? fade : 0
        }px, #000 calc(100% - ${edges.bottom ? fade : 0}px), transparent 100%)`;

    const showClear = Boolean(selectedCourse) && !disabled;

    return (
        <div className={`relative w-full ${className}`} ref={containerRef}>
            {/* Trigger */}
            <button
                ref={triggerRef}
                type="button"
                role="combobox"
                aria-haspopup="listbox"
                aria-expanded={open}
                aria-controls={listId}
                aria-busy={isLoading}
                disabled={!canOpen}
                onClick={() => setIsOpen((prev) => !prev)}
                onKeyDown={onTriggerKeyDown}
                className={`flex h-10 w-full items-center gap-2 rounded-sm border pl-3 text-left text-sm transition-colors ${FOCUS_RING} ${showClear ? "pr-14" : "pr-9"
                    } ${!canOpen
                        ? "cursor-not-allowed border-zinc-200 bg-zinc-100 text-zinc-400 dark:border-white/10 dark:bg-white/5 dark:text-zinc-500"
                        : open
                            ? "border-orange-400 bg-white ring-2 ring-orange-400/25 dark:bg-[#0B1E3D]"
                            : "border-zinc-200 bg-white text-zinc-900 hover:border-zinc-300 dark:border-white/10 dark:bg-[#0B1E3D] dark:text-white dark:hover:border-white/20"
                    }`}
            >
                <GraduationCap
                    className={`h-4 w-4 shrink-0 ${canOpen
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-zinc-400 dark:text-zinc-500"
                        }`}
                />

                {isLoading ? (
                    <span className="flex items-center gap-2 truncate text-zinc-400 dark:text-zinc-500">
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-orange-500 dark:text-orange-400" />
                        Loading courses...
                    </span>
                ) : selectedCourse ? (
                    <span className="flex min-w-0 items-center gap-2">
                        <span className="truncate font-medium text-[#0B1E3D] dark:text-white">
                            {selectedCourse.name}
                        </span>
                        <span className={CODE_CHIP}>
                            {selectedCourse.courseCode}
                        </span>
                    </span>
                ) : (
                    <span className="truncate text-zinc-400 dark:text-zinc-500">
                        {placeholder}
                    </span>
                )}
            </button>

            <ChevronDown
                aria-hidden
                className={`pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400 transition-transform duration-200 dark:text-zinc-500 ${open ? "rotate-180 text-orange-500 dark:text-orange-400" : ""
                    }`}
            />

            {showClear && (
                <button
                    type="button"
                    onClick={handleClear}
                    aria-label="Clear course selection"
                    title="Clear selection"
                    className={`absolute right-8 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-sm text-zinc-400 transition-colors hover:bg-[#0B1E3D]/5 hover:text-[#0B1E3D] dark:text-zinc-500 dark:hover:bg-white/10 dark:hover:text-white ${FOCUS_RING}`}
                >
                    <X className="h-3.5 w-3.5" />
                </button>
            )}

            {required && (
                <input
                    type="text"
                    value={value}
                    onChange={() => { }}
                    required
                    className="sr-only"
                    tabIndex={-1}
                    aria-hidden
                />
            )}

            {/* Dropdown — Portal */}
            <PortalDropdown
                open={open}
                anchorRef={containerRef}
                dropdownRef={dropdownRef}
                maxHeight={340}
            >
                {/* Search */}
                <div className="p-2">
                    <label
                        className="
                            flex h-9 items-center gap-2 rounded-sm border-b-2 border-transparent
                            bg-zinc-100 px-2.5 text-zinc-400 transition-colors
                            focus-within:border-orange-400 focus-within:bg-white focus-within:shadow-sm
                            dark:bg-white/5 dark:text-zinc-500 dark:focus-within:bg-white/10
                        "
                    >
                        <Search className="h-4 w-4 shrink-0" />
                        <input
                            ref={attachSearchRef}
                            type="text"
                            role="searchbox"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onKeyDown={onSearchKeyDown}
                            placeholder="Search by code or title"
                            aria-label="Search courses"
                            aria-controls={listId}
                            aria-activedescendant={
                                filteredCourses.length > 0
                                    ? `${listId}-opt-${activeIndex}`
                                    : undefined
                            }
                            autoComplete="off"
                            spellCheck={false}
                            className="min-w-0 flex-1 bg-transparent text-[13px] text-[#0B1E3D] outline-none placeholder:text-zinc-400 dark:text-white dark:placeholder:text-zinc-500"
                        />
                        {searchQuery && (
                            <button
                                type="button"
                                onClick={() => {
                                    setSearchQuery("");
                                    searchInputRef.current?.focus();
                                }}
                                aria-label="Clear search"
                                className={`flex h-5 w-5 items-center justify-center rounded-sm hover:text-[#0B1E3D] dark:hover:text-white ${FOCUS_RING}`}
                            >
                                <X className="h-3.5 w-3.5" />
                            </button>
                        )}
                    </label>
                </div>

                {/* Options */}
                <div
                    ref={listRef}
                    id={listId}
                    role="listbox"
                    aria-label="Courses"
                    onScroll={updateEdges}
                    style={{ maskImage, WebkitMaskImage: maskImage }}
                    className={`max-h-60 space-y-0.5 overflow-y-auto overscroll-contain px-1.5 pb-1.5 ${HIDE_SCROLLBAR}`}
                >
                    {filteredCourses.length === 0 ? (
                        <div className="px-4 py-6 text-center text-xs text-zinc-500 dark:text-zinc-400">
                            {searchQuery.trim()
                                ? <>No courses match &ldquo;{searchQuery.trim()}&rdquo;</>
                                : "No courses available"}
                        </div>
                    ) : (
                        filteredCourses.map((course, index) => {
                            const isSelected = course._id === value;
                            const isActive = index === activeIndex;
                            return (
                                <div
                                    key={course._id}
                                    id={`${listId}-opt-${index}`}
                                    role="option"
                                    aria-selected={isSelected}
                                    onClick={() => handleSelect(course)}
                                    onMouseMove={() =>
                                        !isActive && setActiveIndex(index)
                                    }
                                    className={`relative flex h-9 cursor-pointer items-center gap-2 rounded-sm px-3 text-[13px] transition-colors ${isSelected
                                            ? "bg-[#0B1E3D]/[0.07] font-semibold text-[#0B1E3D] dark:bg-white/10 dark:text-white"
                                            : isActive
                                                ? "bg-[#0B1E3D]/4 text-[#0B1E3D] dark:bg-white/6 dark:text-white"
                                                : "text-zinc-700 dark:text-zinc-300"
                                        }`}
                                >
                                    {/* Selected pill, same as the sidebar */}
                                    <span
                                        aria-hidden
                                        className={`absolute left-0 top-1/2 h-4 w-0.75 origin-center -translate-y-1/2 rounded-sm bg-orange-400 transition-transform duration-200 ${isSelected ? "scale-y-100" : "scale-y-0"
                                            }`}
                                    />

                                    <span className="min-w-0 flex-1 truncate">
                                        {course.name}
                                    </span>
                                    <span className={CODE_CHIP}>
                                        {course.courseCode}
                                    </span>
                                    <Check
                                        className={`h-4 w-4 shrink-0 text-orange-500 dark:text-orange-400 ${isSelected ? "opacity-100" : "opacity-0"
                                            }`}
                                        strokeWidth={2.4}
                                    />
                                </div>
                            );
                        })
                    )}
                </div>
            </PortalDropdown>
        </div>
    );
}