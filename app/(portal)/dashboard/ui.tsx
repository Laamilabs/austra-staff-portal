"use client";

import Link from "next/link";
import {
    Banknote,
    ChevronRight,
    Inbox,
    Info,
    TrendingDown,
    TrendingUp,
    type LucideIcon,
} from "lucide-react";
import type { ReactNode } from "react";

import RequireRoleInline from "@/app/components/navigation/RequiredRoleInline";
import type { ApplicationSummaryStats } from "@/app/types/application";
import type { FinanceSummary } from "@/app/types/finance";
import type { StudentOverviewStats } from "@/app/types/students";

import {
    APP_STATUS,
    QUICK_GROUPS,
    TONE_TILE,
    clampPct,
    formatCompact,
    formatCurrency,
    type GenderEntry,
    type Tone,
} from "./utils";

// ---------------------------------------------------------------------------
// Tokens
//
// Fluent / Windows 11 feel: layered surfaces, 1px strokes, soft elevation,
// small radius. Blue (#0A5BC4 / #4F9BFF) and orange (orange-400/500) are used
// in BOTH themes — only their lightness shifts.
// ---------------------------------------------------------------------------

/** `@container` lets children use @sm/@xl/@3xl variants based on card width. */
export const CARD =
    "@container rounded-sm border border-zinc-900/[0.08] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.05),0_12px_28px_-20px_rgba(8,43,102,0.4)] dark:border-white/[0.09] dark:bg-[#111c36] dark:shadow-[0_1px_2px_rgba(0,0,0,0.5),0_16px_36px_-22px_rgba(0,0,0,0.9)]";

/** Inner surface (Win11 "layer" inside a card) */
export const SUBCARD =
    "rounded-sm border border-zinc-900/[0.06] bg-zinc-50 dark:border-white/[0.07] dark:bg-white/[0.04]";

export const PAD = "p-3 sm:p-4 xl:p-5";

export const NAVY_FILL = "bg-[#0A5BC4] dark:bg-[#4F9BFF]";
export const NAVY_TEXT = "text-[#082B66] dark:text-white";
export const BLUE_LINK = "text-[#0A5BC4] dark:text-[#7DB6FF]";
export const ORANGE_TEXT = "text-orange-600 dark:text-orange-400";
export const TRACK = "bg-zinc-200/80 dark:bg-white/10";

export const HIDE_SCROLLBAR =
    "[scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden";

export const FOCUS_RING =
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-1 focus-visible:ring-offset-white dark:focus-visible:ring-offset-[#111c36]";

// ---------------------------------------------------------------------------
// Segment shapes & composition palette
// ---------------------------------------------------------------------------

export interface Segment {
    value: number;
    className: string;
    label: string;
}

export const COMPOSITION_SEGMENTS = [
    { bar: "bg-orange-400", swatch: "bg-orange-400" },
    { bar: NAVY_FILL, swatch: NAVY_FILL },
    {
        bar: "bg-orange-200 dark:bg-orange-300/70",
        swatch: "bg-orange-200 dark:bg-orange-300/70",
    },
    {
        bar: "bg-blue-300 dark:bg-blue-300/60",
        swatch: "bg-blue-300 dark:bg-blue-300/60",
    },
];

// ---------------------------------------------------------------------------
// Small primitives
// ---------------------------------------------------------------------------

export function Skeleton({ className = "" }: { className?: string }) {
    return (
        <div
            className={`animate-pulse rounded-sm bg-zinc-200 dark:bg-white/10 ${className}`}
        />
    );
}

export function Card({
    children,
    className = "",
    padded = true,
}: {
    children: ReactNode;
    className?: string;
    padded?: boolean;
}) {
    return (
        <div className={`${CARD} ${padded ? PAD : ""} ${className}`}>
            {children}
        </div>
    );
}

export function IconTile({
    icon: Icon,
    tone,
    size = "md",
}: {
    icon: LucideIcon;
    tone: Tone;
    size?: "sm" | "md" | "lg";
}) {
    const box =
        size === "sm"
            ? "h-8 w-8"
            : size === "lg"
              ? "h-11 w-11"
              : "h-9 w-9 sm:h-10 sm:w-10";
    const px = size === "sm" ? 16 : size === "lg" ? 22 : 20;
    return (
        <span
            className={`flex shrink-0 items-center justify-center rounded-sm shadow-sm ring-1 ring-black/5 ${box} ${TONE_TILE[tone]}`}
        >
            <Icon size={px} strokeWidth={2} aria-hidden />
        </span>
    );
}

export function SectionHeader({
    icon,
    tone,
    title,
    subtitle,
    action,
}: {
    icon: LucideIcon;
    tone: Tone;
    title: string;
    subtitle: string;
    action?: ReactNode;
}) {
    return (
        <div className="mb-2 flex items-center justify-between gap-3 sm:mb-3">
            <div className="flex min-w-0 items-center gap-2.5">
                <IconTile icon={icon} tone={tone} size="sm" />
                <div className="min-w-0">
                    <h2
                        className={`text-sm font-semibold leading-tight sm:text-base ${NAVY_TEXT}`}
                    >
                        {title}
                    </h2>
                    <p className="truncate text-xs text-zinc-600 dark:text-zinc-400">
                        {subtitle}
                    </p>
                </div>
            </div>
            {action}
        </div>
    );
}

export function SectionLink({
    href,
    children,
}: {
    href: string;
    children: ReactNode;
}) {
    return (
        <Link
            href={href}
            className={`inline-flex shrink-0 items-center gap-0.5 rounded-sm px-2 py-1 text-xs font-semibold transition-colors hover:bg-[#0A5BC4]/10 dark:hover:bg-white/10 ${BLUE_LINK} ${FOCUS_RING}`}
        >
            {children}
            <ChevronRight size={14} aria-hidden />
        </Link>
    );
}

/** Fluent "InfoBar" */
export function Insight({ children }: { children: ReactNode }) {
    return (
        <div className="flex items-start gap-2.5 rounded-sm border border-orange-400/30 bg-orange-50 px-3 py-2.5 text-sm text-zinc-800 dark:border-orange-400/25 dark:bg-orange-400/10 dark:text-zinc-100">
            <Info
                size={16}
                className="mt-0.5 shrink-0 text-orange-500"
                aria-hidden
            />
            <p className="min-w-0">{children}</p>
        </div>
    );
}

export function B({ children }: { children: ReactNode }) {
    return (
        <strong className={`font-semibold ${ORANGE_TEXT}`}>{children}</strong>
    );
}

export function StackedBar({
    segments,
    total,
}: {
    segments: Segment[];
    total: number;
}) {
    return (
        <div
            role="img"
            aria-label={segments
                .map((s) => `${s.label}: ${s.value}`)
                .join(", ")}
            className={`flex h-2.5 w-full gap-0.5 overflow-hidden rounded-sm ${TRACK}`}
        >
            {segments.map((s) => (
                <div
                    key={s.label}
                    className={`h-full transition-all duration-700 ease-out ${s.className}`}
                    style={{
                        width: `${total > 0 ? clampPct((s.value / total) * 100) : 0}%`,
                    }}
                />
            ))}
        </div>
    );
}

export function LegendRow({
    swatch,
    label,
    value,
    pct,
}: {
    swatch: string;
    label: string;
    value: number | string;
    pct?: number;
}) {
    return (
        <li className="flex items-center justify-between gap-3 text-sm">
            <span className="flex min-w-0 items-center gap-2 text-zinc-700 dark:text-zinc-300">
                <span className={`h-2.5 w-2.5 shrink-0 rounded-sm ${swatch}`} />
                <span className="truncate">{label}</span>
            </span>
            <span className="shrink-0 font-semibold text-zinc-900 dark:text-white">
                {value}
                {pct !== undefined && (
                    <span className="ml-1.5 text-xs font-normal text-zinc-500 dark:text-zinc-400">
                        {pct}%
                    </span>
                )}
            </span>
        </li>
    );
}

/** Circular gauge, reused for approval rate and fee collection. */
export function Ring({
    pct,
    label,
    stroke,
    ariaLabel,
    className = "h-28 w-28",
}: {
    pct: number;
    label: string;
    stroke: string;
    ariaLabel: string;
    className?: string;
}) {
    const R = 54;
    const C = 2 * Math.PI * R;
    return (
        <div role="img" aria-label={ariaLabel} className={`relative ${className}`}>
            <svg viewBox="0 0 132 132" className="h-full w-full -rotate-90">
                <circle
                    cx="66"
                    cy="66"
                    r={R}
                    fill="none"
                    strokeWidth="12"
                    className="stroke-[#0A5BC4]/15 dark:stroke-white/10"
                />
                <circle
                    cx="66"
                    cy="66"
                    r={R}
                    fill="none"
                    strokeWidth="12"
                    strokeDasharray={C}
                    strokeDashoffset={C * (1 - clampPct(pct) / 100)}
                    className={`${stroke} transition-all duration-700 ease-out`}
                />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-semibold text-zinc-900 dark:text-white">
                    {pct}%
                </span>
                <span className="text-[11px] text-zinc-600 dark:text-zinc-400">
                    {label}
                </span>
            </div>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Hero pieces
// ---------------------------------------------------------------------------

export function HeroAvatar({
    src,
    name,
    initials,
    loading,
    onError,
}: {
    src: string;
    name: string;
    initials: string;
    loading: boolean;
    onError: () => void;
}) {
    return (
        <span className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-sm bg-orange-400 text-lg font-bold text-[#082B66] ring-2 ring-white/40 sm:h-16 sm:w-16 sm:text-xl">
            {loading ? (
                <span className="h-full w-full animate-pulse bg-white/30" />
            ) : src ? (
                <img
                    src={src}
                    alt={name}
                    className="h-full w-full object-cover"
                    onError={onError}
                />
            ) : (
                initials
            )}
        </span>
    );
}

/** Acrylic chip used in the hero summary row. */
export function HeroStat({
    value,
    label,
}: {
    value: ReactNode;
    label: string;
}) {
    return (
        <li className="min-w-0 rounded-sm bg-white/10 px-3 py-2 ring-1 ring-white/15 backdrop-blur-md sm:min-w-32">
            <p className="text-lg font-semibold leading-none text-orange-300 sm:text-xl">
                {value}
            </p>
            <p className="mt-1 truncate text-xs text-blue-100">{label}</p>
        </li>
    );
}

// ---------------------------------------------------------------------------
// KPI tile
// ---------------------------------------------------------------------------

export function KpiTile({
    label,
    value,
    hint,
    loading,
    icon,
    tone,
    href,
}: {
    label: string;
    value: number | string | undefined;
    hint: string;
    loading: boolean;
    icon: LucideIcon;
    tone: Tone;
    href?: string;
}) {
    const body = (
        <>
            <IconTile icon={icon} tone={tone} />
            <div className="min-w-0">
                <p className="truncate text-xs font-medium text-zinc-600 dark:text-zinc-400">
                    {label}
                </p>
                {loading ? (
                    <Skeleton className="mt-1 h-7 w-14" />
                ) : (
                    <p
                        className={`text-xl font-semibold leading-tight tracking-tight sm:text-2xl ${NAVY_TEXT}`}
                    >
                        {value !== undefined
                            ? typeof value === "number"
                                ? value.toLocaleString()
                                : value
                            : "—"}
                    </p>
                )}
                <p className="hidden truncate text-[11px] text-zinc-500 dark:text-zinc-500 sm:block">
                    {hint}
                </p>
            </div>
        </>
    );

    const cls = `${CARD} flex items-center gap-2.5 p-2.5 sm:gap-3 sm:p-3.5`;

    return (
        <li className="min-w-0">
            {href ? (
                <Link
                    href={href}
                    className={`${cls} transition-colors hover:border-orange-400/60 ${FOCUS_RING}`}
                >
                    {body}
                </Link>
            ) : (
                <div className={cls}>{body}</div>
            )}
        </li>
    );
}

// ---------------------------------------------------------------------------
// Record payment — highlighted, ONLY for admin / registrar
// ---------------------------------------------------------------------------

const PAYMENT_HREF = "/finance/transactions/new";

export function RecordPaymentButton({
    variant,
}: {
    variant: "hero" | "card" | "fab";
}) {
    return (
        <RequireRoleInline roles={["admin", "registrar"]}>
            {variant === "hero" ? (
                <Link
                    href={PAYMENT_HREF}
                    className="hidden h-10 items-center justify-center gap-2 rounded-sm bg-orange-400 px-4 text-sm font-semibold text-[#082B66] shadow-[0_8px_20px_-8px_rgba(251,146,60,0.9)] ring-1 ring-orange-200/70 transition hover:bg-orange-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white sm:inline-flex"
                >
                    <Banknote size={18} aria-hidden />
                    Record payment
                </Link>
            ) : variant === "card" ? (
                <Link
                    href={PAYMENT_HREF}
                    className="group relative hidden items-center gap-3 overflow-hidden rounded-sm bg-orange-400 p-3 text-[#082B66] shadow-[0_10px_24px_-10px_rgba(249,115,22,0.85)] ring-1 ring-orange-200/70 transition hover:bg-orange-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#082B66] dark:focus-visible:ring-white xl:flex"
                >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-sm bg-white/90 text-orange-600 shadow-sm">
                        <Banknote size={22} aria-hidden />
                    </span>
                    <span className="min-w-0 flex-1">
                        <span className="block text-sm font-bold leading-tight">
                            Record payment
                        </span>
                        <span className="block truncate text-xs text-[#082B66]/80">
                            Cash, M-Pesa, bank or other fees
                        </span>
                    </span>
                    <ChevronRight
                        size={16}
                        className="shrink-0 transition-transform group-hover:translate-x-0.5"
                        aria-hidden
                    />
                </Link>
            ) : (
                <Link
                    href={PAYMENT_HREF}
                    className="fixed bottom-[max(1rem,env(safe-area-inset-bottom))] right-4 z-30 inline-flex h-12 items-center gap-2 rounded-sm bg-orange-400 px-4 text-sm font-bold text-[#082B66] shadow-[0_12px_28px_-8px_rgba(249,115,22,0.9)] ring-1 ring-orange-200/70 active:scale-95 sm:hidden"
                >
                    <Banknote size={20} aria-hidden />
                    Record payment
                </Link>
            )}
        </RequireRoleInline>
    );
}

// ---------------------------------------------------------------------------
// Quick actions
//   mobile  : horizontal snap scroller
//   sm–lg   : icon grid
//   xl+     : sticky sidebar list, grouped, with descriptions
// ---------------------------------------------------------------------------

export function QuickActions() {
    return (
        <section
            aria-labelledby="quick-actions-title"
            className={`${CARD} p-3 sm:p-4`}
        >
            <h2
                id="quick-actions-title"
                className={`mb-2 text-sm font-semibold sm:text-base ${NAVY_TEXT}`}
            >
                Quick actions
            </h2>

            <RecordPaymentButton variant="card" />

            <div
                className={`-mx-1 flex snap-x gap-2 overflow-x-auto px-1 pb-1 sm:mx-0 sm:grid sm:grid-cols-4 sm:overflow-visible sm:px-0 lg:grid-cols-5 xl:mt-3 xl:block xl:space-y-3 ${HIDE_SCROLLBAR}`}
            >
                {QUICK_GROUPS.map((group) => (
                    <div key={group.title} className="contents xl:block">
                        <p className="mb-1 hidden px-2 text-xs font-semibold text-zinc-500 dark:text-zinc-400 xl:block">
                            {group.title}
                        </p>
                        <div className="contents xl:grid xl:gap-0.5">
                            {group.links.map(
                                ({
                                    href,
                                    label,
                                    description,
                                    icon,
                                    tone,
                                }) => (
                                    <Link
                                        key={href}
                                        href={href}
                                        title={description}
                                        className={`group relative flex w-24 shrink-0 snap-start flex-col items-center gap-1.5 rounded-sm bg-zinc-900/[0.04] p-2.5 text-center transition-colors hover:bg-zinc-900/[0.08] dark:bg-white/[0.05] dark:hover:bg-white/[0.09] sm:w-auto xl:w-full xl:flex-row xl:gap-3 xl:bg-transparent xl:p-2 xl:text-left xl:dark:bg-transparent ${FOCUS_RING}`}
                                    >
                                        <span
                                            aria-hidden
                                            className="absolute left-0 top-1/2 hidden h-0 w-[3px] -translate-y-1/2 rounded-full bg-orange-400 transition-all group-hover:h-5 xl:block"
                                        />
                                        <IconTile
                                            icon={icon}
                                            tone={tone}
                                            size="sm"
                                        />
                                        <span className="min-w-0 flex-1">
                                            <span
                                                className={`line-clamp-2 block text-xs font-semibold leading-tight xl:text-[13px] ${NAVY_TEXT}`}
                                            >
                                                {label}
                                            </span>
                                            <span className="hidden truncate text-xs text-zinc-600 dark:text-zinc-400 xl:block">
                                                {description}
                                            </span>
                                        </span>
                                        <ChevronRight
                                            className="hidden h-4 w-4 shrink-0 text-zinc-400 transition-transform group-hover:translate-x-0.5 group-hover:text-orange-500 xl:block"
                                            aria-hidden
                                        />
                                    </Link>
                                ),
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </section>
    );
}

// ---------------------------------------------------------------------------
// Rows
// ---------------------------------------------------------------------------

export function StageRow({
    label,
    hint,
    value,
    total,
    fill,
}: {
    label: string;
    hint: string;
    value: number;
    total: number;
    fill: string;
}) {
    const pct = total > 0 ? clampPct((value / total) * 100) : 0;
    return (
        <div>
            <div className="mb-1 flex items-baseline justify-between gap-3">
                <span className="min-w-0 truncate text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    {label}
                    <span className="ml-2 hidden text-xs font-normal text-zinc-500 dark:text-zinc-400 sm:inline">
                        {hint}
                    </span>
                </span>
                <span className="text-sm font-semibold text-zinc-900 dark:text-white">
                    {value.toLocaleString()}
                </span>
            </div>
            <div className={`h-2 w-full overflow-hidden rounded-sm ${TRACK}`}>
                <div
                    className={`h-full transition-all duration-700 ease-out ${fill}`}
                    style={{ width: `${pct}%` }}
                />
            </div>
        </div>
    );
}

export function FlowRow({
    label,
    amount,
    billed,
    fill,
}: {
    label: string;
    amount: number;
    billed: number;
    fill: string;
}) {
    const pct = billed > 0 ? clampPct((amount / billed) * 100) : 0;
    return (
        <div>
            <div className="mb-1 flex items-baseline justify-between gap-3">
                <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    {label}
                </span>
                <span
                    className="text-sm font-semibold text-zinc-900 dark:text-white"
                    title={formatCurrency(amount)}
                >
                    {formatCompact(amount)}
                </span>
            </div>
            <div className={`h-2 w-full overflow-hidden rounded-sm ${TRACK}`}>
                <div
                    className={`h-full transition-all duration-700 ease-out ${fill}`}
                    style={{ width: `${pct}%` }}
                />
            </div>
        </div>
    );
}

export function StatusTile({
    label,
    count,
    dot,
}: {
    label: string;
    count: number;
    dot: string;
}) {
    return (
        <div className={`${SUBCARD} p-3`}>
            <p className="flex items-center gap-2 text-xs font-medium text-zinc-600 dark:text-zinc-400">
                <span className={`h-2.5 w-2.5 rounded-sm ${dot}`} />
                {label}
            </p>
            <p className="mt-1 text-xl font-semibold text-zinc-900 dark:text-white">
                {count.toLocaleString()}
            </p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
                transactions
            </p>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Admissions
// ---------------------------------------------------------------------------

export function ApplicationsSection({
    stats,
    loading,
}: {
    stats: ApplicationSummaryStats | null;
    loading: boolean;
}) {
    if (loading && !stats) return <Skeleton className="h-72 flex-1" />;

    if (!stats || stats.total === 0) {
        return (
            <Card className="flex-1 text-sm text-zinc-500 dark:text-zinc-400">
                No applications yet. They&apos;ll appear here as soon as
                someone applies.
            </Card>
        );
    }

    const n = (k: keyof ApplicationSummaryStats["byStatus"]) =>
        stats.byStatus[k] ?? 0;
    const awaiting = n("pending") + n("under_review");
    const decided = n("approved") + n("waitlisted") + n("rejected");
    const approvalRate =
        decided > 0 ? Math.round((n("approved") / decided) * 100) : null;

    const growth = stats.growthRate;
    const showGrowth = stats.lastMonth > 0 || stats.thisMonth > 0;

    return (
        <Card padded={false} className="flex-1">
            <div className="grid @3xl:grid-cols-[3fr_2fr]">
                {/* Pipeline */}
                <div className={PAD}>
                    <div className="flex flex-wrap items-end justify-between gap-3">
                        <div>
                            <p className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-white sm:text-4xl">
                                {stats.total.toLocaleString()}
                            </p>
                            <p className="text-xs text-zinc-600 dark:text-zinc-400">
                                applications received
                                {stats.thisMonth > 0 && (
                                    <>
                                        {" · "}
                                        <span className={`font-semibold ${ORANGE_TEXT}`}>
                                            {stats.thisMonth} new
                                        </span>{" "}
                                        this month
                                        {showGrowth && (
                                            <span
                                                className={`ml-1.5 inline-flex items-center gap-0.5 font-semibold ${
                                                    growth >= 0
                                                        ? "text-emerald-600 dark:text-emerald-400"
                                                        : "text-rose-600 dark:text-rose-400"
                                                }`}
                                            >
                                                {growth >= 0 ? (
                                                    <TrendingUp size={11} />
                                                ) : (
                                                    <TrendingDown size={11} />
                                                )}
                                                {Math.abs(growth).toFixed(1)}%
                                            </span>
                                        )}
                                    </>
                                )}
                            </p>
                        </div>
                        <div className="text-right">
                            <p className="text-2xl font-semibold text-orange-500 dark:text-orange-400">
                                {awaiting.toLocaleString()}
                            </p>
                            <p className="text-xs text-zinc-600 dark:text-zinc-400">
                                need a decision
                            </p>
                        </div>
                    </div>

                    <div className="mt-4 space-y-3 sm:mt-5">
                        <StageRow
                            label="Received"
                            hint="Everyone who applied"
                            value={stats.total}
                            total={stats.total}
                            fill={NAVY_FILL}
                        />
                        <StageRow
                            label="Waiting"
                            hint="Pending + under review"
                            value={awaiting}
                            total={stats.total}
                            fill="bg-orange-400"
                        />
                        <StageRow
                            label="Decided"
                            hint="Approved, waitlisted, rejected"
                            value={decided}
                            total={stats.total}
                            fill="bg-emerald-500"
                        />
                    </div>

                    <div className="mt-4 sm:mt-5">
                        <StackedBar
                            total={stats.total}
                            segments={APP_STATUS.map((s) => ({
                                label: s.label,
                                value: n(s.key),
                                className: s.bar,
                            }))}
                        />
                    </div>

                    <ul className="mt-3 grid grid-cols-2 gap-2 @2xl:grid-cols-3">
                        {APP_STATUS.map(
                            ({ key, label, hint, icon: Icon, tile }) => (
                                <li key={key} className="min-w-0">
                                    <Link
                                        href={`/applications?status=${key}`}
                                        className={`flex items-center gap-2 rounded-sm border border-zinc-900/[0.07] p-2 transition-colors hover:border-orange-400/70 hover:bg-orange-400/5 dark:border-white/10 sm:gap-3 sm:p-2.5 ${FOCUS_RING}`}
                                    >
                                        <span
                                            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-sm ${tile}`}
                                        >
                                            <Icon size={16} />
                                        </span>
                                        <span className="min-w-0 flex-1">
                                            <span
                                                className={`block truncate text-[13px] font-semibold leading-tight ${NAVY_TEXT}`}
                                            >
                                                {label}
                                            </span>
                                            <span className="hidden truncate text-xs text-zinc-500 dark:text-zinc-400 sm:block">
                                                {hint}
                                            </span>
                                        </span>
                                        <span className="text-sm font-semibold text-zinc-900 dark:text-white">
                                            {n(key).toLocaleString()}
                                        </span>
                                    </Link>
                                </li>
                            ),
                        )}
                    </ul>
                </div>

                {/* Outcome + next step */}
                <div
                    className={`flex flex-col border-t border-zinc-900/[0.08] dark:border-white/10 @3xl:border-l @3xl:border-t-0 ${PAD}`}
                >
                    <h3 className={`text-sm font-semibold ${NAVY_TEXT}`}>
                        Decision outcomes
                    </h3>

                    {approvalRate !== null ? (
                        <div className="mt-3 flex items-center gap-4">
                            <Ring
                                pct={approvalRate}
                                label="approved"
                                stroke="stroke-emerald-500"
                                ariaLabel={`Approval rate ${approvalRate} percent`}
                                className="h-28 w-28 shrink-0 sm:h-32 sm:w-32"
                            />
                            <ul className="min-w-0 flex-1 space-y-2.5">
                                <LegendRow
                                    swatch="bg-emerald-500"
                                    label="Approved"
                                    value={n("approved").toLocaleString()}
                                />
                                <LegendRow
                                    swatch="bg-violet-500"
                                    label="Waitlisted"
                                    value={n("waitlisted").toLocaleString()}
                                />
                                <LegendRow
                                    swatch="bg-rose-500"
                                    label="Rejected"
                                    value={n("rejected").toLocaleString()}
                                />
                            </ul>
                        </div>
                    ) : (
                        <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">
                            No decisions yet. Outcomes will show here once
                            applications are approved, waitlisted or rejected.
                        </p>
                    )}

                    <div className="mt-4">
                        <Insight>
                            {awaiting > 0 ? (
                                <>
                                    <B>{awaiting.toLocaleString()}</B>{" "}
                                    {awaiting === 1
                                        ? "application is"
                                        : "applications are"}{" "}
                                    waiting for a decision
                                    {n("pending") > 0 && (
                                        <>
                                            ,{" "}
                                            <B>
                                                {n("pending").toLocaleString()}
                                            </B>{" "}
                                            not opened yet
                                        </>
                                    )}
                                    .
                                </>
                            ) : (
                                <>
                                    Every application has a decision. The
                                    queue is clear.
                                </>
                            )}
                        </Insight>
                    </div>

                    <Link
                        href={
                            awaiting > 0
                                ? "/applications?status=pending"
                                : "/applications"
                        }
                        className="mt-4 inline-flex h-10 items-center justify-center gap-2 rounded-sm bg-[#0A5BC4] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#0B6BE0] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2 dark:bg-[#4F9BFF] dark:text-[#06142e] dark:hover:bg-[#6BAEFF] dark:focus-visible:ring-offset-[#111c36] @3xl:mt-auto"
                    >
                        <Inbox size={16} aria-hidden />
                        {awaiting > 0
                            ? "Review pending"
                            : "View all applications"}
                    </Link>
                </div>
            </div>
        </Card>
    );
}

// ---------------------------------------------------------------------------
// Student journey
// ---------------------------------------------------------------------------

export function EnrollmentCard({
    stats,
    loading,
    activePct,
    completedPct,
    perStudent,
}: {
    stats: StudentOverviewStats | null;
    loading: boolean;
    activePct: number | null;
    completedPct: number | null;
    perStudent: string | null;
}) {
    return (
        <Card className="flex-1">
            <h3 className={`text-sm font-semibold ${NAVY_TEXT}`}>
                Enrollment lifecycle
            </h3>

            {loading && !stats ? (
                <Skeleton className="mt-4 h-40" />
            ) : stats ? (
                <>
                    <div className="mt-3 flex items-end justify-between gap-4">
                        <div>
                            <p className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-white sm:text-4xl">
                                {stats.totalEnrollments.toLocaleString()}
                            </p>
                            <p className="text-xs text-zinc-600 dark:text-zinc-400">
                                total enrollments
                            </p>
                        </div>
                        {perStudent && (
                            <div className="text-right">
                                <p className="text-2xl font-semibold text-orange-500 dark:text-orange-400">
                                    {perStudent}
                                </p>
                                <p className="text-xs text-zinc-600 dark:text-zinc-400">
                                    per student
                                </p>
                            </div>
                        )}
                    </div>

                    <div className="mt-4">
                        <StackedBar
                            total={stats.totalEnrollments}
                            segments={[
                                {
                                    label: "Active",
                                    value: stats.activeEnrollments,
                                    className: "bg-orange-400",
                                },
                                {
                                    label: "Completed",
                                    value: stats.completedEnrollments,
                                    className: NAVY_FILL,
                                },
                            ]}
                        />
                    </div>

                    <ul className="mt-3 space-y-2">
                        <LegendRow
                            swatch="bg-orange-400"
                            label="Active"
                            value={stats.activeEnrollments.toLocaleString()}
                            pct={activePct ?? undefined}
                        />
                        <LegendRow
                            swatch={NAVY_FILL}
                            label="Completed"
                            value={stats.completedEnrollments.toLocaleString()}
                            pct={completedPct ?? undefined}
                        />
                    </ul>

                    {activePct !== null && (
                        <div className="mt-4">
                            <Insight>
                                <B>{activePct}%</B> of enrollments are still in
                                progress; <B>{completedPct ?? 0}%</B> have been
                                completed.
                            </Insight>
                        </div>
                    )}
                </>
            ) : (
                <p className="mt-4 text-sm text-zinc-500 dark:text-zinc-400">
                    No enrollment data available.
                </p>
            )}
        </Card>
    );
}

export function CompositionCard({
    loading,
    hasStats,
    genders,
    total,
}: {
    loading: boolean;
    hasStats: boolean;
    genders: GenderEntry[];
    total: number;
}) {
    return (
        <Card className="flex-1">
            <h3 className={`text-sm font-semibold ${NAVY_TEXT}`}>
                Student composition
            </h3>

            {loading && !hasStats ? (
                <Skeleton className="mt-4 h-40" />
            ) : genders.length > 0 ? (
                <>
                    <div className="mt-3">
                        <p className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-white sm:text-4xl">
                            {total.toLocaleString()}
                        </p>
                        <p className="text-xs text-zinc-600 dark:text-zinc-400">
                            registered students
                        </p>
                    </div>

                    <div className="mt-4">
                        <StackedBar
                            total={total || 1}
                            segments={genders.map((g, i) => ({
                                label: g.gender,
                                value: g.count,
                                className:
                                    COMPOSITION_SEGMENTS[
                                        i % COMPOSITION_SEGMENTS.length
                                    ].bar,
                            }))}
                        />
                    </div>

                    <ul className="mt-3 space-y-2">
                        {genders.map((g, i) => (
                            <LegendRow
                                key={g.gender}
                                swatch={
                                    COMPOSITION_SEGMENTS[
                                        i % COMPOSITION_SEGMENTS.length
                                    ].swatch
                                }
                                label={g.gender}
                                value={g.count.toLocaleString()}
                                pct={
                                    total > 0
                                        ? Math.round((g.count / total) * 100)
                                        : 0
                                }
                            />
                        ))}
                    </ul>
                </>
            ) : (
                <p className="mt-4 text-sm text-zinc-500 dark:text-zinc-400">
                    No student data available.
                </p>
            )}
        </Card>
    );
}

// ---------------------------------------------------------------------------
// Fee collection
// ---------------------------------------------------------------------------

export function FinanceCard({
    summary,
    loading,
    collectionPct,
    delta,
}: {
    summary: FinanceSummary | null;
    loading: boolean;
    collectionPct: number;
    delta: number | null;
}) {
    return (
        <Card className="flex-1">
            {loading && !summary ? (
                <Skeleton className="h-56" />
            ) : summary ? (
                <>
                    <div className="grid gap-4 @xl:grid-cols-[auto_1fr] @xl:items-center @xl:gap-8">
                        <div className="flex justify-center @xl:justify-start">
                            <Ring
                                pct={collectionPct}
                                label="collected"
                                stroke="stroke-orange-400"
                                ariaLabel={`Collection rate ${collectionPct} percent`}
                                className="h-32 w-32 sm:h-36 sm:w-36"
                            />
                        </div>

                        <div className="space-y-3">
                            <FlowRow
                                label="Billed"
                                amount={summary.assessments.totalBilled}
                                billed={summary.assessments.totalBilled}
                                fill={NAVY_FILL}
                            />
                            <FlowRow
                                label="Paid"
                                amount={summary.assessments.totalPaid}
                                billed={summary.assessments.totalBilled}
                                fill="bg-orange-400"
                            />
                            <FlowRow
                                label="Outstanding"
                                amount={summary.assessments.outstanding}
                                billed={summary.assessments.totalBilled}
                                fill="bg-orange-200 dark:bg-orange-300/70"
                            />
                        </div>
                    </div>

                    <div className="mt-4">
                        <Insight>
                            <B>{formatCompact(summary.assessments.outstanding)}</B>{" "}
                            is still outstanding — <B>{collectionPct}%</B> of
                            billed fees have been collected.
                        </Insight>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-2 border-t border-zinc-900/[0.08] pt-4 dark:border-white/10 @3xl:grid-cols-4">
                        <div className={`${SUBCARD} col-span-2 p-3 @3xl:col-span-1`}>
                            <p className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                                This month
                            </p>
                            <p
                                className="mt-1 text-xl font-semibold text-orange-500 dark:text-orange-400"
                                title={formatCurrency(summary.thisMonth)}
                            >
                                {formatCompact(summary.thisMonth)}
                            </p>
                            {delta !== null && (
                                <span
                                    className={`mt-1.5 inline-flex items-center gap-1 rounded-sm px-1.5 py-0.5 text-xs font-semibold ${
                                        delta >= 0
                                            ? "bg-orange-400/15 text-orange-700 dark:text-orange-300"
                                            : "bg-rose-500/10 text-rose-700 dark:text-rose-300"
                                    }`}
                                >
                                    {delta >= 0 ? (
                                        <TrendingUp size={12} />
                                    ) : (
                                        <TrendingDown size={12} />
                                    )}
                                    {Math.abs(delta).toFixed(1)}% vs last month
                                </span>
                            )}
                        </div>

                        <StatusTile
                            label="Confirmed"
                            count={summary.transactions.confirmedCount}
                            dot="bg-orange-400"
                        />
                        <StatusTile
                            label="Pending"
                            count={summary.transactions.pendingCount}
                            dot={NAVY_FILL}
                        />
                        <StatusTile
                            label="Reversed"
                            count={summary.transactions.reversedCount}
                            dot="bg-zinc-400 dark:bg-zinc-500"
                        />
                    </div>
                </>
            ) : (
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    No finance data available.
                </p>
            )}
        </Card>
    );
}