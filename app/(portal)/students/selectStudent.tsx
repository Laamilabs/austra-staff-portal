
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
    UserRound,
    Check,
    Loader2,
} from "lucide-react";

import {
    Student,
    studentApi,
} from "@/app/types/students";

import { PortalDropdown } from "@/app/components/ui/portal-dropdown";

interface SelectStudentProps {
    value: string;
    onChange: (
        studentId: string,
        selectedStudent?: Student
    ) => void;
    disabled?: boolean;
    students?: Student[];
    loading?: boolean;
    required?: boolean;
    placeholder?: string;
    className?: string;
}

const FOCUS_RING =
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400";

const HIDE_SCROLLBAR =
    "[scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden";

const CODE_CHIP =
    "shrink-0 rounded-sm bg-[#0B1E3D]/5 px-1.5 py-0.5 font-mono text-[11px] font-medium text-[#0B1E3D] ring-1 ring-inset ring-[#0B1E3D]/10 dark:bg-orange-400/10 dark:text-orange-300 dark:ring-orange-400/25";

/**
 * Safely obtain the student's full name.
 */
function getStudentName(student: Student): string {
    const { firstName, middleName, lastName } = student.fullName;

    return [firstName, middleName, lastName]
        .filter((part) => part?.trim())
        .join(" ");
}

/**
 * GET /students populates userId with the email.
 * Other responses may return userId as a string.
 */
function getStudentEmail(student: Student): string {
    if (
        typeof student.userId === "object" &&
        student.userId !== null
    ) {
        return student.userId.email ?? "";
    }

    return "";
}

/**
 * Admission numbers are generated per student enrollment.
 * A student can have multiple course enrollments.
 */
function getAdmissionNumbers(student: Student): string[] {
    return (student.courses ?? [])
        .map((enrollment) => enrollment.admissionNumber)
        .filter(Boolean);
}

export default function SelectStudent({
    value,
    onChange,
    disabled = false,
    students: externalStudents,
    loading: externalLoading,
    required = false,
    placeholder = "Select or search a student...",
    className = "",
}: SelectStudentProps) {
    const [internalStudents, setInternalStudents] =
        useState<Student[]>([]);

    const [internalLoading, setInternalLoading] =
        useState(false);

    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [activeIndex, setActiveIndex] = useState(0);

    const [edges, setEdges] = useState({
        top: false,
        bottom: false,
    });

    const containerRef = useRef<HTMLDivElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const triggerRef = useRef<HTMLButtonElement>(null);
    const listRef = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement | null>(null);

    const listId = useId();

    const students = externalStudents ?? internalStudents;
    const isLoading = externalLoading ?? internalLoading;

    // ---------------------------------------------------------
    // Load students when no external list is provided.
    // ---------------------------------------------------------

    useEffect(() => {
        if (externalStudents !== undefined) {
            return;
        }

        let cancelled = false;

        const fetchStudents = async () => {
            try {
                setInternalLoading(true);

                const response = await studentApi.getAll();

                if (!cancelled) {
                    setInternalStudents(response.data ?? []);
                }
            } catch (error) {
                if (!cancelled) {
                    console.error(
                        "Failed to load students in SelectStudent:",
                        error
                    );
                }
            } finally {
                if (!cancelled) {
                    setInternalLoading(false);
                }
            }
        };

        fetchStudents();

        return () => {
            cancelled = true;
        };
    }, [externalStudents]);

    // ---------------------------------------------------------
    // Close the dropdown when clicking outside it.
    // ---------------------------------------------------------

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Node;

            const inTrigger =
                containerRef.current?.contains(target);

            const inDropdown =
                dropdownRef.current?.contains(target);

            if (!inTrigger && !inDropdown) {
                setIsOpen(false);
            }
        };

        document.addEventListener(
            "mousedown",
            handleClickOutside
        );

        return () => {
            document.removeEventListener(
                "mousedown",
                handleClickOutside
            );
        };
    }, []);

    // ---------------------------------------------------------
    // Focus the search field after opening the dropdown.
    // ---------------------------------------------------------

    const attachSearchRef = useCallback(
        (element: HTMLInputElement | null) => {
            searchInputRef.current = element;

            if (element) {
                queueMicrotask(() => element.focus());
            }
        },
        []
    );

    // ---------------------------------------------------------
    // Selected student.
    // ---------------------------------------------------------

    const selectedStudent = useMemo(
        () => students.find((student) => student._id === value),
        [students, value]
    );

    // ---------------------------------------------------------
    // Search by name, email, ID number, or admission number.
    // ---------------------------------------------------------

    const filteredStudents = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();

        if (!query) {
            return students;
        }

        return students.filter((student) => {
            const name = getStudentName(student).toLowerCase();

            const email = getStudentEmail(student).toLowerCase();

            const idNumber =
                student.identification?.idNumber?.toLowerCase() ?? "";

            const passportNumber =
                student.identification?.passportNumber?.toLowerCase() ?? "";

            const admissionNumbers = getAdmissionNumbers(student);

            return (
                name.includes(query) ||
                email.includes(query) ||
                idNumber.includes(query) ||
                passportNumber.includes(query) ||
                admissionNumbers.some((number) =>
                    number.toLowerCase().includes(query)
                )
            );
        });
    }, [students, searchQuery]);

    const canOpen = !disabled && !isLoading;
    const open = isOpen && canOpen;

    // ---------------------------------------------------------
    // Scroll edge fades.
    // ---------------------------------------------------------

    const updateEdges = useCallback(() => {
        const element = listRef.current;

        if (!element) {
            return;
        }

        const top = element.scrollTop > 4;

        const bottom =
            element.scrollTop + element.clientHeight <
            element.scrollHeight - 4;

        setEdges((previous) =>
            previous.top === top &&
                previous.bottom === bottom
                ? previous
                : { top, bottom }
        );
    }, []);

    useEffect(() => {
        if (!open) {
            return;
        }

        const timeoutId = window.setTimeout(updateEdges, 0);

        return () => window.clearTimeout(timeoutId);
    }, [open, filteredStudents.length, updateEdges]);

    // ---------------------------------------------------------
    // Set the active option when the list changes.
    // ---------------------------------------------------------

    useEffect(() => {
        if (!open) {
            return;
        }

        const selectedIndex = filteredStudents.findIndex(
            (student) => student._id === value
        );

        setActiveIndex(
            selectedIndex >= 0 && !searchQuery
                ? selectedIndex
                : 0
        );
    }, [open, searchQuery, filteredStudents, value]);

    // ---------------------------------------------------------
    // Keep the active option visible.
    // ---------------------------------------------------------

    useEffect(() => {
        if (!open) {
            return;
        }

        document
            .getElementById(`${listId}-opt-${activeIndex}`)
            ?.scrollIntoView({ block: "nearest" });
    }, [activeIndex, open, listId]);

    // ---------------------------------------------------------
    // Actions.
    // ---------------------------------------------------------

    const closeAndFocusTrigger = () => {
        setIsOpen(false);
        setSearchQuery("");
        triggerRef.current?.focus();
    };

    const handleSelect = (student: Student) => {
        onChange(student._id, student);
        closeAndFocusTrigger();
    };

    const handleClear = (
        event: React.MouseEvent<HTMLButtonElement>
    ) => {
        event.stopPropagation();

        onChange("", undefined);
        setSearchQuery("");
    };

    const onTriggerKeyDown = (
        event: React.KeyboardEvent<HTMLButtonElement>
    ) => {
        if (!canOpen) {
            return;
        }

        if (
            event.key === "ArrowDown" ||
            event.key === "ArrowUp"
        ) {
            event.preventDefault();
            setIsOpen(true);
        }
    };

    const onSearchKeyDown = (
        event: React.KeyboardEvent<HTMLInputElement>
    ) => {
        const last = filteredStudents.length - 1;

        switch (event.key) {
            case "ArrowDown":
                event.preventDefault();

                setActiveIndex((index) =>
                    last < 0 ? 0 : index >= last ? 0 : index + 1
                );
                break;

            case "ArrowUp":
                event.preventDefault();

                setActiveIndex((index) =>
                    last < 0 ? 0 : index <= 0 ? last : index - 1
                );
                break;

            case "Home":
                event.preventDefault();
                setActiveIndex(0);
                break;

            case "End":
                event.preventDefault();
                setActiveIndex(Math.max(last, 0));
                break;

            case "Enter": {
                event.preventDefault();

                const student = filteredStudents[activeIndex];

                if (student) {
                    handleSelect(student);
                }

                break;
            }

            case "Escape":
                event.preventDefault();
                closeAndFocusTrigger();
                break;

            case "Tab":
                setIsOpen(false);
                setSearchQuery("");
                break;
        }
    };

    const fade = 20;

    const maskImage = `linear-gradient(
        to bottom,
        transparent 0,
        #000 ${edges.top ? fade : 0}px,
        #000 calc(100% - ${edges.bottom ? fade : 0}px),
        transparent 100%
    )`;

    const showClear = Boolean(selectedStudent) && !disabled;

    // ---------------------------------------------------------
    // Render.
    // ---------------------------------------------------------

    return (
        <div
            ref={containerRef}
            className={`relative w-full ${className}`}
        >
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
                onClick={() => setIsOpen((previous) => !previous)}
                onKeyDown={onTriggerKeyDown}
                className={`flex h-10 w-full items-center gap-2 rounded-sm border pl-3 text-left text-sm transition-colors ${FOCUS_RING} ${showClear ? "pr-14" : "pr-9"
                    } ${!canOpen
                        ? "cursor-not-allowed border-zinc-200 bg-zinc-100 text-zinc-400 dark:border-white/10 dark:bg-white/5 dark:text-zinc-500"
                        : open
                            ? "border-orange-400 bg-white ring-2 ring-orange-400/25 dark:bg-[#0B1E3D]"
                            : "border-zinc-200 bg-white text-zinc-900 hover:border-zinc-300 dark:border-white/10 dark:bg-[#0B1E3D] dark:text-white dark:hover:border-white/20"
                    }`}
            >
                <UserRound
                    className={`h-4 w-4 shrink-0 ${canOpen
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-zinc-400 dark:text-zinc-500"
                        }`}
                />

                {isLoading ? (
                    <span className="flex items-center gap-2 truncate text-zinc-400 dark:text-zinc-500">
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-orange-500 dark:text-orange-400" />
                        Loading students...
                    </span>
                ) : selectedStudent ? (
                    <span className="flex min-w-0 flex-1 items-center gap-2">
                        <span className="truncate font-medium text-[#0B1E3D] dark:text-white">
                            {getStudentName(selectedStudent)}
                        </span>

                        {/* Courses chip — desktop only, gives the name full width on mobile */}
                        <span className={`hidden sm:inline ${CODE_CHIP}`}>
                            {selectedStudent.courses?.length ?? 0}{" "}
                            {(selectedStudent.courses?.length ?? 0) === 1
                                ? "course"
                                : "courses"}
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
                className={`pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400 transition-transform duration-200 dark:text-zinc-500 ${open
                    ? "rotate-180 text-orange-500 dark:text-orange-400"
                    : ""
                    }`}
            />

            {showClear && (
                <button
                    type="button"
                    onClick={handleClear}
                    aria-label="Clear student selection"
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
                    tabIndex={-1}
                    aria-hidden
                    className="sr-only"
                />
            )}

            {/* Dropdown portal */}

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
                            flex h-9 items-center gap-2 rounded-sm border-b-2
                            border-transparent bg-zinc-100 px-2.5
                            text-zinc-400 transition-colors
                            focus-within:border-orange-400
                            focus-within:bg-white focus-within:shadow-sm
                            dark:bg-white/5 dark:text-zinc-500
                            dark:focus-within:bg-white/10
                        "
                    >
                        <Search className="h-4 w-4 shrink-0" />

                        <input
                            ref={attachSearchRef}
                            type="text"
                            role="searchbox"
                            value={searchQuery}
                            onChange={(event) =>
                                setSearchQuery(event.target.value)
                            }
                            onKeyDown={onSearchKeyDown}
                            placeholder="Search name, email, ID or admission no."
                            aria-label="Search students"
                            aria-controls={listId}
                            aria-activedescendant={
                                filteredStudents.length > 0
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
                    aria-label="Students"
                    onScroll={updateEdges}
                    style={{
                        maskImage,
                        WebkitMaskImage: maskImage,
                    }}
                    className={`max-h-60 space-y-0.5 overflow-y-auto overscroll-contain px-1.5 pb-1.5 ${HIDE_SCROLLBAR}`}
                >
                    {filteredStudents.length === 0 ? (
                        <div className="px-4 py-6 text-center text-xs text-zinc-500 dark:text-zinc-400">
                            {searchQuery.trim() ? (
                                <>
                                    No students match &ldquo;
                                    {searchQuery.trim()}
                                    &rdquo;
                                </>
                            ) : (
                                "No students available"
                            )}
                        </div>
                    ) : (
                        filteredStudents.map((student, index) => {
                            const isSelected =
                                student._id === value;

                            const isActive =
                                index === activeIndex;

                            const name = getStudentName(student);

                            const email = getStudentEmail(student);

                            const admissionNumbers =
                                getAdmissionNumbers(student);

                            return (
                                <div
                                    key={student._id}
                                    id={`${listId}-opt-${index}`}
                                    role="option"
                                    aria-selected={isSelected}
                                    onClick={() =>
                                        handleSelect(student)
                                    }
                                    onMouseMove={() => {
                                        if (!isActive) {
                                            setActiveIndex(index);
                                        }
                                    }}
                                    className={`relative flex min-h-12 cursor-pointer items-center gap-2 rounded-sm px-3 py-2 text-[13px] transition-colors ${isSelected
                                        ? "bg-[#0B1E3D]/[0.07] font-semibold text-[#0B1E3D] dark:bg-white/10 dark:text-white"
                                        : isActive
                                            ? "bg-[#0B1E3D]/[0.04] text-[#0B1E3D] dark:bg-white/[0.06] dark:text-white"
                                            : "text-zinc-700 dark:text-zinc-300"
                                        }`}
                                >
                                    <span
                                        aria-hidden
                                        className={`absolute left-0 top-1/2 h-4 w-0.75 -translate-y-1/2 rounded-sm bg-orange-400 transition-transform duration-200 ${isSelected
                                            ? "scale-y-100"
                                            : "scale-y-0"
                                            }`}
                                    />

                                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-sm bg-[#0B1E3D]/5 text-[#0B1E3D] dark:bg-white/10 dark:text-orange-300">
                                        <UserRound className="h-4 w-4" />
                                    </span>

                                    <span className="min-w-0 flex-1">
                                        <span className="block truncate font-medium">
                                            {name || "Unnamed student"}
                                        </span>

                                        <span className="block truncate text-[11px] text-zinc-500 dark:text-zinc-400">
                                            {email ||
                                                student.identification?.idNumber ||
                                                "No email or ID available"}
                                        </span>
                                    </span>

                                    {admissionNumbers.length > 0 && (
                                        <span
                                            className={CODE_CHIP}
                                            title={admissionNumbers.join(", ")}
                                        >
                                            {admissionNumbers.length > 1
                                                ? `${admissionNumbers.length} admissions`
                                                : admissionNumbers[0]}
                                        </span>
                                    )}

                                    <Check
                                        className={`h-4 w-4 shrink-0 text-orange-500 dark:text-orange-400 ${isSelected
                                            ? "opacity-100"
                                            : "opacity-0"
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
