// app/(portal)/dashboard/page.tsx
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
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

export default function DashboardPage() {
    const { user, isLoading: authLoading, isAuthenticated } = useAuth();

    // Scales the UI up smoothly on 2K → 4K+ displays (no change below 1920px).
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
    const firstName = displayName.split(/\s+/)[0];

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

    // ---- Render ------------------------------------------------------------

    return (
        <div
            className="relative min-h-dvh overflow-x-clip bg-[#f1f5fb] text-zinc-900 dark:bg-[#0a1020] dark:text-zinc-100"
            style={{ fontFamily: FONT_STACK }}
        >
            <div className="relative mx-auto w-full max-w-full space-y-3 px-3 py-3 pb-24 sm:space-y-4 sm:px-5 sm:py-5 sm:pb-6 lg:px-6 lg:py-6">
                {/* ============================================================ */}
                {/* HERO                                                         */}
                {/* ============================================================ */}
                <header className="relative overflow-hidden rounded-sm border border-white/10 bg-[#0A4AA6] dark:bg-[#0B3A80] p-3 text-white shadow-[0_20px_50px_-28px_rgba(8,43,102,0.8)] sm:p-5 lg:p-6">

                    <div className="relative z-10 flex flex-col gap-3 sm:gap-4 md:flex-row md:items-center md:justify-between">
                        <div className="flex min-w-0 items-center gap-3 sm:gap-4">
                            <HeroAvatar
                                src={profileImage}
                                name={displayName}
                                initials={initials}
                                loading={authLoading}
                                onError={() => setImageFailed(true)}
                            />

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

                                {authLoading ? (
                                    <div className="mt-1.5 space-y-2">
                                        <div className="h-6 w-40 animate-pulse rounded-sm bg-white/15" />
                                        <div className="h-4 w-48 animate-pulse rounded-sm bg-white/10" />
                                    </div>
                                ) : (
                                    <>
                                        <h1 className="truncate text-xl font-semibold leading-tight tracking-tight sm:text-3xl">
                                            {isAuthenticated
                                                ? firstName
                                                : "Welcome"}
                                        </h1>
                                        <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1">
                                            <span className="rounded-sm border border-orange-300/50 bg-orange-400/20 px-2 py-0.5 text-xs font-semibold text-orange-200">
                                                {role}
                                            </span>
                                            <span className="max-w-full truncate text-xs text-blue-100 sm:text-sm">
                                                {displayEmail}
                                            </span>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>

                        <div className="flex items-center gap-2 md:justify-end">
                            <RecordPaymentButton variant="hero" />
                            <Link
                                href="/profile"
                                className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-sm bg-white/10 px-4 text-sm font-semibold text-white ring-1 ring-white/25 backdrop-blur-md transition-colors hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-300 sm:flex-none"
                            >
                                <User size={16} aria-hidden />
                                My profile
                            </Link>
                        </div>
                    </div>

                    {/* The story in one line */}
                    <div className="relative z-10 mt-3 sm:mt-4">
                        {storyLoading ? (
                            <div className="grid grid-cols-2 gap-2 sm:flex">
                                <div className="h-12 w-full animate-pulse rounded-sm bg-white/10 sm:w-36" />
                                <div className="h-12 w-full animate-pulse rounded-sm bg-white/10 sm:w-36" />
                                <div className="h-12 w-full animate-pulse rounded-sm bg-white/10 sm:w-36" />
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
                                    <HeroStat
                                        value={`${activePct}%`}
                                        label="enrollments active"
                                    />
                                )}
                                {financeSummary && (
                                    <RequireRoleInline
                                        roles={["admin", "registrar"]}
                                    >
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
                        )}
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
                {/* Sidebar from xl; main grid goes 1 → 2 → 3 columns on         */}
                {/* wide / ultrawide screens. Cards adapt via container queries. */}
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