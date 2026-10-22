// app/(portal)/dashboard/page.tsx
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
    Banknote,
    BookOpen,
    Building2,
    GraduationCap,
    Inbox,
    Layers,
    User,
    UserCog,
    Users,
    Wallet,
} from "lucide-react";

import { useAuth } from "@/app/context/AuthContext";
import { financeAnalyticsApi, type FinanceSummary } from "@/app/types/finance";
import { curriculumApi, type CurriculumKpis } from "@/app/types/curriculum";
import { type StudentOverviewStats, studentApi } from "@/app/types/students";
import {
    applicationApi,
    type ApplicationSummaryStats,
} from "@/app/types/application";
import RequireRoleInline from "@/app/components/navigation/RequiredRoleInline";

import {
    ApplicationsSection,
    CompositionCard,
    EnrollmentCard,
    FinanceCard,
    HeroAvatar,
    HeroStat,
    HIDE_SCROLLBAR,
    KpiTile,
    QuickActions,
    RecordPaymentButton,
    SectionHeader,
    SectionLink,
} from "./ui";
import { clampPct, useFluidScale, type GenderEntry } from "./utils";

const FONT_STACK =
    '"Segoe UI Variable Text", "Segoe UI Variable", "Segoe UI", system-ui, -apple-system, "Helvetica Neue", Arial, sans-serif';

// Deep navy used across the hero and accents
const NAVY = "#0B1E3D";

export default function DashboardPage() {
    const { user, isLoading: authLoading, isAuthenticated } = useAuth();

    useFluidScale();

    const [studentStats, setStudentStats] =
        useState<StudentOverviewStats | null>(null);
    const [financeSummary, setFinanceSummary] =
        useState<FinanceSummary | null>(null);
    const [kpis, setKpis] = useState<CurriculumKpis | null>(null);
    const [appStats, setAppStats] = useState<ApplicationSummaryStats | null>(
        null,
    );

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [imageFailed, setImageFailed] = useState(false);
    const [now, setNow] = useState<Date | null>(null);

    useEffect(() => {
        setNow(new Date());
    }, []);

    useEffect(() => {
        setImageFailed(false);
    }, [user?.profileImage]);

    useEffect(() => {
        let cancelled = false;

        async function load() {
            setLoading(true);
            setError(null);

            const [studentsRes, financeRes, kpisRes, appsRes] =
                await Promise.allSettled([
                    studentApi.getOverviewStats(),
                    financeAnalyticsApi.summary(6, 5),
                    curriculumApi.kpis(),
                    applicationApi.getSummaryStats(),
                ]);

            if (cancelled) return;

            if (studentsRes.status === "fulfilled") {
                setStudentStats(studentsRes.value.data);
            }
            if (financeRes.status === "fulfilled") {
                setFinanceSummary(financeRes.value);
            }
            if (kpisRes.status === "fulfilled") {
                setKpis(kpisRes.value);
            }
            if (appsRes.status === "fulfilled") {
                setAppStats(appsRes.value.data);
            }

            const anyFailed =
                studentsRes.status === "rejected" ||
                financeRes.status === "rejected" ||
                kpisRes.status === "rejected" ||
                appsRes.status === "rejected";

            if (anyFailed)
                setError("Some dashboard metrics could not be loaded.");

            setLoading(false);
        }

        load();
        return () => {
            cancelled = true;
        };
    }, []);

    // ---- Signed-in user ----------------------------------------------------

    const displayName = user?.name?.trim() || "Staff Member";
    const displayEmail = user?.email?.trim() || "Staff account";
    const initials = user?.name?.trim()?.charAt(0)?.toUpperCase() || "U";

    const rawRole = user?.role?.toString()?.trim() || "staff";
    const role =
        rawRole.charAt(0).toUpperCase() + rawRole.slice(1).toLowerCase();

    const profileImage =
        !imageFailed && user?.profileImage?.trim()
            ? user.profileImage.trim()
            : "";

    const greeting = !now
        ? "Welcome back"
        : now.getHours() < 12
          ? "Good morning"
          : now.getHours() < 17
            ? "Good afternoon"
            : "Good evening";

    // ---- Derived metrics ---------------------------------------------------

    const students = kpis?.students.total ?? studentStats?.totalStudents;
    const courses = kpis?.courses.total;

    const activePct = useMemo<number | null>(() => {
        if (!studentStats || studentStats.totalEnrollments <= 0) return null;
        return Math.round(
            (studentStats.activeEnrollments / studentStats.totalEnrollments) *
                100,
        );
    }, [studentStats]);

    const completedPct = useMemo<number | null>(() => {
        if (!studentStats || studentStats.totalEnrollments <= 0) return null;
        return Math.round(
            (studentStats.completedEnrollments /
                studentStats.totalEnrollments) *
                100,
        );
    }, [studentStats]);

    const perStudent = useMemo<string | null>(() => {
        if (!studentStats || studentStats.totalStudents <= 0) return null;
        return (
            studentStats.totalEnrollments / studentStats.totalStudents
        ).toFixed(1);
    }, [studentStats]);

    const collectionRatePct = useMemo<number>(() => {
        const r = financeSummary?.assessments.collectionRate ?? 0;
        return clampPct(Math.round(r * 100));
    }, [financeSummary]);

    const monthDelta = financeSummary?.delta ?? null;

    const genders: GenderEntry[] = studentStats?.genderBreakdown ?? [];
    const genderTotal =
        studentStats?.totalStudents ||
        genders.reduce((sum, g) => sum + g.count, 0);

    const appsAwaiting = appStats
        ? appStats.byStatus.pending + appStats.byStatus.under_review
        : 0;

    const storyLoading = loading && students === undefined && !financeSummary;
    const kpiLoading = loading && !kpis;

    // ---- Hero blocks (shared between mobile and desktop headers) -----------

    const metaContent = !authLoading ? (
        <div className="min-w-0">
            <p className="text-xs font-medium text-orange-300">
                {greeting}
                {now && (
                    <span className="text-blue-200">
                        {" · "}
                        {now.toLocaleDateString(undefined, {
                            weekday: "long",
                            month: "long",
                            day: "numeric",
                        })}
                    </span>
                )}
            </p>
            <h1 className="mt-0.5 break-words text-xl font-semibold leading-tight tracking-tight sm:text-2xl md:text-3xl lg:text-4xl">
                {isAuthenticated ? displayName : "Welcome"}
            </h1>
            <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1">
                <span className="rounded-sm border border-orange-300/50 bg-orange-400/20 px-2 py-0.5 text-xs font-semibold text-orange-200">
                    {role}
                </span>
                <span className="max-w-full truncate text-xs text-blue-100 sm:text-sm">
                    {displayEmail}
                </span>
            </div>
        </div>
    ) : (
        <div className="min-w-0 space-y-2">
            <div className="h-3 w-32 animate-pulse rounded-sm bg-white/15" />
            <div className="h-6 w-40 animate-pulse rounded-sm bg-white/15" />
            <div className="h-4 w-48 animate-pulse rounded-sm bg-white/10" />
        </div>
    );

    const statsContent = storyLoading ? (
        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
            <div className="h-12 w-full animate-pulse rounded-sm bg-white/10 sm:w-32" />
            <div className="h-12 w-full animate-pulse rounded-sm bg-white/10 sm:w-32" />
            <div className="h-12 w-full animate-pulse rounded-sm bg-white/10 sm:w-32" />
        </div>
    ) : (
        <ul className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
            {students !== undefined && (
                <HeroStat
                    value={students.toLocaleString()}
                    label={
                        courses !== undefined
                            ? `students · ${courses.toLocaleString()} courses`
                            : "students"
                    }
                />
            )}
            {activePct !== null && (
                <HeroStat value={`${activePct}%`} label="enrollments active" />
            )}
            {financeSummary && (
                <RequireRoleInline roles={["admin", "registrar"]}>
                    <HeroStat
                        value={`${collectionRatePct}%`}
                        label="fees collected"
                    />
                </RequireRoleInline>
            )}
            {appStats && appsAwaiting > 0 && (
                <HeroStat
                    value={appsAwaiting.toLocaleString()}
                    label="applications waiting"
                />
            )}
            {students === undefined &&
                activePct === null &&
                !financeSummary &&
                !appStats && (
                    <li className="col-span-2 text-sm text-blue-100">
                        Your institution at a glance.
                    </li>
                )}
        </ul>
    );

    // ---- Render ------------------------------------------------------------

    return (
        <div
            className="relative min-h-dvh overflow-x-clip bg-[#f1f5fb] text-zinc-900 dark:bg-[#0a1020] dark:text-zinc-100"
            style={{ fontFamily: FONT_STACK }}
        >
            {/* Hero-scoped keyframes — mounted with the page, no global CSS needed */}
            <style>{`
                @keyframes hero-streak {
                    0%   { transform: translate3d(-100%, 0, 0) rotate(var(--angle, 0deg)); opacity: 0; }
                    15%  { opacity: var(--peak, 1); }
                    85%  { opacity: var(--peak, 1); }
                    100% { transform: translate3d(350%, 0, 0) rotate(var(--angle, 0deg)); opacity: 0; }
                }
                @keyframes hero-glow {
                    0%, 100% { opacity: 0.55; transform: scale(1); }
                    50%      { opacity: 0.9;  transform: scale(1.08); }
                }
                .hero-streak {
                    position: absolute;
                    height: 1px;
                    border-radius: 9999px;
                    background: linear-gradient(
                        90deg,
                        transparent 0%,
                        rgba(251, 146, 60, 0.75) 50%,
                        transparent 100%
                    );
                    will-change: transform, opacity;
                    animation: hero-streak var(--dur, 12s) linear infinite;
                    animation-delay: var(--delay, 0s);
                }
                .hero-glow {
                    animation: hero-glow 14s ease-in-out infinite;
                    will-change: transform, opacity;
                }
                @media (prefers-reduced-motion: reduce) {
                    .hero-streak { animation: none; opacity: 0.35; }
                    .hero-glow   { animation: none; }
                }
            `}</style>

            <div className="relative mx-auto w-full max-w-full space-y-3 py-3 pb-24 sm:space-y-4 sm:px-4 sm:py-5 sm:pb-6 lg:px-6 lg:py-6">
                {/* ============================================================ */}
                {/* HERO                                                         */}
                {/* ============================================================ */}
                <header
                    className="relative overflow-hidden rounded-sm border border-white/10 text-white shadow-[0_20px_50px_-28px_rgba(11,30,61,0.8)]"
                    style={{ backgroundColor: NAVY }}
                >
                    {/* ---- Animated background layer ---- */}
                    <div
                        aria-hidden
                        className="pointer-events-none absolute inset-0 overflow-hidden"
                    >
                        {/* Static diagonal pinstripe — depth, no motion */}
                        <div
                            className="absolute inset-0 opacity-[0.05]"
                            style={{
                                backgroundImage:
                                    "repeating-linear-gradient(135deg, #ffffff 0 1px, transparent 1px 56px)",
                            }}
                        />

                        {/* Soft radial glows */}
                        <div
                            className="hero-glow absolute -right-32 -top-32 h-96 w-96 rounded-full blur-3xl"
                            style={{ backgroundColor: "rgba(251, 146, 60, 0.20)" }}
                        />
                        <div
                            className="hero-glow absolute -bottom-40 -left-24 h-80 w-80 rounded-full blur-3xl"
                            style={{
                                backgroundColor: "rgba(79, 127, 214, 0.15)",
                                animationDelay: "3s",
                            }}
                        />

                        {/* Drifting orange streaks */}
                        <span
                            className="hero-streak"
                            style={{
                                top: "22%",
                                left: 0,
                                width: "30%",
                                transform: "rotate(-14deg)",
                                ["--angle" as string]: "-14deg",
                                ["--dur" as string]: "11s",
                                ["--delay" as string]: "0s",
                                ["--peak" as string]: "0.9",
                            }}
                        />
                        <span
                            className="hero-streak"
                            style={{
                                top: "52%",
                                left: 0,
                                width: "45%",
                                transform: "rotate(-9deg)",
                                ["--angle" as string]: "-9deg",
                                ["--dur" as string]: "15s",
                                ["--delay" as string]: "3s",
                                ["--peak" as string]: "0.55",
                            }}
                        />
                        <span
                            className="hero-streak"
                            style={{
                                top: "82%",
                                left: 0,
                                width: "25%",
                                transform: "rotate(-20deg)",
                                ["--angle" as string]: "-20deg",
                                ["--dur" as string]: "9s",
                                ["--delay" as string]: "6s",
                                ["--peak" as string]: "0.7",
                            }}
                        />
                    </div>

                    {/* ---- Content layer ---- */}
                    <div className="relative z-10">
                        {/* ---------------- Mobile layout ---------------- */}
                        <div className="md:hidden">
                            <div className="flex flex-col items-center gap-3 p-4 sm:gap-4 sm:p-5">
                                {/* Centered square portrait */}
                                <div className="aspect-square h-40 w-40 overflow-hidden rounded-sm shadow-xl shadow-black/40 ring-[3px] ring-orange-300/70 ring-offset-2 ring-offset-[#0B1E3D] sm:h-48 sm:w-48">
                                    <HeroAvatar
                                        src={profileImage}
                                        name={displayName}
                                        initials={initials}
                                        loading={authLoading}
                                        onError={() => setImageFailed(true)}
                                    />
                                </div>

                                {/* Centered identity */}
                                {!authLoading ? (
                                    <div className="text-center">
                                        <p className="text-xs font-medium text-orange-300">
                                            {greeting}
                                            {now && (
                                                <span className="text-blue-200">
                                                    {" · "}
                                                    {now.toLocaleDateString(
                                                        undefined,
                                                        {
                                                            weekday: "long",
                                                            month: "long",
                                                            day: "numeric",
                                                        },
                                                    )}
                                                </span>
                                            )}
                                        </p>
                                        <h1 className="mt-0.5 break-words text-2xl font-semibold leading-tight tracking-tight">
                                            {isAuthenticated
                                                ? displayName
                                                : "Welcome"}
                                        </h1>
                                        <div className="mt-1.5 flex flex-wrap items-center justify-center gap-x-2.5 gap-y-1">
                                            <span className="rounded-sm border border-orange-300/50 bg-orange-400/20 px-2 py-0.5 text-xs font-semibold text-orange-200">
                                                {role}
                                            </span>
                                            <span className="max-w-full truncate text-xs text-blue-100">
                                                {displayEmail}
                                            </span>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex w-full flex-col items-center space-y-2">
                                        <div className="h-3 w-32 animate-pulse rounded-sm bg-white/15" />
                                        <div className="h-7 w-44 animate-pulse rounded-sm bg-white/15" />
                                        <div className="h-4 w-48 animate-pulse rounded-sm bg-white/10" />
                                    </div>
                                )}

                                {/* Actions */}
                                <div className="flex w-full items-stretch gap-2">
                                    <RequireRoleInline
                                        roles={["admin", "registrar"]}
                                    >
                                        <Link
                                            href="/finance/transactions/new"
                                            className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-sm bg-orange-400 px-3 text-sm font-semibold text-[#0B1E3D] shadow-[0_6px_16px_-8px_rgba(251,146,60,0.9)] ring-1 ring-orange-200/70 transition hover:bg-orange-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                                        >
                                            <Banknote size={16} aria-hidden />
                                            Record payment
                                        </Link>
                                    </RequireRoleInline>
                                    <Link
                                        href="/profile"
                                        className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-sm bg-white/10 px-3 text-sm font-semibold text-white ring-1 ring-white/25 backdrop-blur-md transition hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-300"
                                    >
                                        <User size={16} aria-hidden />
                                        My profile
                                    </Link>
                                </div>

                                {/* Stats */}
                                <div className="w-full">{statsContent}</div>
                            </div>
                        </div>

                        {/* ---------------- Desktop layout ---------------- */}
                        <div className="hidden md:grid md:grid-cols-[9rem_1fr]">
                            <div className="h-full w-full overflow-hidden">
                                <HeroAvatar
                                    src={profileImage}
                                    name={displayName}
                                    initials={initials}
                                    loading={authLoading}
                                    onError={() => setImageFailed(true)}
                                />
                            </div>
                            <div className="flex min-w-0 flex-col gap-4 p-6">
                                <div className="flex items-start justify-between gap-4">
                                    {metaContent}
                                    <div className="flex shrink-0 items-center gap-2">
                                        <RecordPaymentButton variant="hero" />
                                        <Link
                                            href="/profile"
                                            className="inline-flex h-10 items-center justify-center gap-2 rounded-sm bg-white/10 px-4 text-sm font-semibold text-white ring-1 ring-white/25 backdrop-blur-md transition-colors hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-300"
                                        >
                                            <User size={16} aria-hidden />
                                            My profile
                                        </Link>
                                    </div>
                                </div>
                                {statsContent}
                            </div>
                        </div>
                    </div>
                </header>

                {error && (
                    <div
                        role="alert"
                        className="rounded-sm border border-orange-400/40 bg-orange-50 px-3 py-2.5 text-sm text-orange-900 dark:bg-orange-400/10 dark:text-orange-200"
                    >
                        {error}
                    </div>
                )}

                {/* ============================================================ */}
                {/* KPI STRIP                                                    */}
                {/* ============================================================ */}
                <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 xl:grid-cols-6">
                    <KpiTile
                        label="Students"
                        value={students}
                        hint="Registered learners"
                        loading={loading && students === undefined}
                        icon={GraduationCap}
                        tone="blue"
                        href="/students"
                    />
                    <KpiTile
                        label="Faculty"
                        value={kpis?.faculty.total}
                        hint="Teaching staff"
                        loading={kpiLoading}
                        icon={UserCog}
                        tone="orange"
                    />
                    <KpiTile
                        label="Courses"
                        value={courses}
                        hint="Active programs"
                        loading={kpiLoading}
                        icon={BookOpen}
                        tone="emerald"
                    />
                    <KpiTile
                        label="Departments"
                        value={kpis?.departments.total}
                        hint="Academic divisions"
                        loading={kpiLoading}
                        icon={Building2}
                        tone="violet"
                    />
                    <KpiTile
                        label="Enrollment density"
                        value={perStudent ? `${perStudent} : 1` : undefined}
                        hint="Enrollments per student"
                        loading={loading && !studentStats}
                        icon={Layers}
                        tone="teal"
                    />
                    <KpiTile
                        label="Awaiting decision"
                        value={appStats ? appsAwaiting : undefined}
                        hint="Pending + under review"
                        loading={loading && !appStats}
                        icon={Inbox}
                        tone="amber"
                        href="/applications?status=pending"
                    />
                </ul>

                {/* ============================================================ */}
                {/* BODY                                                         */}
                {/* ============================================================ */}
                <div className="grid gap-3 sm:gap-4 xl:grid-cols-[minmax(0,1fr)_20rem] min-[2400px]:grid-cols-[minmax(0,1fr)_24rem]">
                    <aside
                        className={`xl:order-2 xl:sticky xl:top-4 xl:max-h-[calc(100dvh-2rem)] xl:self-start xl:overflow-y-auto ${HIDE_SCROLLBAR}`}
                    >
                        <QuickActions />
                    </aside>

                    <div className="grid min-w-0 grid-flow-dense grid-cols-1 gap-3 sm:gap-4 xl:order-1 min-[1800px]:grid-cols-2 min-[3000px]:grid-cols-3">
                        {/* Admissions */}
                        <section className="flex min-w-0 flex-col min-[1800px]:col-span-2">
                            <SectionHeader
                                icon={Inbox}
                                tone="orange"
                                title="Admissions"
                                subtitle="Who applied, who is waiting, what we decided"
                                action={
                                    <SectionLink href="/applications">
                                        View all
                                    </SectionLink>
                                }
                            />
                            <ApplicationsSection
                                stats={appStats}
                                loading={loading}
                            />
                        </section>

                        {/* Enrollment lifecycle */}
                        <section className="flex min-w-0 flex-col">
                            <SectionHeader
                                icon={GraduationCap}
                                tone="blue"
                                title="Student journey"
                                subtitle="Where learners are in their programs"
                                action={
                                    <SectionLink href="/students">
                                        Students
                                    </SectionLink>
                                }
                            />
                            <EnrollmentCard
                                stats={studentStats}
                                loading={loading}
                                activePct={activePct}
                                completedPct={completedPct}
                                perStudent={perStudent}
                            />
                        </section>

                        {/* Composition */}
                        <section className="flex min-w-0 flex-col">
                            <SectionHeader
                                icon={Users}
                                tone="sky"
                                title="Who they are"
                                subtitle="Student composition"
                            />
                            <CompositionCard
                                loading={loading}
                                hasStats={!!studentStats}
                                genders={genders}
                                total={genderTotal}
                            />
                        </section>

                        {/* Finance (admin / registrar only) */}
                        <RequireRoleInline roles={["admin", "registrar"]}>
                            <section className="flex min-w-0 flex-col min-[1800px]:col-span-2">
                                <SectionHeader
                                    icon={Wallet}
                                    tone="emerald"
                                    title="Fee collection"
                                    subtitle="From what was billed to what was collected"
                                    action={
                                        <SectionLink href="/finance">
                                            Finances
                                        </SectionLink>
                                    }
                                />
                                <FinanceCard
                                    summary={financeSummary}
                                    loading={loading}
                                    collectionPct={collectionRatePct}
                                    delta={monthDelta}
                                />
                            </section>
                        </RequireRoleInline>
                    </div>
                </div>
            </div>

            {/* Mobile-only floating shortcut (admin / registrar) */}
            <RecordPaymentButton variant="fab" />
        </div>
    );
}