"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
    FileText,
    BookOpen,
    Briefcase,
    Building,
    Globe,
    Lock,
    ExternalLink,
    ChevronDown,
    Eye,
    Layers,
    GraduationCap,
    Plus,
} from "lucide-react";

import { DocumentItem, DocumentType } from "@/app/types/documents";
import { Unit } from "@/app/types/units";
import RequireRoleInline from "@/app/components/navigation/RequiredRoleInline";

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
// Grouping helpers
// ----------------------------------------------------------------------
const GENERAL_KEY = "__general__";

interface DocumentGroup {
    key: string;
    unitName: string;
    unitCode?: string;
    isGeneral: boolean;
    documents: DocumentItem[];
}

function groupDocumentsByUnit(
    documents: DocumentItem[],
    units: Unit[],
): DocumentGroup[] {
    const unitOrder = new Map<string, number>();
    units.forEach((u, i) => unitOrder.set(u._id, i));

    const unitMeta = new Map<string, { name: string; code?: string }>();
    units.forEach((u) => unitMeta.set(u._id, { name: u.name, code: u.code }));

    const buckets = new Map<string, DocumentItem[]>();

    documents.forEach((doc) => {
        let key = GENERAL_KEY;

        if (doc.unit && typeof doc.unit === "object" && doc.unit._id) {
            key = doc.unit._id;

            if (!unitMeta.has(key)) {
                unitMeta.set(key, {
                    name: doc.unit.name || "Unknown Unit",
                    code: undefined,
                });
            }
        }

        if (!buckets.has(key)) buckets.set(key, []);
        buckets.get(key)!.push(doc);
    });

    const orderedKeys = Array.from(buckets.keys()).sort((a, b) => {
        if (a === GENERAL_KEY) return 1;
        if (b === GENERAL_KEY) return -1;

        const ao = unitOrder.get(a) ?? Number.MAX_SAFE_INTEGER;
        const bo = unitOrder.get(b) ?? Number.MAX_SAFE_INTEGER;
        return ao - bo;
    });

    return orderedKeys.map((key) => {
        const isGeneral = key === GENERAL_KEY;
        const meta = unitMeta.get(key);

        return {
            key,
            isGeneral,
            unitName: isGeneral
                ? "General Course Documents"
                : meta?.name || "Unknown Unit",
            unitCode: isGeneral ? undefined : meta?.code,
            documents: buckets.get(key)!,
        };
    });
}

// ----------------------------------------------------------------------
// Main Component
// ----------------------------------------------------------------------
interface CourseDocumentsProps {
    courseId: string;
    documents: DocumentItem[];
    units: Unit[];
    isLoading: boolean;
}

export default function CourseDocuments({
    courseId,
    documents,
    units,
    isLoading,
}: CourseDocumentsProps) {
    const [isOpen, setIsOpen] = useState(false);

    const groups = useMemo(
        () => groupDocumentsByUnit(documents, units),
        [documents, units],
    );

    return (
        <section className="rounded-sm border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900 border-t-4 border-t-[#0B1E3D] dark:border-t-orange-400">
            {/* Main Section Header */}
            <div className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between md:p-8">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-sm bg-[#0B1E3D]/5 text-[#0B1E3D] dark:bg-white/10 dark:text-orange-400">
                        <FileText size={20} />
                    </div>

                    <div>
                        <h2 className="text-lg font-bold text-[#0B1E3D] dark:text-white leading-tight">
                            Course Documents
                        </h2>
                        <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                            Documents affiliated with this course, grouped by unit
                        </p>
                    </div>
                </div>

                {/* Controls & Actions */}
                <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
                    {!isLoading && (
                        <span className="rounded-sm bg-zinc-100 px-2.5 py-1.5 text-xs font-semibold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                            {documents.length}{" "}
                            {documents.length === 1 ? "Document" : "Documents"}
                        </span>
                    )}

                    <button
                        type="button"
                        onClick={() => setIsOpen((prev) => !prev)}
                        aria-expanded={isOpen}
                        aria-controls="course-documents-panel"
                        className="inline-flex items-center gap-1.5 rounded-sm border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs font-semibold text-zinc-700 transition-colors hover:border-zinc-300 hover:bg-zinc-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/40 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:border-zinc-600 dark:hover:bg-zinc-700/80"
                    >
                        <Eye size={14} className="text-zinc-500 dark:text-zinc-400" />
                        <span>{isOpen ? "Hide Documents" : "View Documents"}</span>
                        <ChevronDown
                            size={14}
                            className={`transition-transform duration-200 ${
                                isOpen ? "rotate-180" : "rotate-0"
                            }`}
                        />
                    </button>

                    <RequireRoleInline role="admin">
                        <Link
                            href={`/documents/new?courseId=${courseId}`}
                            className="inline-flex items-center gap-1.5 rounded-sm bg-[#0B1E3D] px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[#10294d] dark:bg-orange-400 dark:text-[#0B1E3D] dark:hover:bg-orange-300"
                        >
                            <Plus className="h-3.5 w-3.5" />
                            Add Document
                        </Link>
                    </RequireRoleInline>
                </div>
            </div>

            {/* Collapsible Content */}
            {isOpen && (
                <div
                    id="course-documents-panel"
                    className="px-6 pb-6 md:px-8 md:pb-8"
                >
                    {isLoading ? (
                        <div className="space-y-3">
                            <div className="h-16 animate-pulse rounded-sm bg-zinc-100 dark:bg-zinc-800/60" />
                            <div className="h-16 animate-pulse rounded-sm bg-zinc-100 dark:bg-zinc-800/60" />
                        </div>
                    ) : groups.length === 0 ? (
                        <div className="rounded-sm border border-dashed border-zinc-200 bg-zinc-50 p-6 text-center dark:border-zinc-700 dark:bg-zinc-800/40">
                            <p className="text-sm text-zinc-400">
                                No documents have been affiliated with this course yet.
                            </p>
                        </div>
                    ) : (
                        <div className="divide-y-2 divide-zinc-200/80 dark:divide-zinc-800 space-y-8 pt-2">
                            {groups.map((group, index) => (
                                <div
                                    key={group.key}
                                    className={index !== 0 ? "pt-8" : ""}
                                >
                                    <DocumentGroupBlock
                                        group={group}
                                        courseId={courseId}
                                    />
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </section>
    );
}

// ----------------------------------------------------------------------
// Document Group Block
// ----------------------------------------------------------------------
function DocumentGroupBlock({
    group,
    courseId,
}: {
    group: DocumentGroup;
    courseId: string;
}) {
    const router = useRouter();

    return (
        <div className="space-y-3">
            {/* Unit / Group Header with left indicator line */}
            <div className="flex items-center justify-between gap-3 border-l-4 border-orange-500 dark:border-orange-400 pl-3 py-1 bg-zinc-50/50 dark:bg-zinc-800/20 rounded-r-sm">
                <div className="flex items-center gap-2.5 min-w-0">
                    <div
                        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-sm ${
                            group.isGeneral
                                ? "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400"
                                : "bg-orange-100 text-orange-600 dark:bg-orange-400/10 dark:text-orange-400"
                        }`}
                    >
                        {group.isGeneral ? (
                            <GraduationCap size={15} />
                        ) : (
                            <Layers size={15} />
                        )}
                    </div>

                    <div className="flex items-baseline gap-2 min-w-0">
                        <h3 className="text-sm font-bold text-[#0B1E3D] dark:text-white truncate">
                            {group.unitName}
                        </h3>
                        {group.unitCode && (
                            <span className="font-mono text-[11px] font-bold text-orange-600 dark:text-orange-400 shrink-0">
                                ({group.unitCode})
                            </span>
                        )}
                    </div>
                </div>

                {/* Subtitle / Counter on the right */}
                <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 shrink-0 pr-2">
                    {group.documents.length}{" "}
                    {group.documents.length === 1 ? "document" : "documents"}
                </span>
            </div>

            {/* List of Documents */}
            <div className="divide-y divide-zinc-100 rounded-sm border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
                {group.documents.map((doc) => (
                    <DocumentRow
                        key={doc._id}
                        doc={doc}
                        onOpen={() =>
                            router.push(
                                `/courses/${courseId}/viewDocument?docId=${doc._id}`
                            )
                        }
                    />
                ))}
            </div>
        </div>
    );
}

// ----------------------------------------------------------------------
// Document Row
// ----------------------------------------------------------------------
function DocumentRow({
    doc,
    onOpen,
}: {
    doc: DocumentItem;
    onOpen: () => void;
}) {
    const config = DOC_TYPE_CONFIG[doc.type] || DOC_TYPE_CONFIG.resource;
    const Icon = config.icon;
    const isPublic = !doc.owner;

    return (
        <div
            role="button"
            tabIndex={0}
            onClick={onOpen}
            onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onOpen();
                }
            }}
            className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors cursor-pointer focus:outline-none focus-visible:bg-zinc-50 dark:focus-visible:bg-zinc-800/30"
        >
            {/* Left: Icon & Document Details */}
            <div className="flex items-center gap-3 min-w-0">
                <div
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-sm ${config.badgeClass}`}
                >
                    <Icon size={16} />
                </div>

                <div className="space-y-1 min-w-0">
                    <h4 className="text-sm font-semibold text-[#0B1E3D] dark:text-white truncate">
                        {doc.name}
                    </h4>

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-500 dark:text-zinc-400">
                        <span
                            className={`inline-flex items-center rounded-sm px-1.5 py-0.5 text-[10px] font-medium ${config.badgeClass}`}
                        >
                            {config.label}
                        </span>

                        <span className="inline-flex items-center gap-1">
                            {isPublic ? (
                                <>
                                    <Globe size={11} />
                                    Public
                                </>
                            ) : (
                                <>
                                    <Lock size={11} />
                                    Restricted
                                </>
                            )}
                        </span>
                    </div>
                </div>
            </div>

            {/* Right: External Link */}
            <div className="flex items-center gap-2 self-start sm:self-center">
                {doc.url && (
                    <a
                        href={doc.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        title="Open file"
                        className="inline-flex items-center gap-1 rounded-sm border border-zinc-200 bg-white px-2.5 py-1.5 text-xs font-medium text-zinc-600 transition-colors hover:border-orange-400 hover:text-orange-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:border-orange-400 dark:hover:text-orange-400"
                    >
                        <ExternalLink size={12} />
                        Open
                    </a>
                )}
            </div>
        </div>
    );
}