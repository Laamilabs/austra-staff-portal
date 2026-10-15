"use client";

import React, {
    useEffect,
    useLayoutEffect,
    useRef,
    useState,
} from "react";
import { createPortal } from "react-dom";

interface PortalDropdownProps {
    open: boolean;
    anchorRef: React.RefObject<HTMLElement | null>;
    /** Optional external ref so the parent can test `contains()` for outside-click. */
    dropdownRef?: React.RefObject<HTMLDivElement | null>;
    /** Approximate max height of the dropdown content (used to decide flip). */
    maxHeight?: number;
    /** Gap in px between the trigger and the dropdown. */
    gap?: number;
    className?: string;
    children: React.ReactNode;
}

interface DropdownPos {
    top: number;
    left: number;
    width: number;
    placement: "top" | "bottom";
}

export function PortalDropdown({
    open,
    anchorRef,
    dropdownRef,
    maxHeight = 340,
    gap = 6,
    className = "",
    children,
}: PortalDropdownProps) {
    const [mounted, setMounted] = useState(false);
    const [pos, setPos] = useState<DropdownPos | null>(null);

    const internalRef = useRef<HTMLDivElement>(null);
    const ref = dropdownRef ?? internalRef;

    useEffect(() => {
        setMounted(true);
    }, []);

    useLayoutEffect(() => {
        if (!open) {
            setPos(null);
            return;
        }

        const update = () => {
            const el = anchorRef.current;
            if (!el) return;

            const rect = el.getBoundingClientRect();
            const spaceBelow = window.innerHeight - rect.bottom - gap;
            const spaceAbove = rect.top - gap;
            const openUp =
                spaceBelow < maxHeight && spaceAbove > spaceBelow;

            setPos({
                top: openUp ? rect.top - gap : rect.bottom + gap,
                left: rect.left,
                width: rect.width,
                placement: openUp ? "top" : "bottom",
            });
        };

        update();

        // capture-phase scroll so we react to *any* scrolling ancestor
        window.addEventListener("scroll", update, true);
        window.addEventListener("resize", update);

        return () => {
            window.removeEventListener("scroll", update, true);
            window.removeEventListener("resize", update);
        };
    }, [open, anchorRef, maxHeight, gap]);

    if (!mounted || !open || !pos) return null;

    return createPortal(
        <div
            ref={ref}
            style={{
                position: "fixed",
                top: pos.top,
                left: pos.left,
                width: pos.width,
                transform:
                    pos.placement === "top"
                        ? "translateY(-100%)"
                        : undefined,
                zIndex: 1000,
            }}
            className={`bg-white border border-zinc-200 rounded-sm shadow-lg overflow-hidden animate-in fade-in-50 duration-100 dark:bg-zinc-900 dark:border-zinc-800 ${className}`}
        >
            {children}
        </div>,
        document.body
    );
}