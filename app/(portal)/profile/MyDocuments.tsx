"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Loader2,
  AlertCircle,
  FileText,
  FileSpreadsheet,
  ExternalLink,
  RefreshCw,
  FolderOpen,
  Lock,
} from "lucide-react";

import {
  DocumentItem,
  DocumentType,
  documentApi,
} from "@/app/types/documents";

interface MyDocumentsProps {
  userId: string;
}

/* ---------- Helpers ---------- */

const getDocumentIcon = (doc: DocumentItem) => {
  const url = doc.url?.toLowerCase() || "";

  if (url.endsWith(".xls") || url.endsWith(".xlsx")) {
    return (
      <FileSpreadsheet className="h-5 w-5 text-green-600 dark:text-green-400" />
    );
  }

  return (
    <FileText className="h-5 w-5 text-[#082B66] dark:text-orange-400" />
  );
};

const getTypeBadge = (type: DocumentType) => {
  const base =
    "inline-flex items-center rounded-sm px-2 py-0.5 text-[11px] font-medium capitalize";

  switch (type) {
    case "academic":
      return `${base} bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300`;

    case "professional":
      return `${base} bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300`;

    case "institutional":
      return `${base} bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300`;

    case "resource":
    default:
      return `${base} bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300`;
  }
};

/**
 * Get the owner's MongoDB ID regardless of whether
 * the backend returned a populated owner object or an ID.
 */
const getOwnerId = (doc: DocumentItem): string | null => {
  if (!doc.owner) {
    return null;
  }

  if (typeof doc.owner === "string") {
    return doc.owner;
  }

  return doc.owner._id ?? null;
};

/* ---------- Component ---------- */

export default function MyDocuments({ userId }: MyDocumentsProps) {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDocuments = useCallback(async () => {
    if (!userId) {
      setDocuments([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await documentApi.getByUser(userId);

      const userDocuments = (response.data ?? []).filter((doc) => {
        const ownerId = getOwnerId(doc);

        // Only show documents that have an owner
        // and belong to the currently logged-in user.
        return ownerId === userId;
      });

      setDocuments(userDocuments);
    } catch (err: any) {
      console.error("Failed to fetch documents:", err);

      setError(
        err?.response?.data?.message ||
          "Failed to load your documents. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  /* ---------- Loading ---------- */

  if (loading) {
    return (
      <div className="overflow-hidden rounded-sm border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex h-40 items-center justify-center">
          <div className="flex items-center gap-3 text-zinc-500 dark:text-zinc-400">
            <Loader2 className="h-5 w-5 animate-spin text-[#082B66] dark:text-orange-400" />

            <span className="text-sm font-medium">
              Loading your documents...
            </span>
          </div>
        </div>
      </div>
    );
  }

  /* ---------- Error ---------- */

  if (error) {
    return (
      <div className="overflow-hidden rounded-sm border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="border-b border-zinc-100 px-6 py-4 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <FolderOpen className="h-4 w-4 text-zinc-400" />

            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              My Documents
            </h3>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 px-6 py-5">
          <div className="flex items-center gap-3 text-red-700 dark:text-red-400">
            <AlertCircle className="h-4 w-4 shrink-0" />

            <p className="text-sm">{error}</p>
          </div>

          <button
            type="button"
            onClick={fetchDocuments}
            className="inline-flex items-center gap-2 rounded-sm border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Retry
          </button>
        </div>
      </div>
    );
  }

  /* ---------- Empty ---------- */

  if (documents.length === 0) {
    return (
      <div className="overflow-hidden rounded-sm border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="border-b border-zinc-100 px-6 py-4 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <FolderOpen className="h-4 w-4 text-zinc-400" />

            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              My Documents
            </h3>
          </div>

          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            Documents assigned specifically to you.
          </p>
        </div>

        <div className="flex flex-col items-center justify-center gap-2 px-6 py-10 text-center">
          <div className="rounded-full bg-zinc-100 p-3 dark:bg-zinc-800">
            <FolderOpen className="h-5 w-5 text-zinc-400" />
          </div>

          <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            No documents found
          </p>

          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            You don't have any documents assigned to your account yet.
          </p>
        </div>
      </div>
    );
  }

  /* ---------- List ---------- */

  return (
    <div className="overflow-hidden rounded-sm border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      {/* Header */}

      <div className="flex items-center justify-between border-b border-zinc-100 px-6 py-4 dark:border-zinc-800">
        <div>
          <div className="flex items-center gap-2">
            <FolderOpen className="h-4 w-4 text-zinc-400" />

            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              My Documents
            </h3>

            <span className="rounded-sm bg-zinc-100 px-1.5 py-0.5 text-[11px] font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
              {documents.length}
            </span>
          </div>

          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            Documents assigned specifically to you.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchDocuments}
          className="inline-flex items-center gap-2 rounded-sm border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh
        </button>
      </div>

      {/* List */}

      <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
        {documents.map((doc) => (
          <li
            key={doc._id}
            className="flex items-center justify-between gap-4 px-6 py-3 transition-colors hover:bg-zinc-50/60 dark:hover:bg-zinc-800/40"
          >
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900">
                {getDocumentIcon(doc)}
              </div>

              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
                  {doc.name}
                </p>

                <div className="mt-0.5 flex items-center gap-2">
                  <span className={getTypeBadge(doc.type)}>
                    {doc.type}
                  </span>

                  <span className="inline-flex items-center gap-1 text-[11px] text-zinc-500 dark:text-zinc-400">
                    <Lock className="h-3 w-3" />
                    Private
                  </span>
                </div>
              </div>
            </div>

            <a
              href={doc.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex shrink-0 items-center gap-1.5 rounded-sm border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Open
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}