// app/(portal)/applications/[id]/page.tsx
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
    AlertCircle,
    ArrowLeft,
    BookOpen,
    Building2,
    Calendar,
    Check,
    CheckCircle2,
    Clock,
    Copy,
    FileText,
    Globe,
    GraduationCap,
    Hourglass,
    Loader2,
    Mail,
    MapPin,
    MinusCircle,
    Phone,
    RefreshCw,
    Search,
    StickyNote,
    Trash2,
    User,
    Users,
    X,
    XCircle,
    type LucideIcon,
} from "lucide-react";
import { ApplicationStatus, Application, applicationApi } from "@/app/types/application";
import RequireRole from "@/app/components/navigation/RequireRole";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STATUS_META: Record<
    ApplicationStatus,
    { label: string; hint: string; icon: LucideIcon; badge: string; tile: string }
> = {
    pending: {
        label: "Pending",
        hint: "Waiting for a reviewer",
        icon: Clock,
        badge: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
        tile: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
    },
    under_review: {
        label: "Under review",
        hint: "A reviewer is looking at it",
        icon: Search,
        badge: "bg-sky-500/10 text-sky-700 dark:text-sky-300",
        tile: "bg-sky-500/15 text-sky-600 dark:text-sky-400",
    },
    approved: {
        label: "Approved",
        hint: "Applicant is accepted",
        icon: CheckCircle2,
        badge: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
        tile: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
    },
    waitlisted: {
        label: "Waitlisted",
        hint: "Offer a place if one opens",
        icon: Hourglass,
        badge: "bg-violet-500/10 text-violet-700 dark:text-violet-300",
        tile: "bg-violet-500/15 text-violet-600 dark:text-violet-400",
    },
    rejected: {
        label: "Rejected",
        hint: "Applicant is declined",
        icon: XCircle,
        badge: "bg-rose-500/10 text-rose-700 dark:text-rose-300",
        tile: "bg-rose-500/15 text-rose-600 dark:text-rose-400",
    },
    withdrawn: {
        label: "Withdrawn",
        hint: "Applicant pulled out",
        icon: MinusCircle,
        badge: "bg-zinc-500/10 text-zinc-600 dark:text-zinc-300",
        tile: "bg-zinc-500/15 text-zinc-500 dark:text-zinc-400",
    },
};

const STATUS_ORDER: ApplicationStatus[] = [
    "pending",
    "under_review",
    "approved",
    "waitlisted",
    "rejected",
    "withdrawn",
];

const STUDY_MODE_LABELS: Record<string, string> = {
    on_campus: "On campus",
    online: "Online",
    hybrid: "Hybrid",
};

const GENDER_LABELS: Record<string, string> = {
    male: "Male",
    female: "Female",
    other: "Other",
    prefer_not_to_say: "Prefer not to say",
};

// Shared surface styles (navy glass in dark mode)
const SURFACE =
    "rounded-sm border border-zinc-200 bg-white shadow-sm dark:border-white/10 dark:bg-[#0B1E3D]/50";
const FOCUS =
    "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-400";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(value?: string | null): string | null {
    if (!value) return null;
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return null;
    return d.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
}

function formatDateTime(value?: string | null): string | null {
    if (!value) return null;
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return null;
    return d.toLocaleString(undefined, {
        year: "numeric",
        month: "short",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
    });
}

function applicantFullName(a: Application): string {
    if (a.applicant?.fullName) return a.applicant.fullName;
    const parts = [a.applicant?.firstName, a.applicant?.lastName].filter(Boolean);
    return parts.join(" ") || "Unnamed applicant";
}

function initials(name: string): string {
    return (
        name
            .split(/\s+/)
            .filter(Boolean)
            .slice(0, 2)
            .map((p) => p[0]?.toUpperCase())
            .join("") || "?"
    );
}

function courseName(course: Application["course"]): string {
    if (!course) return "Course no longer available";
    if (typeof course === "string") return course;
    return course.name ?? course.courseCode ?? "Untitled course";
}

function courseCode(course: Application["course"]): string | null {
    if (!course || typeof course === "string") return null;
    return course.courseCode ?? null;
}

function courseDetails(course: Application["course"]) {
    if (!course || typeof course === "string") return null;
    return { level: course.level, duration: course.duration, department: course.department };
}

function reviewerName(reviewer: Application["reviewedBy"]): string | null {
    if (!reviewer) return null;
    if (typeof reviewer === "string") return reviewer;
    const parts = [reviewer.firstName, reviewer.lastName].filter(Boolean);
    return parts.join(" ") || reviewer.email || null;
}

function errMessage(err: any, fallback: string): string {
    const msg = err?.response?.data?.message ?? err?.message ?? fallback;
    return Array.isArray(msg) ? msg.join(", ") : String(msg);
}

type Toast = { text: string; undo?: () => void };
type Confirm = { kind: "delete" } | { kind: "status"; status: ApplicationStatus } | null;

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function ApplicationDetailPage() {
    const params = useParams<{ id: string }>();
    const router = useRouter();
    const id = params?.id;

    const [application, setApplication] = useState<Application | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [updatingStatus, setUpdatingStatus] = useState(false);
    const [statusError, setStatusError] = useState<string | null>(null);

    const [notesDraft, setNotesDraft] = useState("");
    const [savingNotes, setSavingNotes] = useState(false);

    const [confirm, setConfirm] = useState<Confirm>(null);
    const [deleting, setDeleting] = useState(false);
    const [toast, setToast] = useState<Toast | null>(null);

    const notesChanged =
        !!application && notesDraft.trim() !== (application.reviewNotes ?? "").trim();

    // ----- load -------------------------------------------------------------
    const load = useCallback(async () => {
        if (!id) return;
        try {
            setLoading(true);
            setError(null);
            const res = await applicationApi.getById(id);
            const data = (res as any)?.data ?? (res as unknown as Application);
            setApplication(data);
            setNotesDraft(data?.reviewNotes ?? "");
        } catch (err: any) {
            console.error("[application detail] load failed", err);
            setError(errMessage(err, "Failed to load application."));
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        load();
    }, [load]);

    // Toast auto-dismiss
    useEffect(() => {
        if (!toast) return;
        const t = setTimeout(() => setToast(null), 6000);
        return () => clearTimeout(t);
    }, [toast]);

    // Warn before leaving with unsaved notes
    useEffect(() => {
        if (!notesChanged) return;
        const handler = (e: BeforeUnloadEvent) => {
            e.preventDefault();
            e.returnValue = "";
        };
        window.addEventListener("beforeunload", handler);
        return () => window.removeEventListener("beforeunload", handler);
    }, [notesChanged]);

    // ----- actions ----------------------------------------------------------
    async function handleStatusChange(next: ApplicationStatus, canUndo = true) {
        if (!application || next === application.status) return;

        const previous = application;
        setApplication({ ...application, status: next }); // optimistic
        setStatusError(null);
        setUpdatingStatus(true);

        try {
            const res = await applicationApi.updateStatus(application._id, {
                status: next,
                ...(notesDraft.trim() && notesDraft.trim() !== previous.reviewNotes
                    ? { reviewNotes: notesDraft.trim() }
                    : {}),
            });
            const updated = (res as any)?.data ?? res;
            setApplication(updated);
            setToast({
                text: `Marked as ${STATUS_META[next].label.toLowerCase()}`,
                undo: canUndo ? () => handleStatusChange(previous.status, false) : undefined,
            });
        } catch (err: any) {
            console.error("[application detail] status update failed", err);
            setApplication(previous);
            setStatusError(errMessage(err, "Failed to update status."));
        } finally {
            setUpdatingStatus(false);
        }
    }

    // Rejecting is hard to undo for the applicant, so ask first
    function requestStatus(next: ApplicationStatus) {
        if (!application || next === application.status) return;
        if (next === "rejected") setConfirm({ kind: "status", status: next });
        else handleStatusChange(next);
    }

    async function handleSaveNotes() {
        if (!application || !notesChanged) return;
        setSavingNotes(true);
        setStatusError(null);
        try {
            const res = await applicationApi.update(application._id, {
                reviewNotes: notesDraft.trim(),
            });
            const updated = (res as any)?.data ?? res;
            setApplication(updated);
            setToast({ text: "Notes saved" });
        } catch (err: any) {
            console.error("[application detail] notes save failed", err);
            setStatusError(errMessage(err, "Failed to save notes."));
        } finally {
            setSavingNotes(false);
        }
    }

    async function handleDelete() {
        if (!application) return;
        setDeleting(true);
        try {
            await applicationApi.delete(application._id);
            router.push("/applications");
        } catch (err: any) {
            console.error("[application detail] delete failed", err);
            setStatusError(errMessage(err, "Failed to delete application."));
            setDeleting(false);
            setConfirm(null);
        }
    }

    // ----- loading / error states -------------------------------------------
    if (loading) return <DetailSkeleton />;

    if (error || !application) {
        return (
            <Shell>
                <div className="mx-auto max-w-lg px-4 py-20">
                    <div className={`${SURFACE} flex flex-col items-center gap-4 p-10 text-center`}>
                        <span className="flex h-12 w-12 items-center justify-center rounded-sm bg-rose-500/15 text-rose-500">
                            <AlertCircle className="h-6 w-6" />
                        </span>
                        <div>
                            <h2 className="text-base font-semibold text-[#0B1E3D] dark:text-white">
                                Couldn't load this application
                            </h2>
                            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                                {error ?? "It may have been deleted."}
                            </p>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={load}
                                className={`inline-flex h-9 items-center gap-2 rounded-sm bg-orange-400 px-3 text-sm font-semibold text-[#0B1E3D] transition hover:bg-orange-300 ${FOCUS}`}
                            >
                                <RefreshCw className="h-4 w-4" />
                                Try again
                            </button>
                            <Link
                                href="/applications"
                                className={`inline-flex h-9 items-center gap-2 rounded-sm border border-zinc-300 px-3 text-sm font-medium text-[#0B1E3D] hover:bg-zinc-100 dark:border-white/15 dark:text-white dark:hover:bg-white/10 ${FOCUS}`}
                            >
                                <ArrowLeft className="h-4 w-4" />
                                All applications
                            </Link>
                        </div>
                    </div>
                </div>
            </Shell>
        );
    }

    const meta = STATUS_META[application.status];
    const BadgeIcon = meta.icon;
    const cDetails = courseDetails(application.course);
    const code = courseCode(application.course);
    const name = applicantFullName(application);
    const reviewer = reviewerName(application.reviewedBy);
    const reviewedAt = formatDateTime(application.reviewedAt);

    // ----- render -----------------------------------------------------------
    return (
        <Shell>
            {/* Sticky top bar: always shows where you are and the current status */}
            <div className="sticky top-0 z-20 border-b border-zinc-200/80 bg-[#EEF2F9]/80 backdrop-blur-xl dark:border-white/10 dark:bg-[#050D1B]/80">
                <div className="mx-auto flex h-14 max-w-full items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
                    <div className="flex min-w-0 items-center gap-3">
                        <Link
                            href="/applications"
                            aria-label="Back to applications"
                            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-sm text-zinc-600 hover:bg-zinc-900/5 dark:text-zinc-300 dark:hover:bg-white/10 ${FOCUS}`}
                        >
                            <ArrowLeft className="h-4 w-4" />
                        </Link>
                        <nav aria-label="Breadcrumb" className="hidden text-sm text-zinc-500 sm:block dark:text-zinc-400">
                            <Link href="/applications" className="hover:underline">
                                Applications
                            </Link>
                            <span className="mx-2">/</span>
                        </nav>
                        <span className="truncate text-sm font-semibold text-[#0B1E3D] dark:text-white">
                            {application.applicationNumber}
                        </span>
                        <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-sm px-2 py-0.5 text-xs font-medium ${meta.badge}`}>
                            <BadgeIcon className="h-3.5 w-3.5" />
                            {meta.label}
                        </span>
                    </div>
                    <button
                        type="button"
                        onClick={() => setConfirm({ kind: "delete" })}
                        className={`inline-flex h-8 items-center gap-1.5 rounded-sm px-2.5 text-sm font-medium text-rose-600 hover:bg-rose-500/10 dark:text-rose-400 ${FOCUS}`}
                    >
                        <Trash2 className="h-4 w-4" />
                        <span className="hidden sm:inline">Delete</span>
                    </button>
                </div>
            </div>

            <div className="mx-auto max-w-full py-6 sm:px-6 lg:px-8">
                {/* Summary: who, what, and how to reach them */}
                <section className={`${SURFACE} flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between`}>
                    <div className="flex min-w-0 items-center gap-4">
                        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-sm bg-orange-400 text-lg font-bold text-[#0B1E3D]">
                            {initials(name)}
                        </span>
                        <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                                <h1 className="truncate text-xl font-semibold tracking-tight text-[#0B1E3D] dark:text-white">
                                    {name}
                                </h1>
                                {application.isInternational && (
                                    <span className="inline-flex items-center gap-1 rounded-sm bg-indigo-500/10 px-2 py-0.5 text-xs font-medium text-indigo-700 dark:text-indigo-300">
                                        <Globe className="h-3 w-3" />
                                        International
                                    </span>
                                )}
                            </div>
                            <p className="mt-0.5 truncate text-sm text-zinc-600 dark:text-zinc-300">
                                {courseName(application.course)}
                                {code ? ` (${code})` : ""}
                            </p>
                            <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                                {STUDY_MODE_LABELS[application.studyMode] ?? application.studyMode}
                                {formatDate(application.preferredStartDate)
                                    ? ` · Starts ${formatDate(application.preferredStartDate)}`
                                    : ""}
                                {formatDate(application.createdAt)
                                    ? ` · Applied ${formatDate(application.createdAt)}`
                                    : ""}
                            </p>
                        </div>
                    </div>
                    <div className="flex shrink-0 gap-2">
                        {application.applicant?.email && (
                            <a
                                href={`mailto:${application.applicant.email}`}
                                className={`inline-flex h-9 items-center gap-2 rounded-sm border border-zinc-300 px-3 text-sm font-medium text-[#0B1E3D] hover:bg-zinc-100 dark:border-white/15 dark:text-white dark:hover:bg-white/10 ${FOCUS}`}
                            >
                                <Mail className="h-4 w-4 text-sky-500" />
                                Email
                            </a>
                        )}
                        {application.applicant?.phone && (
                            <a
                                href={`tel:${application.applicant.phone}`}
                                className={`inline-flex h-9 items-center gap-2 rounded-sm border border-zinc-300 px-3 text-sm font-medium text-[#0B1E3D] hover:bg-zinc-100 dark:border-white/15 dark:text-white dark:hover:bg-white/10 ${FOCUS}`}
                            >
                                <Phone className="h-4 w-4 text-emerald-500" />
                                Call
                            </a>
                        )}
                    </div>
                </section>

                {statusError && (
                    <div
                        role="alert"
                        className="mt-4 flex items-start gap-3 rounded-sm border border-rose-200 border-l-4 border-l-rose-500 bg-rose-50 p-3 text-sm text-rose-800 dark:border-rose-900/60 dark:border-l-rose-500 dark:bg-rose-950/40 dark:text-rose-200"
                    >
                        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                        <p className="flex-1">{statusError}</p>
                        <button
                            type="button"
                            onClick={() => setStatusError(null)}
                            aria-label="Dismiss"
                            className={`rounded-sm p-0.5 hover:bg-rose-500/10 ${FOCUS}`}
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                )}

                <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
                    {/* Decision panel comes first on mobile and stays pinned on desktop */}
                    <aside className="space-y-6 lg:sticky lg:top-20 lg:order-2 lg:self-start">
                        <Card title="Decision" icon={CheckCircle2} tone="bg-orange-400/20 text-orange-600 dark:text-orange-400">
                            <div role="radiogroup" aria-label="Application status" className="space-y-1">
                                {STATUS_ORDER.map((s) => {
                                    const m = STATUS_META[s];
                                    const Icon = m.icon;
                                    const active = application.status === s;
                                    return (
                                        <button
                                            key={s}
                                            type="button"
                                            role="radio"
                                            aria-checked={active}
                                            disabled={updatingStatus}
                                            onClick={() => requestStatus(s)}
                                            className={`relative flex w-full items-center gap-3 rounded-sm px-2.5 py-2 text-left transition disabled:cursor-not-allowed disabled:opacity-60 ${FOCUS} ${active
                                                ? "bg-[#0B1E3D]/5 dark:bg-white/10"
                                                : "hover:bg-zinc-100 dark:hover:bg-white/5"
                                                }`}
                                        >
                                            {active && (
                                                <span className="absolute left-0 top-1/2 h-4 w-[3px] -translate-y-1/2 rounded-sm bg-orange-400" />
                                            )}
                                            <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-sm ${m.tile}`}>
                                                <Icon className="h-4 w-4" />
                                            </span>
                                            <span className="min-w-0 flex-1">
                                                <span className="block text-sm font-medium text-[#0B1E3D] dark:text-white">
                                                    {m.label}
                                                </span>
                                                <span className="block truncate text-xs text-zinc-500 dark:text-zinc-400">
                                                    {m.hint}
                                                </span>
                                            </span>
                                            {active &&
                                                (updatingStatus ? (
                                                    <Loader2 className="h-4 w-4 animate-spin text-orange-500" />
                                                ) : (
                                                    <Check className="h-4 w-4 text-orange-500" />
                                                ))}
                                        </button>
                                    );
                                })}
                            </div>
                            {(reviewedAt || reviewer) && (
                                <p className="mt-3 flex items-center gap-1.5 border-t border-zinc-200 pt-3 text-xs text-zinc-500 dark:border-white/10 dark:text-zinc-400">
                                    <Clock className="h-3.5 w-3.5" />
                                    Reviewed {reviewedAt}
                                    {reviewer ? ` by ${reviewer}` : ""}
                                </p>
                            )}
                        </Card>

                        <Card title="Review notes" icon={StickyNote} tone="bg-amber-500/15 text-amber-600 dark:text-amber-400">
                            <label htmlFor="review-notes" className="sr-only">
                                Review notes
                            </label>
                            <textarea
                                id="review-notes"
                                rows={5}
                                value={notesDraft}
                                onChange={(e) => setNotesDraft(e.target.value)}
                                onKeyDown={(e) => {
                                    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                                        e.preventDefault();
                                        handleSaveNotes();
                                    }
                                }}
                                placeholder="Only staff can see these notes. They're sent with your next status change."
                                className="w-full resize-y rounded-sm border border-zinc-300 border-b-zinc-500 bg-white/80 px-3 py-2 text-sm text-[#0B1E3D] placeholder:text-zinc-400 transition-shadow focus:border-b-orange-400 focus:outline-none focus:shadow-[0_1px_0_0_#FB923C] dark:border-white/10 dark:border-b-white/40 dark:bg-white/5 dark:text-white dark:placeholder:text-zinc-500 dark:focus:border-b-orange-400"
                            />
                            <div className="mt-2 flex items-center justify-between gap-2">
                                <span className={`text-xs ${notesChanged ? "text-amber-600 dark:text-amber-400" : "text-zinc-400"}`}>
                                    {notesChanged ? "Unsaved changes · Ctrl+Enter to save" : "All changes saved"}
                                </span>
                                <button
                                    type="button"
                                    onClick={handleSaveNotes}
                                    disabled={!notesChanged || savingNotes}
                                    className={`inline-flex h-8 items-center gap-1.5 rounded-sm bg-orange-400 px-3 text-xs font-semibold text-[#0B1E3D] transition hover:bg-orange-300 disabled:cursor-not-allowed disabled:opacity-40 ${FOCUS}`}
                                >
                                    {savingNotes && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                                    {savingNotes ? "Saving…" : "Save notes"}
                                </button>
                            </div>
                        </Card>
                    </aside>

                    {/* Main column */}
                    <RequireRole roles={["admin", "registrar"]}>
                        <div className="space-y-6 lg:order-1 lg:col-span-2">
                            <Card title="Applicant" icon={User} tone="bg-sky-500/15 text-sky-600 dark:text-sky-400">
                                <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
                                    <Detail label="Full name" value={name} />
                                    <Detail
                                        label="Gender"
                                        value={
                                            application.applicant?.gender
                                                ? GENDER_LABELS[application.applicant.gender] ?? application.applicant.gender
                                                : null
                                        }
                                    />
                                    <Detail icon={Mail} label="Email" value={application.applicant?.email} href={`mailto:${application.applicant?.email}`} copy />
                                    <Detail icon={Phone} label="Phone" value={application.applicant?.phone} href={`tel:${application.applicant?.phone}`} copy />
                                    <Detail icon={Calendar} label="Date of birth" value={formatDate(application.applicant?.dateOfBirth)} />
                                    <Detail label="Nationality" value={application.applicant?.nationality} />
                                    <Detail icon={MapPin} label="Locality" value={application.applicant?.locality} />
                                    <Detail icon={MapPin} label="County" value={application.applicant?.county} />
                                </dl>
                            </Card>

                            <Card title="Course and study" icon={BookOpen} tone="bg-violet-500/15 text-violet-600 dark:text-violet-400">
                                <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
                                    <Detail label="Course" value={courseName(application.course)} className="sm:col-span-2" />
                                    {code && <Detail label="Course code" value={code} />}
                                    <Detail label="Study mode" value={STUDY_MODE_LABELS[application.studyMode] ?? application.studyMode} />
                                    <Detail icon={Calendar} label="Preferred start" value={formatDate(application.preferredStartDate)} />
                                    {cDetails?.level && <Detail label="Level" value={cDetails.level} />}
                                    {cDetails?.duration && <Detail label="Duration" value={cDetails.duration} />}
                                    {cDetails?.department && <Detail label="Department" value={cDetails.department} />}
                                </dl>
                            </Card>

                            <Card title="Education" icon={GraduationCap} tone="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                                <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
                                    <Detail label="Highest qualification" value={application.education?.highestQualification} className="sm:col-span-2" />
                                    <Detail icon={Building2} label="Institution" value={application.education?.institution} />
                                    <Detail
                                        label="Year completed"
                                        value={application.education?.yearCompleted != null ? String(application.education.yearCompleted) : null}
                                    />
                                    {application.education?.gradeOrGpa && (
                                        <Detail label="Grade / GPA" value={application.education.gradeOrGpa} />
                                    )}
                                </dl>
                            </Card>

                            {(application.personalStatement || application.previousExperience || application.referralSource) && (
                                <Card title="Additional information" icon={FileText} tone="bg-orange-400/20 text-orange-600 dark:text-orange-400">
                                    <dl className="space-y-4">
                                        {application.personalStatement && (
                                            <Prose label="Personal statement">{application.personalStatement}</Prose>
                                        )}
                                        {application.previousExperience && (
                                            <Prose label="Previous experience">{application.previousExperience}</Prose>
                                        )}
                                        {application.referralSource && (
                                            <Detail label="How they heard about us" value={application.referralSource} />
                                        )}
                                    </dl>
                                </Card>
                            )}

                            <Card title="Emergency contact" icon={Users} tone="bg-rose-500/15 text-rose-600 dark:text-rose-400">
                                <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
                                    <Detail label="Name" value={application.emergencyContact?.name} />
                                    <Detail label="Relationship" value={application.emergencyContact?.relationship} />
                                    <Detail icon={Phone} label="Phone" value={application.emergencyContact?.phone} href={`tel:${application.emergencyContact?.phone}`} copy />
                                    {application.emergencyContact?.email && (
                                        <Detail icon={Mail} label="Email" value={application.emergencyContact.email} href={`mailto:${application.emergencyContact.email}`} copy />
                                    )}
                                </dl>
                            </Card>

                            <p className="px-1 text-xs text-zinc-500 dark:text-zinc-400">
                                Submitted {formatDateTime(application.createdAt) ?? "—"} · Last updated{" "}
                                {formatDateTime(application.updatedAt) ?? "—"}
                                {application.declarationAccepted
                                    ? ` · Declaration accepted ${formatDateTime(application.declarationAcceptedAt ?? application.createdAt) ?? ""}`
                                    : ""}
                            </p>
                        </div>
                    </RequireRole>
                </div>
            </div>

            {/* Confirm dialog (delete / reject) */}
            {confirm && (
                <Modal onClose={() => !deleting && setConfirm(null)}>
                    {confirm.kind === "delete" ? (
                        <ConfirmBody
                            title="Delete this application?"
                            body={
                                <>
                                    <strong className="font-semibold">{application.applicationNumber}</strong> will be permanently removed. This can't be undone.
                                </>
                            }
                            actionLabel={deleting ? "Deleting…" : "Delete application"}
                            busy={deleting}
                            onCancel={() => setConfirm(null)}
                            onConfirm={handleDelete}
                        />
                    ) : (
                        <ConfirmBody
                            title="Reject this application?"
                            body={
                                <>
                                    {name} will be marked as rejected. Add a note first if you want to record why. You can undo this from the confirmation message.
                                </>
                            }
                            actionLabel="Reject application"
                            busy={updatingStatus}
                            onCancel={() => setConfirm(null)}
                            onConfirm={() => {
                                const s = confirm.status;
                                setConfirm(null);
                                handleStatusChange(s);
                            }}
                        />
                    )}
                </Modal>
            )}

            {/* Toast with undo */}
            {toast && (
                <div
                    role="status"
                    className="fixed bottom-5 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-sm border border-white/10 bg-[#0B1E3D] px-4 py-2.5 text-sm text-white shadow-xl"
                >
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    <span>{toast.text}</span>
                    {toast.undo && (
                        <button
                            type="button"
                            onClick={() => {
                                const undo = toast.undo;
                                setToast(null);
                                undo?.();
                            }}
                            className={`rounded-sm px-2 py-0.5 text-sm font-semibold text-orange-400 hover:bg-white/10 ${FOCUS}`}
                        >
                            Undo
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={() => setToast(null)}
                        aria-label="Dismiss"
                        className={`rounded-sm p-0.5 text-zinc-300 hover:bg-white/10 ${FOCUS}`}
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>
            )}
        </Shell>
    );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function Shell({ children }: { children: React.ReactNode }) {
    return <div className="min-h-screen bg-[#EEF2F9] dark:bg-[#050D1B]">{children}</div>;
}

function Card({
    title,
    icon: Icon,
    tone,
    children,
}: {
    title: string;
    icon: LucideIcon;
    tone: string;
    children: React.ReactNode;
}) {
    return (
        <section className={`${SURFACE} p-5`}>
            <header className="mb-4 flex items-center gap-2.5">
                <span className={`flex h-8 w-8 items-center justify-center rounded-sm ${tone}`}>
                    <Icon className="h-4 w-4" />
                </span>
                <h2 className="text-sm font-semibold text-[#0B1E3D] dark:text-white">{title}</h2>
            </header>
            {children}
        </section>
    );
}

function Detail({
    label,
    value,
    href,
    icon: Icon,
    copy,
    className,
}: {
    label: string;
    value?: string | null;
    href?: string;
    icon?: LucideIcon;
    copy?: boolean;
    className?: string;
}) {
    const [copied, setCopied] = useState(false);
    const has = !!value;

    async function handleCopy() {
        if (!value) return;
        try {
            await navigator.clipboard.writeText(value);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        } catch {
            /* clipboard unavailable */
        }
    }

    return (
        <div className={`group ${className ?? ""}`}>
            <dt className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
                {Icon && <Icon className="h-3.5 w-3.5" />}
                {label}
            </dt>
            <dd className="mt-0.5 flex items-center gap-1.5 text-sm text-[#0B1E3D] dark:text-zinc-100">
                {!has ? (
                    <span className="text-zinc-400 dark:text-zinc-500">Not provided</span>
                ) : href ? (
                    <a href={href} className="wrap-break-word hover:text-orange-600 hover:underline dark:hover:text-orange-400">
                        {value}
                    </a>
                ) : (
                    <span className="wrap-break-word">{value}</span>
                )}
                {has && copy && (
                    <button
                        type="button"
                        onClick={handleCopy}
                        aria-label={`Copy ${label.toLowerCase()}`}
                        className={`rounded-sm p-1 text-zinc-400 opacity-0 transition hover:bg-zinc-900/5 hover:text-[#0B1E3D] focus-visible:opacity-100 group-hover:opacity-100 dark:hover:bg-white/10 dark:hover:text-white ${FOCUS}`}
                    >
                        {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                    </button>
                )}
            </dd>
        </div>
    );
}

function Prose({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div>
            <dt className="text-xs text-zinc-500 dark:text-zinc-400">{label}</dt>
            <dd className="mt-1 max-w-prose whitespace-pre-wrap text-sm leading-relaxed text-[#0B1E3D] dark:text-zinc-200">
                {children}
            </dd>
        </div>
    );
}

function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [onClose]);

    return (
        <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-[#050D1B]/50 backdrop-blur-sm" onClick={onClose} aria-hidden />
            <div className="relative z-10 w-full max-w-md rounded-sm border border-zinc-200 bg-white p-5 shadow-2xl dark:border-white/10 dark:bg-[#0B1E3D]">
                {children}
            </div>
        </div>
    );
}

function ConfirmBody({
    title,
    body,
    actionLabel,
    busy,
    onCancel,
    onConfirm,
}: {
    title: string;
    body: React.ReactNode;
    actionLabel: string;
    busy: boolean;
    onCancel: () => void;
    onConfirm: () => void;
}) {
    const cancelRef = useRef<HTMLButtonElement>(null);
    // Focus the safe option first
    useEffect(() => cancelRef.current?.focus(), []);

    return (
        <>
            <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-sm bg-rose-500/15 text-rose-500">
                    <AlertCircle className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                    <h3 className="text-base font-semibold text-[#0B1E3D] dark:text-white">{title}</h3>
                    <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">{body}</p>
                </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
                <button
                    ref={cancelRef}
                    type="button"
                    disabled={busy}
                    onClick={onCancel}
                    className={`h-9 rounded-sm border border-zinc-300 px-3 text-sm font-medium text-[#0B1E3D] hover:bg-zinc-100 disabled:opacity-50 dark:border-white/15 dark:text-white dark:hover:bg-white/10 ${FOCUS}`}
                >
                    Cancel
                </button>
                <button
                    type="button"
                    disabled={busy}
                    onClick={onConfirm}
                    className={`inline-flex h-9 items-center gap-2 rounded-sm bg-rose-600 px-3 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-60 ${FOCUS}`}
                >
                    {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                    {actionLabel}
                </button>
            </div>
        </>
    );
}

function DetailSkeleton() {
    const bar = "animate-pulse rounded-sm bg-zinc-200 dark:bg-white/10";
    return (
        <Shell>
            <div className="mx-auto max-w-full py-6 sm:px-6 lg:px-8" aria-busy="true" aria-label="Loading application">
                <div className={`${SURFACE} flex items-center gap-4 p-5`}>
                    <div className={`h-14 w-14 ${bar}`} />
                    <div className="space-y-2">
                        <div className={`h-5 w-56 ${bar}`} />
                        <div className={`h-4 w-72 ${bar}`} />
                    </div>
                </div>
                <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
                    <div className="space-y-6 lg:col-span-2">
                        {Array.from({ length: 3 }).map((_, i) => (
                            <div key={i} className={`${SURFACE} p-5`}>
                                <div className={`mb-4 h-8 w-40 ${bar}`} />
                                <div className="grid grid-cols-2 gap-4">
                                    {Array.from({ length: 6 }).map((_, j) => (
                                        <div key={j} className="space-y-2">
                                            <div className={`h-3 w-20 ${bar}`} />
                                            <div className={`h-4 w-32 ${bar}`} />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="space-y-6">
                        {Array.from({ length: 2 }).map((_, i) => (
                            <div key={i} className={`${SURFACE} space-y-2 p-5`}>
                                <div className={`mb-4 h-8 w-32 ${bar}`} />
                                <div className={`h-10 w-full ${bar}`} />
                                <div className={`h-10 w-full ${bar}`} />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </Shell>
    );
}