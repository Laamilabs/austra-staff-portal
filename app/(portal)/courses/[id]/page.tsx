"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, BookOpen } from "lucide-react";

import { Course, courseApi } from "@/app/types/courses";
import { Unit, unitApi } from "@/app/types/units";
import { DocumentItem, documentApi } from "@/app/types/documents";
import CourseDocuments from "./components/CourseDocuments";
import CourseHero from "./components/CourseHero";
import CourseSidebar from "./components/CourseSidebar";
import CourseUnits from "./components/CourseUnits";


export default function CourseDetailsPage() {
    const params = useParams();
    const router = useRouter();

    const id = Array.isArray(params.id) ? params.id[0] : params.id;

    const [course, setCourse] = useState<Course | null>(null);
    const [units, setUnits] = useState<Unit[]>([]);
    const [documents, setDocuments] = useState<DocumentItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isUnitsLoading, setIsUnitsLoading] = useState(true);
    const [isDocumentsLoading, setIsDocumentsLoading] = useState(true);
    const [error, setError] = useState("");
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        if (!id) return;

        const loadCourseData = async () => {
            try {
                setIsLoading(true);
                setError("");
                const response = await courseApi.getById(id);
                setCourse(response.data);
            } catch (err) {
                console.error("Failed to load course:", err);
                setError(
                    "Unable to load this course. It may have been removed or you may not have permission to view it.",
                );
            } finally {
                setIsLoading(false);
            }
        };

        const loadCourseUnits = async () => {
            try {
                setIsUnitsLoading(true);
                const response = await unitApi.getByCourse(id);
                setUnits(response.data || []);
            } catch (err) {
                console.error("Failed to load course units:", err);
            } finally {
                setIsUnitsLoading(false);
            }
        };

        const loadCourseDocuments = async () => {
            try {
                setIsDocumentsLoading(true);
                const response = await documentApi.getByCourse(id);
                setDocuments(response.data || []);
            } catch (err) {
                console.error("Failed to load course documents:", err);
            } finally {
                setIsDocumentsLoading(false);
            }
        };

        loadCourseData();
        loadCourseUnits();
        loadCourseDocuments();
    }, [id]);

    const handleDelete = async () => {
        if (!course) return;

        const confirmed = window.confirm(
            `Are you sure you want to delete "${course.name}"? This action cannot be undone.`,
        );
        if (!confirmed) return;

        try {
            setIsDeleting(true);
            await courseApi.delete(course._id);
            router.replace("/courses");
        } catch (err) {
            console.error("Failed to delete course:", err);
            window.alert("Unable to delete this course. Please try again.");
        } finally {
            setIsDeleting(false);
        }
    };

    /* ---------------- Loading state ---------------- */
    if (isLoading) {
        return (
            <main className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
                <div className="mx-auto max-w-full px-4 py-8 sm:px-6 lg:px-8">
                    <div className="animate-pulse">
                        <div className="h-4 w-32 rounded-sm bg-zinc-200 dark:bg-zinc-800" />

                        <div className="mt-6 overflow-hidden rounded-sm bg-[#0B1E3D]">
                            <div className="border-b-2 border-orange-400 px-6 py-12 md:px-8">
                                <div className="h-5 w-24 rounded-sm bg-white/10" />
                                <div className="mt-5 h-10 max-w-xl rounded-sm bg-white/10" />
                                <div className="mt-4 h-4 w-72 rounded-sm bg-white/10" />
                            </div>
                        </div>

                        <div className="mt-6 grid gap-6 lg:grid-cols-3 lg:items-start">
                            <div className="space-y-6 lg:col-span-2">
                                <div className="h-48 rounded-sm bg-white dark:bg-zinc-900 shadow-sm" />
                                <div className="h-64 rounded-sm bg-white dark:bg-zinc-900 shadow-sm" />
                                <div className="h-48 rounded-sm bg-white dark:bg-zinc-900 shadow-sm" />
                            </div>
                            <div className="space-y-6">
                                <div className="h-64 rounded-sm bg-white dark:bg-zinc-900 shadow-sm" />
                                <div className="h-32 rounded-sm bg-white dark:bg-zinc-900 shadow-sm" />
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        );
    }

    /* ---------------- Error state ---------------- */
    if (error || !course) {
        return (
            <main className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
                <div className="mx-auto max-w-full px-4 py-8 sm:px-6 lg:px-8">
                    <Link
                        href="/courses"
                        className="inline-flex items-center gap-2 text-sm font-semibold text-[#0B1E3D] dark:text-white transition-colors hover:text-orange-500 dark:hover:text-orange-400"
                    >
                        <ArrowLeft size={16} />
                        Back to courses
                    </Link>

                    <div className="mt-8 rounded-sm border border-red-200 dark:border-red-900/50 border-t-4 border-t-red-600 bg-red-50 dark:bg-red-950/20 p-6 shadow-sm">
                        <h1 className="text-lg font-bold text-red-800 dark:text-red-300">
                            Course unavailable
                        </h1>
                        <p className="mt-2 max-w-2xl text-sm leading-6 text-red-700 dark:text-red-400">
                            {error || "The requested course could not be found."}
                        </p>
                        <Link
                            href="/courses"
                            className="mt-5 inline-flex items-center gap-2 rounded-sm bg-[#0B1E3D] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#10294d] dark:bg-orange-400 dark:text-[#0B1E3D] dark:hover:bg-orange-300"
                        >
                            <ArrowLeft size={15} />
                            Return to courses
                        </Link>
                    </div>
                </div>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
            <div className="mx-auto max-w-full px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
                {/* Back navigation */}
                <Link
                    href="/courses"
                    className="inline-flex items-center gap-2 text-sm font-semibold text-zinc-500 dark:text-zinc-400 transition-colors hover:text-[#0B1E3D] dark:hover:text-white"
                >
                    <ArrowLeft size={16} />
                    Back to courses
                </Link>

                {/* Hero */}
                <CourseHero
                    course={course}
                    isDeleting={isDeleting}
                    onDelete={handleDelete}
                />

                {/* Content grid */}
                <div className="mt-6 grid gap-6 lg:grid-cols-3 lg:items-start">
                    <div className="space-y-6 lg:col-span-2">
                        <CourseUnits
                            courseId={course._id}
                            units={units}
                            isLoading={isUnitsLoading}
                        />

                        <CourseDocuments
                            courseId={course._id}
                            documents={documents}
                            units={units}
                            isLoading={isDocumentsLoading}
                        />

                        {/* About This Course */}
                        <section className="rounded-sm border border-zinc-200 dark:border-zinc-800 border-t-4 border-t-[#0B1E3D] dark:border-t-orange-400 bg-white dark:bg-zinc-900 p-6 shadow-sm md:p-8">
                            <div className="flex items-center gap-3">
                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-sm bg-[#0B1E3D]/5 dark:bg-white/10 text-[#0B1E3D] dark:text-orange-400">
                                    <BookOpen size={18} />
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-[#0B1E3D] dark:text-white">
                                        About This Course
                                    </h2>
                                    <p className="mt-0.5 text-xs text-zinc-400">
                                        Course description
                                    </p>
                                </div>
                            </div>

                            {course.description ? (
                                <div
                                    className="
                                        mt-6 max-w-none text-sm leading-7 text-zinc-500 dark:text-zinc-400
                                        [&_h1]:mb-3 [&_h1]:mt-6 [&_h1]:text-xl [&_h1]:font-bold [&_h1]:text-[#0B1E3D] dark:[&_h1]:text-white
                                        [&_h2]:mb-3 [&_h2]:mt-6 [&_h2]:text-lg [&_h2]:font-bold [&_h2]:text-[#0B1E3D] dark:[&_h2]:text-white
                                        [&_h3]:mb-2 [&_h3]:mt-5 [&_h3]:text-base [&_h3]:font-bold [&_h3]:text-[#0B1E3D] dark:[&_h3]:text-white
                                        [&_p]:mb-3 [&_p]:leading-7
                                        [&_ul]:mb-4 [&_ul]:list-disc [&_ul]:pl-5
                                        [&_ol]:mb-4 [&_ol]:list-decimal [&_ol]:pl-5
                                        [&_li]:mb-1
                                        [&_strong]:font-semibold [&_strong]:text-[#0B1E3D] dark:[&_strong]:text-white
                                        [&_a]:text-orange-500 [&_a]:underline [&_a]:underline-offset-2 [&_a]:hover:text-orange-600 dark:[&_a]:text-orange-400 dark:[&_a]:hover:text-orange-300
                                    "
                                    dangerouslySetInnerHTML={{ __html: course.description }}
                                />
                            ) : (
                                <div className="mt-6 rounded-sm border border-dashed border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/40 p-6">
                                    <p className="text-sm text-zinc-400">
                                        No course description has been provided.
                                    </p>
                                </div>
                            )}
                        </section>

                        {/* Prerequisites */}
                        <section className="rounded-sm border border-zinc-200 dark:border-zinc-800 border-t-4 border-t-[#0B1E3D] dark:border-t-orange-400 bg-white dark:bg-zinc-900 p-6 shadow-sm md:p-8">
                            <h2 className="flex items-center gap-2 text-lg font-bold text-[#0B1E3D] dark:text-white">
                                <span className="h-2 w-2 rounded-sm bg-orange-400" />
                                Requirements &amp; Prerequisites
                            </h2>

                            {course.prerequisites ? (
                                <div className="mt-5 rounded-sm border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/40 p-5">
                                    <p className="whitespace-pre-line text-sm leading-7 text-zinc-500 dark:text-zinc-400">
                                        {course.prerequisites}
                                    </p>
                                </div>
                            ) : (
                                <p className="mt-5 text-sm text-zinc-400">
                                    No prerequisites have been specified for this course.
                                </p>
                            )}
                        </section>
                    </div>

                    <CourseSidebar course={course} />
                </div>
            </div>
        </main>
    );
}