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
    type LucideIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import {
    useCallback,
    useEffect,
    useMemo,
    useState,
    type ReactNode,
} from "react";

import { Course as FullCourse, courseApi } from "@/app/types/courses";
import { StudentCourse, studentApi } from "@/app/types/students";

import { resolveCourseByAdmissionNumber } from "../../components/resolve-course";
import { formatDate } from "../../components/formatters";
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

    /** Optional callback after a successful add/remove (parent refetches). */
    onChanged?: () => void | Promise<void>;

    /** Optional preloaded course catalogue; fetched on mount if omitted. */
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
// Style tokens — 44px touch targets on phones, compact from sm
// ---------------------------------------------------------------------------

const labelCls =
    "mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300";

const btnBase =
    "inline-flex h-11 items-center justify-center gap-2 rounded-sm px-4 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 disabled:cursor-not-allowed disabled:opacity-50 sm:h-9";

const btnPrimaryCls = `${btnBase} bg-blue-950 text-white hover:bg-blue-900 dark:bg-orange-400 dark:text-blue-950 dark:hover:bg-orange-300`;

const btnSecondaryCls = `${btnBase} border border-zinc-300 bg-white text-zinc-800 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800`;

const btnOutlineCls = `${btnBase} border border-blue-950 text-blue-950 hover:bg-blue-950 hover:text-white dark:border-orange-400 dark:text-orange-400 dark:hover:bg-orange-400 dark:hover:text-blue-950`;

const btnDangerCls = `${btnBase} border border-red-300 text-red-600 hover:bg-red-50 focus-visible:ring-red-400 dark:border-red-900/60 dark:text-red-400 dark:hover:bg-red-950/40`;

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

    const fallback = resolveCourseByAdmissionNumber(courseItem.admissionNumber);

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

function resolveCourseIdString(courseItem: StudentCourse): string | null {
    const cid = courseItem.courseId;
    if (cid && typeof cid === "object") return cid._id;
    if (typeof cid === "string") return cid;
    return null;
}

// ---------------------------------------------------------------------------
// Small building blocks
// ---------------------------------------------------------------------------

function Fact({
    icon: Icon,
    label,
    value,
    mono = false,
    muted = false,
    className = "",
}: {
    icon: LucideIcon;
    label: string;
    value: string;
    mono?: boolean;
    muted?: boolean;
    className?: string;
}) {
    return (
        <div className={`flex min-w-0 items-start gap-2.5 ${className}`}>
            <Icon className="mt-0.5 h-4 w-4 shrink-0 text-zinc-400 dark:text-zinc-500" />
            <div className="min-w-0">
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    {label}
                </p>
                <p
                    className={`truncate text-sm font-medium ${mono ? "font-mono" : ""
                        } ${muted
                            ? "text-zinc-400 dark:text-zinc-500"
                            : "text-zinc-900 dark:text-zinc-100"
                        }`}
                >
                    {value}
                </p>
            </div>
        </div>
    );
}

function Pill({
    children,
    className,
    title,
}: {
    children: ReactNode;
    className: string;
    title?: string;
}) {
    return (
        <span
            title={title}
            className={`inline-flex items-center gap-1 whitespace-nowrap rounded-sm border px-2 py-0.5 text-xs font-medium ${className}`}
        >
            {children}
        </span>
    );
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

    const [pendingRemoval, setPendingRemoval] = useState<StudentCourse | null>(
        null,
    );
    const [removeBusy, setRemoveBusy] = useState(false);
    const [removeError, setRemoveError] = useState<string | null>(null);

    // Fetch course catalogue if the parent didn't provide one
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

    // Hide already-enrolled courses from the picker
    const enrolledCourseIds = useMemo(() => {
        const ids = new Set<string>();
        for (const c of courses) {
            const cid = c.courseId;
            if (typeof cid === "string") ids.add(cid);
            else if (cid && typeof cid === "object") ids.add(cid._id);
        }
        return ids;
    }, [courses]);

    const availableCatalogue = useMemo(
        () => catalogue.filter((c) => !enrolledCourseIds.has(c._id)),
        [catalogue, enrolledCourseIds],
    );

    // ------------------------------ Add flow ------------------------------

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

    // ----------------------------- Remove flow ----------------------------

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

    // ------------------------------ Navigation ----------------------------

    const navigateToAcademicRecord = (courseItem: StudentCourse) => {
        if (resolveCourseIdString(courseItem)) {
            router.push(`/results/${studentId}`);
        }
    };

    // ------------------------------- Render -------------------------------

    return (
        <>
            <section className="mt-6 overflow-hidden rounded-sm border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
                {/* Header */}
                <header className="flex items-center gap-3 border-b border-zinc-200 px-4 py-3 sm:px-6 sm:py-4 dark:border-zinc-800">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-sm bg-blue-950 text-orange-400">
                        <GraduationCap size={20} />
                    </span>

                    <div className="min-w-0 flex-1">
                        <h2 className="truncate text-base font-semibold text-zinc-900 dark:text-white">
                            Enrolled courses
                        </h2>
                        <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
                            {courses.length}{" "}
                            {courses.length === 1 ? "course" : "courses"}
                            <span className="hidden sm:inline">
                                {" "}
                                · active and completed
                            </span>
                        </p>
                    </div>

                    {!isAdding && (
                        <button
                            type="button"
                            onClick={openAddForm}
                            aria-label="Add course"
                            className={`${btnPrimaryCls} shrink-0 !px-3 sm:!px-4`}
                        >
                            <Plus size={16} />
                            <span className="hidden sm:inline">Add course</span>
                        </button>
                    )}
                </header>

                {/* Inline add form */}
                {isAdding && (
                    <div className="border-b border-zinc-200 bg-zinc-50 p-4 sm:p-6 dark:border-zinc-800 dark:bg-zinc-950">
                        <div className="mb-4 flex items-center justify-between gap-3">
                            <h3 className="border-l-4 border-orange-400 pl-3 text-sm font-semibold text-blue-950 dark:text-white">
                                Add enrollment
                            </h3>

                            <button
                                type="button"
                                onClick={closeAddForm}
                                disabled={addBusy}
                                className="flex h-11 w-11 items-center justify-center rounded-sm text-zinc-500 transition-colors hover:bg-zinc-200 hover:text-zinc-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 disabled:opacity-40 sm:h-9 sm:w-9 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                                aria-label="Cancel add enrollment"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2 sm:gap-5">
                            <div className="sm:col-span-2">
                                <label className={labelCls}>
                                    Course{" "}
                                    <span className="text-red-500">*</span>
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

                            <div>
                                <label className={labelCls}>
                                    Date of completion{" "}
                                    <span className="font-normal text-zinc-500 dark:text-zinc-400">
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
                                            ? new Date(
                                                addForm.dateOfAdmission,
                                            ).getFullYear()
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

                        {/* Stacked full-width on phones, right-aligned from sm */}
                        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                            <button
                                type="button"
                                onClick={closeAddForm}
                                disabled={addBusy}
                                className={`${btnSecondaryCls} w-full sm:w-auto`}
                            >
                                Cancel
                            </button>

                            <button
                                type="button"
                                onClick={submitAdd}
                                disabled={addBusy}
                                className={`${btnPrimaryCls} w-full sm:w-auto`}
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
                    <div className="m-4 flex flex-col items-center gap-3 rounded-sm border border-dashed border-zinc-300 px-4 py-10 text-center sm:m-6 sm:py-12 dark:border-zinc-700">
                        <span className="flex h-12 w-12 items-center justify-center rounded-sm bg-blue-950 text-orange-400">
                            <BookOpen size={22} />
                        </span>

                        <div>
                            <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                                No enrolled courses
                            </p>
                            <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                                Enrol this student in a course to see it here.
                            </p>
                        </div>

                        {!isAdding && (
                            <button
                                type="button"
                                onClick={openAddForm}
                                className={`${btnPrimaryCls} w-full max-w-xs sm:w-auto`}
                            >
                                <Plus size={16} />
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
                                resolveCourseIdString(courseItem);

                            return (
                                <li
                                    key={courseItem._id || index}
                                    onClick={() =>
                                        navigateToAcademicRecord(courseItem)
                                    }
                                    className={`group flex flex-col gap-4 border-l-4 px-4 py-4 transition-colors hover:bg-zinc-50 sm:px-6 sm:py-5 lg:flex-row lg:items-center lg:gap-8 dark:hover:bg-zinc-800/40 ${completed
                                            ? "border-l-emerald-500"
                                            : "border-l-orange-400"
                                        } ${courseIdString ? "cursor-pointer" : ""}`}
                                >
                                    {/* Identity + facts */}
                                    <div className="min-w-0 flex-1 space-y-3">
                                        <div className="flex flex-wrap items-center gap-1.5">
                                            <span className="inline-flex items-center rounded-sm bg-blue-950 px-2 py-0.5 font-mono text-xs font-semibold text-orange-400">
                                                {display.courseCode || "Course"}
                                            </span>

                                            {completed ? (
                                                <Pill className="border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                                                    Completed
                                                </Pill>
                                            ) : (
                                                <Pill className="border-orange-400/50 bg-orange-400/15 text-orange-700 dark:text-orange-300">
                                                    Ongoing
                                                </Pill>
                                            )}

                                            {display.resolvedLocally && (
                                                <Pill
                                                    title="Inferred via admission number resolver"
                                                    className="border-amber-400/40 bg-amber-400/10 text-amber-700 dark:text-amber-300"
                                                >
                                                    <Sparkles size={11} />
                                                    Resolved
                                                </Pill>
                                            )}
                                        </div>

                                        <h3 className="text-base font-semibold leading-snug text-blue-950 transition-colors group-hover:text-orange-600 sm:text-lg dark:text-white dark:group-hover:text-orange-400">
                                            {display.courseName}
                                        </h3>

                                        <div className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
                                            <Fact
                                                icon={Hash}
                                                label="Adm. no."
                                                value={
                                                    courseItem.admissionNumber ||
                                                    "N/A"
                                                }
                                                mono
                                                className="col-span-2 sm:col-span-1"
                                            />
                                            <Fact
                                                icon={CalendarDays}
                                                label="Admitted"
                                                value={formatDate(
                                                    courseItem.dateOfAdmission,
                                                )}
                                            />
                                            <Fact
                                                icon={CalendarCheck}
                                                label="Completed"
                                                value={
                                                    completed
                                                        ? formatDate(
                                                            courseItem.dateOfCompletion!,
                                                        )
                                                        : "Not yet"
                                                }
                                                muted={!completed}
                                            />
                                        </div>
                                    </div>

                                    {/* Actions: primary full-width, then edit/remove side by side on phones;
                                        a fixed-width column from lg */}
                                    <RequireRoleInline
                                        roles={["admin", "registrar"]}
                                    >
                                        <div className="grid grid-cols-2 gap-2 border-t border-zinc-100 pt-4 lg:w-48 lg:shrink-0 lg:grid-cols-1 lg:border-t-0 lg:pt-0 dark:border-zinc-800">
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    navigateToAcademicRecord(
                                                        courseItem,
                                                    );
                                                }}
                                                disabled={!courseIdString}
                                                title="View student academic record and units"
                                                className={`${btnPrimaryCls} col-span-2 lg:col-span-1`}
                                            >
                                                <FileText size={15} />
                                                Academic record
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
                                                className={btnOutlineCls}
                                            >
                                                <Pencil size={15} />
                                                Edit
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
                                                className={btnDangerCls}
                                            >
                                                <Trash2 size={15} />
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
                                    (Adm. no.{" "}
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