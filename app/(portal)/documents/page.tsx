"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  FileText,
  Plus,
  Search,
  Filter,
  Trash2,
  ExternalLink,
  User as UserIcon,
  Globe,
  Lock,
  Loader2,
  AlertCircle,
  BookOpen,
  Briefcase,
  Building,
  GraduationCap,
  Layers,
} from "lucide-react";

import {
  DocumentItem,
  DocumentType,
  DocumentOwner,
  documentApi,
} from "@/app/types/documents";
import { userApi } from "@/app/types/users";
import { User } from "@/app/lib/types";
import SelectCourse from "@/app/(portal)/courses/selectCourse";

// ----------------------------------------------------------------------
// Helper Configs & Badge Renderers
// ----------------------------------------------------------------------

const TYPE_CONFIG: Record<
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
      "bg-[#082B66]/10 text-[#082B66] dark:bg-orange-400/10 dark:text-orange-400",
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
// Helper: Extract display name or ID safely
// ----------------------------------------------------------------------

function getOwnerDisplayName(
  owner: DocumentOwner | string | null | undefined,
  userMap: Map<string, string>
): string {
  if (!owner) return "Unknown";

  if (typeof owner === "object") {
    if (owner.name) return owner.name;
    const objId = owner._id || owner.id;
    if (objId) return userMap.get(objId) || String(objId).slice(-6);
    return "Unknown";
  }

  const stringId = String(owner);
  return (
    userMap.get(stringId) ||
    (stringId.length > 6 ? stringId.slice(-6) : stringId)
  );
}

// ----------------------------------------------------------------------
// Helper: Build course/unit context summary
// ----------------------------------------------------------------------

function getCourseUnitSummary(doc: DocumentItem): {
  courseName: string | null;
  unitName: string | null;
  courseId: string | null;
  hasAffiliation: boolean;
} {
  const courseName =
    doc.course && typeof doc.course === "object" && doc.course.name
      ? doc.course.name
      : null;

  const courseId =
    doc.course && typeof doc.course === "object" && doc.course._id
      ? doc.course._id
      : null;

  const unitName =
    doc.unit && typeof doc.unit === "object" && doc.unit.name
      ? doc.unit.name
      : null;

  return {
    courseName,
    unitName,
    courseId,
    hasAffiliation: Boolean(courseName || unitName),
  };
}

// ----------------------------------------------------------------------
// Page
// ----------------------------------------------------------------------

export default function DocumentsPage() {
  const router = useRouter();

  // Data states
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Search & Filter states
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [visibilityFilter, setVisibilityFilter] =
    useState<string>("all");
  const [courseFilter, setCourseFilter] = useState<string>("");

  // Delete confirmation
  const [deleteConfirmId, setDeleteConfirmId] =
    useState<string | null>(null);

  // --------------------------------------------------------------------
  // Fetch data
  // --------------------------------------------------------------------

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [docsRes, usersRes] = await Promise.all([
        documentApi.getAll(),
        userApi.getAll(),
      ]);

      setDocuments(docsRes.data || []);
      setUsers(usersRes.data || []);
    } catch (err: any) {
      console.error("Failed to fetch documents or users:", err);

      setError(
        "Failed to load documents. Please check your network connection."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // --------------------------------------------------------------------
  // User lookup
  // --------------------------------------------------------------------

  const userMap = useMemo(() => {
    const map = new Map<string, string>();

    users.forEach((user) => {
      const userId = user.id || (user as any)._id || (user as any).id;

      if (userId) {
        map.set(String(userId), user.name);
      }
    });

    return map;
  }, [users]);

  // --------------------------------------------------------------------
  // Navigation
  // --------------------------------------------------------------------

  const handleCreateDocument = () => {
    router.push("/documents/new");
  };

  const handleViewDocument = (id: string) => {
    router.push(`/documents/${id}`);
  };

  // --------------------------------------------------------------------
  // Delete
  // --------------------------------------------------------------------

  const handleDelete = async (id: string) => {
    try {
      await documentApi.delete(id);

      setDocuments((prev) =>
        prev.filter((document) => document._id !== id)
      );

      setDeleteConfirmId(null);
    } catch (err: any) {
      console.error("Delete error:", err);
      alert("Failed to delete document.");
    }
  };

  // --------------------------------------------------------------------
  // Filtering
  // --------------------------------------------------------------------

  const filteredDocuments = useMemo(() => {
    return documents.filter((doc) => {
      const search = searchTerm.toLowerCase();

      const ownerName = getOwnerDisplayName(doc.owner, userMap).toLowerCase();

      const { courseName, unitName, courseId } = getCourseUnitSummary(doc);

      const matchesSearch =
        doc.name.toLowerCase().includes(search) ||
        doc.url.toLowerCase().includes(search) ||
        ownerName.includes(search) ||
        (courseName ? courseName.toLowerCase().includes(search) : false) ||
        (unitName ? unitName.toLowerCase().includes(search) : false);

      const matchesType =
        selectedType === "all" || doc.type === selectedType;

      const isPublicDoc = !doc.owner;

      const matchesVisibility =
        visibilityFilter === "all" ||
        (visibilityFilter === "public" && isPublicDoc) ||
        (visibilityFilter === "restricted" && !isPublicDoc);

      const matchesCourse =
        !courseFilter || (courseId !== null && courseId === courseFilter);

      return (
        matchesSearch &&
        matchesType &&
        matchesVisibility &&
        matchesCourse
      );
    });
  }, [
    documents,
    searchTerm,
    selectedType,
    visibilityFilter,
    courseFilter,
    userMap,
  ]);

  const hasActiveFilters =
    Boolean(searchTerm) ||
    selectedType !== "all" ||
    visibilityFilter !== "all" ||
    Boolean(courseFilter);

  // --------------------------------------------------------------------
  // Render
  // --------------------------------------------------------------------

  return (
    <div className="mx-auto max-w-full space-y-6 p-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">
            Document Repository
          </h1>

          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Manage academic, professional, institutional, and resource
            documents.
          </p>
        </div>

        <button
          type="button"
          onClick={handleCreateDocument}
          className="inline-flex items-center justify-center gap-2 rounded-sm bg-[#082B66] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#082B66]/90 focus:outline-none focus:ring-2 focus:ring-[#082B66]/30 focus:ring-offset-2 dark:bg-orange-400 dark:text-zinc-950 dark:hover:bg-orange-300"
        >
          <Plus className="h-4 w-4" />
          Add Document
        </button>
      </div>

      {/* Controls / Filter Bar */}
      <div className="flex flex-col items-stretch justify-between gap-4 rounded-sm border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900 lg:flex-row lg:items-center">
        {/* Search */}
        <div className="relative w-full lg:w-80">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />

          <input
            type="text"
            placeholder="Search by name, URL, owner, course, or unit..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-sm border border-zinc-200 bg-zinc-50 py-2 pl-9 pr-4 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-[#082B66] focus:ring-2 focus:ring-[#082B66]/10 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white dark:focus:border-orange-400 dark:focus:ring-orange-400/10"
          />
        </div>

        {/* Filters */}
        <div className="flex w-full flex-wrap items-center gap-3 lg:w-auto">
          {/* Course Filter — powered by SelectCourse */}
          <div className="w-full sm:w-64">
            <SelectCourse
              value={courseFilter}
              onChange={(id) => setCourseFilter(id)}
              placeholder="All courses"
            />
          </div>

          {/* Type Filter */}
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-zinc-400" />

            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="rounded-sm border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-700 outline-none transition focus:border-[#082B66] focus:ring-2 focus:ring-[#082B66]/10 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-200 dark:focus:border-orange-400 dark:focus:ring-orange-400/10"
            >
              <option value="all">All Types</option>
              <option value="resource">Resource</option>
              <option value="academic">Academic</option>
              <option value="professional">Professional</option>
              <option value="institutional">Institutional</option>
            </select>
          </div>

          {/* Visibility Filter */}
          <select
            value={visibilityFilter}
            onChange={(e) => setVisibilityFilter(e.target.value)}
            className="rounded-sm border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-700 outline-none transition focus:border-[#082B66] focus:ring-2 focus:ring-[#082B66]/10 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-200 dark:focus:border-orange-400 dark:focus:ring-orange-400/10"
          >
            <option value="all">All Access</option>
            <option value="public">Public</option>
            <option value="restricted">Restricted / Private</option>
          </select>
        </div>
      </div>

      {/* Main Content */}
      {loading ? (
        <div className="flex flex-col items-center justify-center rounded-sm border border-zinc-200 bg-white py-20 dark:border-zinc-800 dark:bg-zinc-900">
          <Loader2 className="mb-2 h-8 w-8 animate-spin text-[#082B66] dark:text-orange-400" />

          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Loading documents...
          </p>
        </div>
      ) : error ? (
        <div className="rounded-sm border border-red-200 bg-red-50 p-6 text-center dark:border-red-900/50 dark:bg-red-950/20">
          <AlertCircle className="mx-auto mb-2 h-8 w-8 text-red-600 dark:text-red-400" />

          <p className="font-medium text-red-800 dark:text-red-300">
            {error}
          </p>

          <button
            type="button"
            onClick={fetchData}
            className="mt-4 rounded-sm bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      ) : filteredDocuments.length === 0 ? (
        <div className="rounded-sm border border-zinc-200 bg-white p-12 text-center dark:border-zinc-800 dark:bg-zinc-900">
          <FileText className="mx-auto mb-3 h-10 w-10 text-zinc-300 dark:text-zinc-600" />

          <h3 className="text-lg font-medium text-zinc-900 dark:text-white">
            No documents found
          </h3>

          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            {hasActiveFilters
              ? "Try adjusting your search filters."
              : "Get started by adding your first document."}
          </p>

          {!hasActiveFilters && (
            <button
              type="button"
              onClick={handleCreateDocument}
              className="mt-5 inline-flex items-center gap-2 rounded-sm bg-[#082B66] px-4 py-2 text-sm font-medium text-white hover:bg-[#082B66]/90 dark:bg-orange-400 dark:text-zinc-950 dark:hover:bg-orange-300"
            >
              <Plus className="h-4 w-4" />
              Add Document
            </button>
          )}
        </div>
      ) : (
        /* Documents Table */
        <div className="overflow-hidden rounded-sm border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-zinc-200 bg-zinc-50 text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400">
                <tr>
                  <th scope="col" className="px-6 py-3.5">Document</th>
                  <th scope="col" className="px-6 py-3.5">Type</th>
                  <th scope="col" className="px-6 py-3.5">Course / Unit</th>
                  <th scope="col" className="px-6 py-3.5">Access</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {filteredDocuments.map((doc) => {
                  const Config =
                    TYPE_CONFIG[doc.type] || TYPE_CONFIG.resource;
                  const Icon = Config.icon;
                  const isPublicDoc = !doc.owner;

                  const { courseName, unitName, hasAffiliation } =
                    getCourseUnitSummary(doc);

                  const showResourceAffiliationHint =
                    doc.type === "resource" && hasAffiliation;

                  return (
                    <tr
                      key={doc._id}
                      onClick={() => handleViewDocument(doc._id)}
                      className="group cursor-pointer transition hover:bg-zinc-50 dark:hover:bg-zinc-800/40"
                    >
                      {/* Document name + owner + inline actions */}
                      <td className="px-6 py-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0">
                            <p className="font-medium text-zinc-900 transition group-hover:text-[#082B66] dark:text-white dark:group-hover:text-orange-400">
                              {doc.name}
                            </p>

                            {!isPublicDoc && doc.owner && (
                              <p className="mt-0.5 flex items-center gap-1 text-xs text-zinc-500 dark:text-zinc-400">
                                <UserIcon className="h-3 w-3" />
                                {getOwnerDisplayName(doc.owner, userMap)}
                              </p>
                            )}
                          </div>

                          {/* Inline row actions (replaces the old Actions column) */}
                          <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity duration-150 group-hover:opacity-100 focus-within:opacity-100">
                            <a
                              href={doc.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="rounded-sm p-1.5 text-zinc-500 transition hover:bg-zinc-100 hover:text-[#082B66] dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-orange-400"
                              title="Open link"
                            >
                              <ExternalLink className="h-4 w-4" />
                            </a>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeleteConfirmId(doc._id);
                              }}
                              className="rounded-sm p-1.5 text-red-500 transition hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-900/30 dark:hover:text-red-300"
                              title="Delete document"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </td>

                      {/* Type badge */}
                      <td className="px-6 py-4">
                        <div className="flex flex-col items-start gap-1.5">
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-sm px-2.5 py-1 text-xs font-medium ${Config.badgeClass}`}
                          >
                            <Icon className="h-3.5 w-3.5" />
                            {Config.label}
                          </span>

                          {showResourceAffiliationHint && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-medium uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
                              <Layers className="h-3 w-3" />
                              Affiliated
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Course / Unit context */}
                      <td className="px-6 py-4">
                        {hasAffiliation ? (
                          <div className="flex flex-col gap-0.5">
                            {courseName && (
                              <span className="inline-flex items-center gap-1 text-xs text-zinc-700 dark:text-zinc-300">
                                <GraduationCap className="h-3 w-3 shrink-0 text-zinc-400 dark:text-zinc-500" />
                                <span className="truncate">
                                  <span className="text-zinc-400 dark:text-zinc-500">
                                    Course:
                                  </span>{" "}
                                  {courseName}
                                </span>
                              </span>
                            )}

                            {unitName && (
                              <span className="inline-flex items-center gap-1 text-xs text-zinc-700 dark:text-zinc-300">
                                <Layers className="h-3 w-3 shrink-0 text-zinc-400 dark:text-zinc-500" />
                                <span className="truncate">
                                  <span className="text-zinc-400 dark:text-zinc-500">
                                    Unit:
                                  </span>{" "}
                                  {unitName}
                                </span>
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-zinc-400 dark:text-zinc-500">
                            General Document
                          </span>
                        )}
                      </td>

                      {/* Access */}
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center gap-1 rounded-sm px-2 py-0.5 text-xs font-medium ${
                            isPublicDoc
                              ? "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
                              : "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300"
                          }`}
                        >
                          {isPublicDoc ? (
                            <>
                              <Globe className="h-3 w-3" />
                              Public
                            </>
                          ) : (
                            <>
                              <Lock className="h-3 w-3" />
                              Restricted
                            </>
                          )}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION DIALOG */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-sm border border-zinc-200 bg-white p-6 text-center shadow-xl dark:border-zinc-800 dark:bg-zinc-900">
            <Trash2 className="mx-auto mb-3 h-10 w-10 text-red-500" />

            <h3 className="text-lg font-bold text-zinc-900 dark:text-white">
              Delete Document?
            </h3>

            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              This action cannot be undone. Are you sure you want to
              remove this document?
            </p>

            <div className="mt-6 flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setDeleteConfirmId(null)}
                className="rounded-sm border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={() => handleDelete(deleteConfirmId)}
                className="rounded-sm bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}