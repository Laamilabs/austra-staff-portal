"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, BookOpen, Loader2, Save } from "lucide-react";

import {
  courseApi,
  type CreateCourseDto,
} from "../../../types/courses";

import {
  departmentApi,
  type Department,
} from "../../../types/department";

import RichTextEditor from "./RichTextEditor";

const LEVELS = [
  "Certificate",
  "Diploma",
  "Degree",
  "Short Course",
  "Professional",
];

interface FieldProps {
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}

function Field({
  label,
  required = false,
  hint,
  children,
  className = "",
}: FieldProps) {
  return (
    <div className={className}>
      <label className="mb-2 block text-[13px] font-semibold text-[#0B1E3D] dark:text-zinc-100">
        {label}
        {required && <span className="ml-1 text-orange-500 dark:text-orange-400">*</span>}
      </label>
      {children}
      {hint && (
        <p className="mt-1.5 text-[11px] leading-5 text-zinc-400">{hint}</p>
      )}
    </div>
  );
}

const inputClass = `
  h-11 w-full rounded-sm border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/50
  px-3.5 text-sm text-[#0B1E3D] dark:text-zinc-100
  placeholder:text-zinc-400
  transition-colors
  focus:border-[#0B1E3D] dark:focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-[#0B1E3D]/10 dark:focus:ring-orange-400/10
  disabled:cursor-not-allowed disabled:bg-zinc-50 dark:disabled:bg-zinc-900 disabled:text-zinc-400
`;

export default function CourseForm() {
  const router = useRouter();

  const [departments, setDepartments] = useState<Department[]>([]);
  const [isLoadingDepartments, setIsLoadingDepartments] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [form, setForm] = useState<CreateCourseDto>({
    courseCode: "",
    department: "",
    description: "",
    duration: "",
    featured: false,
    level: "",
    name: "",
    prerequisites: "",
  });

  useEffect(() => {
    let cancelled = false;

    const loadDepartments = async () => {
      try {
        setIsLoadingDepartments(true);
        setError("");

        const response = await departmentApi.getAll();
        if (!cancelled) setDepartments(response.data);
      } catch (err) {
        console.error("Failed to load departments:", err);
        if (!cancelled) {
          setError(
            "Unable to load departments. Please refresh the page and try again.",
          );
        }
      } finally {
        if (!cancelled) setIsLoadingDepartments(false);
      }
    };

    loadDepartments();
    return () => {
      cancelled = true;
    };
  }, []);

  const updateField = <K extends keyof CreateCourseDto>(
    field: K,
    value: CreateCourseDto[K],
  ) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (
      !form.courseCode.trim() ||
      !form.name.trim() ||
      !form.department ||
      !form.description.trim() ||
      !form.duration.trim() ||
      !form.level ||
      !form.prerequisites.trim()
    ) {
      setError("Please complete all required fields before submitting.");
      return;
    }

    try {
      setIsSubmitting(true);

      const payload: CreateCourseDto = {
        courseCode: form.courseCode.trim(),
        department: form.department,
        description: form.description.trim(),
        duration: form.duration.trim(),
        featured: Boolean(form.featured),
        level: form.level,
        name: form.name.trim(),
        prerequisites: form.prerequisites.trim(),
      };

      const response = await courseApi.create(payload);
      setSuccess("Course created successfully.");

      setTimeout(() => {
        router.push(`/courses/${response.data._id}`);
      }, 700);
    } catch (err: any) {
      console.error("Failed to create course:", err);
      const message = err?.response?.data?.message;

      if (Array.isArray(message)) setError(message.join(" "));
      else if (typeof message === "string") setError(message);
      else
        setError(
          "Unable to create the course. Please check your information and try again.",
        );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="py-6 sm:px-6 lg:px-8 lg:py-8">
      <div className="mx-auto max-w-400">
        {/* Back */}
        <Link
          href="/courses"
          className="inline-flex items-center gap-2 text-sm font-medium text-zinc-400 transition-colors hover:text-[#0B1E3D] dark:hover:text-white"
        >
          <ArrowLeft size={16} />
          Back to courses
        </Link>

        {/* Header */}
        <div className="mt-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-sm bg-[#0B1E3D] text-white dark:bg-orange-400 dark:text-[#0B1E3D]">
            <BookOpen size={22} />
          </div>

          <p className="mt-5 text-[10px] font-bold uppercase tracking-[0.18em] text-orange-500 dark:text-orange-400">
            Course Management
          </p>

          <h1 className="mt-2 text-2xl font-bold tracking-tight text-[#0B1E3D] dark:text-white sm:text-3xl">
            Add New Course
          </h1>

          <p className="mt-2 text-sm text-zinc-400 sm:text-base">
            Create a new course and assign it to a department.
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="mt-6 rounded-sm border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/20 px-4 py-3">
            <p className="text-sm font-medium text-red-700 dark:text-red-400">{error}</p>
          </div>
        )}

        {/* Success */}
        {success && (
          <div className="mt-6 rounded-sm border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50 dark:bg-emerald-950/20 px-4 py-3">
            <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">{success}</p>
          </div>
        )}

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="mt-8 overflow-hidden rounded-sm border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm"
        >
          {/* Basic information */}
          <section className="border-b border-zinc-200 dark:border-zinc-800 p-5 sm:p-6">
            <div>
              <h2 className="text-base font-semibold text-[#0B1E3D] dark:text-white">
                Basic Information
              </h2>
              <p className="mt-1 text-sm text-zinc-400">
                Enter the basic details of the course.
              </p>
            </div>

            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              <Field label="Course Name" required className="sm:col-span-2">
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => updateField("name", e.target.value)}
                  placeholder="e.g. Nursing Aide"
                  className={inputClass}
                  required
                />
              </Field>

              <Field label="Course Code" required>
                <input
                  type="text"
                  value={form.courseCode}
                  onChange={(e) => updateField("courseCode", e.target.value)}
                  placeholder="e.g. NA-001"
                  className={`${inputClass} uppercase`}
                  required
                />
              </Field>

              <Field label="Department" required>
                <select
                  value={form.department}
                  onChange={(e) => updateField("department", e.target.value)}
                  disabled={isLoadingDepartments}
                  className={inputClass}
                  required
                >
                  <option value="">
                    {isLoadingDepartments
                      ? "Loading departments..."
                      : departments.length === 0
                        ? "No departments available"
                        : "Select department"}
                  </option>

                  {departments.map((department) => (
                    <option key={department._id} value={department._id}>
                      {department.name}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Level" required>
                <select
                  value={form.level}
                  onChange={(e) => updateField("level", e.target.value)}
                  className={inputClass}
                  required
                >
                  <option value="">Select course level</option>
                  {LEVELS.map((level) => (
                    <option key={level} value={level}>
                      {level}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Duration" required>
                <input
                  type="text"
                  value={form.duration}
                  onChange={(e) => updateField("duration", e.target.value)}
                  placeholder="e.g. 4 Weeks"
                  className={inputClass}
                  required
                />
              </Field>
            </div>
          </section>

          {/* Details */}
          <section className="border-b border-zinc-200 dark:border-zinc-800 p-5 sm:p-6">
            <div>
              <h2 className="text-base font-semibold text-[#0B1E3D] dark:text-white">
                Course Details
              </h2>
              <p className="mt-1 text-sm text-zinc-400">
                Provide information students should know before enrolling.
              </p>
            </div>

            <div className="mt-6 space-y-5">
              <Field
                label="Description"
                required
                hint="Write the description in HTML. The preview matches how it will appear on the course page."
              >
                <RichTextEditor
                  value={form.description}
                  onChange={(value) => updateField("description", value)}
                  disabled={isSubmitting}
                />
              </Field>

              <Field
                label="Prerequisites"
                required
                hint="Plain text. e.g. KCSE certificate or equivalent qualification"
              >
                <textarea
                  value={form.prerequisites}
                  onChange={(e) =>
                    updateField("prerequisites", e.target.value)
                  }
                  placeholder="e.g. KCSE certificate or equivalent qualification"
                  rows={4}
                  className={`${inputClass} h-auto resize-y py-3`}
                  required
                />
              </Field>
            </div>
          </section>

          {/* Featured */}
          <section className="p-5 sm:p-6">
            <div>
              <h2 className="text-base font-semibold text-[#0B1E3D] dark:text-white">
                Course Visibility
              </h2>
              <p className="mt-1 text-sm text-zinc-400">
                Choose whether this course should be highlighted as a featured
                course.
              </p>
            </div>

            <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-sm border border-zinc-200 dark:border-zinc-700 p-4 transition hover:border-[#0B1E3D]/30 dark:hover:border-orange-400/40 hover:bg-zinc-50 dark:hover:bg-zinc-800/40">
              <input
                type="checkbox"
                checked={Boolean(form.featured)}
                onChange={(e) => updateField("featured", e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded-sm border-zinc-300 dark:border-zinc-600 text-[#0B1E3D] dark:text-orange-400 focus:ring-[#0B1E3D] dark:focus:ring-orange-400"
              />

              <span>
                <span className="block text-sm font-semibold text-[#0B1E3D] dark:text-zinc-100">
                  Featured course
                </span>
                <span className="mt-1 block text-xs leading-5 text-zinc-400">
                  Mark this course as featured so it can receive additional
                  visibility where featured courses are displayed.
                </span>
              </span>
            </label>
          </section>

          {/* Actions */}
          <div className="flex flex-col-reverse gap-3 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/60 px-5 py-4 sm:flex-row sm:items-center sm:justify-end sm:px-6">
            <Link
              href="/courses"
              className="inline-flex h-11 items-center justify-center rounded-sm border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-5 text-sm font-semibold text-zinc-500 dark:text-zinc-300 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800 hover:text-[#0B1E3D] dark:hover:text-white"
            >
              Cancel
            </Link>

            <button
              type="submit"
              disabled={
                isSubmitting ||
                isLoadingDepartments ||
                departments.length === 0
              }
              className="inline-flex h-11 items-center justify-center gap-2 rounded-sm bg-[#0B1E3D] px-5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#10294d] disabled:cursor-not-allowed disabled:opacity-60 dark:bg-orange-400 dark:text-[#0B1E3D] dark:hover:bg-orange-300"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={17} className="animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Save size={17} />
                  Create Course
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}