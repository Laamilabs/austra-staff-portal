"use client";

import {
    ArrowLeft,
    Calendar,
    CheckCircle2,
    Hash,
    Loader2,
    Save,
    AlertCircle,
    GraduationCap,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
    FormEvent,
    useEffect,
    useMemo,
    useState,
} from "react";

import {
    studentApi,
    type Student,
    type StudentCourse,
} from "@/app/types/students";

import { resolveCourseByAdmissionNumber } from "../../components/resolve-course";
import { DatePicker } from "@/app/(portal)/students/new/components/DatePicker";

type EditMode = "admission" | "dates";

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
            };
        }
    }

    const fallback = resolveCourseByAdmissionNumber(
        courseItem.admissionNumber
    );

    if (fallback) {
        return {
            courseName: fallback.courseName,
            courseCode: fallback.courseCode,
        };
    }

    if (typeof courseId === "string") {
        return {
            courseName: courseId,
            courseCode: undefined,
        };
    }

    return {
        courseName: "Unknown / Unresolved Course",
        courseCode: undefined,
    };
}

/**
 * Converts an API ISO date into yyyy-MM-dd format expected by DatePicker.
 */
function toDateInputValue(value?: string | null) {
    if (!value) return "";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return "";
    }

    return date.toISOString().slice(0, 10);
}

export default function EditEnrollmentPage() {
    const params = useParams();
    const router = useRouter();
    const searchParams = useSearchParams();

    const studentId = String(params.id);
    const enrollmentId = searchParams.get("courseId");

    const [student, setStudent] = useState<Student | null>(null);
    const [enrollment, setEnrollment] =
        useState<StudentCourse | null>(null);

    // Which set of fields the user is editing.
    // Dates is the default and primary mode.
    const [mode, setMode] = useState<EditMode>("dates");

    const [admissionNumber, setAdmissionNumber] = useState("");
    const [dateOfAdmission, setDateOfAdmission] = useState("");
    const [dateOfCompletion, setDateOfCompletion] = useState("");

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    useEffect(() => {
        if (!enrollmentId) {
            setError(
                "No enrollment was specified. Please return to the student profile and select an enrollment to edit."
            );
            setLoading(false);
            return;
        }

        let cancelled = false;

        async function loadStudent() {
            try {
                setLoading(true);
                setError("");

                const response = await studentApi.getById(studentId);
                const fetchedStudent = response.data;

                if (cancelled) return;

                setStudent(fetchedStudent);

                const selectedEnrollment =
                    fetchedStudent.courses?.find(
                        (course) => course._id === enrollmentId
                    ) ?? null;

                if (!selectedEnrollment) {
                    setError(
                        "The selected enrollment could not be found on this student."
                    );
                    return;
                }

                setEnrollment(selectedEnrollment);

                setAdmissionNumber(
                    selectedEnrollment.admissionNumber || ""
                );

                setDateOfAdmission(
                    toDateInputValue(
                        selectedEnrollment.dateOfAdmission
                    )
                );

                setDateOfCompletion(
                    toDateInputValue(
                        selectedEnrollment.dateOfCompletion
                    )
                );
            } catch (err: any) {
                console.error(
                    "Failed to load student enrollment:",
                    err
                );

                setError(
                    err?.response?.data?.message ||
                    "Unable to load the enrollment. Please try again."
                );
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        }

        loadStudent();

        return () => {
            cancelled = true;
        };
    }, [studentId, enrollmentId]);

    const courseDisplay = useMemo(() => {
        if (!enrollment) return null;

        return getCourseDisplay(enrollment);
    }, [enrollment]);

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (!enrollmentId) {
            setError("The enrollment could not be identified.");
            return;
        }

        setError("");
        setSuccess("");

        // Validate only the fields relevant to the active mode.
        if (mode === "admission") {
            if (!admissionNumber.trim()) {
                setError("Admission number is required.");
                return;
            }
        } else {
            if (!dateOfAdmission) {
                setError("Date of admission is required.");
                return;
            }
        }

        setSaving(true);

        try {
            if (mode === "admission") {
                // Submit only the admission number.
                await studentApi.updateEnrollment(studentId, {
                    courseId: enrollmentId,
                    admissionNumber: admissionNumber.trim(),
                });
            } else {
                // Submit only the dates.
                await studentApi.updateEnrollment(studentId, {
                    courseId: enrollmentId,
                    dateOfAdmission,
                    dateOfCompletion: dateOfCompletion || null,
                });
            }

            setSuccess("Enrollment updated successfully.");

            setTimeout(() => {
                router.push(`/students/${studentId}`);
                router.refresh();
            }, 700);
        } catch (err: any) {
            console.error(
                "Failed to update student enrollment:",
                err
            );

            setError(
                err?.response?.data?.message ||
                "Unable to update the enrollment. Please check the details and try again."
            );
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <main className="min-h-[calc(100vh-80px)] bg-zinc-50 px-4 py-8 dark:bg-zinc-950">
                <div className="mx-auto flex max-w-full items-center justify-center py-24">
                    <div className="flex flex-col items-center gap-3 text-zinc-500 dark:text-zinc-400">
                        <Loader2
                            size={28}
                            className="animate-spin text-orange-500"
                        />

                        <p className="text-sm">
                            Loading enrollment...
                        </p>
                    </div>
                </div>
            </main>
        );
    }

    if (error && !enrollment) {
        return (
            <main className="min-h-[calc(100vh-80px)] bg-zinc-50 px-4 py-8 dark:bg-zinc-950">
                <div className="mx-auto max-w-full">
                    <Link
                        href={`/students/${studentId}`}
                        className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-[#0B1E3D] transition hover:text-orange-600 dark:text-white dark:hover:text-orange-400"
                    >
                        <ArrowLeft size={16} />
                        Back to Student
                    </Link>

                    <div className="border border-red-200 bg-white p-6 shadow-sm dark:border-red-900/50 dark:bg-zinc-900">
                        <div className="flex items-start gap-3">
                            <AlertCircle
                                size={20}
                                className="mt-0.5 shrink-0 text-red-500"
                            />

                            <div>
                                <h1 className="text-sm font-bold text-red-700 dark:text-red-400">
                                    Unable to load enrollment
                                </h1>

                                <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                                    {error}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        );
    }

    return (
        <main className="min-h-[calc(100vh-80px)] bg-zinc-50 px-4 py-8 dark:bg-zinc-950 sm:px-6">
            <div className="mx-auto max-w-full">
                {/* Back */}
                <Link
                    href={`/students/${studentId}`}
                    className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-[#0B1E3D] transition hover:text-orange-600 dark:text-white dark:hover:text-orange-400"
                >
                    <ArrowLeft size={16} />
                    Back to Student
                </Link>

                {/* Header */}
                <div className="mb-6">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-sm bg-[#0B1E3D]/5 text-[#0B1E3D] dark:bg-orange-400/10 dark:text-orange-400">
                            <GraduationCap size={18} />
                        </div>

                        <div>
                            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-orange-600 dark:text-orange-400">
                                Student Enrollment
                            </p>

                            <h1 className="text-xl font-bold text-[#0B1E3D] dark:text-white">
                                Edit Enrollment
                            </h1>
                        </div>
                    </div>

                    {student && (
                        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                            Update enrollment information for{" "}
                            <span className="font-semibold text-zinc-700 dark:text-zinc-200">
                                {student.fullName.firstName}{" "}
                                {student.fullName.middleName}{" "}
                                {student.fullName.lastName}
                            </span>
                        </p>
                    )}
                </div>

                {/* Course summary */}
                {enrollment && courseDisplay && (
                    <section className="mb-6 overflow-hidden border border-zinc-200 border-t-4 border-t-[#0B1E3D] bg-white shadow-sm dark:border-zinc-800 dark:border-t-orange-400 dark:bg-zinc-900">
                        <div className="px-6 py-5">
                            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                                <div>
                                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-orange-600 dark:text-orange-400">
                                        Course
                                    </p>

                                    <h2 className="mt-1 text-lg font-bold text-[#0B1E3D] dark:text-white">
                                        {courseDisplay.courseName}
                                    </h2>

                                    {courseDisplay.courseCode && (
                                        <p className="mt-1 text-xs font-semibold text-zinc-400">
                                            {courseDisplay.courseCode}
                                        </p>
                                    )}
                                </div>

                                <div className="inline-flex items-center gap-2 self-start border border-zinc-200 bg-zinc-50 px-3 py-2 font-mono text-xs font-semibold text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 sm:self-auto">
                                    <Hash
                                        size={13}
                                        className="text-orange-500"
                                    />
                                    {enrollment.admissionNumber}
                                </div>
                            </div>
                        </div>
                    </section>
                )}

                {/* Form */}
                <form
                    onSubmit={handleSubmit}
                    className="overflow-hidden border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
                >
                    <div className="border-b border-zinc-100 px-6 py-5 dark:border-zinc-800">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                                <h2 className="text-sm font-bold text-[#0B1E3D] dark:text-white">
                                    Enrollment Details
                                </h2>

                                <p className="mt-1 text-xs text-zinc-400">
                                    {mode === "dates"
                                        ? "Update the admission and/or completion dates for this enrollment."
                                        : "Update the admission number for this enrollment."}
                                </p>
                            </div>

                            {/* Secondary mode toggle */}
                            <button
                                type="button"
                                onClick={() => {
                                    setMode(
                                        mode === "dates"
                                            ? "admission"
                                            : "dates"
                                    );
                                    setError("");
                                    setSuccess("");
                                }}
                                disabled={saving}
                                className="inline-flex shrink-0 items-center gap-1.5 self-start border border-zinc-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-zinc-500 transition hover:border-zinc-300 hover:text-zinc-700 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-200"
                            >
                                {mode === "dates" ? (
                                    <>
                                        <Hash size={12} />
                                        Edit Admission Number Instead
                                    </>
                                ) : (
                                    <>
                                        <Calendar size={12} />
                                        Back to Editing Dates
                                    </>
                                )}
                            </button>
                        </div>
                    </div>

                    <div className="space-y-6 px-6 py-6">
                        {/* Error */}
                        {error && (
                            <div className="flex items-start gap-3 border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
                                <AlertCircle
                                    size={17}
                                    className="mt-0.5 shrink-0"
                                />

                                <span>{error}</span>
                            </div>
                        )}

                        {/* Success */}
                        {success && (
                            <div className="flex items-start gap-3 border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300">
                                <CheckCircle2
                                    size={17}
                                    className="mt-0.5 shrink-0"
                                />

                                <span>{success}</span>
                            </div>
                        )}

                        {/* Admission Number — only in 'admission' mode */}
                        {mode === "admission" && (
                            <div>
                                <div className="mb-2 flex items-center gap-2">
                                    <label
                                        htmlFor="admissionNumber"
                                        className="block text-xs font-bold uppercase tracking-wide text-zinc-600 dark:text-zinc-300"
                                    >
                                        Admission Number
                                    </label>

                                    <span className="border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-400">
                                        Discouraged
                                    </span>
                                </div>

                                <div className="relative">
                                    <Hash
                                        size={16}
                                        className="absolute left-3 top-1/2 -translate-y-1/2 text-orange-500"
                                    />

                                    <input
                                        id="admissionNumber"
                                        type="text"
                                        value={admissionNumber}
                                        onChange={(event) =>
                                            setAdmissionNumber(
                                                event.target.value
                                            )
                                        }
                                        placeholder="ATI/AD/0001/025"
                                        disabled={saving}
                                        className="w-full border border-zinc-200 bg-white py-3 pl-10 pr-4 font-mono text-sm font-semibold text-[#0B1E3D] outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-400/10 disabled:cursor-not-allowed disabled:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white dark:disabled:bg-zinc-800"
                                    />
                                </div>

                                <p className="mt-2 text-[11px] text-zinc-400">
                                    Format: ATI/&lt;COURSE_CODE&gt;/
                                    &lt;INDEX&gt;/&lt;YYY&gt;
                                </p>
                            </div>
                        )}

                        {/* Dates — only in 'dates' mode */}
                        {mode === "dates" && (
                            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                                {/* Date of Admission */}
                                <div>
                                    <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-zinc-600 dark:text-zinc-300">
                                        Date of Admission
                                    </label>

                                    <DatePicker
                                        value={dateOfAdmission}
                                        onChange={(val) => setDateOfAdmission(val)}
                                        placeholder="Select admission date"
                                        disabled={saving}
                                    />
                                </div>

                                {/* Date of Completion */}
                                <div>
                                    <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-zinc-600 dark:text-zinc-300">
                                        Date of Completion
                                    </label>

                                    <DatePicker
                                        value={dateOfCompletion}
                                        onChange={(val) => setDateOfCompletion(val)}
                                        placeholder="Select completion date"
                                        disabled={saving}
                                    />

                                    <p className="mt-2 text-[11px] text-zinc-400">
                                        Leave blank if the student has
                                        not completed the course.
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="flex flex-col-reverse gap-3 border-t border-zinc-100 bg-zinc-50 px-6 py-4 dark:border-zinc-800 dark:bg-zinc-950 sm:flex-row sm:justify-end">
                        <button
                            type="button"
                            onClick={() =>
                                router.push(`/students/${studentId}`)
                            }
                            disabled={saving}
                            className="inline-flex items-center justify-center gap-2 border border-zinc-200 bg-white px-5 py-2.5 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
                        >
                            Cancel
                        </button>

                        <button
                            type="submit"
                            disabled={saving || !enrollment}
                            className="inline-flex items-center justify-center gap-2 bg-[#0B1E3D] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#102c57] disabled:cursor-not-allowed disabled:opacity-50 dark:bg-orange-500 dark:hover:bg-orange-600"
                        >
                            {saving ? (
                                <>
                                    <Loader2
                                        size={16}
                                        className="animate-spin"
                                    />
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <Save size={16} />
                                    {mode === "admission"
                                        ? "Save Admission Number"
                                        : "Save Dates"}
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </main>
    );
}