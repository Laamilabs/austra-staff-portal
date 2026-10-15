"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  FileText,
  BookOpen,
  Briefcase,
  Building,
  Globe,
  Lock,
  AlertCircle,
  Loader2,
  Save,
  Trash2,
  ExternalLink,
  GraduationCap,
  Layers,
  Info,
  Link2,
} from "lucide-react";

import {
  DocumentType,
  UpdateDocumentDto,
  documentApi,
} from "@/app/types/documents";

import { CloudinaryUpload } from "@/app/components/ui/cloudinary";
import { UserSelect } from "@/app/components/ui/user-select";
import SelectCourse from "@/app/(portal)/courses/selectCourse";
import SelectUnit from "@/app/(portal)/units/selectUnit";
import { Course } from "@/app/types/courses";

const CATEGORY_OPTIONS: {
  type: DocumentType;
  label: string;
  description: string;
  icon: React.ElementType;
}[] = [
  {
    type: "resource",
    label: "Resource",
    description: "General references, templates, and guides for open access.",
    icon: FileText,
  },
  {
    type: "academic",
    label: "Academic",
    description: "Research papers, course materials, and study resources.",
    icon: BookOpen,
  },
  {
    type: "professional",
    label: "Professional",
    description: "Workplace reports, portfolios, resumes, and project docs.",
    icon: Briefcase,
  },
  {
    type: "institutional",
    label: "Institutional",
    description: "Official policies, guidelines, and compliance files.",
    icon: Building,
  },
];

export default function EditDocumentPage() {
  const router = useRouter();
  const params = useParams();

  const documentId = params?.id as string;

  // --------------------------------------------------
  // Fetch State
  // --------------------------------------------------
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // --------------------------------------------------
  // Form State
  // --------------------------------------------------
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [type, setType] = useState<DocumentType>("resource");

  const [isPublic, setIsPublic] = useState(true);
  const [selectedOwner, setSelectedOwner] = useState<string | null>(null);

  // --------------------------------------------------
  // Course / Unit Affiliation State (optional)
  // --------------------------------------------------
  const [showAffiliation, setShowAffiliation] = useState(false);
  const [courseId, setCourseId] = useState<string>("");
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [unitId, setUnitId] = useState<string>("");

  // --------------------------------------------------
  // Submission & Deletion State
  // --------------------------------------------------
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // --------------------------------------------------
  // Load Document Details
  // --------------------------------------------------
  useEffect(() => {
    if (!documentId) return;

    const loadDocument = async () => {
      try {
        setLoading(true);
        setFetchError(null);

        const docRes = await documentApi.getById(documentId);
        const doc = docRes.data;

        setName(doc.name);
        setUrl(doc.url);
        setType(doc.type);

        const ownerId = doc.owner
          ? typeof doc.owner === "string"
            ? doc.owner
            : doc.owner._id ?? doc.owner.id
          : null;

        setIsPublic(!ownerId);
        setSelectedOwner(ownerId);

        // Populated course/unit come back as objects with `_id`.
        // Extract just the IDs to feed the selectors.
        const loadedCourseId = doc.course?._id ?? "";
        const loadedUnitId = doc.unit?._id ?? "";

        setCourseId(loadedCourseId);
        setUnitId(loadedUnitId);

        // Keep a lightweight object for the "Units available for X"
        // hint. SelectCourse still resolves the full course by ID
        // from its own fetched list.
        setSelectedCourse(
          doc.course
            ? ({ _id: doc.course._id, name: doc.course.name } as Course)
            : null
        );

        // Auto-enable the affiliation section if the doc already has
        // a course or unit attached.
        setShowAffiliation(Boolean(loadedCourseId || loadedUnitId));
      } catch (err) {
        console.error("Failed to load document:", err);
        setFetchError("Document not found or failed to load.");
      } finally {
        setLoading(false);
      }
    };

    loadDocument();
  }, [documentId]);

  // --------------------------------------------------
  // Toggle affiliation (also resets selections when off)
  // --------------------------------------------------
  const handleToggleAffiliation = (next: boolean) => {
    setShowAffiliation(next);

    if (!next) {
      setCourseId("");
      setSelectedCourse(null);
      setUnitId("");
    }
  };

  // --------------------------------------------------
  // Submit
  // --------------------------------------------------
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!name.trim()) {
      setFormError("Document name is required.");
      return;
    }

    if (!url.trim()) {
      setFormError("Please upload a document or provide a document URL.");
      return;
    }

    try {
      new URL(url);
    } catch {
      setFormError("Please provide a valid document URL.");
      return;
    }

    if (!isPublic && !selectedOwner) {
      setFormError(
        "Please select a permitted user account or set access to Public."
      );
      return;
    }

    setIsSubmitting(true);

    try {
      const payload: UpdateDocumentDto = {
        name: name.trim(),
        url: url.trim(),
        type,

        // Public documents must explicitly clear the owner.
        // Restricted documents keep the selected owner.
        owner: isPublic ? null : selectedOwner,

        // Affiliation: use null (not undefined) so the backend
        // explicitly clears the field when the toggle is off or
        // the corresponding selector is left empty.
        course: showAffiliation ? courseId || null : null,
        unit: showAffiliation ? unitId || null : null,
      };

      await documentApi.update(documentId, payload);

      router.push("/documents");
      router.refresh();
    } catch (err: any) {
      console.error("Failed to update document:", err);

      const responseMessage = err?.response?.data?.message;

      const message = Array.isArray(responseMessage)
        ? responseMessage.join(", ")
        : responseMessage ||
          "Failed to update document. Please verify your inputs.";

      setFormError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // --------------------------------------------------
  // Delete
  // --------------------------------------------------
  const handleDelete = async () => {
    setIsDeleting(true);

    try {
      await documentApi.delete(documentId);

      router.push("/documents");
      router.refresh();
    } catch (err) {
      console.error("Failed to delete document:", err);
      alert("Failed to delete document. Please try again.");
      setIsDeleting(false);
      setShowDeleteModal(false);
    }
  };

  // --------------------------------------------------
  // Loading
  // --------------------------------------------------
  if (loading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center">
        <Loader2 className="mb-2 h-8 w-8 animate-spin text-[#082B66] dark:text-orange-400" />

        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Loading document details...
        </p>
      </div>
    );
  }

  // --------------------------------------------------
  // Fetch Error
  // --------------------------------------------------
  if (fetchError) {
    return (
      <div className="mx-auto my-12 max-w-2xl space-y-4 p-6 text-center">
        <AlertCircle className="mx-auto h-12 w-12 text-red-500" />

        <h2 className="text-xl font-bold text-zinc-900 dark:text-white">
          {fetchError}
        </h2>

        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          The requested document may have been deleted or you do not have
          permission to access it.
        </p>

        <Link
          href="/documents"
          className="inline-flex items-center gap-2 rounded-sm bg-[#082B66] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#082B66]/90 dark:bg-orange-400 dark:text-zinc-900 dark:hover:bg-orange-400/90"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Documents
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-400 space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link
            href="/documents"
            className="mb-2 inline-flex items-center gap-2 text-sm font-medium text-zinc-500 transition-colors hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Documents
          </Link>

          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">
            Edit Document
          </h1>

          <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
            Update document details, file, category, and access permissions.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {url && (
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-sm bg-zinc-100 px-3 py-2 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-200 dark:bg-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-600"
            >
              Preview File
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}

          <button
            type="button"
            onClick={() => setShowDeleteModal(true)}
            className="inline-flex items-center gap-1.5 rounded-sm bg-red-50 px-3 py-2 text-xs font-medium text-red-600 transition-colors hover:bg-red-100 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete
          </button>
        </div>
      </div>

      {/* Form Error */}
      {formError && (
        <div className="flex items-center gap-3 rounded-sm border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <p>{formError}</p>
        </div>
      )}

      {/* Main Form */}
      <form
        onSubmit={handleSubmit}
        className="space-y-8 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-800 md:p-8"
      >
        {/* Section 1: Document Details */}
        <section className="space-y-4">
          <h2 className="border-b border-zinc-100 pb-2 text-base font-semibold text-zinc-900 dark:border-zinc-700 dark:text-white">
            1. Document Details
          </h2>

          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Document Name <span className="text-red-500">*</span>
              </label>

              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Student Handbook 2026"
                className="w-full rounded-sm border border-zinc-300 bg-zinc-50 px-3.5 py-2.5 text-sm text-zinc-900 outline-none transition focus:border-[#082B66] focus:ring-2 focus:ring-[#082B66] dark:border-zinc-700 dark:bg-zinc-900 dark:text-white dark:placeholder-zinc-500 dark:focus:border-orange-400 dark:focus:ring-orange-400"
              />
            </div>

            <div>
              <CloudinaryUpload
                value={url}
                onChange={(uploadedUrl) => {
                  setUrl(uploadedUrl);
                  setFormError(null);
                }}
                preset="documents"
                label="Document File"
                maxFileSizeMb={10}
              />

              <p className="mt-1.5 text-xs text-zinc-400 dark:text-zinc-500">
                Upload a PDF, Word document, Excel file, or image. You can
                also enter an existing URL directly.
              </p>
            </div>
          </div>
        </section>

        {/* Section 2: Category Type */}
        <section className="space-y-4">
          <h2 className="border-b border-zinc-100 pb-2 text-base font-semibold text-zinc-900 dark:border-zinc-700 dark:text-white">
            2. Category Type
          </h2>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {CATEGORY_OPTIONS.map((category) => {
              const Icon = category.icon;
              const isSelected = type === category.type;

              return (
                <button
                  key={category.type}
                  type="button"
                  onClick={() => setType(category.type)}
                  className={`flex items-start gap-3.5 rounded-sm border p-4 text-left transition-all ${
                    isSelected
                      ? "border-[#082B66] bg-[#082B66]/5 ring-1 ring-[#082B66] dark:border-orange-400 dark:bg-orange-400/10 dark:ring-orange-400"
                      : "border-zinc-200 bg-zinc-50/50 hover:border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900/50 dark:hover:border-zinc-600"
                  }`}
                >
                  <div
                    className={`rounded-sm p-2 ${
                      isSelected
                        ? "bg-[#082B66] text-white dark:bg-orange-400 dark:text-zinc-900"
                        : "bg-zinc-200 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                  </div>

                  <div>
                    <p className="text-sm font-semibold text-zinc-900 dark:text-white">
                      {category.label}
                    </p>

                    <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                      {category.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* Section 3: Access Permissions */}
        <section className="space-y-4">
          <h2 className="border-b border-zinc-100 pb-2 text-base font-semibold text-zinc-900 dark:border-zinc-700 dark:text-white">
            3. Access Permissions
          </h2>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Public Option */}
            <label
              className={`flex cursor-pointer items-start gap-3 rounded-sm border p-4 transition-all ${
                isPublic
                  ? "border-[#082B66] bg-[#082B66]/5 ring-1 ring-[#082B66] dark:border-orange-400 dark:bg-orange-400/10 dark:ring-orange-400"
                  : "border-zinc-200 bg-zinc-50/50 dark:border-zinc-700 dark:bg-zinc-900/50"
              }`}
            >
              <input
                type="radio"
                name="accessType"
                checked={isPublic}
                onChange={() => {
                  // Do not clear selectedOwner here.
                  // This allows Public -> Restricted to restore
                  // the previously selected owner.
                  setIsPublic(true);
                }}
                className="mt-1 accent-[#082B66] dark:accent-orange-400"
              />

              <div>
                <span className="flex items-center gap-1.5 text-sm font-medium text-zinc-900 dark:text-white">
                  <Globe className="h-4 w-4 text-emerald-500" />
                  Public Access
                </span>

                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                  Available to all users in the organization.
                </p>
              </div>
            </label>

            {/* Restricted Option */}
            <label
              className={`flex cursor-pointer items-start gap-3 rounded-sm border p-4 transition-all ${
                !isPublic
                  ? "border-[#082B66] bg-[#082B66]/5 ring-1 ring-[#082B66] dark:border-orange-400 dark:bg-orange-400/10 dark:ring-orange-400"
                  : "border-zinc-200 bg-zinc-50/50 dark:border-zinc-700 dark:bg-zinc-900/50"
              }`}
            >
              <input
                type="radio"
                name="accessType"
                checked={!isPublic}
                onChange={() => setIsPublic(false)}
                className="mt-1 accent-[#082B66] dark:accent-orange-400"
              />

              <div>
                <span className="flex items-center gap-1.5 text-sm font-medium text-zinc-900 dark:text-white">
                  <Lock className="h-4 w-4 text-amber-500" />
                  Restricted Access
                </span>

                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                  Visible only to specifically assigned owner.
                </p>
              </div>
            </label>
          </div>

          {/* Owner Selection Component */}
          {!isPublic && (
            <UserSelect
              selectedUserId={selectedOwner}
              onSelectUser={setSelectedOwner}
            />
          )}
        </section>

        {/* Affiliation toggle (reveals Section 4) */}
        <section className="space-y-4">
          <label
            className={`flex cursor-pointer items-start gap-3 rounded-sm border p-4 transition-all ${
              showAffiliation
                ? "border-[#082B66] bg-[#082B66]/5 ring-1 ring-[#082B66] dark:border-orange-400 dark:bg-orange-400/10 dark:ring-orange-400"
                : "border-zinc-200 bg-zinc-50/50 hover:border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900/50 dark:hover:border-zinc-600"
            }`}
          >
            <input
              type="checkbox"
              checked={showAffiliation}
              onChange={(e) => handleToggleAffiliation(e.target.checked)}
              className="mt-1 h-4 w-4 accent-[#082B66] dark:accent-orange-400"
            />

            <div>
              <span className="flex items-center gap-1.5 text-sm font-medium text-zinc-900 dark:text-white">
                <Link2 className="h-4 w-4 text-[#082B66] dark:text-orange-400" />
                Affiliate this document with a course or unit
              </span>

              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                Optional. Tick to link this document to a course and/or
                unit. Unchecking will remove the affiliation when saved.
              </p>
            </div>
          </label>
        </section>

        {/* Section 4: Course / Unit Affiliation (Optional) — only when toggled */}
        {showAffiliation && (
          <section className="space-y-4">
            <h2 className="border-b border-zinc-100 pb-2 text-base font-semibold text-zinc-900 dark:border-zinc-700 dark:text-white">
              4. Course / Unit Affiliation{" "}
              <span className="text-xs font-normal text-zinc-500 dark:text-zinc-400">
                (Optional)
              </span>
            </h2>

            <div className="flex items-start gap-2 rounded-sm border border-zinc-200 bg-zinc-50/60 p-3 text-xs text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900/40 dark:text-zinc-400">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#082B66] dark:text-orange-400" />
              <p>
                <span className="font-medium text-zinc-700 dark:text-zinc-300">
                  Resources
                </span>{" "}
                are typically tied to courses or units, while{" "}
                <span className="font-medium text-zinc-700 dark:text-zinc-300">
                  academic
                </span>
                ,{" "}
                <span className="font-medium text-zinc-700 dark:text-zinc-300">
                  professional
                </span>
                , and{" "}
                <span className="font-medium text-zinc-700 dark:text-zinc-300">
                  institutional
                </span>{" "}
                documents can remain standalone. You can leave one or both
                fields empty.
              </p>
            </div>

            <div className="grid grid-cols-1 items-start gap-6 md:grid-cols-2">
              {/* Course Selector */}
              <div>
                <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  <span className="inline-flex items-center gap-1.5">
                    <GraduationCap className="h-3.5 w-3.5" />
                    Course
                  </span>
                </label>

                <SelectCourse
                  value={courseId}
                  onChange={(id, course) => {
                    setCourseId(id);
                    setSelectedCourse(course || null);
                    // Unit auto-clears inside SelectUnit when courseId changes.
                  }}
                  placeholder="Select a course (optional)..."
                />

                <p className="mt-1 text-[11px] text-zinc-400 dark:text-zinc-500">
                  Optional — leave empty to affiliate with a unit only.
                </p>
              </div>

              {/* Unit Selector — now powered by SelectUnit */}
              <div>
                <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  <span className="inline-flex items-center gap-1.5">
                    <Layers className="h-3.5 w-3.5" />
                    Unit
                  </span>
                </label>

                <SelectUnit
                  courseId={courseId}
                  value={unitId}
                  onChange={(id) => setUnitId(id)}
                  placeholder="Select a unit (optional)..."
                />

                <p className="mt-1 text-[11px] text-zinc-400 dark:text-zinc-500">
                  {selectedCourse
                    ? `Units available for ${selectedCourse.name}.`
                    : "Units belong to a course — select a course to enable this."}
                </p>
              </div>
            </div>
          </section>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 border-t border-zinc-100 pt-4 dark:border-zinc-700">
          <Link
            href="/documents"
            className="rounded-sm border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-700"
          >
            Cancel
          </Link>

          <button
            type="submit"
            disabled={isSubmitting || !url.trim()}
            className="inline-flex items-center gap-2 rounded-sm bg-[#082B66] px-5 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-[#082B66]/90 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-orange-400 dark:text-zinc-900 dark:hover:bg-orange-400/90"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving Changes...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Save Changes
              </>
            )}
          </button>
        </div>
      </form>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-6 text-center shadow-2xl dark:border-zinc-700 dark:bg-zinc-800">
            <Trash2 className="mx-auto mb-3 h-10 w-10 text-red-500" />

            <h3 className="text-lg font-bold text-zinc-900 dark:text-white">
              Delete Document?
            </h3>

            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              Are you sure you want to permanently delete{" "}
              <strong>{name}</strong>? This action cannot be undone.
            </p>

            <div className="mt-6 flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                disabled={isDeleting}
                className="rounded-sm border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-700"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={isDeleting}
                onClick={handleDelete}
                className="inline-flex items-center gap-1.5 rounded-sm bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {isDeleting && (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}