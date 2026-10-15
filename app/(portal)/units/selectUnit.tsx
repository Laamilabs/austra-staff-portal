"use client";

import React, {
    useState,
    useEffect,
    useRef,
    useMemo,
    useCallback,
} from "react";
import {
    Search,
    ChevronDown,
    X,
    Layers,
    Check,
    Loader2,
} from "lucide-react";
import { Unit, unitApi } from "@/app/types/units";
import { PortalDropdown } from "@/app/components/ui/portal-dropdown";

interface SelectUnitProps {
    courseId: string;
    value: string;
    onChange: (unitId: string, selectedUnit?: Unit) => void;
    disabled?: boolean;
    units?: Unit[];
    loading?: boolean;
    required?: boolean;
    placeholder?: string;
    className?: string;
}

export default function SelectUnit({
    courseId,
    value,
    onChange,
    disabled = false,
    units: externalUnits,
    loading: externalLoading,
    required = false,
    placeholder = "Select or search a unit...",
    className = "",
}: SelectUnitProps) {
    const [internalUnits, setInternalUnits] = useState<Unit[]>([]);
    const [internalLoading, setInternalLoading] = useState<boolean>(false);
    const [isOpen, setIsOpen] = useState<boolean>(false);
    const [searchQuery, setSearchQuery] = useState<string>("");

    const containerRef = useRef<HTMLDivElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement | null>(null);
    const prevCourseIdRef = useRef<string>(courseId);

    // Resolve data source
    const units = externalUnits ?? internalUnits;
    const isLoading = externalLoading ?? internalLoading;

    // Fetch units for the given course if external ones are not provided
    useEffect(() => {
        if (externalUnits !== undefined) return;

        if (!courseId) {
            setInternalUnits([]);
            return;
        }

        let cancelled = false;

        const fetchUnits = async () => {
            try {
                setInternalLoading(true);
                const res = await unitApi.getByCourse(courseId);
                if (!cancelled) setInternalUnits(res.data || []);
            } catch (err) {
                console.error("Failed to load units in SelectUnit:", err);
                if (!cancelled) setInternalUnits([]);
            } finally {
                if (!cancelled) setInternalLoading(false);
            }
        };

        fetchUnits();

        return () => {
            cancelled = true;
        };
    }, [courseId, externalUnits]);

    // Clear selection when the courseId actually changes (after mount)
    useEffect(() => {
        if (prevCourseIdRef.current !== courseId) {
            prevCourseIdRef.current = courseId;
            if (value) onChange("", undefined);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [courseId]);

    // Close on outside click — now checks both the trigger AND the portal dropdown
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

    // Focus the search input the moment it mounts inside the portal
    const attachSearchRef = useCallback((el: HTMLInputElement | null) => {
        searchInputRef.current = el;
        if (el) {
            // microtask lets the browser finish layout before focus
            queueMicrotask(() => el.focus());
        }
    }, []);

    const selectedUnit = useMemo(
        () => units.find((u) => u._id === value),
        [units, value]
    );

    const filteredUnits = useMemo(() => {
        if (!searchQuery.trim()) return units;
        const query = searchQuery.toLowerCase();
        return units.filter((unit) => {
            const nameMatch = unit.name?.toLowerCase().includes(query);
            const codeMatch = unit.code?.toLowerCase().includes(query);
            const typeMatch = unit.type?.toLowerCase().includes(query);
            const descMatch = unit.description?.toLowerCase().includes(query);
            return nameMatch || codeMatch || typeMatch || descMatch;
        });
    }, [units, searchQuery]);

    const handleSelect = (unit: Unit) => {
        onChange(unit._id, unit);
        setIsOpen(false);
        setSearchQuery("");
    };

    const handleClear = (e: React.MouseEvent) => {
        e.stopPropagation();
        onChange("", undefined);
        setSearchQuery("");
    };

    const isDisabled = disabled || !courseId || isLoading;

    return (
        <div className={`relative w-full ${className}`} ref={containerRef}>
            {/* Trigger */}
            <div
                onClick={() => !isDisabled && setIsOpen((prev) => !prev)}
                className={`w-full px-3.5 py-2.5 border rounded-sm text-sm flex items-center justify-between cursor-pointer transition-all shadow-xs ${
                    isDisabled
                        ? "bg-zinc-100 text-zinc-400 border-zinc-200 cursor-not-allowed dark:bg-zinc-800 dark:text-zinc-500 dark:border-zinc-700"
                        : isOpen
                        ? "border-[#082B66] ring-2 ring-[#082B66]/20 bg-white dark:border-orange-400 dark:ring-orange-400/20 dark:bg-zinc-900"
                        : "border-zinc-300 bg-white text-zinc-900 hover:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white dark:hover:border-zinc-600"
                }`}
            >
                <div className="flex items-center gap-2 overflow-hidden mr-2">
                    <Layers className="w-4 h-4 text-zinc-500 shrink-0 dark:text-zinc-400" />

                    {isLoading ? (
                        <span className="text-zinc-400 flex items-center gap-2 dark:text-zinc-500">
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            Loading units...
                        </span>
                    ) : selectedUnit ? (
                        <div className="truncate flex items-center gap-2">
                            <span className="font-medium text-zinc-900 truncate dark:text-white">
                                {selectedUnit.name}
                            </span>
                            <span className="text-xs font-mono bg-zinc-100 text-zinc-600 px-1.5 py-0.5 rounded-sm border border-zinc-200 shrink-0 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700">
                                {selectedUnit.code}
                            </span>
                        </div>
                    ) : (
                        <span className="text-zinc-400 truncate dark:text-zinc-500">
                            {!courseId ? "Select a course first..." : placeholder}
                        </span>
                    )}
                </div>

                <div className="flex items-center gap-1 shrink-0">
                    {selectedUnit && !disabled && (
                        <button
                            type="button"
                            onClick={handleClear}
                            className="p-1 hover:bg-zinc-100 text-zinc-400 hover:text-zinc-600 rounded-full transition-colors dark:hover:bg-zinc-800 dark:text-zinc-500 dark:hover:text-zinc-300"
                            title="Clear selection"
                        >
                            <X className="w-3.5 h-3.5" />
                        </button>
                    )}
                    <ChevronDown
                        className={`w-4 h-4 text-zinc-400 transition-transform duration-200 dark:text-zinc-500 ${
                            isOpen ? "rotate-180" : ""
                        }`}
                    />
                </div>
            </div>

            {/* Hidden input for native form validation */}
            {required && (
                <input
                    type="text"
                    value={value}
                    onChange={() => {}}
                    required
                    className="sr-only"
                    tabIndex={-1}
                />
            )}

            {/* Dropdown — rendered in a portal with fixed positioning */}
            <PortalDropdown
                open={isOpen && !isDisabled}
                anchorRef={containerRef}
                dropdownRef={dropdownRef}
                maxHeight={340}
            >
                {/* Search Header */}
                <div className="p-2 border-b border-zinc-100 bg-zinc-50/50 dark:border-zinc-800 dark:bg-zinc-800/40">
                    <div className="relative">
                        <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 dark:text-zinc-500" />
                        <input
                            ref={attachSearchRef}
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search by code, title or type..."
                            className="w-full pl-9 pr-8 py-2 text-xs bg-white border border-zinc-200 rounded-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-[#082B66] focus:border-transparent transition-all dark:bg-zinc-800 dark:border-zinc-700 dark:text-white dark:placeholder-zinc-500 dark:focus:ring-orange-400"
                        />
                        {searchQuery && (
                            <button
                                type="button"
                                onClick={() => setSearchQuery("")}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300"
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                        )}
                    </div>
                </div>

                {/* Options */}
                <div className="max-h-60 overflow-y-auto p-1 space-y-0.5">
                    {filteredUnits.length === 0 ? (
                        <div className="py-6 px-4 text-center text-xs text-zinc-500 dark:text-zinc-400">
                            {units.length === 0
                                ? "No units available for this course"
                                : `No units found matching "${searchQuery}"`}
                        </div>
                    ) : (
                        filteredUnits.map((unit) => {
                            const isSelected = unit._id === value;
                            const metaParts: string[] = [];
                            if (unit.type) {
                                metaParts.push(
                                    unit.type.charAt(0).toUpperCase() +
                                        unit.type.slice(1)
                                );
                            }
                            if (unit.optionalUnit) metaParts.push("Optional");

                            return (
                                <div
                                    key={unit._id}
                                    onClick={() => handleSelect(unit)}
                                    className={`px-3 py-2.5 rounded-sm text-xs cursor-pointer flex items-center justify-between transition-colors ${
                                        isSelected
                                            ? "bg-[#082B66]/10 text-[#082B66] font-medium dark:bg-orange-400/10 dark:text-orange-300"
                                            : "hover:bg-zinc-50 text-zinc-700 dark:hover:bg-zinc-800 dark:text-zinc-300"
                                    }`}
                                >
                                    <div className="space-y-0.5 min-w-0 pr-2">
                                        <div className="flex items-center gap-2">
                                            <span className="font-semibold text-zinc-900 truncate dark:text-white">
                                                {unit.name}
                                            </span>
                                            <span className="font-mono text-[10px] text-[#082B66] bg-[#082B66]/10 px-1.5 py-0.5 rounded-sm shrink-0 dark:text-orange-400 dark:bg-orange-400/10">
                                                {unit.code}
                                            </span>
                                        </div>
                                        {metaParts.length > 0 && (
                                            <p className="text-[11px] text-zinc-500 truncate dark:text-zinc-400">
                                                {metaParts.join(" • ")}
                                            </p>
                                        )}
                                    </div>
                                    {isSelected && (
                                        <Check className="w-4 h-4 text-[#082B66] shrink-0 dark:text-orange-400" />
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>
            </PortalDropdown>
        </div>
    );
}