"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
    ArrowLeft,
    Edit,
    ExternalLink,
    Globe,
    Lock,
    Calendar,
    Clock,
    AlertCircle,
    Loader2,
    FileText,
    BookOpen,
    Briefcase,
    Building,
    User as UserIcon,
    Copy,
    Check,
    Maximize2,
    Minimize2,
    Layers,
    GraduationCap,
    Download,
} from "lucide-react";

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

    const clean = url.split("?")[0].split("#")[0].toLowerCase();

    if (/\.(png|jpe?g|gif|webp|svg|bmp|avif)$/.test(clean)) {
        return "image";
    }

    if (/\.pdf$/.test(clean)) {
        return "pdf";
    }

    if (/\.(docx?|xlsx?|pptx?|odt|ods|odp)$/.test(clean)) {
        return "office";
    }

    if (/\.(txt|md|csv|json|xml|html?)$/.test(clean)) {
        return "text";
    }

    return "unknown";
}

// ----------------------------------------------------------------------
// Page
// ----------------------------------------------------------------------

export default function DocumentDetailsPage() {
    const params = useParams();
    const documentId = params?.id as string;

    const [document, setDocument] = useState<DocumentItem | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [copied, setCopied] = useState<boolean>(false);
    const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
    const [imageError, setImageError] = useState<boolean>(false);

    // ----------------------------------------------------------------
    // Load document
    // ----------------------------------------------------------------

    useEffect(() => {
        if (!documentId) return;

        let cancelled = false;

        const fetchDocument = async () => {
            try {
                setLoading(true);
                setError(null);

                const res = await documentApi.getById(documentId);

                if (!cancelled) {
                    setDocument(res.data);
                }
            } catch (err: any) {
                console.error("Failed to fetch document:", err);

                if (!cancelled) {
                    setError("Document not found or access restricted.");
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        };

        fetchDocument();

        return () => {
            cancelled = true;
        };
    }, [documentId]);

    // ----------------------------------------------------------------
    // Reset image error when document changes
    // ----------------------------------------------------------------

    useEffect(() => {
        setImageError(false);
    }, [document?._id]);

    // ----------------------------------------------------------------
    // Escape key exits fullscreen
    // ----------------------------------------------------------------

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                setIsFullscreen(false);
            }
        };

        window.addEventListener("keydown", onKey);

        return () => {
            window.removeEventListener("keydown", onKey);
        };
    }, []);

    // ----------------------------------------------------------------
    // Copy URL
    // ----------------------------------------------------------------

    const handleCopyLink = () => {
        if (!document?.url) return;

        navigator.clipboard.writeText(document.url);

        setCopied(true);

        setTimeout(() => {
            setCopied(false);
        }, 2000);
    };

    // ----------------------------------------------------------------
    // Loading
    // ----------------------------------------------------------------

    if (loading) {
        return (
            <main className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
                <div className="flex min-h-[60vh] flex-col items-center justify-center">
                    <Loader2 className="mb-2 h-8 w-8 animate-spin text-[#0B1E3D] dark:text-orange-400" />

                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
                        Loading document...
                    </p>
                </div>
            </main>
        );
    }

    // ----------------------------------------------------------------
    // Error
    // ----------------------------------------------------------------

    if (error || !document) {
        return (
            <main className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
                <div className="mx-auto max-w-full py-8 sm:px-6 lg:px-8">
                    <Link
                        href="/documents"
                        className="inline-flex items-center gap-2 text-sm font-semibold text-zinc-500 transition-colors hover:text-[#0B1E3D] dark:text-zinc-400 dark:hover:text-white"
                    >
                        <ArrowLeft size={16} />
                        Back to Documents
                    </Link>

                    <div className="mt-8 rounded-sm border border-red-200 border-t-4 border-t-red-600 bg-red-50 p-6 shadow-sm dark:border-red-900/50 dark:bg-red-950/20">
                        <h1 className="text-lg font-bold text-red-800 dark:text-red-300">
                            Document unavailable
                        </h1>

                        <p className="mt-2 max-w-2xl text-sm leading-6 text-red-700 dark:text-red-400">
                            {error || "The requested document could not be found."}
                        </p>

                        <Link
                            href="/documents"
                            className="mt-5 inline-flex items-center gap-2 rounded-sm bg-[#0B1E3D] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#10294d] dark:bg-orange-400 dark:text-[#0B1E3D] dark:hover:bg-orange-300"
                        >
                            <ArrowLeft size={15} />
                            Return to Documents
                        </Link>
                    </div>
                </div>
            </main>
        );
    }

    // ----------------------------------------------------------------
    // Derived values
    // ----------------------------------------------------------------

    const config =
        DOC_TYPE_CONFIG[document.type] || DOC_TYPE_CONFIG.resource;

    const Icon = config.icon;

    const isPublic = !document.owner;

    const kind = getFileKind(document.url);

    const courseName =
        document.course &&
            typeof document.course === "object" &&
            document.course.name
            ? document.course.name
            : null;

    const unitName =
        document.unit &&
            typeof document.unit === "object" &&
            document.unit.name
            ? document.unit.name
            : null;

    const unitCode =
        document.unit &&
            typeof document.unit === "object" &&
            (document.unit as any).code
            ? ((document.unit as any).code as string)
            : null;

    const ownerName =
        document.owner &&
            typeof document.owner === "object" &&
            document.owner.name
            ? document.owner.name
            : null;

    // ----------------------------------------------------------------
    // Render
    // ----------------------------------------------------------------

    return (
        <main className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
            <div
                className={
                    isFullscreen
                        ? "w-full"
                        : "mx-auto w-full px-4 py-6 sm:px-6 lg:px-8 lg:py-8"
                }
            >
                {/* ============================================================
                    BACK NAVIGATION
                ============================================================ */}

                {!isFullscreen && (
                    <Link
                        href="/documents"
                        className="inline-flex items-center gap-2 text-sm font-semibold text-zinc-500 transition-colors hover:text-[#0B1E3D] dark:text-zinc-400 dark:hover:text-white"
                    >
                        <ArrowLeft size={16} />
                        Back to Documents
                    </Link>
                )}

                {/* ============================================================
                    DOCUMENT HEADER
                ============================================================ */}

                {!isFullscreen && (
                    <section className="mt-5 overflow-hidden rounded-sm border-b-2 border-orange-400 bg-[#0B1E3D] shadow-sm">
                        <div className="px-6 py-7 md:px-8 md:py-9">
                            {/* Eyebrow */}
                            <div className="mb-4 flex items-center gap-2">
                                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-orange-400">
                                    Document Details
                                </span>

                                <span className="h-px w-8 bg-orange-400/50" />
                            </div>

                            {/* Title */}
                            <h1 className="max-w-5xl text-3xl font-bold leading-tight tracking-tight text-white md:text-4xl">
                                {document.name}
                            </h1>

                            {/* ======================================================
                                METADATA
                            ======================================================= */}

                            <div className="mt-6 flex flex-wrap items-center gap-2.5">
                                {/* Type */}
                                <span
                                    className={`inline-flex items-center gap-1.5 rounded-sm px-2.5 py-1 text-[11px] font-semibold ${config.badgeClass}`}
                                >
                                    <Icon size={13} />
                                    {config.label}
                                </span>

                                {/* Access */}
                                {isPublic ? (
                                    <span className="inline-flex items-center gap-1.5 rounded-sm border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-medium text-zinc-300">
                                        <Globe size={12} />
                                        Public Access
                                    </span>
                                ) : (
                                    <span className="inline-flex items-center gap-1.5 rounded-sm border border-amber-400/30 bg-amber-400/10 px-2.5 py-1 text-[11px] font-medium text-amber-300">
                                        <Lock size={12} />
                                        Restricted Access
                                    </span>
                                )}

                                {/* Owner */}
                                {ownerName && (
                                    <span className="inline-flex items-center gap-1.5 rounded-sm border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-medium text-zinc-300">
                                        <UserIcon size={12} />
                                        {ownerName}
                                    </span>
                                )}

                                {/* Course */}
                                {courseName && (
                                    <span className="inline-flex items-center gap-1.5 rounded-sm border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-medium text-zinc-300">
                                        <GraduationCap size={12} />
                                        {courseName}
                                    </span>
                                )}

                                {/* Unit */}
                                {unitName && (
                                    <span className="inline-flex items-center gap-1.5 rounded-sm border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-medium text-zinc-300">
                                        <Layers size={12} />
                                        {unitName}

                                        {unitCode && (
                                            <span className="font-mono font-bold text-orange-400">
                                                {unitCode}
                                            </span>
                                        )}
                                    </span>
                                )}

                                {/* Created */}
                                {document.createdAt && (
                                    <span className="inline-flex items-center gap-1.5 rounded-sm border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-medium text-zinc-400">
                                        <Calendar size={12} />
                                        {new Date(
                                            document.createdAt
                                        ).toLocaleDateString(undefined, {
                                            year: "numeric",
                                            month: "short",
                                            day: "numeric",
                                        })}
                                    </span>
                                )}

                                {/* Updated */}
                                {document.updatedAt && (
                                    <span className="inline-flex items-center gap-1.5 rounded-sm border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-medium text-zinc-400">
                                        <Clock size={12} />
                                        Updated{" "}
                                        {new Date(
                                            document.updatedAt
                                        ).toLocaleDateString(undefined, {
                                            year: "numeric",
                                            month: "short",
                                            day: "numeric",
                                        })}
                                    </span>
                                )}
                            </div>

                            {/* Optional contextual description */}
                            {(courseName || unitName) && document.type === "resource" && (
                                <p className="mt-4 text-xs text-zinc-400">
                                    This resource is associated with
                                    {courseName ? ` ${courseName}` : ""}
                                    {courseName && unitName ? " / " : ""}
                                    {unitName ? `${unitName}` : ""}.
                                </p>
                            )}

                            {/* Restricted access information */}
                            {!isPublic && ownerName && (
                                <p className="mt-3 text-xs text-zinc-500">
                                    Restricted access assigned to{" "}
                                    <span className="font-medium text-zinc-300">
                                        {ownerName}
                                    </span>
                                    .
                                </p>
                            )}
                        </div>
                    </section>
                )}

                {/* ============================================================
                    DOCUMENT VIEWER
                ============================================================ */}

                <div
                    className={`${isFullscreen
                            ? "fixed inset-0 z-50 flex flex-col bg-white dark:bg-zinc-950"
                            : "mt-6 min-h-[80vh] w-full overflow-hidden rounded-sm border border-zinc-200 border-t-4 border-t-orange-400 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
                        }`}
                >
                    {/* ----------------------------------------------------------
                        VIEWER TOOLBAR
                    ---------------------------------------------------------- */}

                    <div className="flex flex-col gap-3 border-b border-zinc-100 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0">
                            <div className="flex min-w-0 items-center gap-2">
                                <FileText className="h-4 w-4 shrink-0 text-zinc-400" />

                                <span className="truncate font-mono text-[11px] text-zinc-400 dark:text-zinc-500">
                                    {document.url}
                                </span>
                            </div>
                        </div>

                        <div className="flex shrink-0 flex-wrap items-center gap-2">
                            {!isFullscreen && (
                                <>
                                    {/* Copy */}
                                    <button
                                        type="button"
                                        onClick={handleCopyLink}
                                        className="inline-flex items-center gap-1.5 rounded-sm border border-zinc-200 bg-white px-3 py-2 text-xs font-medium text-zinc-600 transition-colors hover:border-zinc-300 hover:text-zinc-800 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700 dark:hover:text-white"
                                    >
                                        {copied ? (
                                            <Check
                                                size={13}
                                                className="text-emerald-500"
                                            />
                                        ) : (
                                            <Copy size={13} />
                                        )}

                                        {copied ? "Copied" : "Copy URL"}
                                    </button>

                                    {/* Download */}
                                    <a
                                        href={document.url}
                                        download
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1.5 rounded-sm border border-zinc-200 bg-white px-3 py-2 text-xs font-medium text-zinc-600 transition-colors hover:border-zinc-300 hover:text-zinc-800 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700 dark:hover:text-white"
                                    >
                                        <Download size={13} />
                                        Download
                                    </a>

                                    {/* Original */}
                                    <a
                                        href={document.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1.5 rounded-sm border border-zinc-200 bg-white px-3 py-2 text-xs font-medium text-zinc-600 transition-colors hover:border-zinc-300 hover:text-zinc-800 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700 dark:hover:text-white"
                                    >
                                        <ExternalLink size={13} />
                                        Open Original
                                    </a>

                                    {/* Edit */}
                                    <Link
                                        href={`/documents/${documentId}/edit`}
                                        className="inline-flex items-center gap-1.5 rounded-sm bg-[#0B1E3D] px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#10294d] dark:bg-orange-400 dark:text-[#0B1E3D] dark:hover:bg-orange-300"
                                    >
                                        <Edit size={13} />
                                        Edit
                                    </Link>
                                </>
                            )}

                            {/* Fullscreen */}
                            <button
                                type="button"
                                onClick={() =>
                                    setIsFullscreen((value) => !value)
                                }
                                className={`inline-flex items-center justify-center rounded-sm p-2 transition-colors ${isFullscreen
                                        ? "bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-white/10 dark:text-white dark:hover:bg-white/20"
                                        : "border border-zinc-200 bg-white text-zinc-500 hover:border-zinc-300 hover:text-zinc-800 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700 dark:hover:text-white"
                                    }`}
                                title={
                                    isFullscreen
                                        ? "Exit fullscreen (Esc)"
                                        : "Fullscreen preview"
                                }
                            >
                                {isFullscreen ? (
                                    <Minimize2 size={14} />
                                ) : (
                                    <Maximize2 size={14} />
                                )}
                            </button>
                        </div>
                    </div>

                    {/* ----------------------------------------------------------
                        EMBEDDED CONTENT
                    ---------------------------------------------------------- */}

                    <div className="relative bg-zinc-100 dark:bg-zinc-950">
                        {/* Image */}
                        {kind === "image" && !imageError && (
                            <div className="flex items-center justify-center p-4 md:p-8">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                    src={document.url}
                                    alt={document.name}
                                    onError={() => setImageError(true)}
                                    className="h-auto w-full max-w-full rounded-sm border border-zinc-200 bg-white object-contain shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
                                />
                            </div>
                        )}

                        {/* PDF */}
                        {kind === "pdf" && (
                            <iframe
                                src={document.url}
                                title={document.name}
                                className="h-[90vh] w-full border-0 bg-white"
                            />
                        )}

                        {/* Office */}
                        {kind === "office" && (
                            <iframe
                                src={`https://docs.google.com/viewer?url=${encodeURIComponent(
                                    document.url
                                )}&embedded=true`}
                                title={document.name}
                                className="h-[90vh] w-full border-0 bg-white"
                            />
                        )}

                        {/* Text */}
                        {kind === "text" && (
                            <iframe
                                src={document.url}
                                title={document.name}
                                className="h-[90vh] w-full border-0 bg-white"
                            />
                        )}

                        {/* Unsupported */}
                        {(kind === "unknown" ||
                            (kind === "image" && imageError)) && (
                                <div className="flex min-h-[80vh] flex-col items-center justify-center p-8 text-center">
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
                                        href={document.url}
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
                </div>
            </div>
        </main>
    );
}