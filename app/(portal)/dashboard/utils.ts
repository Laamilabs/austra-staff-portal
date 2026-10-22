import { useEffect } from "react";
import {
    CheckCircle2,
    ClipboardCheck,
    Clock,
    Hourglass,
    Inbox,
    KeyRound,
    Landmark,
    Library,
    MinusCircle,
    Puzzle,
    Receipt,
    Search,
    Upload,
    UserPlus,
    Users,
    XCircle,
    type LucideIcon,
} from "lucide-react";

import type { ApplicationStatus } from "@/app/types/application";

// ---------------------------------------------------------------------------
// Formatting helpers
// ---------------------------------------------------------------------------

export function formatCurrency(amount: number, currency = "KES"): string {
    return `${currency} ${amount.toLocaleString(undefined, {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    })}`;
}

export function formatCompact(amount: number, currency = "KES"): string {
    if (amount >= 1_000_000) {
        return `${currency} ${(amount / 1_000_000).toFixed(1)}M`;
    }
    if (amount >= 1_000) {
        return `${currency} ${(amount / 1_000).toFixed(1)}K`;
    }
    return `${currency} ${amount}`;
}

export const clampPct = (n: number) => Math.max(0, Math.min(100, n));

// ---------------------------------------------------------------------------
// Fluid scale for large / 4K+ monitors
//
// Every Tailwind size is rem-based, so raising the root font-size scales the
// whole UI proportionally. Up to 1920px nothing changes; beyond that the UI
// grows at half the rate of the screen (so wider screens still show MORE
// content, not just bigger content), capped at 1.75x. Restored on unmount.
// ---------------------------------------------------------------------------

export function useFluidScale() {
    useEffect(() => {
        const root = document.documentElement;
        const previous = root.style.fontSize;

        const apply = () => {
            const w = window.innerWidth;
            const scale =
                w <= 1920 ? 1 : Math.min(1.75, 1 + ((w - 1920) / 1920) * 0.5);
            root.style.fontSize =
                scale === 1 ? previous : `${(16 * scale).toFixed(2)}px`;
        };

        apply();
        window.addEventListener("resize", apply);
        return () => {
            window.removeEventListener("resize", apply);
            root.style.fontSize = previous;
        };
    }, []);
}

// ---------------------------------------------------------------------------
// Icon tones — Fluent-style solid tiles with a white glyph.
// Blue + orange lead; the rest add colour for quick recognition.
// ---------------------------------------------------------------------------

export type Tone =
    | "blue"
    | "orange"
    | "sky"
    | "emerald"
    | "violet"
    | "rose"
    | "amber"
    | "teal";

export const TONE_TILE: Record<Tone, string> = {
    blue: "bg-[#0A5BC4] text-white",
    orange: "bg-[#F27A1A] text-white",
    sky: "bg-[#0A8AD6] text-white",
    emerald: "bg-[#0B9B65] text-white",
    violet: "bg-[#6D3AE6] text-white",
    rose: "bg-[#DC1F52] text-white",
    amber: "bg-[#D98A06] text-white",
    teal: "bg-[#0B8F86] text-white",
};

// ---------------------------------------------------------------------------
// Quick actions
//
// "Record payment" is NOT in this list on purpose: it is a highlighted,
// role-gated (admin / registrar) action rendered by <RecordPaymentButton />.
// ---------------------------------------------------------------------------

export interface QuickLink {
    href: string;
    label: string;
    description: string;
    icon: LucideIcon;
    tone: Tone;
}

export interface QuickGroup {
    title: string;
    links: QuickLink[];
}

export const QUICK_GROUPS: QuickGroup[] = [
    {
        title: "Admissions & students",
        links: [
            {
                href: "/applications",
                label: "Applications",
                description: "Review, decide and track admissions",
                icon: Inbox,
                tone: "orange",
            },
            {
                href: "/students/new",
                label: "Register student",
                description: "Create a record and enroll into a course",
                icon: UserPlus,
                tone: "blue",
            },
            {
                href: "/students",
                label: "Students",
                description: "Browse, search and manage records",
                icon: Users,
                tone: "sky",
            },
        ],
    },
    {
        title: "Academics",
        links: [
            {
                href: "/results",
                label: "Results",
                description: "Enter, review and publish marks",
                icon: ClipboardCheck,
                tone: "teal",
            },
            {
                href: "/units/new",
                label: "Add units",
                description: "Attach units to a course offering",
                icon: Puzzle,
                tone: "violet",
            },
        ],
    },
    {
        title: "Finance",
        links: [
            {
                href: "/finance/fee-structures/new",
                label: "Fee structures",
                description: "Define fee items and assign to a course",
                icon: Receipt,
                tone: "amber",
            },
            {
                href: "/finance",
                label: "Finances",
                description: "Structures, assessments and transactions",
                icon: Landmark,
                tone: "emerald",
            },
        ],
    },
    {
        title: "Library",
        links: [
            {
                href: "/documents",
                label: "Library",
                description: "Academic and institutional documents",
                icon: Library,
                tone: "blue",
            },
            {
                href: "/documents/new",
                label: "Upload documents",
                description: "Share notes, resources or files",
                icon: Upload,
                tone: "orange",
            },
        ],
    },
    {
        title: "Administration",
        links: [
            {
                href: "/users",
                label: "Users & passwords",
                description: "Create users, roles and resets",
                icon: KeyRound,
                tone: "rose",
            },
        ],
    },
];

// ---------------------------------------------------------------------------
// Application status config
// ---------------------------------------------------------------------------

export interface ApplicationStatusConfig {
    key: ApplicationStatus;
    label: string;
    hint: string;
    icon: LucideIcon;
    bar: string;
    tile: string;
}

export const APP_STATUS: ApplicationStatusConfig[] = [
    {
        key: "pending",
        label: "Pending",
        hint: "Not opened yet",
        icon: Clock,
        bar: "bg-amber-400",
        tile: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
    },
    {
        key: "under_review",
        label: "Under review",
        hint: "With a reviewer",
        icon: Search,
        bar: "bg-sky-500",
        tile: "bg-sky-500/15 text-sky-600 dark:text-sky-400",
    },
    {
        key: "approved",
        label: "Approved",
        hint: "Accepted",
        icon: CheckCircle2,
        bar: "bg-emerald-500",
        tile: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
    },
    {
        key: "waitlisted",
        label: "Waitlisted",
        hint: "Waiting for a place",
        icon: Hourglass,
        bar: "bg-violet-500",
        tile: "bg-violet-500/15 text-violet-600 dark:text-violet-400",
    },
    {
        key: "rejected",
        label: "Rejected",
        hint: "Declined",
        icon: XCircle,
        bar: "bg-rose-500",
        tile: "bg-rose-500/15 text-rose-600 dark:text-rose-400",
    },
    {
        key: "withdrawn",
        label: "Withdrawn",
        hint: "Applicant left",
        icon: MinusCircle,
        bar: "bg-zinc-400 dark:bg-zinc-500",
        tile: "bg-zinc-500/15 text-zinc-500 dark:text-zinc-400",
    },
];

// ---------------------------------------------------------------------------
// Shared types
// ---------------------------------------------------------------------------

export interface GenderEntry {
    gender: string;
    count: number;
}