"use client";

import {
    BookOpen,
    CalendarCheck,
    CalendarDays,
    FileText,
    GraduationCap,
    Hash,
    Pencil,
    Plus,
    Sparkles,
    Trash2,
    X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import {
    Course as FullCourse,
    courseApi,
} from "@/app/types/courses";
import {
    StudentCourse,
    studentApi,
} from "@/app/types/students";

import { resolveCourseByAdmissionNumber } from "../../components/resolve-course";
import { formatDate } from "../../components/formatters";
import DateChip from "./datechip";
import SelectCourse from "@/app/(portal)/courses/selectCourse";
import { ConfirmDialog } from "./ConfirmDialog";
import { DatePicker } from "../../new/components/DatePicker";
import RequireRoleInline from "@/app/components/navigation/RequiredRoleInline";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface EnrolledCoursesProps {
    courses: StudentCourse[];
    studentId: string;

    /**
     * Optional callback invoked after a successful add/remove.
     * The parent can use it to refetch the student. If omitted,
     * the component will refetch the student itself.
     */
    onChanged?: () => void | Promise<void>;

    /**
     * Optional preloaded course catalogue. If omitted, the
     * component fetches it once on mount.
     */
    courseCatalogue?: FullCourse[];
}

interface AddFormState {
    courseId: string;
    dateOfAdmission: string;
    dateOfCompletion: string;
}

const emptyAddForm: AddFormState = {
    courseId: "",
    dateOfAdmission: "",
    dateOfCompletion: "",
};

// ---------------------------------------------------------------------------
// Style tokens
// ---------------------------------------------------------------------------

const labelCls =
    "mb-1.5 block text-xs font-semibold uppercase tracking-wide text-zinc-700 dark:text-zinc-300";

const btnPrimaryCls =
    "inline-flex items-center justify-center gap-2 rounded-sm bg-blue-950 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-blue-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-orange-400 dark:text-blue-950 dark:hover:bg-orange-300 dark:focus-visible:ring-offset-zinc-900";

const btnSecondaryCls =
    "inline-flex items-center justify-center gap-2 rounded-sm border border-zinc-300 bg-white px-4 py-2 text-xs font-medium text-zinc-800 transition-colors hover:bg-zinc-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getCourseDisplay(courseItem: StudentCourse) {
    const courseId = courseItem.courseId;

    if (courseId && typeof courseId === "object") {
        const full = courseId as {
            _id: string;
            name?: string;
            courseCode?: string;
        };

        if (full.name || full.courseCode) {
            return {
                courseName: full.name || full.courseCode || "",
                courseCode: full.courseCode,
                resolvedLocally: false,
            };
        }
    }

    const fallback = resolveCourseByAdmissionNumber(
        courseItem.admissionNumber,
    );

    if (fallback) {
        return {
            courseName: fallback.courseName,
            courseCode: fallback.courseCode,
            resolvedLocally: true,
        };
    }

    if (typeof courseId === "string") {
        return {
            courseName: courseId,
            courseCode: undefined,
            resolvedLocally: true,
        };
    }

    return {
        courseName: "Unknown / Unresolved Course",
        courseCode: undefined,
        resolvedLocally: true,
    };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function EnrolledCourses({
    courses,
    studentId,
    onChanged,
    courseCatalogue,
}: EnrolledCoursesProps) {
    const router = useRouter();

    // ------------------------------------------------------------------
    // Local state
    // ------------------------------------------------------------------

    const [isAdding, setIsAdding] = useState(false);
    const [addForm, setAddForm] = useState<AddFormState>(emptyAddForm);
    const [addError, setAddError] = useState<string | null>(null);
    const [addBusy, setAddBusy] = useState(false);

    const [catalogue, setCatalogue] = useState<FullCourse[]>(
        courseCatalogue ?? [],
    );
    const [catalogueLoading, setCatalogueLoading] = useState(
        courseCatalogue === undefined,
    );

    const [pendingRemoval, setPendingRemoval] =
        useState<StudentCourse | null>(null);
    const [removeBusy, setRemoveBusy] = useState(false);
    const [removeError, setRemoveError] = useState<string | null>(null);

    // ------------------------------------------------------------------
    // Fetch course catalogue if the parent didn't provide one
    // ------------------------------------------------------------------

    useEffect(() => {
        if (courseCatalogue !== undefined) {
            setCatalogue(courseCatalogue);
            setCatalogueLoading(false);
            return;
        }

        let cancelled = false;
        (async () => {
            try {
                setCatalogueLoading(true);
                const res = await courseApi.getAll();
                if (!cancelled) setCatalogue(res.data ?? []);
            } catch (err) {
                if (!cancelled) {
                    console.error("Failed to load course catalogue:", err);
                }
            } finally {
                if (!cancelled) setCatalogueLoading(false);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [courseCatalogue]);

    // ------------------------------------------------------------------
    // IDs of courses this student is already in (to hide them from the picker)
    // ------------------------------------------------------------------

    const enrolledCourseIds = useMemo(() => {
        const ids = new Set<string>();
        for (const c of courses) {
            const cid = c.courseId;
            if (typeof cid === "string") {
                ids.add(cid);
            } else if (cid && typeof cid === "object") {
                ids.add(cid._id);
            }
        }
        return ids;
    }, [courses]);

    const availableCatalogue = useMemo(
        () => catalogue.filter((c) => !enrolledCourseIds.has(c._id)),
        [catalogue, enrolledCourseIds],
    );

    // ------------------------------------------------------------------
    // Add flow
    // ------------------------------------------------------------------

    const openAddForm = useCallback(() => {
        setAddForm(emptyAddForm);
        setAddError(null);
        setIsAdding(true);
    }, []);

    const closeAddForm = useCallback(() => {
        if (addBusy) return;
        setIsAdding(false);
        setAddForm(emptyAddForm);
        setAddError(null);
    }, [addBusy]);

    const updateAddForm = useCallback(
        <K extends keyof AddFormState>(key: K, value: AddFormState[K]) => {
            setAddForm((prev) => ({ ...prev, [key]: value }));
        },
        [],
    );

    async function refreshStudent() {
        if (onChanged) {
            await onChanged();
            return;
        }
        router.refresh();
    }

    async function submitAdd() {
        setAddError(null);

        if (!addForm.courseId) {
            setAddError("Please select a course.");
            return;
        }
        if (!addForm.dateOfAdmission) {
            setAddError("Please provide a date of admission.");
            return;
        }
        if (
            addForm.dateOfCompletion &&
            new Date(addForm.dateOfCompletion) <
            new Date(addForm.dateOfAdmission)
        ) {
            setAddError(
                "Date of completion cannot be earlier than date of admission.",
            );
            return;
        }

        setAddBusy(true);
        try {
            await studentApi.addEnrollment(studentId, {
                courseId: addForm.courseId,
                dateOfAdmission: addForm.dateOfAdmission,
                dateOfCompletion: addForm.dateOfCompletion || undefined,
            });

            setIsAdding(false);
            setAddForm(emptyAddForm);

            await refreshStudent();
        } catch (err: any) {
            setAddError(
                err?.response?.data?.message ??
                err?.message ??
                "Failed to add enrollment.",
            );
        } finally {
            setAddBusy(false);
        }
    }

    // ------------------------------------------------------------------
    // Remove flow
    // ------------------------------------------------------------------

    const requestRemove = useCallback((item: StudentCourse) => {
        setRemoveError(null);
        setPendingRemoval(item);
    }, []);

    const cancelRemove = useCallback(() => {
        if (removeBusy) return;
        setPendingRemoval(null);
        setRemoveError(null);
    }, [removeBusy]);

    async function confirmRemove() {
        if (!pendingRemoval?._id) return;

        setRemoveBusy(true);
        setRemoveError(null);

        try {
            await studentApi.removeEnrollment(studentId, pendingRemoval._id);

            setPendingRemoval(null);

            await refreshStudent();
        } catch (err: any) {
            setRemoveError(
                err?.response?.data?.message ??
                err?.message ??
                "Failed to remove enrollment.",
            );
        } finally {
            setRemoveBusy(false);
        }
    }

    // ------------------------------------------------------------------
    // Academic Record Navigation
    // ------------------------------------------------------------------

    const navigateToAcademicRecord = (courseItem: StudentCourse) => {
        const courseIdString =
            typeof courseItem.courseId === "object" && courseItem.courseId !== null
                ? courseItem.courseId._id
                : typeof courseItem.courseId === "string"
                    ? courseItem.courseId
                    : null;

        if (courseIdString) {
            router.push(`/students/${studentId}/academic-record/${courseIdString}`);
        }
    };

    // ------------------------------------------------------------------
    // Render
    // ------------------------------------------------------------------

    return (
        <>
            <section className="mt-6 overflow-hidden rounded-sm border border-zinc-200 border-t-4 border-t-orange-400 bg-white shadow-sm dark:border-zinc-800 dark:border-t-orange-400 dark:bg-zinc-900">
                {/* Header */}
                <header className="flex flex-col gap-4 bg-blue-950 px-6 py-5 text-white sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-sm bg-orange-400 text-blue-950">
                            <GraduationCap size={20} />
                        </div>

                        <div>
                            <h2 className="text-base font-semibold leading-tight">
                                Enrolled Courses
                            </h2>
                            <p className="text-xs text-blue-200">
                                Active and completed program enrollments
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 self-start sm:self-auto">
                        <span className="inline-flex items-center rounded-sm border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white">
                            {courses.length}{" "}
                            {courses.length === 1 ? "Course" : "Courses"}
                        </span>

                        {!isAdding && (
                            <button
                                type="button"
                                onClick={openAddForm}
                                className="inline-flex items-center gap-1.5 rounded-sm bg-orange-400 px-3.5 py-2 text-xs font-semibold text-blue-950 transition-colors hover:bg-orange-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-blue-950"
                            >
                                <Plus size={14} />
                                Add Course
                            </button>
                        )}
                    </div>
                </header>

                {/* Inline add form */}
                {isAdding && (
                    <div className="border-b border-zinc-200 bg-zinc-50 px-6 py-6 dark:border-zinc-800 dark:bg-zinc-950">
                        <div className="mb-4 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <span
                                    className="h-4 w-1 rounded-sm bg-orange-400"
                                    aria-hidden="true"
                                />
                                <h3 className="text-xs font-semibold uppercase tracking-[0.15em] text-blue-950 dark:text-orange-400">
                                    Add enrollment
                                </h3>
                            </div>

                            <button
                                type="button"
                                onClick={closeAddForm}
                                disabled={addBusy}
                                className="rounded-sm p-1.5 text-zinc-500 transition-colors hover:bg-zinc-200 hover:text-zinc-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 disabled:opacity-40 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                                aria-label="Cancel add enrollment"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        <div className="grid gap-5 sm:grid-cols-2">
                            {/* Course picker */}
                            <div className="sm:col-span-2">
                                <label className={labelCls}>
                                    Course <span className="text-red-500">*</span>
                                </label>
                                <SelectCourse
                                    value={addForm.courseId}
                                    onChange={(courseId) =>
                                        updateAddForm("courseId", courseId)
                                    }
                                    courses={availableCatalogue}
                                    loading={catalogueLoading}
                                    disabled={addBusy}
                                    required
                                    placeholder="Search or select a course..."
                                />
                            </div>

                            {/* Admission date */}
                            <div>
                                <label className={labelCls}>
                                    Date of admission{" "}
                                    <span className="text-red-500">*</span>
                                </label>
                                <DatePicker
                                    value={addForm.dateOfAdmission}
                                    onChange={(value) =>
                                        updateAddForm("dateOfAdmission", value)
                                    }
                                    placeholder="Pick admission date"
                                    disabled={addBusy}
                                    disableFuture
                                />
                            </div>

                            {/* Completion date (optional) */}
                            <div>
                                <label className={labelCls}>
                                    Date of completion{" "}
                                    <span className="font-normal normal-case text-zinc-500 dark:text-zinc-400">
                                        (optional)
                                    </span>
                                </label>
                                <DatePicker
                                    value={addForm.dateOfCompletion}
                                    onChange={(value) =>
                                        updateAddForm("dateOfCompletion", value)
                                    }
                                    placeholder="Not yet completed"
                                    disabled={addBusy}
                                    fromYear={
                                        addForm.dateOfAdmission
                                            ? new Date(addForm.dateOfAdmission).getFullYear()
                                            : undefined
                                    }
                                />
                            </div>
                        </div>

                        {addError && (
                            <div
                                role="alert"
                                className="mt-4 rounded-sm border-l-4 border-red-500 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-600 dark:bg-red-950/30 dark:text-red-300"
                            >
                                {addError}
                            </div>
                        )}

                        <div className="mt-5 flex justify-end gap-2">
                            <button
                                type="button"
                                onClick={closeAddForm}
                                disabled={addBusy}
                                className={btnSecondaryCls}
                            >
                                Cancel
                            </button>

                            <button
                                type="button"
                                onClick={submitAdd}
                                disabled={addBusy}
                                className={btnPrimaryCls}
                            >
                                {addBusy && (
                                    <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                                )}
                                {addBusy ? "Adding..." : "Add enrollment"}
                            </button>
                        </div>
                    </div>
                )}

                {/* Body */}
                {courses.length === 0 ? (
                    <div className="m-6 flex flex-col items-center gap-3 rounded-sm border border-dashed border-zinc-300 px-6 py-12 text-center dark:border-zinc-700">
                        <div className="flex h-12 w-12 items-center justify-center rounded-sm bg-blue-950 text-orange-400">
                            <BookOpen size={22} />
                        </div>

                        <div>
                            <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                                No enrolled courses
                            </p>
                            <p className="mt-0.5 text-xs text-zinc-600 dark:text-zinc-400">
                                Enrol this student in a course to see it here.
                            </p>
                        </div>

                        {!isAdding && (
                            <button
                                type="button"
                                onClick={openAddForm}
                                className={btnPrimaryCls}
                            >
                                <Plus size={14} />
                                Add first course
                            </button>
                        )}
                    </div>
                ) : (
                    <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
                        {courses.map((courseItem, index) => {
                            const display = getCourseDisplay(courseItem);
                            const canModify = Boolean(courseItem._id);
                            const completed = Boolean(
                                courseItem.dateOfCompletion,
                            );

                            const courseIdString =
                                typeof courseItem.courseId === "object" && courseItem.courseId !== null
                                    ? courseItem.courseId._id
                                    : typeof courseItem.courseId === "string"
                                        ? courseItem.courseId
                                        : null;

                            return (
                                <li
                                    key={courseItem._id || index}
                                    onClick={() => navigateToAcademicRecord(courseItem)}
                                    className="group grid cursor-pointer grid-cols-1 gap-5 border-l-4 border-l-orange-400 px-6 py-6 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/40 lg:grid-cols-[1fr_auto] lg:items-center lg:gap-8"
                                >
                                    {/* Identity + key facts */}
                                    <div className="min-w-0 space-y-4">
                                        <div className="space-y-2">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <span className="inline-flex items-center rounded-sm bg-blue-950 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-orange-400">
                                                    {display.courseCode || "Course"}
                                                </span>

                                                {completed ? (
                                                    <span className="inline-flex items-center rounded-sm border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
                                                        Completed
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center rounded-sm border border-orange-400/50 bg-orange-400/15 px-2 py-0.5 text-[11px] font-semibold text-orange-700 dark:text-orange-300">
                                                        Ongoing
                                                    </span>
                                                )}

                                                {display.resolvedLocally && (
                                                    <span
                                                        title="Inferred via admission number resolver"
                                                        className="inline-flex items-center gap-1 rounded-sm border border-amber-400/40 bg-amber-400/10 px-2 py-0.5 text-[11px] font-semibold text-amber-700 dark:text-amber-300"
                                                    >
                                                        <Sparkles size={10} />
                                                        Resolved
                                                    </span>
                                                )}
                                            </div>

                                            <h3 className="text-lg font-semibold leading-snug text-blue-950 transition-colors group-hover:text-orange-500 dark:text-white dark:group-hover:text-orange-400">
                                                {display.courseName}
                                            </h3>
                                        </div>

                                        <div className="flex items-center gap-3 rounded-sm border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-900/60">
                                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-sm bg-blue-950/10 text-blue-950 dark:bg-orange-400/10 dark:text-orange-400">
                                                <Hash className="h-4 w-4" />
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <p className="text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                                                    ADM No.
                                                </p>
                                                <p className="mt-0.5 truncate font-mono text-sm font-semibold text-blue-950 dark:text-orange-400">
                                                    {courseItem.admissionNumber || "N/A"}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="grid gap-3 sm:grid-cols-2">
                                            <DateChip
                                                label="Admitted"
                                                value={formatDate(
                                                    courseItem.dateOfAdmission,
                                                )}
                                                icon={CalendarDays}
                                            />
                                            {completed ? (
                                                <DateChip
                                                    label="Completed"
                                                    value={formatDate(
                                                        courseItem.dateOfCompletion!,
                                                    )}
                                                    tone="success"
                                                    icon={CalendarCheck}
                                                />
                                            ) : (
                                                <DateChip
                                                    label="Completed"
                                                    value="Not yet completed"
                                                    tone="muted"
                                                    icon={CalendarCheck}
                                                />
                                            )}
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <RequireRoleInline roles={["admin", "registrar"]}>
                                        <div className="flex items-center gap-2 border-t border-zinc-200 pt-4 dark:border-zinc-800 lg:flex-col lg:items-stretch lg:border-t-0 lg:pt-0">
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    navigateToAcademicRecord(courseItem);
                                                }}
                                                disabled={!courseIdString}
                                                title="View student academic record and units"
                                                className="inline-flex flex-1 items-center justify-center gap-2 rounded-sm bg-blue-950 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-blue-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-orange-400 dark:text-blue-950 dark:hover:bg-orange-300 lg:flex-none"
                                            >
                                                <FileText size={13} />
                                                Academic Record
                                            </button>

                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (!courseItem._id) return;

                                                    router.push(
                                                        `/students/${studentId}/editEnrollment?courseId=${encodeURIComponent(
                                                            courseItem._id,
                                                        )}`,
                                                    );
                                                }}
                                                disabled={!canModify}
                                                className="inline-flex flex-1 items-center justify-center gap-2 rounded-sm border border-blue-950 px-4 py-2 text-xs font-semibold text-blue-950 transition-colors hover:bg-blue-950 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 disabled:cursor-not-allowed disabled:opacity-40 dark:border-orange-400 dark:text-orange-400 dark:hover:bg-orange-400 dark:hover:text-blue-950 lg:flex-none"
                                            >
                                                <Pencil size={13} />
                                                Edit enrollment
                                            </button>

                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    requestRemove(courseItem);
                                                }}
                                                disabled={!canModify}
                                                title={
                                                    canModify
                                                        ? "Remove this enrollment"
                                                        : "Cannot remove — enrollment has no id"
                                                }
                                                className="inline-flex flex-1 items-center justify-center gap-2 rounded-sm border border-red-300 px-4 py-2 text-xs font-semibold text-red-600 transition-colors hover:bg-red-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400 disabled:cursor-not-allowed disabled:opacity-40 dark:border-red-900/60 dark:text-red-400 dark:hover:bg-red-950/40 lg:flex-none"
                                            >
                                                <Trash2 size={13} />
                                                Remove
                                            </button>
                                        </div>
                                    </RequireRoleInline>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </section>

            {/* Remove confirmation */}
            <ConfirmDialog
                open={pendingRemoval !== null}
                title="Remove enrollment?"
                tone="danger"
                confirmLabel={removeBusy ? "Removing..." : "Remove"}
                cancelLabel="Keep"
                busy={removeBusy}
                onCancel={cancelRemove}
                onConfirm={confirmRemove}
                description={
                    pendingRemoval
                        ? (() => {
                            const d = getCourseDisplay(pendingRemoval);
                            return (
                                <>
                                    This will remove the enrollment for{" "}
                                    <strong className="text-zinc-900 dark:text-white">
                                        {d.courseName}
                                    </strong>{" "}
                                    (ADM No.{" "}
                                    <span className="font-mono">
                                        {pendingRemoval.admissionNumber}
                                    </span>
                                    ).
                                    {removeError && (
                                        <span className="mt-2 block text-red-600 dark:text-red-400">
                                            {removeError}
                                        </span>
                                    )}
                                </>
                            );
                        })()
                        : undefined
                }
            />
        </>
    );
}