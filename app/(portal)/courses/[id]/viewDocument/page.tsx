"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import {
    ArrowLeft,
    FileText,
    BookOpen,
    Briefcase,
    Building,
    Globe,
    Lock,
    Loader2,
    ExternalLink,
    Layers,
    GraduationCap,
    User as UserIcon,
    Calendar,
    Eye,
    Download,
    X,
    AlertCircle,
} from "lucide-react";

import { Course, courseApi } from "@/app/types/courses";
import {
    DocumentItem,
    DocumentType,
    documentApi,
} from "@/app/types/documents";

// ----------------------------------------------------------------------
// Document type visual config
// ----------------------------------------------------------------------
const DOC_TYPE_CONFIG: Record<
    DocumentType,
    {
        label: string;
        badgeClass: string;
        icon: React.ElementType;
    }
> = {
    resource: {
        label: "Resource",
        badgeClass:
            "bg-[#0B1E3D]/10 text-[#0B1E3D] dark:bg-orange-400/10 dark:text-orange-400",
        icon: FileText,
    },
    academic: {
        label: "Academic",
        badgeClass:
            "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300",
        icon: BookOpen,
    },
    professional: {
        label: "Professional",
        badgeClass:
            "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
        icon: Briefcase,
    },
    institutional: {
        label: "Institutional",
        badgeClass:
            "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
        icon: Building,
    },
};

// ----------------------------------------------------------------------
// File-kind detection from URL
// ----------------------------------------------------------------------
type FileKind = "image" | "pdf" | "office" | "text" | "unknown";

function getFileKind(url: string): FileKind {
    if (!url) return "unknown";

    // Strip query / hash and lowercase for extension matching
    const clean = url.split("?")[0].split("#")[0].toLowerCase();

    if (/\.(png|jpe?g|gif|webp|svg|bmp|avif)$/.test(clean)) return "image";
    if (/\.pdf$/.test(clean)) return "pdf";
    if (/\.(docx?|xlsx?|pptx?|odt|ods|odp)$/.test(clean)) return "office";
    if (/\.(txt|md|csv|json|xml|html?)$/.test(clean)) return "text";

    return "unknown";
}

// ----------------------------------------------------------------------
// Page wrapper (Suspense required for useSearchParams)
// ----------------------------------------------------------------------
export default function ViewCourseDocumentsPage() {
    return (
        <Suspense fallback={<LoadingShell />}>
            <ViewCourseDocuments />
        </Suspense>
    );
}

function LoadingShell() {
    return (
        <main className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
            <div className="flex min-h-[60vh] flex-col items-center justify-center">
                <Loader2 className="mb-2 h-8 w-8 animate-spin text-[#0B1E3D] dark:text-orange-400" />
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    Loading documents...
                </p>
            </div>
        </main>
    );
}

// ----------------------------------------------------------------------
// Main view
// ----------------------------------------------------------------------
function ViewCourseDocuments() {
    const params = useParams();
    const searchParams = useSearchParams();

    const courseId = Array.isArray(params.id) ? params.id[0] : params.id;
    const focusedDocId = searchParams?.get("docId") || "";

    const [course, setCourse] = useState<Course | null>(null);
    const [documents, setDocuments] = useState<DocumentItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState("");

    const focusedDoc = useMemo(
        () => documents.find((d) => d._id === focusedDocId) || null,
        [documents, focusedDocId]
    );

    // ------------------------------------------------------------------
    // Load course + affiliated documents
    // ------------------------------------------------------------------
    useEffect(() => {
        if (!courseId) return;

        let cancelled = false;

        const load = async () => {
            try {
                setIsLoading(true);
                setError("");

                const [courseRes, docsRes] = await Promise.all([
                    courseApi.getById(courseId),
                    documentApi.getByCourse(courseId),
                ]);

                if (!cancelled) {
                    setCourse(courseRes.data);
                    setDocuments(docsRes.data || []);
                }
            } catch (err) {
                console.error("Failed to load course documents:", err);
                if (!cancelled) {
                    setError(
                        "Unable to load documents for this course. It may have been removed or you may not have permission to view it.",
                    );
                }
            } finally {
                if (!cancelled) setIsLoading(false);
            }
        };

        load();

        return () => {
            cancelled = true;
        };
    }, [courseId]);

    // ------------------------------------------------------------------
    // Scroll to top whenever the focused document changes
    // (so the viewer is immediately visible)
    // ------------------------------------------------------------------
    useEffect(() => {
        if (!focusedDocId) return;
        if (typeof window === "undefined") return;
        window.scrollTo({ top: 0, behavior: "smooth" });
    }, [focusedDocId]);

    // ------------------------------------------------------------------
    // Loading
    // ------------------------------------------------------------------
    if (isLoading) {
        return (
            <main className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
                <div className="mx-auto max-w-full px-4 py-8 sm:px-6 lg:px-8">
                    <div className="animate-pulse">
                        <div className="h-4 w-40 rounded-sm bg-zinc-200 dark:bg-zinc-800" />

                        <div className="mt-6 h-24 rounded-sm bg-white dark:bg-zinc-900 shadow-sm" />

                        <div className="mt-6 h-[60vh] rounded-sm bg-white dark:bg-zinc-900 shadow-sm" />
                    </div>
                </div>
            </main>
        );
    }

    // ------------------------------------------------------------------
    // Error
    // ------------------------------------------------------------------
    if (error || !course) {
        return (
            <main className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
                <div className="mx-auto max-w-full px-4 py-8 sm:px-6 lg:px-8">
                    <Link
                        href={`/courses/${courseId}`}
                        className="inline-flex items-center gap-2 text-sm font-semibold text-[#0B1E3D] dark:text-white transition-colors hover:text-orange-500 dark:hover:text-orange-400"
                    >
                        <ArrowLeft size={16} />
                        Back to course
                    </Link>

                    <div className="mt-8 rounded-sm border border-red-200 dark:border-red-900/50 border-t-4 border-t-red-600 bg-red-50 dark:bg-red-950/20 p-6 shadow-sm">
                        <h1 className="text-lg font-bold text-red-800 dark:text-red-300">
                            Documents unavailable
                        </h1>

                        <p className="mt-2 max-w-2xl text-sm leading-6 text-red-700 dark:text-red-400">
                            {error ||
                                "The requested course could not be found."}
                        </p>

                        <Link
                            href={`/courses/${courseId}`}
                            className="mt-5 inline-flex items-center gap-2 rounded-sm bg-[#0B1E3D] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#10294d] dark:bg-orange-400 dark:text-[#0B1E3D] dark:hover:bg-orange-300"
                        >
                            <ArrowLeft size={15} />
                            Return to course
                        </Link>
                    </div>
                </div>
            </main>
        );
    }

    // ------------------------------------------------------------------
    // Render
    // ------------------------------------------------------------------
    return (
        <main className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
            <div className="mx-auto max-w-full px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
                {/* Back navigation */}
                <Link
                    href={`/courses/${course._id}`}
                    className="inline-flex items-center gap-2 text-sm font-semibold text-zinc-500 dark:text-zinc-400 transition-colors hover:text-[#0B1E3D] dark:hover:text-white"
                >
                    <ArrowLeft size={16} />
                    Back to course
                </Link>

                {/* ======================================================
                    HEADER
                ======================================================= */}
                <section className="mt-5 overflow-hidden rounded-sm border-b-2 border-orange-400 bg-[#0B1E3D] shadow-sm">
                    <div className="px-6 py-10 md:px-8 md:py-12">
                        <div className="mb-5 flex items-center gap-2">
                            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-orange-400">
                                Document Viewer
                            </span>
                            <span className="h-px w-8 bg-orange-400/50" />
                        </div>

                        <h1 className="text-3xl font-bold leading-tight tracking-tight text-white md:text-4xl">
                            Course Documents
                        </h1>

                        <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-zinc-400">
                            <span className="inline-flex items-center gap-1.5">
                                <GraduationCap size={14} />
                                <span className="font-medium text-white">
                                    {course.name}
                                </span>
                            </span>

                            <span className="font-mono text-xs font-bold text-orange-400">
                                {course.courseCode}
                            </span>

                            <span className="inline-flex items-center gap-1.5 rounded-sm border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] font-medium text-zinc-300">
                                <Eye size={11} />
                                Read-only view
                            </span>
                        </div>
                    </div>
                </section>

                {/* ======================================================
                    VIEWER (only when a docId is provided)
                ======================================================= */}
                {focusedDoc && (
                    <ViewerSection
                        doc={focusedDoc}
                        courseId={course._id}
                    />
                )}

                {/* ======================================================
                    DOCUMENTS LIST
                ======================================================= */}
                <section className="mt-6 rounded-sm border border-zinc-200 dark:border-zinc-800 border-t-4 border-t-[#0B1E3D] dark:border-t-orange-400 bg-white dark:bg-zinc-900 p-6 shadow-sm md:p-8">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-sm bg-[#0B1E3D]/5 dark:bg-white/10 text-[#0B1E3D] dark:text-orange-400">
                                <FileText size={18} />
                            </div>

                            <div>
                                <h2 className="text-lg font-bold text-[#0B1E3D] dark:text-white">
                                    {focusedDoc
                                        ? "All Affiliated Documents"
                                        : "Affiliated Documents"}
                                </h2>
                                <p className="mt-0.5 text-xs text-zinc-400">
                                    {focusedDoc
                                        ? "Click another document to view it inline"
                                        : "Click a document to view its contents inline"}
                                </p>
                            </div>
                        </div>

                        <span className="self-start rounded-sm bg-zinc-100 px-2.5 py-1 text-xs font-semibold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 sm:self-auto">
                            {documents.length}{" "}
                            {documents.length === 1
                                ? "Document"
                                : "Documents"}
                        </span>
                    </div>

                    {documents.length === 0 ? (
                        <div className="mt-6 rounded-sm border border-dashed border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/40 p-8 text-center">
                            <FileText className="mx-auto mb-2 h-8 w-8 text-zinc-300 dark:text-zinc-600" />
                            <p className="text-sm text-zinc-500 dark:text-zinc-400">
                                No documents have been affiliated with this
                                course yet.
                            </p>
                        </div>
                    ) : (
                        <div className="mt-6 space-y-3">
                            {documents.map((doc) => (
                                <DocumentCard
                                    key={doc._id}
                                    doc={doc}
                                    courseId={course._id}
                                    isActive={doc._id === focusedDocId}
                                    isFocused={
                                        Boolean(focusedDocId) &&
                                        doc._id === focusedDocId
                                    }
                                />
                            ))}
                        </div>
                    )}
                </section>
            </div>
        </main>
    );
}

// ----------------------------------------------------------------------
// Viewer section
// ----------------------------------------------------------------------
function ViewerSection({
    doc,
    courseId,
}: {
    doc: DocumentItem;
    courseId: string;
}) {
    const kind = getFileKind(doc.url);
    const config = DOC_TYPE_CONFIG[doc.type] || DOC_TYPE_CONFIG.resource;
    const Icon = config.icon;

    const [imageError, setImageError] = useState(false);

    // Reset error state when doc changes
    useEffect(() => {
        setImageError(false);
    }, [doc._id]);

    return (
        <section className="mt-6 overflow-hidden rounded-sm border border-zinc-200 dark:border-zinc-800 border-t-4 border-t-orange-400 bg-white dark:bg-zinc-900 shadow-sm">
            {/* Toolbar */}
            <div className="flex flex-col gap-3 border-b border-zinc-100 p-4 dark:border-zinc-800 sm:flex-row sm:items-center sm:justify-between md:p-5">
                <div className="flex items-start gap-3 min-w-0">
                    <div
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-sm ${config.badgeClass}`}
                    >
                        <Icon size={18} />
                    </div>

                    <div className="min-w-0">
                        <h2 className="text-base font-semibold text-[#0B1E3D] dark:text-white truncate">
                            {doc.name}
                        </h2>

                        <div className="mt-0.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-zinc-500 dark:text-zinc-400">
                            <span
                                className={`inline-flex items-center rounded-sm px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider ${config.badgeClass}`}
                            >
                                {config.label}
                            </span>

                            {kind !== "unknown" && (
                                <span className="uppercase tracking-wider text-[10px] font-semibold text-zinc-400 dark:text-zinc-500">
                                    {kind === "office"
                                        ? "Office Document"
                                        : kind}
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto">
                    <Link
                        href={`/courses/${courseId}/viewDocument`}
                        className="inline-flex items-center gap-1.5 rounded-sm border border-zinc-200 bg-white px-3 py-2 text-xs font-medium text-zinc-600 transition-colors hover:border-zinc-300 hover:text-zinc-800 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700 dark:hover:text-white"
                    >
                        <X size={13} />
                        Close
                    </Link>

                    <a
                        href={doc.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-sm border border-zinc-200 bg-white px-3 py-2 text-xs font-medium text-zinc-600 transition-colors hover:border-zinc-300 hover:text-zinc-800 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700 dark:hover:text-white"
                    >
                        <ExternalLink size={13} />
                        Open in tab
                    </a>

                    <a
                        href={doc.url}
                        download
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-sm bg-[#0B1E3D] px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#10294d] dark:bg-orange-400 dark:text-[#0B1E3D] dark:hover:bg-orange-300"
                    >
                        <Download size={13} />
                        Download
                    </a>
                </div>
            </div>

            {/* Embedded content */}
            <div className="bg-zinc-100 dark:bg-zinc-950">
                {kind === "image" && !imageError && (
                    <div className="flex items-center justify-center p-4 md:p-6">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                            src={doc.url}
                            alt={doc.name}
                            onError={() => setImageError(true)}
                            className="max-h-[80vh] w-auto max-w-full rounded-sm border border-zinc-200 bg-white object-contain shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
                        />
                    </div>
                )}

                {kind === "pdf" && (
                    <iframe
                        src={doc.url}
                        title={doc.name}
                        className="h-[80vh] min-h-150 w-full border-0 bg-white"
                    />
                )}

                {kind === "office" && (
                    <iframe
                        src={`https://docs.google.com/viewer?url=${encodeURIComponent(
                            doc.url
                        )}&embedded=true`}
                        title={doc.name}
                        className="h-[80vh] min-h-150 w-full border-0 bg-white"
                    />
                )}

                {kind === "text" && (
                    <iframe
                        src={doc.url}
                        title={doc.name}
                        className="h-[80vh] min-h-150 w-full border-0 bg-white"
                    />
                )}

                {/* Fallback / unknown / image-error */}
                {(kind === "unknown" || (kind === "image" && imageError)) && (
                    <div className="flex min-h-[40vh] flex-col items-center justify-center p-8 text-center">
                        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-sm bg-zinc-200 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                            <AlertCircle size={26} />
                        </div>

                        <h3 className="text-base font-semibold text-[#0B1E3D] dark:text-white">
                            {imageError
                                ? "Preview unavailable"
                                : "Inline preview not supported"}
                        </h3>

                        <p className="mt-1.5 max-w-md text-sm text-zinc-500 dark:text-zinc-400">
                            {imageError
                                ? "The image could not be loaded inline. Try opening it in a new tab or downloading it."
                                : "This file type cannot be embedded directly. Use one of the buttons above to open or download the document."}
                        </p>

                        <a
                            href={doc.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-5 inline-flex items-center gap-1.5 rounded-sm bg-[#0B1E3D] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#10294d] dark:bg-orange-400 dark:text-[#0B1E3D] dark:hover:bg-orange-300"
                        >
                            <ExternalLink size={14} />
                            Open document
                        </a>
                    </div>
                )}
            </div>
        </section>
    );
}

// ----------------------------------------------------------------------
// Document list card
// ----------------------------------------------------------------------
function DocumentCard({
    doc,
    courseId,
    isActive,
    isFocused,
}: {
    doc: DocumentItem;
    courseId: string;
    isActive: boolean;
    isFocused: boolean;
}) {
    const config = DOC_TYPE_CONFIG[doc.type] || DOC_TYPE_CONFIG.resource;
    const Icon = config.icon;

    const isPublic = !doc.owner;

    const ownerName =
        doc.owner && typeof doc.owner === "object"
            ? doc.owner.name || null
            : null;

    const unitName =
        doc.unit && typeof doc.unit === "object" && doc.unit.name
            ? doc.unit.name
            : null;

    const createdAt = doc.createdAt
        ? new Date(doc.createdAt).toLocaleDateString(undefined, {
            year: "numeric",
            month: "short",
            day: "numeric",
        })
        : null;

    // Navigates to viewer with this doc focused
    const viewerHref = `/courses/${courseId}/viewDocument?docId=${doc._id}`;

    return (
        <article
            id={`doc-${doc._id}`}
            className={`rounded-sm border bg-white p-5 transition-all dark:bg-zinc-900 ${isFocused
                    ? "border-orange-400 ring-2 ring-orange-400/30 dark:border-orange-400"
                    : isActive
                        ? "border-[#0B1E3D]/40 dark:border-orange-400/40"
                        : "border-zinc-200 hover:border-zinc-300 dark:border-zinc-800 dark:hover:border-zinc-700"
                }`}
        >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                {/* Left: icon + name + meta */}
                <div className="flex items-start gap-3.5 min-w-0">
                    <div
                        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-sm ${config.badgeClass}`}
                    >
                        <Icon size={18} />
                    </div>

                    <div className="min-w-0 space-y-2">
                        <h3 className="text-base font-semibold text-[#0B1E3D] dark:text-white wrap-break-word">
                            {doc.name}
                        </h3>

                        {/* Meta row */}
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-zinc-500 dark:text-zinc-400">
                            <span
                                className={`inline-flex items-center rounded-sm px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider ${config.badgeClass}`}
                            >
                                {config.label}
                            </span>

                            {unitName && (
                                <span className="inline-flex items-center gap-1">
                                    <Layers size={12} />
                                    {unitName}
                                </span>
                            )}

                            <span className="inline-flex items-center gap-1">
                                {isPublic ? (
                                    <>
                                        <Globe size={12} />
                                        Public
                                    </>
                                ) : (
                                    <>
                                        <Lock size={12} />
                                        Restricted
                                    </>
                                )}
                            </span>

                            {!isPublic && ownerName && (
                                <span className="inline-flex items-center gap-1">
                                    <UserIcon size={12} />
                                    {ownerName}
                                </span>
                            )}

                            {createdAt && (
                                <span className="inline-flex items-center gap-1">
                                    <Calendar size={12} />
                                    {createdAt}
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right: actions */}
                <div className="flex items-center gap-2 self-start sm:self-center sm:pl-4">
                    {/* Inline view / focus this doc */}
                    {isFocused ? (
                        <span className="inline-flex items-center gap-1.5 rounded-sm border border-orange-400 bg-orange-400/10 px-3 py-2 text-xs font-semibold text-orange-600 dark:text-orange-400">
                            <Eye size={13} />
                            Viewing
                        </span>
                    ) : (
                        <Link
                            href={viewerHref}
                            className="inline-flex items-center gap-1.5 rounded-sm bg-[#0B1E3D] px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#10294d] dark:bg-orange-400 dark:text-[#0B1E3D] dark:hover:bg-orange-300"
                        >
                            <Eye size={13} />
                            View
                        </Link>
                    )}

                    {/* Open raw file in new tab */}
                    {doc.url && (
                        <a
                            href={doc.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Open in new tab"
                            className="inline-flex items-center gap-1 rounded-sm border border-zinc-200 bg-white px-2.5 py-2 text-xs font-medium text-zinc-600 transition-colors hover:border-zinc-300 hover:text-zinc-800 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700 dark:hover:text-white"
                        >
                            <ExternalLink size={12} />
                        </a>
                    )}
                </div>
            </div>
        </article>
    );
}