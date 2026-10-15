"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
  Plus,
  GraduationCap,
  Layers,
  Info,
  Link2,
  CheckCircle2,
  Mail,
} from "lucide-react";

import {
  DocumentType,
  CreateDocumentDto,
  documentApi,
} from "@/app/types/documents";
import { CloudinaryUpload } from "@/app/components/ui/cloudinary";
import { UserSelect } from "@/app/components/ui/user-select";
import SelectCourse from "@/app/(portal)/courses/selectCourse";
import SelectUnit from "@/app/(portal)/units/selectUnit";
import { Course, courseApi } from "@/app/types/courses";
import { User as UserType } from "@/app/lib/types";
import api from "@/app/lib/api";

// Configuration for Document Types with icons & descriptions
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

// ----------------------------------------------------------------------
// Page (Suspense wrapper required for useSearchParams)
// ----------------------------------------------------------------------
export default function CreateDocumentPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[60vh] flex-col items-center justify-center">
          <Loader2 className="mb-2 h-8 w-8 animate-spin text-[#082B66] dark:text-orange-400" />
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Loading...
          </p>
        </div>
      }
    >
      <CreateDocumentForm />
    </Suspense>
  );
}

// ----------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------

function getInitials(user: UserType | null): string {
  if (!user) return "?";
  const name = (user as any)?.name as string | undefined;
  if (!name) return "?";
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

// ----------------------------------------------------------------------
// Form
// ----------------------------------------------------------------------
function CreateDocumentForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Optional locked course from query string (?courseId=...)
  const lockedCourseId = searchParams?.get("courseId") || "";
  const isCourseLocked = Boolean(lockedCourseId);

  // Optional locked owner from query string (?userId=...)
  const lockedUserId = searchParams?.get("userId") || "";
  const isUserLocked = Boolean(lockedUserId);

  // Optional student context from query string (?studentId=...)
  // When present, back / cancel / exit navigation is redirected to
  // the student details page instead of the global documents list.
  const lockedStudentId = searchParams?.get("studentId") || "";
  const isStudentLocked = Boolean(lockedStudentId);

  // Form State
  const [name, setName] = useState<string>("");
  const [url, setUrl] = useState<string>("");
  const [type, setType] = useState<DocumentType>("resource");

  // When a user is locked via query string, the document is
  // implicitly restricted and pre-assigned to that user.
  const [isPublic, setIsPublic] = useState<boolean>(!isUserLocked);
  const [selectedOwner, setSelectedOwner] = useState<string | null>(
    isUserLocked ? lockedUserId : null,
  );
  const [lockedUser, setLockedUser] = useState<UserType | null>(null);

  // Course / Unit affiliation state (optional)
  const [showAffiliation, setShowAffiliation] = useState<boolean>(
    isCourseLocked,
  );
  const [courseId, setCourseId] = useState<string>(lockedCourseId);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [unitId, setUnitId] = useState<string>("");

  // UI States
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // --------------------------------------------------------------------
  // Where do back / cancel / exit navigate?
  //
  // Priority:
  //   1. Student context  -> /students/[id]
  //   2. Course context   -> /courses/[courseId]
  //   3. Default          -> /documents
  // --------------------------------------------------------------------
  const backHref = isStudentLocked
    ? `/students/${lockedStudentId}`
    : isCourseLocked
      ? `/courses/${lockedCourseId}`
      : "/documents";

  const backLabel = isStudentLocked
    ? "Back to Student"
    : isCourseLocked
      ? "Back to Course"
      : "Back to Documents";

  const cancelHref = backHref;

  // --------------------------------------------------------------------
  // If a course ID is locked in, fetch its details for display
  // --------------------------------------------------------------------
  useEffect(() => {
    if (!isCourseLocked) return;

    let cancelled = false;

    const loadLockedCourse = async () => {
      try {
        const res = await courseApi.getById(lockedCourseId);
        if (!cancelled) setSelectedCourse(res.data);
      } catch (err) {
        console.error("Failed to load locked course:", err);
      }
    };

    loadLockedCourse();

    return () => {
      cancelled = true;
    };
  }, [isCourseLocked, lockedCourseId]);

  // --------------------------------------------------------------------
  // If a user ID is locked in, fetch the user details for display
  // --------------------------------------------------------------------
  useEffect(() => {
    if (!isUserLocked) return;

    let cancelled = false;

    const loadLockedUser = async () => {
      try {
        const res = await api.get<UserType>(`/users/${lockedUserId}`);
        if (!cancelled) setLockedUser(res.data);
      } catch (err) {
        console.error("Failed to load locked user:", err);
      }
    };

    loadLockedUser();

    return () => {
      cancelled = true;
    };
  }, [isUserLocked, lockedUserId]);

  // --------------------------------------------------------------------
  // Toggle affiliation (only used when course is NOT locked)
  // --------------------------------------------------------------------
  const handleToggleAffiliation = (next: boolean) => {
    if (isCourseLocked) return;

    setShowAffiliation(next);

    if (!next) {
      setCourseId("");
      setSelectedCourse(null);
      setUnitId("");
    }
  };

  // --------------------------------------------------------------------
  // Reset per-document fields (keeps course affiliation & locked owner)
  // --------------------------------------------------------------------
  const resetForAnother = () => {
    setName("");
    setUrl("");
    setType("resource");
    if (!isUserLocked) {
      setIsPublic(true);
      setSelectedOwner(null);
    }
    setUnitId("");
    setError(null);
  };

  // --------------------------------------------------------------------
  // Submit Handler
  //   mode: "exit"    -> navigate away
  //   mode: "another" -> reset per-document fields, stay on page
  // --------------------------------------------------------------------
  const handleSubmit = async (
    e: React.FormEvent,
    mode: "exit" | "another",
  ) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (!name.trim()) {
      setError("Document name is required.");
      return;
    }

    if (!url.trim()) {
      setError("Document file or URL is required.");
      return;
    }

    try {
      new URL(url);
    } catch {
      setError(
        "Please enter a valid URL (e.g., https://example.com/file.pdf).",
      );
      return;
    }

    if (!isUserLocked && !isPublic && !selectedOwner) {
      setError(
        "Please select a user for restricted access, or make the document public.",
      );
      return;
    }

    // If course is locked, affiliation is mandatory
    const effectiveCourseId = isCourseLocked ? lockedCourseId : courseId;

    // If user is locked, the owner is forced regardless of public/restricted
    const effectiveOwner = isUserLocked
      ? lockedUserId
      : isPublic
        ? undefined
        : selectedOwner || undefined;

    setIsSubmitting(true);

    try {
      const payload: CreateDocumentDto = {
        name: name.trim(),
        url: url.trim(),
        type,
        owner: effectiveOwner,
        course:
          isCourseLocked || showAffiliation
            ? effectiveCourseId || undefined
            : undefined,
        unit:
          isCourseLocked || showAffiliation
            ? unitId || undefined
            : undefined,
      };

      await documentApi.create(payload);

      if (mode === "another") {
        const displayName = name.trim();
        resetForAnother();
        setSuccessMessage(`"${displayName}" created. Add another below.`);
        if (typeof window !== "undefined") {
          window.scrollTo({ top: 0, behavior: "smooth" });
        }
      } else {
        // Exit: navigate using the same priority as backHref
        router.push(backHref);
        router.refresh();
      }
    } catch (err: any) {
      console.error("Failed to create document:", err);
      const responseMessage = err?.response?.data?.message;
      const message = Array.isArray(responseMessage)
        ? responseMessage.join(", ")
        : responseMessage ||
        "Failed to create document. Please check your inputs.";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-400 space-y-6 p-6">
      {/* Top Header & Navigation */}
      <div>
        <Link
          href={backHref}
          className="mb-3 inline-flex items-center gap-2 text-sm font-medium text-zinc-500 transition-colors hover:text-[#082B66] dark:text-zinc-400 dark:hover:text-orange-400"
        >
          <ArrowLeft className="h-4 w-4" />
          {backLabel}
        </Link>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">
          Add New Document
        </h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          {isStudentLocked
            ? "Add a document that will be assigned to this student."
            : isCourseLocked
              ? "Add a document that will be affiliated with this course."
              : "Upload or link a document and configure access permissions."}
        </p>
      </div>

      {/* Success Alert (shown after "Create & Add Another") */}
      {successMessage && (
        <div className="flex items-center gap-3 rounded-sm border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/20 dark:text-emerald-300">
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          <p>{successMessage}</p>
        </div>
      )}

      {/* Error Alert */}
      {error && (
        <div className="flex items-center gap-3 rounded-sm border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/20 dark:text-red-300">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {/* Form Card */}
      <form
        onSubmit={(e) => handleSubmit(e, "exit")}
        className="space-y-8 rounded-sm border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900 md:p-8"
      >
        {/* Section 1: Basic Information */}
        <div className="space-y-4">
          <h2 className="border-b border-zinc-100 pb-2 text-base font-semibold text-zinc-900 dark:border-zinc-800 dark:text-white">
            1. Basic Information
          </h2>

          <div className="grid grid-cols-1 items-start gap-6 md:grid-cols-2">
            {/* Document Title */}
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Document Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Annual Strategy Report 2026"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-sm border border-zinc-200 bg-zinc-50 px-3.5 py-2.5 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-[#082B66] focus:ring-2 focus:ring-[#082B66]/10 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white dark:focus:border-orange-400 dark:focus:ring-orange-400/10"
              />
            </div>

            {/* Document Upload Component */}
            <div>
              <CloudinaryUpload
                value={url}
                onChange={(uploadedUrl) => setUrl(uploadedUrl)}
                preset="documents"
                label="Document File"
                maxFileSizeMb={20}
              />
            </div>
          </div>
        </div>

        {/* Section 2: Document Category */}
        <div className="space-y-4">
          <h2 className="border-b border-zinc-100 pb-2 text-base font-semibold text-zinc-900 dark:border-zinc-800 dark:text-white">
            2. Category Type
          </h2>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {CATEGORY_OPTIONS.map((cat) => {
              const Icon = cat.icon;
              const isSelected = type === cat.type;
              return (
                <div
                  key={cat.type}
                  onClick={() => setType(cat.type)}
                  className={`flex cursor-pointer items-start gap-3.5 rounded-sm border p-4 transition-all ${isSelected
                      ? "border-[#082B66] bg-[#082B66]/5 ring-1 ring-[#082B66] dark:border-orange-400 dark:bg-orange-400/10 dark:ring-orange-400"
                      : "border-zinc-200 bg-zinc-50/50 hover:border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900/50 dark:hover:border-zinc-600"
                    }`}
                >
                  <div
                    className={`rounded-sm p-2 ${isSelected
                        ? "bg-[#082B66] text-white dark:bg-orange-400 dark:text-zinc-950"
                        : "bg-zinc-200 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
                      }`}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-zinc-900 dark:text-white">
                      {cat.label}
                    </p>
                    <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                      {cat.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Section 3: Visibility & Permissions */}
        <div className="space-y-4">
          <h2 className="border-b border-zinc-100 pb-2 text-base font-semibold text-zinc-900 dark:border-zinc-800 dark:text-white">
            3. Access Permissions
          </h2>

          {isUserLocked ? (
            /* Locked owner — read-only, no choosing */
            <div className="rounded-sm border border-amber-200 bg-amber-50/60 p-4 dark:border-amber-900/50 dark:bg-amber-950/20">
              <div className="flex items-start gap-3">
                <Lock className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />

                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-amber-900 dark:text-amber-200">
                    Restricted — assigned owner
                  </p>
                  <p className="mt-1 text-xs leading-5 text-amber-800/80 dark:text-amber-300/80">
                    This document will be created with restricted access
                    and assigned to the user below. The owner cannot be
                    changed from this page.
                  </p>

                  {/* Locked user card */}
                  <div className="mt-3 flex items-center gap-3 rounded-sm border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900">
                    {lockedUser?.profileImage ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={lockedUser.profileImage}
                        alt={lockedUser.name || "Assigned user"}
                        className="h-10 w-10 shrink-0 rounded-full object-cover"
                      />
                    ) : (
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#082B66] text-sm font-semibold text-white dark:bg-orange-400 dark:text-zinc-950">
                        {getInitials(lockedUser)}
                      </div>
                    )}

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-zinc-900 dark:text-white">
                        {lockedUser?.name || "Loading user..."}
                      </p>

                      {lockedUser?.email ? (
                        <p className="mt-0.5 inline-flex items-center gap-1 truncate text-xs text-zinc-500 dark:text-zinc-400">
                          <Mail className="h-3 w-3 shrink-0" />
                          {lockedUser.email}
                        </p>
                      ) : (
                        <p className="mt-0.5 truncate font-mono text-xs text-zinc-400 dark:text-zinc-500">
                          {lockedUserId}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {/* Public Option */}
                <label
                  className={`flex cursor-pointer items-start gap-3 rounded-sm border p-4 transition-all ${isPublic
                      ? "border-[#082B66] bg-[#082B66]/5 ring-1 ring-[#082B66] dark:border-orange-400 dark:bg-orange-400/10 dark:ring-orange-400"
                      : "border-zinc-200 bg-zinc-50/50 dark:border-zinc-700 dark:bg-zinc-900/50"
                    }`}
                >
                  <input
                    type="radio"
                    name="accessType"
                    checked={isPublic}
                    onChange={() => {
                      setIsPublic(true);
                      setSelectedOwner(null);
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
                  className={`flex cursor-pointer items-start gap-3 rounded-sm border p-4 transition-all ${!isPublic
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
                      Visible only to a specifically assigned user account.
                    </p>
                  </div>
                </label>
              </div>

              {/* User Selection Component (If Restricted) */}
              {!isPublic && (
                <div className="mt-4">
                  <UserSelect
                    selectedUserId={selectedOwner}
                    onSelectUser={(userId) => setSelectedOwner(userId)}
                    label="Select Assigned Owner"
                  />
                </div>
              )}
            </>
          )}
        </div>

        {/* Affiliation toggle (hidden when course is locked) */}
        {!isCourseLocked && (
          <div className="space-y-4">
            <label
              className={`flex cursor-pointer items-start gap-3 rounded-sm border p-4 transition-all ${showAffiliation
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
                  unit. Leave unchecked for a general document.
                </p>
              </div>
            </label>
          </div>
        )}

        {/* Section 4: Course / Unit Affiliation */}
        {(showAffiliation || isCourseLocked) && (
          <div className="space-y-4">
            <h2 className="border-b border-zinc-100 pb-2 text-base font-semibold text-zinc-900 dark:border-zinc-800 dark:text-white">
              4. Course / Unit Affiliation{" "}
              {!isCourseLocked && (
                <span className="text-xs font-normal text-zinc-500 dark:text-zinc-400">
                  (Optional)
                </span>
              )}
            </h2>

            <div className="flex items-start gap-2 rounded-sm border border-zinc-200 bg-zinc-50/60 p-3 text-xs text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900/40 dark:text-zinc-400">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#082B66] dark:text-orange-400" />
              {isCourseLocked ? (
                <p>
                  This document will be linked to the course below. You
                  may optionally choose a specific unit within that course.
                </p>
              ) : (
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
              )}
            </div>

            <div className="grid grid-cols-1 items-start gap-6 md:grid-cols-2">
              {/* Course — read-only when locked, selector otherwise */}
              <div>
                <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  <span className="inline-flex items-center gap-1.5">
                    <GraduationCap className="h-3.5 w-3.5" />
                    Course
                  </span>
                </label>

                {isCourseLocked ? (
                  <div className="flex items-center gap-2 rounded-sm border border-zinc-200 bg-zinc-100 px-3.5 py-2.5 text-sm text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200">
                    <Lock className="h-3.5 w-3.5 text-zinc-400 dark:text-zinc-500" />
                    <span className="truncate">
                      {selectedCourse?.name || "Loading course..."}
                    </span>
                  </div>
                ) : (
                  <SelectCourse
                    value={courseId}
                    onChange={(id, course) => {
                      setCourseId(id);
                      setSelectedCourse(course || null);
                    }}
                    placeholder="Select a course (optional)..."
                  />
                )}

                <p className="mt-1 text-[11px] text-zinc-400 dark:text-zinc-500">
                  {isCourseLocked
                    ? "Locked to this course."
                    : "Optional — leave empty to affiliate with a unit only."}
                </p>
              </div>

              {/* Unit Selector */}
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
          </div>
        )}

        {/* Submit Actions */}
        <div className="flex flex-col-reverse items-stretch gap-3 border-t border-zinc-100 pt-4 dark:border-zinc-800 sm:flex-row sm:items-center sm:justify-end">
          <Link
            href={cancelHref}
            className="rounded-sm border border-zinc-300 px-4 py-2 text-center text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-700"
          >
            Cancel
          </Link>

          <button
            type="button"
            disabled={isSubmitting}
            onClick={(e) => handleSubmit(e, "another")}
            className="inline-flex items-center justify-center gap-2 rounded-sm border border-[#082B66] bg-white px-5 py-2 text-sm font-medium text-[#082B66] transition-colors hover:bg-[#082B66]/5 disabled:opacity-50 dark:border-orange-400 dark:bg-transparent dark:text-orange-400 dark:hover:bg-orange-400/10"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Plus className="h-4 w-4" />
                Create &amp; Add Another
              </>
            )}
          </button>

          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center justify-center gap-2 rounded-sm bg-[#082B66] px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-[#082B66]/90 disabled:opacity-50 dark:bg-orange-400 dark:text-zinc-950 dark:hover:bg-orange-300"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Plus className="h-4 w-4" />
                Create &amp; Exit
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}