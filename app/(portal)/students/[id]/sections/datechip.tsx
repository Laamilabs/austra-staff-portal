"use client";

import { Calendar, type LucideIcon } from "lucide-react";

interface DateChipProps {
    label: string;
    value: string;
    tone?: "neutral" | "info" | "accent" | "success" | "warning" | "muted";
    /** Override the default calendar icon (e.g. Hash for an admission number). */
    icon?: LucideIcon;
    /** Render the value in a monospace face (IDs, admission numbers). */
    mono?: boolean;
}

// Compact, borderless meta item: a coloured icon tile with a label over a value.
const TONES = {
    neutral: {
        icon: "bg-[#0B1E3D]/5 text-[#0B1E3D] dark:bg-orange-400/15 dark:text-orange-400",
        value: "text-[#0B1E3D] dark:text-white",
    },
    info: {
        icon: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
        value: "text-[#0B1E3D] dark:text-white",
    },
    accent: {
        icon: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
        value: "text-[#0B1E3D] dark:text-white",
    },
    success: {
        icon: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
        value: "text-emerald-700 dark:text-emerald-300",
    },
    warning: {
        icon: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
        value: "text-amber-700 dark:text-amber-300",
    },
    muted: {
        icon: "bg-zinc-100 text-zinc-400 dark:bg-white/5 dark:text-zinc-500",
        value: "text-zinc-400 dark:text-zinc-500",
    },
} as const;

export default function DateChip({
    label,
    value,
    tone = "neutral",
    icon: Icon = Calendar,
    mono = false,
}: DateChipProps) {
    const t = TONES[tone];

    return (
        <span className="flex min-w-0 items-center gap-2.5">
            <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-sm ${t.icon}`}
            >
                <Icon size={15} />
            </span>

            <span className="min-w-0">
                <span className="block text-xs text-zinc-500 dark:text-zinc-400">
                    {label}
                </span>
                <span
                    className={`block truncate text-[13px] font-semibold ${t.value} ${mono ? "font-mono" : ""
                        }`}
                >
                    {value}
                </span>
            </span>
        </span>
    );
}