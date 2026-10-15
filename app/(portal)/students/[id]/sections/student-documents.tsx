// app/(portal)/students/[id]/sections/student-documents.tsx
"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Loader2,
  AlertCircle,
  FileText,
  FileSpreadsheet,
  RefreshCw,
  FolderOpen,
  Link2Off,
  GraduationCap,
  Layers,
  Eye,
  Plus,
} from "lucide-react";

import {
  DocumentItem,
  DocumentType,
  documentApi,
} from "@/app/types/documents";

/* -------------------------------------------------------------------------- */
/* Props                                                                      */
/* -------------------------------------------------------------------------- */

interface StudentDocumentsProps {
  /**
   * The linked user's ID for this student.
   *
   * Pass `null` / `undefined` when the student has no user account
   * yet — the component will skip the fetch and show a friendly
   * empty state instead.
   */
  userId?: string | null;

  /**
   * The student's own Mongo `_id`.
   *
   * Required so the "View" link can build a URL under
   * `/students/[id]/student-document`.
   */
  studentId: string;

  /** Extra classes (e.g. `mt-6`) so the parent can space it. */
  className?: string;
}

/* -------------------------------------------------------------------------- */
/* Helpers (module scope — NOT inside the component)                          */
/* -------------------------------------------------------------------------- */

const getDocumentIcon = (doc: DocumentItem) => {
  const url = doc.url?.toLowerCase() || "";

  if (url.endsWith(".xls") || url.endsWith(".xlsx")) {
    return (
      <FileSpreadsheet className="h-5 w-5 text-green-600 dark:text-green-400" />
    );
  }

  return (
    <FileText className="h-5 w-5 text-[#0B1E3D] dark:text-orange-400" />
  );
};

const getTypeBadgeClass = (type: DocumentType) => {
  const base =
    "inline-flex items-center rounded-sm px-2 py-0.5 text-[11px] font-medium capitalize";

  switch (type) {
    case "academic":
      return `${base} bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300`;

    case "professional":
      return `${base} bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300`;

    case "institutional":
      return `${base} bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300`;

    case "resource":
    default:
      return `${base} bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300`;
  }
};

/**
 * Get the owner's Mongo ID regardless of whether the backend
 * returned a populated owner object or a raw string.
 */
const getOwnerId = (doc: DocumentItem): string | null => {
  if (!doc.owner) return null;
  if (typeof doc.owner === "string") return doc.owner;
  return doc.owner._id ?? null;
};

const getCourseName = (doc: DocumentItem): string | null =>
  doc.course && typeof doc.course === "object"
    ? doc.course.name ?? null
    : null;

const getUnitName = (doc: DocumentItem): string | null =>
  doc.unit && typeof doc.unit === "object"
    ? doc.unit.name ?? null
    : null;

/* -------------------------------------------------------------------------- */
/* Component                                                                  */
/* -------------------------------------------------------------------------- */

export default function StudentDocuments({
  userId,
  studentId,
  className = "",
}: StudentDocumentsProps) {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState<boolean>(Boolean(userId));
  const [error, setError] = useState<string | null>(null);

  /* ------------------------------ Fetch ------------------------------ */

  const fetchDocuments = useCallback(async () => {
    if (!userId) {
      setDocuments([]);
      setLoading(false);
      setError(null);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await documentApi.getByUser(userId);

      // Backend may return docs where the owner is a populated object
      // or a plain id — normalise the check so we only show this
      // student's own documents.
      const owned = (response.data ?? []).filter(
        (doc) => getOwnerId(doc) === userId,
      );

      setDocuments(owned);
    } catch (err: any) {
      console.error("Failed to fetch student documents:", err);

      setError(
        err?.response?.data?.message ||
        "Failed to load student documents. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  /* ------------------------------ Render ----------------------------- */

  const showRefresh = Boolean(userId) && !loading && !error;
  const canAddDocument = Boolean(userId);

  return (
    <section
      className={`overflow-hidden rounded-sm border border-zinc-200 border-t-4 border-t-[#0B1E3D] bg-white shadow-sm dark:border-zinc-800 dark:border-t-orange-400 dark:bg-zinc-900 ${className}`}
    >
      {/* Header */}
      <header className="flex items-center justify-between gap-3 border-b border-zinc-100 px-6 py-4 dark:border-zinc-800">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-sm bg-[#0B1E3D]/5 text-[#0B1E3D] dark:bg-orange-400/10 dark:text-orange-400">
            <FolderOpen size={16} />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-[#0B1E3D] dark:text-white">
                Documents
              </h2>

              {userId && documents.length > 0 && (
                <span className="rounded-sm bg-zinc-100 px-1.5 py-0.5 text-[11px] font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                  {documents.length}
                </span>
              )}
            </div>

            <p className="text-[11px] text-zinc-400">
              Files assigned to this student&apos;s account
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {showRefresh && (
            <button
              type="button"
              onClick={fetchDocuments}
              className="inline-flex items-center gap-1.5 rounded-sm border border-zinc-200 bg-white px-2.5 py-1.5 text-xs font-medium text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Refresh
            </button>
          )}

          {canAddDocument && (
            <Link
              href={`/documents/new?userId=${userId}&studentId=${studentId}`}
              className="inline-flex items-center gap-1.5 rounded-sm bg-[#0B1E3D] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[#10294d] dark:bg-orange-400 dark:text-[#0B1E3D] dark:hover:bg-orange-300"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Document
            </Link>
          )}
        </div>
      </header>

      {/* Body */}
      {!userId ? (
        <EmptyState
          icon={<Link2Off className="h-5 w-5 text-zinc-400" />}
          title="No user account linked"
          description="Link a user account to this student to manage their documents."
        />
      ) : loading ? (
        <div className="flex h-32 items-center justify-center">
          <div className="flex items-center gap-3 text-zinc-500 dark:text-zinc-400">
            <Loader2 className="h-5 w-5 animate-spin text-[#0B1E3D] dark:text-orange-400" />
            <span className="text-sm font-medium">
              Loading student documents...
            </span>
          </div>
        </div>
      ) : error ? (
        <div className="flex items-center justify-between gap-3 px-6 py-5">
          <div className="flex items-center gap-3 text-red-700 dark:text-red-400">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <p className="text-sm">{error}</p>
          </div>

          <button
            type="button"
            onClick={fetchDocuments}
            className="inline-flex items-center gap-1.5 rounded-sm border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Retry
          </button>
        </div>
      ) : documents.length === 0 ? (
        <EmptyState
          icon={<FolderOpen className="h-5 w-5 text-zinc-400" />}
          title="No documents found"
          description="This student doesn't have any documents assigned yet."
          action={
            canAddDocument ? (
              <Link
                href={`/documents/new?userId=${userId}&studentId=${studentId}`}
                className="mt-4 inline-flex items-center gap-1.5 rounded-sm bg-[#0B1E3D] px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-[#10294d] dark:bg-orange-400 dark:text-[#0B1E3D] dark:hover:bg-orange-300"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Document
              </Link>
            ) : null
          }
        />
      ) : (
        <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
          {documents.map((doc) => {
            const courseName = getCourseName(doc);
            const unitName = getUnitName(doc);

            return (
              <li
                key={doc._id}
                className="flex items-start justify-between gap-4 px-6 py-4 transition-colors hover:bg-zinc-50/60 dark:hover:bg-zinc-800/40"
              >
                <div className="flex min-w-0 items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-sm border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900">
                    {getDocumentIcon(doc)}
                  </div>

                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
                      {doc.name}
                    </p>

                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                      <span className={getTypeBadgeClass(doc.type)}>
                        {doc.type}
                      </span>

                      {courseName && (
                        <span className="inline-flex items-center gap-1 text-[11px] text-zinc-500 dark:text-zinc-400">
                          <GraduationCap className="h-3 w-3" />
                          {courseName}
                        </span>
                      )}

                      {unitName && (
                        <span className="inline-flex items-center gap-1 text-[11px] text-zinc-500 dark:text-zinc-400">
                          <Layers className="h-3 w-3" />
                          {unitName}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <Link
                  href={`/students/${studentId}/student-document?documentId=${doc._id}`}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-sm border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
                >
                  <Eye className="h-3.5 w-3.5" />
                  View
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* Sub-components                                                             */
/* -------------------------------------------------------------------------- */

function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-10 text-center">
      <div className="rounded-full bg-zinc-100 p-3 dark:bg-zinc-800">
        {icon}
      </div>

      <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
        {title}
      </p>

      <p className="text-xs text-zinc-500 dark:text-zinc-400">
        {description}
      </p>

      {action}
    </div>
  );
}