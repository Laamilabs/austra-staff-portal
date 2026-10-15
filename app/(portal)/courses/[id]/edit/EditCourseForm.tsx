"use client";

import { FormEvent, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
    AlertCircle,
    ArrowLeft,
    BookOpen,
    Check,
    Loader2,
    Save,
} from "lucide-react";

import { Course, Department, courseApi } from "@/app/types/courses";
import { departmentApi } from "@/app/types/department";
import RichTextEditor from "../../new/RichTextEditor";


interface CourseForm {
    courseCode: string;
    department: string;
    description: string;
    duration: string;
    featured: boolean;
    level: string;
    name: string;
    prerequisites: string;
}

const initialForm: CourseForm = {
    courseCode: "",
    department: "",
    description: "",
    duration: "",
    featured: false,
    level: "",
    name: "",
    prerequisites: "",
};

const LEVELS = [
    "Certificate",
    "Diploma",
    "Degree",
    "Short Course",
    "Professional",
];

const inputClass = `
  h-11 w-full rounded-sm border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/50
  px-3.5 text-sm text-[#0B1E3D] dark:text-zinc-100
  placeholder:text-zinc-400
  transition-colors
  focus:border-[#0B1E3D] dark:focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-[#0B1E3D]/10 dark:focus:ring-orange-400/10
  disabled:cursor-not-allowed disabled:bg-zinc-50 dark:disabled:bg-zinc-900 disabled:text-zinc-400
`;

function FormField({
    label,
    htmlFor,
    required = false,
    hint,
    children,
    className = "",
}: {
    label: string;
    htmlFor: string;
    required?: boolean;
    hint?: string;
    children: React.ReactNode;
    className?: string;
}) {
    return (
        <div className={className}>
            <label
                htmlFor={htmlFor}
                className="mb-2 block text-[13px] font-semibold text-[#0B1E3D] dark:text-zinc-100"
            >
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

export default function EditCourseForm() {
    const params = useParams();
    const router = useRouter();

    const id = Array.isArray(params.id) ? params.id[0] : params.id;

    const [course, setCourse] = useState<Course | null>(null);
    const [departments, setDepartments] = useState<Department[]>([]);
    const [form, setForm] = useState<CourseForm>(initialForm);

    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    useEffect(() => {
        if (!id) return;
        let cancelled = false;

        const loadData = async () => {
            try {
                setIsLoading(true);
                setError("");

                const [courseResponse, departmentsResponse] = await Promise.all([
                    courseApi.getById(id),
                    departmentApi.getAll(),
                ]);

                if (cancelled) return;

                const loadedCourse = courseResponse.data;

                setCourse(loadedCourse);
                setDepartments(departmentsResponse.data);

                setForm({
                    courseCode: loadedCourse.courseCode ?? "",
                    department: loadedCourse.department?._id ?? "",
                    description: loadedCourse.description ?? "",
                    duration: loadedCourse.duration ?? "",
                    featured: Boolean(loadedCourse.featured),
                    level: loadedCourse.level ?? "",
                    name: loadedCourse.name ?? "",
                    prerequisites: loadedCourse.prerequisites ?? "",
                });
            } catch (err: any) {
                console.error("Failed to load course:", err);
                if (cancelled) return;

                setError(
                    err?.response?.data?.message ||
                    err?.message ||
                    "Failed to load course.",
                );
            } finally {
                if (!cancelled) setIsLoading(false);
            }
        };

        loadData();
        return () => {
            cancelled = true;
        };
    }, [id]);

    const updateField = <K extends keyof CourseForm>(
        field: K,
        value: CourseForm[K],
    ) => {
        setForm((previous) => ({ ...previous, [field]: value }));
        if (error) setError("");
        if (success) setSuccess("");
    };

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (!id) {
            setError("Course ID is missing.");
            return;
        }

        if (
            !form.name.trim() ||
            !form.courseCode.trim() ||
            !form.department ||
            !form.description.trim() ||
            !form.duration.trim() ||
            !form.level ||
            !form.prerequisites.trim()
        ) {
            setError("Please complete all required fields before saving.");
            return;
        }

        try {
            setIsSaving(true);
            setError("");
            setSuccess("");

            const payload = {
                courseCode: form.courseCode.trim(),
                department: form.department,
                description: form.description.trim(),
                duration: form.duration.trim(),
                featured: form.featured,
                level: form.level.trim(),
                name: form.name.trim(),
                prerequisites: form.prerequisites.trim(),
            };

            await courseApi.update(id, payload);

            setSuccess("Course updated successfully.");

            setTimeout(() => {
                router.push(`/courses/${id}`);
            }, 1000);
        } catch (err: any) {
            console.error("Failed to update course:", err);
            setError(
                err?.response?.data?.message ||
                err?.message ||
                "Failed to update course.",
            );
        } finally {
            setIsSaving(false);
        }
    };

    /* ---------- Loading skeleton ---------- */
    if (isLoading) {
        return (
            <main className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
                <div className="mx-auto max-w-400 px-4 py-8 ">
                    <div className="animate-pulse space-y-6">
                        <div className="h-8 w-48 rounded-sm bg-zinc-200 dark:bg-zinc-800" />
                        <div className="h-4 w-72 rounded-sm bg-zinc-200 dark:bg-zinc-800" />

                        <div className="rounded-sm border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6">
                            <div className="space-y-6">
                                <div className="h-10 rounded-sm bg-zinc-50 dark:bg-zinc-800/60" />
                                <div className="h-10 rounded-sm bg-zinc-50 dark:bg-zinc-800/60" />
                                <div className="h-32 rounded-sm bg-zinc-50 dark:bg-zinc-800/60" />
                                <div className="h-10 rounded-sm bg-zinc-50 dark:bg-zinc-800/60" />
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        );
    }

    /* ---------- Load error ---------- */
    if (error && !course) {
        return (
            <main className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
                <div className="mx-auto max-w-400 px-4 py-8 sm:px-6 lg:px-8">
                    <Link
                        href="/courses"
                        className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-zinc-400 transition-colors hover:text-[#0B1E3D] dark:hover:text-white"
                    >
                        <ArrowLeft size={16} />
                        Back to Courses
                    </Link>

                    <div className="rounded-sm border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/20 p-6">
                        <div className="flex items-start gap-3">
                            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600 dark:text-red-400" />

                            <div>
                                <h1 className="font-semibold text-red-900 dark:text-red-300">
                                    Unable to load course
                                </h1>
                                <p className="mt-1 text-sm text-red-700 dark:text-red-400">{error}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        );
    }

    /* ---------- Not found ---------- */
    if (!course) {
        return (
            <main className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
                <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
                    <div className="rounded-sm border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-8 text-center">
                        <BookOpen className="mx-auto h-10 w-10 text-zinc-400" />

                        <h1 className="mt-4 text-lg font-semibold text-[#0B1E3D] dark:text-white">
                            Course not found
                        </h1>

                        <p className="mt-2 text-sm text-zinc-400">
                            The course you are trying to edit could not be found.
                        </p>

                        <Link
                            href="/courses"
                            className="mt-6 inline-flex items-center gap-2 rounded-sm bg-[#0B1E3D] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#10294d] dark:bg-orange-400 dark:text-[#0B1E3D] dark:hover:bg-orange-300"
                        >
                            <ArrowLeft size={16} />
                            Back to Courses
                        </Link>
                    </div>
                </div>
            </main>
        );
    }

    /* ---------- Form ---------- */
    return (
        <main className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
            <div className="mx-auto max-w-400 px-4 py-8 sm:px-6 lg:px-8">
                {/* Header */}
                <div className="mb-8">
                    <Link
                        href={`/courses/${id}`}
                        className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-zinc-400 transition-colors hover:text-[#0B1E3D] dark:hover:text-white"
                    >
                        <ArrowLeft size={16} />
                        Back to Course
                    </Link>

                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                            <div className="mb-3 inline-flex items-center gap-2 rounded-sm bg-[#0B1E3D]/5 dark:bg-orange-400/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.15em] text-[#0B1E3D] dark:text-orange-400">
                                <BookOpen size={12} />
                                Admin Portal
                            </div>

                            <h1 className="text-2xl font-bold tracking-tight text-[#0B1E3D] dark:text-white sm:text-3xl">
                                Edit Course
                            </h1>

                            <p className="mt-2 text-sm text-zinc-400">
                                Update the course information and settings.
                            </p>
                        </div>

                        <div className="rounded-sm border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 py-3">
                            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-zinc-400">
                                Course
                            </p>
                            <p className="mt-1 text-sm font-semibold text-[#0B1E3D] dark:text-white">
                                {course.courseCode}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Alerts */}
                {error && (
                    <div className="mb-6 rounded-sm border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/20 p-4">
                        <div className="flex items-start gap-3">
                            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600 dark:text-red-400" />
                            <div>
                                <p className="text-sm font-semibold text-red-900 dark:text-red-300">
                                    Update failed
                                </p>
                                <p className="mt-1 text-sm text-red-700 dark:text-red-400">{error}</p>
                            </div>
                        </div>
                    </div>
                )}

                {success && (
                    <div className="mb-6 rounded-sm border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50 dark:bg-emerald-950/20 p-4">
                        <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded-sm bg-emerald-100 dark:bg-emerald-900/40">
                                <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-300">
                                    Success
                                </p>
                                <p className="mt-1 text-sm text-emerald-700 dark:text-emerald-400/80">{success}</p>
                            </div>
                        </div>
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    <div className="space-y-6">
                        {/* Basic Information */}
                        <section className="overflow-hidden rounded-sm border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm">
                            <div className="border-b border-zinc-200 dark:border-zinc-800 px-6 py-5">
                                <h2 className="text-base font-semibold text-[#0B1E3D] dark:text-white">
                                    Basic Information
                                </h2>
                                <p className="mt-1 text-sm text-zinc-400">
                                    Core information about the course.
                                </p>
                            </div>

                            <div className="grid gap-6 p-6 md:grid-cols-2">
                                <FormField label="Course Name" required htmlFor="name">
                                    <input
                                        id="name"
                                        type="text"
                                        value={form.name}
                                        onChange={(e) => updateField("name", e.target.value)}
                                        placeholder="e.g. Computer Packages"
                                        className={inputClass}
                                        required
                                    />
                                </FormField>

                                <FormField
                                    label="Course Code"
                                    required
                                    htmlFor="courseCode"
                                >
                                    <input
                                        id="courseCode"
                                        type="text"
                                        value={form.courseCode}
                                        onChange={(e) =>
                                            updateField("courseCode", e.target.value)
                                        }
                                        placeholder="e.g. CP001"
                                        className={`${inputClass} uppercase`}
                                        required
                                    />
                                </FormField>

                                <FormField
                                    label="Department"
                                    required
                                    htmlFor="department"
                                >
                                    <select
                                        id="department"
                                        value={form.department}
                                        onChange={(e) =>
                                            updateField("department", e.target.value)
                                        }
                                        className={inputClass}
                                        required
                                    >
                                        <option value="">Select department</option>
                                        {departments.map((department) => (
                                            <option key={department._id} value={department._id}>
                                                {department.name}
                                            </option>
                                        ))}
                                    </select>
                                </FormField>

                                <FormField label="Level" required htmlFor="level">
                                    <select
                                        id="level"
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
                                </FormField>

                                <FormField label="Duration" required htmlFor="duration">
                                    <input
                                        id="duration"
                                        type="text"
                                        value={form.duration}
                                        onChange={(e) =>
                                            updateField("duration", e.target.value)
                                        }
                                        placeholder="e.g. 4 Weeks"
                                        className={inputClass}
                                        required
                                    />
                                </FormField>

                                <div className="flex items-end">
                                    <label className="flex w-full cursor-pointer items-start gap-3 rounded-sm border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/40 px-4 py-3 transition hover:border-[#0B1E3D]/30 dark:hover:border-orange-400/40 hover:bg-white dark:hover:bg-zinc-800">
                                        <input
                                            type="checkbox"
                                            checked={form.featured}
                                            onChange={(e) =>
                                                updateField("featured", e.target.checked)
                                            }
                                            className="mt-0.5 h-4 w-4 rounded-sm border-zinc-300 dark:border-zinc-600 text-[#0B1E3D] dark:text-orange-400 focus:ring-[#0B1E3D] dark:focus:ring-orange-400"
                                        />
                                        <span>
                                            <span className="block text-sm font-semibold text-[#0B1E3D] dark:text-zinc-100">
                                                Featured Course
                                            </span>
                                            <span className="mt-0.5 block text-xs leading-5 text-zinc-400">
                                                Highlight this course in the portal.
                                            </span>
                                        </span>
                                    </label>
                                </div>
                            </div>
                        </section>

                        {/* Description */}
                        <section className="overflow-hidden rounded-sm border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm">
                            <div className="border-b border-zinc-200 dark:border-zinc-800 px-6 py-5">
                                <h2 className="text-base font-semibold text-[#0B1E3D] dark:text-white">
                                    Course Description
                                </h2>
                                <p className="mt-1 text-sm text-zinc-400">
                                    Describe what students will learn in this course.
                                </p>
                            </div>

                            <div className="p-6">
                                <FormField
                                    label="Description"
                                    htmlFor="description"
                                    required
                                    hint="Write the description in HTML. The preview matches how it will appear on the course page."
                                >
                                    <RichTextEditor
                                        value={form.description}
                                        onChange={(value) =>
                                            updateField("description", value)
                                        }
                                        disabled={isSaving}
                                    />
                                </FormField>
                            </div>
                        </section>

                        {/* Prerequisites */}
                        <section className="overflow-hidden rounded-sm border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm">
                            <div className="border-b border-zinc-200 dark:border-zinc-800 px-6 py-5">
                                <h2 className="text-base font-semibold text-[#0B1E3D] dark:text-white">
                                    Prerequisites
                                </h2>
                                <p className="mt-1 text-sm text-zinc-400">
                                    Specify any requirements students should meet before
                                    enrolling.
                                </p>
                            </div>

                            <div className="p-6">
                                <FormField
                                    label="Prerequisites"
                                    htmlFor="prerequisites"
                                    required
                                    hint="Plain text. e.g. Basic computer knowledge, KCSE certificate"
                                >
                                    <textarea
                                        id="prerequisites"
                                        rows={5}
                                        value={form.prerequisites}
                                        onChange={(e) =>
                                            updateField("prerequisites", e.target.value)
                                        }
                                        placeholder="e.g. Basic computer knowledge, KCSE certificate..."
                                        className={`${inputClass} h-auto resize-y py-3`}
                                        required
                                    />
                                </FormField>
                            </div>
                        </section>

                        {/* Actions */}
                        <div className="flex flex-col-reverse gap-3 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/60 px-5 py-4 sm:flex-row sm:items-center sm:justify-end sm:rounded-sm sm:border sm:px-6">
                            <Link
                                href={`/courses/${id}`}
                                className="inline-flex h-11 items-center justify-center rounded-sm border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-5 text-sm font-semibold text-zinc-500 dark:text-zinc-300 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800 hover:text-[#0B1E3D] dark:hover:text-white"
                            >
                                Cancel
                            </Link>

                            <button
                                type="submit"
                                disabled={isSaving}
                                className="inline-flex h-11 items-center justify-center gap-2 rounded-sm bg-[#0B1E3D] px-5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#10294d] disabled:cursor-not-allowed disabled:opacity-60 dark:bg-orange-400 dark:text-[#0B1E3D] dark:hover:bg-orange-300"
                            >
                                {isSaving ? (
                                    <>
                                        <Loader2 size={17} className="animate-spin" />
                                        Saving...
                                    </>
                                ) : (
                                    <>
                                        <Save size={17} />
                                        Save Changes
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </main>
    );
}