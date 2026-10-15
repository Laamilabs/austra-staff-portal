"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
    Check,
    CircleCheck,
    DatabaseBackup,
    LoaderCircle,
    TriangleAlert,
    X,
} from "lucide-react";

export type BackupStatus = "idle" | "confirm" | "loading" | "success" | "error";

interface BackupModalProps {
    status: BackupStatus;
    error?: string;
    /** Optional 0–100. When provided the bar becomes determinate. */
    progress?: number;
    onConfirm: () => void;
    onClose: () => void;
}

const FOCUS_RING =
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#0B1E3D]";

// Windows 11 buttons: filled accent for the main action, subtle grey for the rest
const primaryBtn = `min-w-28 rounded-sm bg-orange-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-orange-400 active:bg-orange-600 ${FOCUS_RING}`;
const secondaryBtn = `min-w-28 rounded-sm border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-[#0B1E3D] shadow-sm transition-colors hover:bg-zinc-50 active:bg-zinc-100 dark:border-white/15 dark:bg-white/5 dark:text-white dark:hover:bg-white/10 ${FOCUS_RING}`;

const STEPS = ["Confirm", "Export", "Save"] as const;
const STEP_INDEX = { confirm: 0, loading: 1, success: 2, error: 1 } as const;

const formatTime = (s: number) =>
    `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

export default function BackupModal({
    status,
    error,
    progress,
    onConfirm,
    onClose,
}: BackupModalProps) {
    const dialogRef = useRef<HTMLDivElement>(null);
    const open = status !== "idle";
    const busy = status === "loading";
    const [elapsed, setElapsed] = useState(0);

    // Esc closes (not while the backup is running)
    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape" && !busy) onClose();
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [open, busy, onClose]);

    // Move focus to the primary action whenever the step changes
    useEffect(() => {
        if (!open) return;
        const target =
            dialogRef.current?.querySelector<HTMLElement>("[data-autofocus]") ??
            dialogRef.current;
        target?.focus();
    }, [open, status]);

    // Elapsed timer while the backup runs
    useEffect(() => {
        if (!busy) {
            setElapsed(0);
            return;
        }
        const started = Date.now();
        const id = setInterval(
            () => setElapsed(Math.floor((Date.now() - started) / 1000)),
            1000
        );
        return () => clearInterval(id);
    }, [busy]);

    // Keep Tab inside the dialog
    const trapFocus = (e: React.KeyboardEvent) => {
        if (e.key !== "Tab") return;
        const nodes = dialogRef.current?.querySelectorAll<HTMLElement>(
            "button:not([disabled])"
        );
        if (!nodes || nodes.length === 0) {
            e.preventDefault();
            return;
        }
        const first = nodes[0];
        const last = nodes[nodes.length - 1];
        if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first.focus();
        }
    };

    if (!open || typeof document === "undefined") return null;

    // Patience copy that evolves the longer the backup takes
    const loadingText =
        elapsed < 15
            ? "Keep this window open. The download starts automatically."
            : elapsed < 60
                ? "Still working. Larger databases take a little longer."
                : "This is taking longer than usual, but it is still running. Please keep this window open.";

    const content = {
        confirm: {
            icon: <DatabaseBackup size={22} />,
            tile: "bg-orange-400/10 text-orange-600 dark:text-orange-400",
            title: "Download database backup",
            text: "This saves a copy of the database to your device. Store the file somewhere secure.",
        },
        loading: {
            icon: <LoaderCircle size={22} className="motion-safe:animate-spin" />,
            tile: "bg-orange-400/10 text-orange-600 dark:text-orange-400",
            title: "Preparing your backup",
            text: loadingText,
        },
        success: {
            icon: <CircleCheck size={22} />,
            tile: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
            title: "Backup downloaded",
            text: "The file is in your downloads folder.",
        },
        error: {
            icon: <TriangleAlert size={22} />,
            tile: "bg-red-500/10 text-red-600 dark:text-red-400",
            title: "Backup failed",
            text: "No file was saved. Check your connection, then try again.",
        },
    }[status as Exclude<BackupStatus, "idle">];

    const determinate = typeof progress === "number";
    const pct = determinate ? Math.min(100, Math.max(0, progress)) : 0;
    const current = STEP_INDEX[status as Exclude<BackupStatus, "idle">];

    return createPortal(
        <div
            data-backup-modal
            className="fixed inset-0 z-60 flex items-center justify-center p-4"
        >
            <style>{`
        @keyframes backup-slide {
          0%   { transform: translateX(-100%); }
          100% { transform: translateX(350%); }
        }
      `}</style>

            {/* Acrylic scrim */}
            <div
                aria-hidden="true"
                onClick={() => !busy && onClose()}
                className="absolute inset-0 bg-[#0B1E3D]/50 backdrop-blur-md"
            />

            <div
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby="backup-title"
                aria-describedby="backup-text"
                aria-busy={busy}
                tabIndex={-1}
                onKeyDown={trapFocus}
                className="relative w-full max-w-md overflow-hidden rounded-sm border border-zinc-200 bg-white shadow-2xl shadow-blue-950/40 outline-none dark:border-white/10 dark:bg-[#0B1E3D]"
            >
                {/* Title bar */}
                <div className="flex h-10 items-center justify-between pl-4">
                    <div className="flex items-center gap-2 text-xs font-medium text-zinc-500 dark:text-zinc-400">
                        <DatabaseBackup size={14} className="text-orange-500" />
                        Database backup
                    </div>
                    {!busy ? (
                        <button
                            type="button"
                            onClick={onClose}
                            aria-label="Close"
                            className={`flex h-10 w-11 items-center justify-center text-zinc-500 transition-colors hover:bg-red-600 hover:text-white focus-visible:ring-inset ${FOCUS_RING}`}
                        >
                            <X size={16} />
                        </button>
                    ) : (
                        <span className="h-10 w-11" aria-hidden="true" />
                    )}
                </div>

                {/* Step rail: shows where you are in the flow */}
                <ol
                    aria-label="Backup steps"
                    className="grid grid-cols-3 gap-1.5 px-6 pt-1"
                >
                    {STEPS.map((label, i) => {
                        const done = status === "success" || i < current;
                        const active = !done && i === current;
                        const failed = active && status === "error";
                        return (
                            <li
                                key={label}
                                aria-current={active ? "step" : undefined}
                                className="min-w-0"
                            >
                                <div
                                    className={`h-1 rounded-sm transition-colors duration-300 ${failed
                                        ? "bg-red-500"
                                        : done
                                            ? "bg-orange-500"
                                            : active
                                                ? `bg-orange-400 ${busy ? "motion-safe:animate-pulse" : ""}`
                                                : "bg-zinc-200 dark:bg-white/10"
                                        }`}
                                />
                                <span
                                    className={`mt-1.5 flex items-center gap-1 text-xs ${failed
                                        ? "font-semibold text-red-600 dark:text-red-400"
                                        : active
                                            ? "font-semibold text-[#0B1E3D] dark:text-white"
                                            : "text-zinc-400 dark:text-zinc-500"
                                        }`}
                                >
                                    {done && <Check size={12} className="text-orange-500" />}
                                    {label}
                                </span>
                            </li>
                        );
                    })}
                </ol>

                {/* Body */}
                <div className="px-6 pb-6 pt-5" aria-live="polite">
                    <div className="flex items-start gap-4">
                        <span
                            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-sm ${content.tile}`}
                        >
                            {content.icon}
                        </span>
                        <div className="min-w-0">
                            <h2
                                id="backup-title"
                                className="text-base font-semibold text-[#0B1E3D] dark:text-white"
                            >
                                {content.title}
                            </h2>
                            <p
                                id="backup-text"
                                className="mt-1 text-sm leading-6 text-zinc-500 dark:text-zinc-400"
                            >
                                {content.text}
                            </p>
                        </div>
                    </div>

                    {busy && (
                        <div className="mt-5">
                            <div
                                role="progressbar"
                                aria-label="Backup progress"
                                aria-valuemin={0}
                                aria-valuemax={100}
                                aria-valuenow={determinate ? Math.round(pct) : undefined}
                                className="relative h-1 overflow-hidden rounded-sm bg-zinc-100 dark:bg-white/10"
                            >
                                {determinate ? (
                                    <div
                                        className="h-full rounded-sm bg-orange-500 transition-[width] duration-500 ease-out"
                                        style={{ width: `${pct}%` }}
                                    />
                                ) : (
                                    <div className="absolute inset-y-0 left-0 w-1/4 rounded-sm bg-orange-500 motion-safe:animate-[backup-slide_1.4s_cubic-bezier(0.4,0,0.2,1)_infinite] motion-reduce:w-full motion-reduce:opacity-50" />
                                )}
                            </div>
                            <div className="mt-2 flex justify-between text-xs tabular-nums text-zinc-500 dark:text-zinc-400">
                                <span>Elapsed {formatTime(elapsed)}</span>
                                {determinate && <span>{Math.round(pct)}%</span>}
                            </div>
                        </div>
                    )}

                    {/* Error detail: an InfoBar, announced immediately */}
                    {status === "error" && (
                        <div
                            role="alert"
                            className="mt-5 flex gap-3 rounded-sm border border-red-200 border-l-4 border-l-red-500 bg-red-50 p-3 dark:border-red-500/30 dark:border-l-red-500 dark:bg-red-500/10"
                        >
                            <TriangleAlert
                                size={16}
                                className="mt-0.5 shrink-0 text-red-600 dark:text-red-400"
                            />
                            <div className="min-w-0 text-sm">
                                <p className="font-semibold text-red-700 dark:text-red-300">
                                    What went wrong
                                </p>
                                <p className="mt-0.5 wrap-break-word leading-5 text-red-700/90 dark:text-red-200/90">
                                    {error || "Something went wrong. Please try again."}
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Command footer */}
                <div className="flex min-h-15 items-center justify-between gap-2 border-t border-zinc-200 bg-zinc-50 px-6 py-3 dark:border-white/10 dark:bg-white/5">
                    {busy ? (
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">
                            Closing is disabled until the backup finishes.
                        </p>
                    ) : (
                        <>
                            <span aria-hidden="true" />
                            <div className="flex gap-2">
                                {status === "confirm" && (
                                    <>
                                        <button type="button" onClick={onClose} className={secondaryBtn}>
                                            Cancel
                                        </button>
                                        <button
                                            type="button"
                                            onClick={onConfirm}
                                            data-autofocus
                                            className={primaryBtn}
                                        >
                                            Download backup
                                        </button>
                                    </>
                                )}
                                {status === "success" && (
                                    <button
                                        type="button"
                                        onClick={onClose}
                                        data-autofocus
                                        className={primaryBtn}
                                    >
                                        Done
                                    </button>
                                )}
                                {status === "error" && (
                                    <>
                                        <button type="button" onClick={onClose} className={secondaryBtn}>
                                            Close
                                        </button>
                                        <button
                                            type="button"
                                            onClick={onConfirm}
                                            data-autofocus
                                            className={primaryBtn}
                                        >
                                            Try again
                                        </button>
                                    </>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>,
        document.body
    );
}