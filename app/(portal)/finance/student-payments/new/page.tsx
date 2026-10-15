
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import SelectStudent from "@/app/(portal)/students/selectStudent";

import {
    studentFeeApi,
    type StudentFee,
    type CreateStudentFeeDto,
} from "@/app/types/student-fee";

import {
    type Student,
    type StudentCourse,
} from "@/app/types/students";

import {
    feeStructureApi,
    type FeeStructure,
} from "@/app/types/fee-structure";

const NAVY = "#1e3a5f";
const ORANGE = "#f59e0b";

function getId(
    value: { _id: string } | string | null | undefined,
): string {
    if (!value) return "";
    return typeof value === "string" ? value : value._id;
}

function studentName(student: Student): string {
    const { firstName, middleName, lastName } = student.fullName;

    return [firstName, middleName, lastName]
        .filter(Boolean)
        .join(" ");
}

function money(amount: number, currency = "KES"): string {
    return new Intl.NumberFormat("en-KE", {
        style: "currency",
        currency,
        maximumFractionDigits: 2,
    }).format(Number.isFinite(amount) ? amount : 0);
}

function courseName(
    enrollment: StudentCourse,
    structures: FeeStructure[],
): string {
    if (
        enrollment.courseId &&
        typeof enrollment.courseId === "object"
    ) {
        const course = enrollment.courseId;

        return [course.name, course.courseCode]
            .filter(Boolean)
            .join(" · ");
    }

    const id = getId(enrollment.courseId);

    const structure = structures.find(
        (item) => getId(item.courseId) === id,
    );

    return structure && typeof structure.courseId === "object"
        ? [
            structure.courseId.name,
            structure.courseId.courseCode,
        ]
            .filter(Boolean)
            .join(" · ")
        : `Course (${id})`;
}

export default function NewStudentPaymentPage() {
    const router = useRouter();

    const [students, setStudents] = useState<Student[]>([]);
    const [structures, setStructures] = useState<FeeStructure[]>([]);
    const [existingFees, setExistingFees] = useState<StudentFee[]>([]);

    const [studentId, setStudentId] = useState("");
    const [courseId, setCourseId] = useState("");
    const [feeStructureId, setFeeStructureId] = useState("");

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    // ---------------------------------------------------------
    // Load the data required for fee assignment.
    // ---------------------------------------------------------

    useEffect(() => {
        let mounted = true;

        async function load() {
            setLoading(true);
            setError("");

            try {
                const [
                    studentResponse,
                    structureRows,
                    feeRows,
                ] = await Promise.all([
                    import("@/app/types/students").then(
                        ({ studentApi }) => studentApi.getAll(),
                    ),
                    feeStructureApi.getAll(),
                    studentFeeApi.getAll(),
                ]);

                if (!mounted) return;

                setStudents(studentResponse.data ?? []);
                setStructures(structureRows);
                setExistingFees(feeRows);
            } catch (err) {
                if (!mounted) return;

                setError(
                    err instanceof Error
                        ? err.message
                        : "Could not load students and fee structures.",
                );
            } finally {
                if (mounted) {
                    setLoading(false);
                }
            }
        }

        void load();

        return () => {
            mounted = false;
        };
    }, []);

    // ---------------------------------------------------------
    // Resolve the selected student.
    // ---------------------------------------------------------

    const selectedStudent = useMemo(
        () =>
            students.find(
                (student) => student._id === studentId,
            ),
        [students, studentId],
    );

    // ---------------------------------------------------------
    // Only show courses the student is enrolled in.
    // ---------------------------------------------------------

    const enrolledCourses = useMemo(() => {
        if (!selectedStudent) return [];

        return selectedStudent.courses.filter(
            (enrollment) => Boolean(getId(enrollment.courseId)),
        );
    }, [selectedStudent]);

    const selectedEnrollment = useMemo(
        () =>
            enrolledCourses.find(
                (enrollment) =>
                    getId(enrollment.courseId) === courseId,
            ),
        [enrolledCourses, courseId],
    );

    // ---------------------------------------------------------
    // Only active fee structures for the selected course.
    // ---------------------------------------------------------

    const availableStructures = useMemo(
        () =>
            structures.filter(
                (structure) =>
                    structure.isActive &&
                    getId(structure.courseId) === courseId,
            ),
        [structures, courseId],
    );

    const selectedStructure = useMemo(
        () =>
            availableStructures.find(
                (structure) =>
                    structure._id === feeStructureId,
            ),
        [availableStructures, feeStructureId],
    );

    // ---------------------------------------------------------
    // Prevent duplicate active assignments for the same course.
    // ---------------------------------------------------------

    const existingAssignment = useMemo(
        () =>
            existingFees.find(
                (fee) =>
                    getId(fee.studentId) === studentId &&
                    getId(fee.courseId) === courseId &&
                    fee.status !== "CANCELLED",
            ),
        [existingFees, studentId, courseId],
    );

    // ---------------------------------------------------------
    // Selection handlers.
    // ---------------------------------------------------------

    function handleStudentChange(value: string) {
        setStudentId(value);
        setCourseId("");
        setFeeStructureId("");
        setError("");
        setSuccess("");
    }

    function handleCourseChange(value: string) {
        setCourseId(value);
        setFeeStructureId("");
        setError("");
        setSuccess("");
    }

    // ---------------------------------------------------------
    // Submit fee assignment.
    // ---------------------------------------------------------

    async function handleSubmit(
        event: FormEvent<HTMLFormElement>,
    ) {
        event.preventDefault();

        setError("");
        setSuccess("");

        if (!studentId || !selectedStudent) {
            setError("Select a student.");
            return;
        }

        if (
            !courseId ||
            !selectedEnrollment ||
            !getId(selectedEnrollment.courseId)
        ) {
            setError(
                "Select a course the student is enrolled in.",
            );
            return;
        }

        if (!feeStructureId || !selectedStructure) {
            setError(
                "Select an active fee structure for the selected course.",
            );
            return;
        }

        if (existingAssignment) {
            setError(
                "This student already has a fee assignment for this course. Review the existing assignment before proceeding.",
            );
            return;
        }

        const payload: CreateStudentFeeDto = {
            studentId,
            courseId,
            feeStructureId,
        };

        try {
            setSubmitting(true);

            await studentFeeApi.create(payload);

            setSuccess(
                "Fee structure assigned successfully.",
            );

            router.push("/finance/student-payments");
            router.refresh();
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Failed to assign the fee structure.",
            );
        } finally {
            setSubmitting(false);
        }
    }

    // ---------------------------------------------------------
    // Render.
    // ---------------------------------------------------------

    return (
        <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
            {/* Breadcrumbs */}

            <nav className="mb-3 flex gap-2 text-xs text-slate-500 dark:text-slate-400">
                <Link
                    href="/finance"
                    className="hover:text-amber-500"
                >
                    Finance
                </Link>

                <span>/</span>

                <Link
                    href="/finance/student-payments"
                    className="hover:text-amber-500"
                >
                    Student fees
                </Link>

                <span>/</span>
                <span>Assign</span>
            </nav>

            {/* Page heading */}

            <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-600">
                    Fee assignment
                </p>

                <h1 className="mt-2 text-3xl font-semibold text-slate-900 dark:text-white">
                    Assign a fee structure
                </h1>

                <p className="mt-2 max-w-2xl text-sm text-slate-500 dark:text-slate-400">
                    Select a student, choose one of their enrolled
                    courses, and assign an active fee structure for
                    that course.
                </p>
            </div>

            {/* Feedback */}

            {error && (
                <div
                    role="alert"
                    className="mt-6 rounded-sm border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300"
                >
                    {error}
                </div>
            )}

            {success && (
                <div
                    role="status"
                    className="mt-6 rounded-sm border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300"
                >
                    {success}
                </div>
            )}

            {loading ? (
                <div className="py-16 text-center text-sm text-slate-500">
                    Loading students and fee structures…
                </div>
            ) : (
                <form
                    onSubmit={handleSubmit}
                    className="mt-7 space-y-6"
                >
                    {/* Student and course */}

                    <section className="rounded-md border border-slate-200 bg-white p-5 sm:p-7 dark:border-slate-800 dark:bg-slate-900">
                        <div className="mb-6">
                            <h2 className="font-semibold text-slate-900 dark:text-white">
                                1. Student and course
                            </h2>

                            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                                Only courses enrolled by the selected
                                student are listed.
                            </p>
                        </div>

                        <div className="grid gap-5 sm:grid-cols-2">
                            {/* Searchable student selector */}

                            <div>
                                <label
                                    htmlFor="studentId"
                                    className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200"
                                >
                                    Student{" "}
                                    <span className="text-red-500">
                                        *
                                    </span>
                                </label>

                                <SelectStudent
                                    value={studentId}
                                    students={students}
                                    required
                                    placeholder="Search students..."
                                    onChange={(id) =>
                                        handleStudentChange(id)
                                    }
                                />

                                {students.length === 0 && (
                                    <p className="mt-2 text-xs text-amber-700 dark:text-amber-400">
                                        No students are available.
                                    </p>
                                )}
                            </div>

                            {/* Enrolled course selector */}

                            <div>
                                <label
                                    htmlFor="courseId"
                                    className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200"
                                >
                                    Enrolled course{" "}
                                    <span className="text-red-500">
                                        *
                                    </span>
                                </label>

                                <select
                                    id="courseId"
                                    value={courseId}
                                    onChange={(event) =>
                                        handleCourseChange(
                                            event.target.value,
                                        )
                                    }
                                    disabled={!selectedStudent}
                                    required
                                    className="w-full rounded-sm border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                                >
                                    <option value="">
                                        {selectedStudent
                                            ? "Select an enrolled course"
                                            : "Select a student first"}
                                    </option>

                                    {enrolledCourses.map(
                                        (enrollment, index) => {
                                            const id = getId(
                                                enrollment.courseId,
                                            );

                                            return (
                                                <option
                                                    key={
                                                        enrollment._id ??
                                                        `${id}-${index}`
                                                    }
                                                    value={id}
                                                >
                                                    {courseName(
                                                        enrollment,
                                                        structures,
                                                    )}
                                                </option>
                                            );
                                        },
                                    )}
                                </select>

                                {selectedStudent &&
                                    enrolledCourses.length === 0 && (
                                        <p className="mt-2 text-xs text-amber-700 dark:text-amber-400">
                                            This student has no enrolled
                                            courses.
                                        </p>
                                    )}
                            </div>
                        </div>
                    </section>

                    {/* Fee structure */}

                    <section className="rounded-md border border-slate-200 bg-white p-5 sm:p-7 dark:border-slate-800 dark:bg-slate-900">
                        <div className="mb-6">
                            <h2 className="font-semibold text-slate-900 dark:text-white">
                                2. Fee structure
                            </h2>

                            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                                Only active fee structures for the
                                selected course can be assigned.
                            </p>
                        </div>

                        <div>
                            <label
                                htmlFor="feeStructureId"
                                className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200"
                            >
                                Fee structure{" "}
                                <span className="text-red-500">
                                    *
                                </span>
                            </label>

                            <select
                                id="feeStructureId"
                                value={feeStructureId}
                                onChange={(event) =>
                                    setFeeStructureId(
                                        event.target.value,
                                    )
                                }
                                disabled={!courseId}
                                required
                                className="w-full rounded-sm border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                            >
                                <option value="">
                                    {courseId
                                        ? "Select a fee structure"
                                        : "Select a course first"}
                                </option>

                                {availableStructures.map(
                                    (structure) => (
                                        <option
                                            key={structure._id}
                                            value={structure._id}
                                        >
                                            {structure.name} —{" "}
                                            {money(
                                                structure.totalAmount,
                                                structure.currency,
                                            )}
                                        </option>
                                    ),
                                )}
                            </select>

                            {courseId &&
                                availableStructures.length === 0 && (
                                    <p className="mt-2 text-xs text-amber-700 dark:text-amber-400">
                                        No active fee structures are
                                        available for this course.
                                    </p>
                                )}
                        </div>

                        {/* Selected fee structure details */}

                        {selectedStructure && (
                            <div className="mt-5 overflow-hidden rounded-sm border border-slate-200 dark:border-slate-700">
                                <div className="flex flex-col justify-between gap-2 bg-slate-50 px-4 py-3 sm:flex-row sm:items-center dark:bg-slate-950/50">
                                    <div>
                                        <p className="font-medium text-slate-900 dark:text-white">
                                            {selectedStructure.name}
                                        </p>

                                        <p className="mt-1 text-xs text-slate-500">
                                            {
                                                selectedStructure.feeItems
                                                    .length
                                            }{" "}
                                            fee item
                                            {selectedStructure.feeItems
                                                .length === 1
                                                ? ""
                                                : "s"}
                                        </p>
                                    </div>

                                    <p
                                        className="text-xl font-semibold tabular-nums"
                                        style={{
                                            color: ORANGE,
                                        }}
                                    >
                                        {money(
                                            selectedStructure.totalAmount,
                                            selectedStructure.currency,
                                        )}
                                    </p>
                                </div>

                                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {selectedStructure.feeItems.map(
                                        (item, index) => (
                                            <div
                                                key={`${item.name}-${index}`}
                                                className="flex items-start justify-between gap-4 px-4 py-3"
                                            >
                                                <div>
                                                    <p className="text-sm font-medium text-slate-800 dark:text-slate-100">
                                                        {item.name}
                                                    </p>

                                                    {item.description && (
                                                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                                            {item.description}
                                                        </p>
                                                    )}
                                                </div>

                                                <p className="whitespace-nowrap text-sm tabular-nums text-slate-700 dark:text-slate-200">
                                                    {money(
                                                        item.amount,
                                                        selectedStructure.currency,
                                                    )}
                                                </p>
                                            </div>
                                        ),
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Duplicate assignment warning */}

                        {existingAssignment && (
                            <div className="mt-5 rounded-sm border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300">
                                This student already has a fee
                                assignment for this course. Review
                                the existing assignment before
                                creating another one.
                            </div>
                        )}
                    </section>

                    {/* Assignment summary */}

                    <section className="rounded-md border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-950/50">
                        <h2 className="font-semibold text-slate-900 dark:text-white">
                            Assignment summary
                        </h2>

                        <dl className="mt-4 space-y-3 text-sm">
                            <div className="flex justify-between gap-4">
                                <dt className="text-slate-500">
                                    Student
                                </dt>

                                <dd className="text-right font-medium text-slate-900 dark:text-white">
                                    {selectedStudent
                                        ? studentName(selectedStudent)
                                        : "Not selected"}
                                </dd>
                            </div>

                            <div className="flex justify-between gap-4">
                                <dt className="text-slate-500">
                                    Course
                                </dt>

                                <dd className="text-right font-medium text-slate-900 dark:text-white">
                                    {selectedEnrollment
                                        ? courseName(
                                            selectedEnrollment,
                                            structures,
                                        )
                                        : "Not selected"}
                                </dd>
                            </div>

                            <div className="flex justify-between gap-4">
                                <dt className="text-slate-500">
                                    Fee structure
                                </dt>

                                <dd className="text-right font-medium text-slate-900 dark:text-white">
                                    {selectedStructure?.name ??
                                        "Not selected"}
                                </dd>
                            </div>

                            <div className="flex justify-between gap-4 border-t border-slate-200 pt-3 dark:border-slate-800">
                                <dt className="font-medium text-slate-700 dark:text-slate-200">
                                    Total assessed
                                </dt>

                                <dd className="text-right text-lg font-semibold tabular-nums text-slate-900 dark:text-white">
                                    {selectedStructure
                                        ? money(
                                            selectedStructure.totalAmount,
                                            selectedStructure.currency,
                                        )
                                        : "—"}
                                </dd>
                            </div>
                        </dl>

                        <p className="mt-4 text-xs text-slate-500 dark:text-slate-400">
                            The fee assignment links the selected
                            student, enrolled course, and fee
                            structure. Payments are recorded
                            separately.
                        </p>
                    </section>

                    {/* Actions */}

                    <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                        <Link
                            href="/finance/student-payments"
                            className="inline-flex items-center justify-center rounded-sm border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                        >
                            Cancel
                        </Link>

                        <button
                            type="submit"
                            disabled={
                                submitting ||
                                !studentId ||
                                !courseId ||
                                !feeStructureId ||
                                Boolean(existingAssignment)
                            }
                            className="inline-flex items-center justify-center rounded-sm px-5 py-2.5 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                            style={{
                                backgroundColor: NAVY,
                            }}
                        >
                            {submitting
                                ? "Assigning…"
                                : "Assign fee structure"}
                        </button>
                    </div>
                </form>
            )}

            <div
                className="mt-8 h-1 w-20 rounded-full"
                style={{
                    backgroundColor: ORANGE,
                }}
            />
        </main>
    );
}
