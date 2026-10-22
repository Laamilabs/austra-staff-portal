"use client";

import Link from "next/link";
import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
    type FormEvent,
    type ReactNode,
} from "react";
import {
    Check,
    Circle,
    CircleCheck,
    LoaderCircle,
    RefreshCw,
    TriangleAlert,
} from "lucide-react";

import SelectStudent from "@/app/(portal)/students/selectStudent";

import {
    studentFeeApi,
    type StudentFee,
    type CreateStudentFeeDto,
    type DiscountType,
} from "@/app/types/student-fee";

import {
    studentApi,
    type Student,
    type StudentCourse,
} from "@/app/types/students";

import {
    feeStructureApi,
    type FeeStructure,
} from "@/app/types/fee-structure";

/* ------------------------------------------------------------------ */
/* Helpers (unchanged logic)                                           */
/* ------------------------------------------------------------------ */

function getId(
    value: { _id: string } | string | null | undefined,
): string {
    if (!value) return "";
    return typeof value === "string" ? value : value._id;
}

function studentName(student: Student): string {
    const { firstName, middleName, lastName } = student.fullName;
    return [firstName, middleName, lastName].filter(Boolean).join(" ");
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
    if (enrollment.courseId && typeof enrollment.courseId === "object") {
        const course = enrollment.courseId;
        return [course.name, course.courseCode].filter(Boolean).join(" · ");
    }

    const id = getId(enrollment.courseId);
    const structure = structures.find((item) => getId(item.courseId) === id);

    return structure && typeof structure.courseId === "object"
        ? [structure.courseId.name, structure.courseId.courseCode]
            .filter(Boolean)
            .join(" · ")
        : `Course (${id})`;
}

const initials = (name: string) =>
    name
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((p) => p[0]?.toUpperCase())
        .join("") || "?";

/* ------------------------------------------------------------------ */
/* Shared classes (Windows 11 feel: orange accent, rounded-sm)         */
/* ------------------------------------------------------------------ */

const FOCUS =
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#0B1E3D]";
const CARD =
    "rounded-sm border border-zinc-200 bg-white shadow-sm shadow-blue-950/5 dark:border-white/10 dark:bg-[#0B1E3D]";
const FIELD =
    "w-full rounded-sm border border-zinc-300 bg-white px-3 py-2.5 text-sm text-[#0B1E3D] shadow-sm outline-none transition-colors placeholder:text-zinc-400 hover:bg-zinc-50 focus:border-orange-400 focus:ring-2 focus:ring-orange-400/30 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/15 dark:bg-white/5 dark:text-white dark:hover:bg-white/10 dark:[color-scheme:dark] dark:[&>option]:bg-[#0B1E3D]";
const LABEL = "mb-1.5 block text-sm font-medium text-[#0B1E3D] dark:text-zinc-100";
const BTN =
    "inline-flex items-center justify-center gap-2 rounded-sm border border-zinc-300 bg-white px-4 py-2.5 text-sm font-semibold text-[#0B1E3D] shadow-sm transition-colors hover:bg-zinc-50 active:bg-zinc-100 disabled:opacity-50 dark:border-white/15 dark:bg-white/5 dark:text-white dark:hover:bg-white/10";
const PRIMARY =
    "inline-flex min-w-40 items-center justify-center gap-2 rounded-sm bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white shadow-sm shadow-blue-950/30 transition-colors hover:bg-orange-400 active:bg-orange-600 disabled:cursor-not-allowed disabled:bg-zinc-300 disabled:text-zinc-500 disabled:shadow-none dark:disabled:bg-white/10 dark:disabled:text-zinc-500";

const DISCOUNT_REASONS = [
    "Merit scholarship",
    "Sibling discount",
    "Bursary",
    "Staff waiver",
];

/* ------------------------------------------------------------------ */
/* Small presentational pieces                                         */
/* ------------------------------------------------------------------ */

function InfoBar({
    tone,
    title,
    children,
    action,
    role,
}: {
    tone: "error" | "success" | "warning" | "info";
    title: string;
    children?: ReactNode;
    action?: ReactNode;
    role?: "alert" | "status";
}) {
    const styles = {
        error: "border-red-200 border-l-red-500 bg-red-50 text-red-700 dark:border-red-500/25 dark:border-l-red-500 dark:bg-red-500/10 dark:text-red-300",
        success: "border-emerald-200 border-l-emerald-500 bg-emerald-50 text-emerald-800 dark:border-emerald-500/25 dark:border-l-emerald-500 dark:bg-emerald-500/10 dark:text-emerald-300",
        warning: "border-amber-200 border-l-amber-500 bg-amber-50 text-amber-800 dark:border-amber-500/25 dark:border-l-amber-500 dark:bg-amber-500/10 dark:text-amber-300",
        info: "border-blue-200 border-l-blue-500 bg-blue-50 text-blue-900 dark:border-blue-400/20 dark:border-l-blue-400 dark:bg-blue-500/10 dark:text-blue-100",
    }[tone];
    const Icon = tone === "success" ? CircleCheck : TriangleAlert;
    return (
        <div
            role={role}
            className={`flex flex-col gap-3 rounded-sm border border-l-4 p-3.5 sm:flex-row sm:items-center ${styles}`}
        >
            <Icon size={18} className="shrink-0" aria-hidden />
            <div className="min-w-0 flex-1 text-sm">
                <p className="font-semibold">{title}</p>
                {children && <div className="mt-0.5 break-words opacity-90">{children}</div>}
            </div>
            {action}
        </div>
    );
}

function StepCard({
    n,
    title,
    hint,
    done,
    optional,
    dimmed,
    children,
}: {
    n: number;
    title: string;
    hint: string;
    done: boolean;
    optional?: boolean;
    dimmed?: boolean;
    children: ReactNode;
}) {
    return (
        <section className={`${CARD} min-w-0 transition-opacity ${dimmed ? "opacity-75" : ""}`}>
            <header className="flex items-start gap-3 border-b border-zinc-100 px-4 py-4 sm:px-6 dark:border-white/10">
                <span
                    aria-hidden
                    className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-sm text-sm font-semibold transition-colors ${done
                        ? "bg-emerald-500 text-white"
                        : "bg-[#0B1E3D] text-white dark:bg-orange-400/15 dark:text-orange-300"}`}
                >
                    {done ? <Check size={16} /> : n}
                </span>
                <div className="min-w-0">
                    <h2 className="font-semibold text-[#0B1E3D] dark:text-white">
                        {title}
                        {optional && (
                            <span className="ml-2 text-sm font-normal text-zinc-400">Optional</span>
                        )}
                    </h2>
                    <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">{hint}</p>
                </div>
            </header>
            <div className="p-4 sm:p-6">{children}</div>
        </section>
    );
}

function SummaryItem({ label, children }: { label: string; children: ReactNode }) {
    return (
        <div className="min-w-0">
            <dt className="text-xs text-zinc-500 dark:text-zinc-400">{label}</dt>
            <dd className="mt-0.5 break-words text-sm font-medium text-[#0B1E3D] dark:text-white">
                {children}
            </dd>
        </div>
    );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function NewStudentPaymentPage() {
    const [students, setStudents] = useState<Student[]>([]);
    const [structures, setStructures] = useState<FeeStructure[]>([]);
    const [existingFees, setExistingFees] = useState<StudentFee[]>([]);

    const [studentId, setStudentId] = useState("");
    const [courseId, setCourseId] = useState("");
    const [feeStructureId, setFeeStructureId] = useState("");

    const [discountType, setDiscountType] = useState<"" | DiscountType>("");
    const [discountValue, setDiscountValue] = useState("");
    const [discountReason, setDiscountReason] = useState("");

    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState("");
    const [elapsed, setElapsed] = useState(0);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const mounted = useRef(true);
    const feedbackRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        mounted.current = true;
        return () => {
            mounted.current = false;
        };
    }, []);

    // ---------------------------------------------------------
    // Load the data required for fee assignment.
    // ---------------------------------------------------------

    const load = useCallback(async () => {
        setLoading(true);
        setLoadError("");

        try {
            const [studentResponse, structureRows, feeRows] = await Promise.all([
                studentApi.getAll(),
                feeStructureApi.getAll(),
                studentFeeApi.getAll(),
            ]);

            if (!mounted.current) return;

            setStudents(studentResponse.data ?? []);
            setStructures(structureRows);
            setExistingFees(feeRows);
        } catch (err) {
            if (!mounted.current) return;
            setLoadError(
                err instanceof Error
                    ? err.message
                    : "Could not load students and fee structures.",
            );
        } finally {
            if (mounted.current) setLoading(false);
        }
    }, []);

    useEffect(() => {
        void load();
    }, [load]);

    // Elapsed timer so a slow load feels accounted for.
    useEffect(() => {
        if (!loading) {
            setElapsed(0);
            return;
        }
        const started = Date.now();
        const id = setInterval(
            () => setElapsed(Math.floor((Date.now() - started) / 1000)),
            1000,
        );
        return () => clearInterval(id);
    }, [loading]);

    // Bring feedback into view when it appears.
    useEffect(() => {
        if (error || success)
            feedbackRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }, [error, success]);

    // ---------------------------------------------------------
    // Derived selections.
    // ---------------------------------------------------------

    const selectedStudent = useMemo(
        () => students.find((student) => student._id === studentId),
        [students, studentId],
    );

    const enrolledCourses = useMemo(() => {
        if (!selectedStudent) return [];
        return selectedStudent.courses.filter((enrollment) =>
            Boolean(getId(enrollment.courseId)),
        );
    }, [selectedStudent]);

    const selectedEnrollment = useMemo(
        () => enrolledCourses.find((e) => getId(e.courseId) === courseId),
        [enrolledCourses, courseId],
    );

    const availableStructures = useMemo(
        () =>
            structures.filter(
                (s) => s.isActive && getId(s.courseId) === courseId,
            ),
        [structures, courseId],
    );

    const selectedStructure = useMemo(
        () => availableStructures.find((s) => s._id === feeStructureId),
        [availableStructures, feeStructureId],
    );

    // A student can hold several active assignments on one course (one per
    // fee structure). Only the same structure twice is blocked.
    const courseAssignments = useMemo(
        () =>
            existingFees.filter(
                (fee) =>
                    getId(fee.studentId) === studentId &&
                    getId(fee.courseId) === courseId &&
                    fee.status !== "CANCELLED",
            ),
        [existingFees, studentId, courseId],
    );

    const assignedStructureIds = useMemo(
        () => new Set(courseAssignments.map((fee) => getId(fee.feeStructureId))),
        [courseAssignments],
    );

    const existingAssignment = useMemo(
        () => Boolean(feeStructureId && assignedStructureIds.has(feeStructureId)),
        [assignedStructureIds, feeStructureId],
    );

    const allStructuresAssigned = useMemo(
        () =>
            availableStructures.length > 0 &&
            availableStructures.every((s) => assignedStructureIds.has(s._id)),
        [availableStructures, assignedStructureIds],
    );

    // ---------------------------------------------------------
    // Discount preview (mirrors the server's derivation).
    // ---------------------------------------------------------

    const parsedDiscountValue = parseFloat(discountValue);
    const hasDiscount =
        Boolean(discountType) &&
        Number.isFinite(parsedDiscountValue) &&
        parsedDiscountValue > 0;

    const discountPreview = useMemo(() => {
        const gross = selectedStructure?.totalAmount ?? 0;

        if (!hasDiscount || !selectedStructure) {
            return { gross, amount: 0, net: gross };
        }

        const value = parsedDiscountValue;
        let amount =
            discountType === "PERCENTAGE"
                ? (gross * Math.min(100, value)) / 100
                : Math.max(0, value);

        amount = Math.min(gross, Math.round(amount * 100) / 100);

        return { gross, amount, net: Math.max(0, gross - amount) };
    }, [hasDiscount, parsedDiscountValue, discountType, selectedStructure]);

    const discountInvalid =
        hasDiscount &&
        Boolean(selectedStructure) &&
        ((discountType === "PERCENTAGE" && parsedDiscountValue > 100) ||
            (discountType === "FIXED" &&
                parsedDiscountValue > (selectedStructure?.totalAmount ?? 0)));

    // What is still needed before the assignment can be made.
    const missing: string[] = [];
    if (!selectedStudent) missing.push("Select a student");
    if (selectedStudent && !selectedEnrollment) missing.push("Choose an enrolled course");
    if (selectedEnrollment && !selectedStructure) missing.push("Pick a fee structure");
    if (existingAssignment) missing.push("Pick a structure not yet assigned");
    if (discountType && !hasDiscount) missing.push("Enter a discount value, or choose No discount");
    if (discountInvalid) missing.push("Fix the discount value");
    const canSubmit = missing.length === 0 && !submitting;

    const currency = selectedStructure?.currency ?? "KES";
    const netPayable = selectedStructure
        ? hasDiscount
            ? discountPreview.net
            : selectedStructure.totalAmount
        : null;

    // ---------------------------------------------------------
    // Handlers.
    // ---------------------------------------------------------

    function clearFeedback() {
        setError("");
        setSuccess("");
    }

    function resetDiscount() {
        setDiscountType("");
        setDiscountValue("");
        setDiscountReason("");
    }

    function handleStudentChange(value: string) {
        setStudentId(value);

        // One enrolled course: no reason to make the operator pick it.
        const next = students.find((s) => s._id === value);
        const courses = (next?.courses ?? []).filter((e) => Boolean(getId(e.courseId)));
        setCourseId(courses.length === 1 ? getId(courses[0].courseId) : "");

        setFeeStructureId("");
        resetDiscount();
        clearFeedback();
    }

    function handleCourseChange(value: string) {
        setCourseId(value);
        setFeeStructureId("");
        resetDiscount();
        clearFeedback();
    }

    function handleStructureChange(value: string) {
        setFeeStructureId(value);
        clearFeedback();
    }

    function handleDiscountType(next: "" | DiscountType) {
        setDiscountType(next);
        if (!next) {
            setDiscountValue("");
            setDiscountReason("");
        } else {
            setDiscountValue("");
        }
        setError("");
    }

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        setError("");
        setSuccess("");

        if (!studentId || !selectedStudent) {
            setError("Select a student.");
            return;
        }

        if (!courseId || !selectedEnrollment || !getId(selectedEnrollment.courseId)) {
            setError("Select a course the student is enrolled in.");
            return;
        }

        if (!feeStructureId || !selectedStructure) {
            setError("Select an active fee structure for the selected course.");
            return;
        }

        if (existingAssignment) {
            setError(
                "This fee structure is already assigned to this student for this course.",
            );
            return;
        }

        if (discountType) {
            if (!hasDiscount) {
                setError(
                    "Enter a discount value greater than zero, or set the discount type to 'No discount'.",
                );
                return;
            }

            if (discountType === "PERCENTAGE" && parsedDiscountValue > 100) {
                setError("Percentage discount cannot exceed 100%.");
                return;
            }

            if (
                discountType === "FIXED" &&
                parsedDiscountValue > selectedStructure.totalAmount
            ) {
                setError("Fixed discount cannot exceed the fee structure total.");
                return;
            }
        }

        const payload: CreateStudentFeeDto = {
            studentId,
            courseId,
            feeStructureId,
            ...(hasDiscount
                ? {
                    discountType: discountType as DiscountType,
                    discountValue: parsedDiscountValue,
                    discountReason: discountReason.trim() || undefined,
                }
                : {}),
        };

        try {
            setSubmitting(true);

            await studentFeeApi.create(payload);

            // Refetch so the "already assigned" hints reflect the new record.
            try {
                const rows = await studentFeeApi.getAll();
                setExistingFees(rows);
            } catch {
                // Assignment succeeded; a stale list only affects hints.
            }

            const studentLabel = studentName(selectedStudent);
            const courseLabel = courseName(selectedEnrollment, structures);

            const discountSuffix = hasDiscount
                ? ` with a ${money(discountPreview.amount, selectedStructure.currency)} discount`
                : "";

            setSuccess(
                `"${selectedStructure.name}" assigned to ${studentLabel} for ${courseLabel}${discountSuffix}. You can assign another fee structure (e.g. next semester) below.`,
            );

            // Keep student + course so another semester is quick to add.
            setFeeStructureId("");
            resetDiscount();
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

    const submitLabel = submitting
        ? "Assigning…"
        : success
            ? "Assign another"
            : "Assign fee structure";

    const submitContent = (
        <>
            {submitting && <LoaderCircle size={16} className="motion-safe:animate-spin" />}
            {submitLabel}
        </>
    );

    // ---------------------------------------------------------
    // Render.
    // ---------------------------------------------------------

    return (
        <main className="mx-auto w-full min-w-0 max-w-full px-4 py-6 pb-28 sm:px-6 sm:py-8 lg:px-8 lg:pb-8">
            <style>{`@keyframes assignSlide{0%{transform:translateX(-100%)}100%{transform:translateX(450%)}}`}</style>

            <nav className="mb-3 flex flex-wrap gap-x-2 text-xs text-zinc-500 dark:text-zinc-400">
                <Link href="/finance" className="hover:text-orange-500">Finance</Link>
                <span aria-hidden>/</span>
                <Link href="/finance/student-payments" className="hover:text-orange-500">Student fees</Link>
                <span aria-hidden>/</span>
                <span>Assign</span>
            </nav>

            <div>
                <h1 className="text-3xl font-semibold text-[#0B1E3D] dark:text-white">
                    Assign a fee structure
                </h1>
                <p className="mt-1.5 max-w-3xl text-sm text-zinc-500 dark:text-zinc-400">
                    Choose a student and one of their courses, then pick the fee structure to bill.
                    A student can hold several structures on one course, such as one per semester,
                    but each structure only once.
                </p>
            </div>

            {/* First load: patience + visible progress */}
            {loading && (
                <div className="mt-6" aria-busy="true">
                    <div className={`${CARD} p-5`}>
                        <div className="flex items-center gap-3">
                            <LoaderCircle size={20} className="text-orange-500 motion-safe:animate-spin" />
                            <div className="min-w-0 flex-1">
                                <p className="text-sm font-semibold text-[#0B1E3D] dark:text-white">
                                    Loading students and fee structures
                                </p>
                                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                                    {elapsed < 8
                                        ? "Getting enrolments and existing assignments."
                                        : "Still loading. Large student lists can take a little longer."}
                                </p>
                            </div>
                            <span className="text-xs tabular-nums text-zinc-400">{elapsed}s</span>
                        </div>
                        <div className="relative mt-4 h-1 overflow-hidden rounded-sm bg-zinc-100 dark:bg-white/10">
                            <div className="absolute inset-y-0 left-0 w-1/4 rounded-sm bg-orange-500 motion-safe:animate-[assignSlide_1.4s_ease-in-out_infinite] motion-reduce:w-full motion-reduce:opacity-50" />
                        </div>
                    </div>
                    <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
                        <div className="space-y-4">
                            {[0, 1, 2].map((i) => (
                                <div key={i} className={`${CARD} h-40 motion-safe:animate-pulse`} />
                            ))}
                        </div>
                        <div className={`${CARD} hidden h-64 motion-safe:animate-pulse lg:block`} />
                    </div>
                </div>
            )}

            {/* Load failure: specific and recoverable */}
            {!loading && loadError && (
                <div className="mt-6">
                    <InfoBar
                        tone="error"
                        role="alert"
                        title="Couldn’t load students and fee structures"
                        action={
                            <button
                                type="button"
                                onClick={() => void load()}
                                className="inline-flex items-center justify-center gap-1.5 rounded-sm bg-red-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-red-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-2"
                            >
                                <RefreshCw size={14} /> Try again
                            </button>
                        }
                    >
                        {loadError}
                    </InfoBar>
                </div>
            )}

            {!loading && !loadError && (
                <form onSubmit={handleSubmit} className="mt-6">
                    {/* Feedback from the last action */}
                    <div ref={feedbackRef} className="space-y-3 empty:hidden">
                        {error && (
                            <InfoBar tone="error" role="alert" title="Couldn’t assign the fee structure">
                                {error}
                            </InfoBar>
                        )}
                        {success && (
                            <InfoBar
                                tone="success"
                                role="status"
                                title="Fee structure assigned"
                                action={
                                    <Link
                                        href="/finance/student-payments"
                                        className={`${BTN} px-3.5 py-2 text-xs ${FOCUS}`}
                                    >
                                        View student fees
                                    </Link>
                                }
                            >
                                {success}
                            </InfoBar>
                        )}
                    </div>

                    <div className="mt-4 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] xl:grid-cols-[minmax(0,1fr)_26rem]">
                        {/* ---------------- Steps ---------------- */}
                        <fieldset disabled={submitting} className="min-w-0 space-y-5 border-0 p-0">
                            {/* 1. Student and course */}
                            <StepCard
                                n={1}
                                title="Student and course"
                                hint="Only courses the student is enrolled in are listed."
                                done={Boolean(selectedStudent && selectedEnrollment)}
                            >
                                <div className="flex flex-col">
                                    <div className="min-w-0">
                                        <label htmlFor="studentId" className={LABEL}>
                                            Student <span className="text-red-500">*</span>
                                        </label>
                                        <SelectStudent
                                            value={studentId}
                                            students={students}
                                            required
                                            placeholder="Search students..."
                                            onChange={(id) => handleStudentChange(id)}
                                        />
                                        {students.length === 0 && (
                                            <p className="mt-2 text-xs text-amber-700 dark:text-amber-400">
                                                No students are available.
                                            </p>
                                        )}
                                        {selectedStudent?.contact?.email && (
                                            <p className="mt-2 truncate text-xs text-zinc-500 dark:text-zinc-400">
                                                {selectedStudent.contact.email}
                                            </p>
                                        )}
                                    </div>

                                    <div className="min-w-0">
                                        <label htmlFor="courseId" className={LABEL}>
                                            Enrolled course <span className="text-red-500">*</span>
                                        </label>
                                        <select
                                            id="courseId"
                                            value={courseId}
                                            onChange={(e) => handleCourseChange(e.target.value)}
                                            disabled={!selectedStudent}
                                            required
                                            className={FIELD}
                                        >
                                            <option value="">
                                                {selectedStudent
                                                    ? "Select an enrolled course"
                                                    : "Select a student first"}
                                            </option>
                                            {enrolledCourses.map((enrollment, index) => {
                                                const id = getId(enrollment.courseId);
                                                return (
                                                    <option key={enrollment._id ?? `${id}-${index}`} value={id}>
                                                        {courseName(enrollment, structures)}
                                                    </option>
                                                );
                                            })}
                                        </select>
                                        {selectedStudent && enrolledCourses.length === 0 && (
                                            <p className="mt-2 text-xs text-amber-700 dark:text-amber-400">
                                                This student has no enrolled courses.
                                            </p>
                                        )}
                                    </div>
                                </div>

                                {studentId && courseId && (
                                    <div className="mt-5 rounded-sm border border-zinc-200 bg-zinc-50 p-4 dark:border-white/10 dark:bg-white/5">
                                        <p className="text-sm font-medium text-[#0B1E3D] dark:text-white">
                                            Already assigned on this course
                                        </p>
                                        {courseAssignments.length === 0 ? (
                                            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                                                Nothing yet. This will be the first.
                                            </p>
                                        ) : (
                                            <ul className="mt-3 divide-y divide-zinc-200 dark:divide-white/10">
                                                {courseAssignments.map((fee) => {
                                                    const structure = structures.find(
                                                        (s) => s._id === getId(fee.feeStructureId),
                                                    );
                                                    return (
                                                        <li
                                                            key={fee._id}
                                                            className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5 py-2 text-sm first:pt-0 last:pb-0"
                                                        >
                                                            <span className="min-w-0 break-words text-zinc-700 dark:text-zinc-200">
                                                                {structure?.name ?? "Unknown structure"}
                                                            </span>
                                                            <span className="text-xs tabular-nums text-zinc-500 dark:text-zinc-400">
                                                                {money(fee.amountPaid, fee.currency)} paid of{" "}
                                                                {money(fee.totalAmount, fee.currency)}
                                                            </span>
                                                        </li>
                                                    );
                                                })}
                                            </ul>
                                        )}
                                    </div>
                                )}
                            </StepCard>

                            {/* 2. Fee structure */}
                            <StepCard
                                n={2}
                                title="Fee structure"
                                hint="Active structures for this course. Ones already assigned are greyed out."
                                done={Boolean(selectedStructure) && !existingAssignment}
                                dimmed={!courseId}
                            >
                                {!courseId ? (
                                    <p className="rounded-sm border border-dashed border-zinc-300 px-4 py-8 text-center text-sm text-zinc-500 dark:border-white/15 dark:text-zinc-400">
                                        Choose a student and course to see its fee structures.
                                    </p>
                                ) : availableStructures.length === 0 ? (
                                    <InfoBar tone="warning" title="No active fee structures for this course">
                                        Create or activate one under Fee structures, then come back.
                                    </InfoBar>
                                ) : (
                                    <>
                                        {allStructuresAssigned && (
                                            <div className="mb-4">
                                                <InfoBar tone="warning" title="Everything is already assigned">
                                                    Every active fee structure for this course has been assigned to this student.
                                                </InfoBar>
                                            </div>
                                        )}

                                        {/* Fee structures — selectable rows */}
                                        <div
                                            role="radiogroup"
                                            aria-label="Fee structure"
                                            className="divide-y divide-zinc-200 overflow-hidden rounded-sm border border-zinc-200 dark:divide-white/10 dark:border-white/10"
                                        >
                                            {availableStructures.map((structure) => {
                                                const taken = assignedStructureIds.has(structure._id);
                                                const selected = feeStructureId === structure._id;

                                                return (
                                                    <label
                                                        key={structure._id}
                                                        className={`block min-w-0 transition-colors ${taken
                                                                ? "cursor-not-allowed bg-zinc-50/70 opacity-60 dark:bg-white/[0.02]"
                                                                : "cursor-pointer hover:bg-zinc-50 dark:hover:bg-white/[0.04]"
                                                            }`}
                                                    >
                                                        <input
                                                            type="radio"
                                                            name="feeStructure"
                                                            value={structure._id}
                                                            checked={selected}
                                                            disabled={taken}
                                                            onChange={() => handleStructureChange(structure._id)}
                                                            className="peer sr-only"
                                                        />

                                                        <span
                                                            className={`flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2 border-l-[3px] px-3 py-3 transition-colors sm:px-4 ${selected
                                                                    ? "border-l-orange-500 bg-orange-50/70 dark:bg-orange-500/[0.07]"
                                                                    : "border-l-transparent"
                                                                } peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-orange-400 peer-focus-visible:-outline-offset-2`}
                                                        >
                                                            {/* Selection indicator */}
                                                            <span className="shrink-0">
                                                                {selected ? (
                                                                    <CircleCheck
                                                                        size={18}
                                                                        className="text-orange-500"
                                                                        aria-hidden="true"
                                                                    />
                                                                ) : (
                                                                    <Circle
                                                                        size={18}
                                                                        className="text-zinc-300 dark:text-zinc-600"
                                                                        aria-hidden="true"
                                                                    />
                                                                )}
                                                            </span>

                                                            {/* Structure details */}
                                                            <span className="min-w-0 flex-1 basis-40">
                                                                <span className="block break-words text-sm font-semibold text-[#0B1E3D] dark:text-white">
                                                                    {structure.name}
                                                                </span>

                                                                <span className="mt-1 block text-xs text-zinc-500 dark:text-zinc-400">
                                                                    {structure.feeItems.length} fee item
                                                                    {structure.feeItems.length === 1 ? "" : "s"}
                                                                </span>
                                                            </span>

                                                            {/* Assignment status */}
                                                            {taken && (
                                                                <span className="order-3 rounded-sm bg-zinc-200 px-2 py-1 text-xs font-medium text-zinc-600 dark:bg-white/10 dark:text-zinc-300 sm:order-none">
                                                                    Already assigned
                                                                </span>
                                                            )}

                                                            {/* Total amount */}
                                                            <span className="ml-auto shrink-0 text-right">
                                                                <span className="block text-sm font-bold tabular-nums text-[#0B1E3D] dark:text-white">
                                                                    {money(
                                                                        structure.totalAmount,
                                                                        structure.currency
                                                                    )}
                                                                </span>
                                                                <span className="mt-0.5 block text-[10px] uppercase tracking-wide text-zinc-400">
                                                                    Total fee
                                                                </span>
                                                            </span>
                                                        </span>
                                                    </label>
                                                );
                                            })}
                                        </div>

                                        {/* Selected structure breakdown */}
                                        {selectedStructure && (
                                            <details
                                                open
                                                className="mt-4 overflow-hidden rounded-sm border border-zinc-200 dark:border-white/10"
                                            >
                                                <summary className="cursor-pointer select-none bg-zinc-50 px-4 py-3 text-sm font-medium text-[#0B1E3D] marker:text-zinc-400 hover:bg-zinc-100 dark:bg-white/5 dark:text-white dark:hover:bg-white/10">
                                                    What’s included in {selectedStructure.name}
                                                </summary>

                                                <ul className="divide-y divide-zinc-100 dark:divide-white/10">
                                                    {selectedStructure.feeItems.map((item, index) => (
                                                        <li
                                                            key={`${item.name}-${index}`}
                                                            className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-4 py-3"
                                                        >
                                                            <div className="min-w-0 flex-1 basis-48">
                                                                <p className="break-words text-sm font-medium text-[#0B1E3D] dark:text-zinc-100">
                                                                    {item.name}
                                                                </p>

                                                                {item.description && (
                                                                    <p className="mt-0.5 break-words text-xs text-zinc-500 dark:text-zinc-400">
                                                                        {item.description}
                                                                    </p>
                                                                )}
                                                            </div>

                                                            <p className="text-sm tabular-nums text-zinc-700 dark:text-zinc-200">
                                                                {money(
                                                                    item.amount,
                                                                    selectedStructure.currency
                                                                )}
                                                            </p>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </details>
                                        )}
                                    </>
                                )}
                            </StepCard>


                            {/* 3. Discount */}
                            <StepCard
                                n={3}
                                title="Discount"
                                optional
                                hint="Scholarship, sibling discount or bursary. Locked once a payment is recorded."
                                done={hasDiscount && !discountInvalid}
                                dimmed={!selectedStructure}
                            >
                                <div className="grid gap-5 md:grid-cols-2">
                                    <div className="min-w-0">
                                        <span id="discount-type-label" className={LABEL}>Discount type</span>
                                        <div
                                            role="group"
                                            aria-labelledby="discount-type-label"
                                            className="grid grid-cols-3 rounded-sm border border-zinc-200 bg-zinc-100 p-0.5 dark:border-white/10 dark:bg-white/5"
                                        >
                                            {(
                                                [
                                                    ["", "None"],
                                                    ["PERCENTAGE", "Percent"],
                                                    ["FIXED", "Fixed"],
                                                ] as const
                                            ).map(([value, label]) => {
                                                const active = discountType === value;
                                                return (
                                                    <button
                                                        key={label}
                                                        type="button"
                                                        aria-pressed={active}
                                                        disabled={!selectedStructure}
                                                        onClick={() => handleDiscountType(value as "" | DiscountType)}
                                                        className={`relative rounded-sm px-2 py-2 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${FOCUS} ${active
                                                            ? "bg-white font-semibold text-[#0B1E3D] shadow-sm after:absolute after:inset-x-3 after:bottom-0 after:h-0.5 after:rounded-sm after:bg-orange-400 dark:bg-white/15 dark:text-white"
                                                            : "text-zinc-600 hover:bg-white/60 dark:text-zinc-300 dark:hover:bg-white/10"}`}
                                                    >
                                                        {label}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    <div className="min-w-0">
                                        <label htmlFor="discountValue" className={LABEL}>
                                            Discount value
                                        </label>
                                        <div className="relative">
                                            {discountType === "FIXED" && selectedStructure && (
                                                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs font-medium text-zinc-500">
                                                    {selectedStructure.currency}
                                                </span>
                                            )}
                                            <input
                                                id="discountValue"
                                                type="number"
                                                inputMode="decimal"
                                                min={0}
                                                max={discountType === "PERCENTAGE" ? 100 : undefined}
                                                step="0.01"
                                                value={discountValue}
                                                onChange={(e) => {
                                                    setDiscountValue(e.target.value);
                                                    setError("");
                                                }}
                                                disabled={!discountType}
                                                aria-invalid={discountInvalid}
                                                placeholder={
                                                    discountType === "PERCENTAGE"
                                                        ? "e.g. 10"
                                                        : discountType === "FIXED"
                                                            ? "e.g. 5000"
                                                            : "Choose a type first"
                                                }
                                                className={`${FIELD} tabular-nums ${discountType === "FIXED" ? "pl-14" : ""} ${discountType === "PERCENTAGE" ? "pr-9" : ""} ${discountInvalid ? "border-red-500 focus:border-red-500 focus:ring-red-500/25" : ""}`}
                                            />
                                            {discountType === "PERCENTAGE" && (
                                                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-zinc-500">
                                                    %
                                                </span>
                                            )}
                                        </div>

                                        {discountType === "PERCENTAGE" && (
                                            <div className="mt-2 flex flex-wrap gap-1.5">
                                                {[5, 10, 25, 50].map((n) => (
                                                    <button
                                                        key={n}
                                                        type="button"
                                                        onClick={() => setDiscountValue(String(n))}
                                                        className={`rounded-sm border border-zinc-200 px-2.5 py-1 text-xs font-semibold text-zinc-600 hover:bg-zinc-50 dark:border-white/15 dark:text-zinc-300 dark:hover:bg-white/10 ${FOCUS}`}
                                                    >
                                                        {n}%
                                                    </button>
                                                ))}
                                            </div>
                                        )}

                                        {discountInvalid && (
                                            <p role="alert" className="mt-2 flex items-start gap-1.5 text-xs text-red-600 dark:text-red-400">
                                                <TriangleAlert size={14} className="mt-px shrink-0" aria-hidden />
                                                {discountType === "PERCENTAGE"
                                                    ? "A percentage discount cannot exceed 100%."
                                                    : `A fixed discount cannot exceed the fee structure total (${money(selectedStructure?.totalAmount ?? 0, currency)}).`}
                                            </p>
                                        )}
                                    </div>
                                </div>

                                <div className="mt-5">
                                    <label htmlFor="discountReason" className={LABEL}>
                                        Reason <span className="font-normal text-zinc-400">(recommended)</span>
                                    </label>
                                    <input
                                        id="discountReason"
                                        type="text"
                                        maxLength={200}
                                        value={discountReason}
                                        onChange={(e) => setDiscountReason(e.target.value)}
                                        disabled={!discountType}
                                        placeholder="e.g. Merit scholarship, sibling discount, staff waiver"
                                        className={FIELD}
                                    />
                                    {discountType && (
                                        <div className="mt-2 flex flex-wrap gap-1.5">
                                            {DISCOUNT_REASONS.map((r) => (
                                                <button
                                                    key={r}
                                                    type="button"
                                                    onClick={() => setDiscountReason(r)}
                                                    className={`rounded-sm border border-zinc-200 px-2.5 py-1 text-xs font-medium text-zinc-600 hover:bg-zinc-50 dark:border-white/15 dark:text-zinc-300 dark:hover:bg-white/10 ${FOCUS}`}
                                                >
                                                    {r}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {hasDiscount && selectedStructure && !discountInvalid && (
                                    <div className="mt-5 rounded-sm border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-500/25 dark:bg-emerald-500/10">
                                        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 text-sm">
                                            <span className="text-emerald-800 dark:text-emerald-300">
                                                {money(discountPreview.amount, currency)} off{" "}
                                                {money(discountPreview.gross, currency)}
                                            </span>
                                            <span className="font-semibold tabular-nums text-emerald-900 dark:text-emerald-200">
                                                Net {money(discountPreview.net, currency)}
                                            </span>
                                        </div>
                                        <div
                                            role="img"
                                            aria-label={`Net payable is ${discountPreview.gross > 0 ? Math.round((discountPreview.net / discountPreview.gross) * 100) : 0}% of the total`}
                                            className="mt-3 flex h-2 overflow-hidden rounded-sm bg-white/70 dark:bg-white/10"
                                        >
                                            <div
                                                className="h-full bg-blue-600 transition-[width] duration-300"
                                                style={{ width: `${discountPreview.gross > 0 ? (discountPreview.net / discountPreview.gross) * 100 : 0}%` }}
                                            />
                                            <div className="h-full flex-1 bg-orange-400" />
                                        </div>
                                    </div>
                                )}
                            </StepCard>
                        </fieldset>

                        {/* ---------------- Summary ---------------- */}
                        <aside className="min-w-0 lg:sticky lg:top-6">
                            <section className={`${CARD} overflow-hidden`} aria-label="Assignment summary">
                                <div aria-hidden className="h-0.5 bg-orange-400" />
                                <div className="p-5">
                                    <h2 className="font-semibold text-[#0B1E3D] dark:text-white">
                                        Assignment summary
                                    </h2>

                                    <dl className="mt-4 space-y-3.5">
                                        <SummaryItem label="Student">
                                            {selectedStudent ? (
                                                <span className="flex items-center gap-2.5">
                                                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-sm bg-[#0B1E3D] text-xs font-semibold text-white dark:bg-orange-400/15 dark:text-orange-300">
                                                        {initials(studentName(selectedStudent))}
                                                    </span>
                                                    <span className="min-w-0">{studentName(selectedStudent)}</span>
                                                </span>
                                            ) : (
                                                <span className="font-normal text-zinc-400">Not selected</span>
                                            )}
                                        </SummaryItem>
                                        <SummaryItem label="Course">
                                            {selectedEnrollment ? (
                                                courseName(selectedEnrollment, structures)
                                            ) : (
                                                <span className="font-normal text-zinc-400">Not selected</span>
                                            )}
                                        </SummaryItem>
                                        <SummaryItem label="Fee structure">
                                            {selectedStructure?.name ?? (
                                                <span className="font-normal text-zinc-400">Not selected</span>
                                            )}
                                        </SummaryItem>
                                    </dl>

                                    <div className="mt-5 space-y-2 border-t border-zinc-200 pt-4 text-sm dark:border-white/10">
                                        <div className="flex justify-between gap-4">
                                            <span className="text-zinc-500 dark:text-zinc-400">
                                                {hasDiscount ? "Fee structure total" : "Total assessed"}
                                            </span>
                                            <span className="tabular-nums text-zinc-700 dark:text-zinc-200">
                                                {selectedStructure ? money(selectedStructure.totalAmount, currency) : "—"}
                                            </span>
                                        </div>
                                        {hasDiscount && (
                                            <div className="flex justify-between gap-4">
                                                <span className="min-w-0 break-words text-zinc-500 dark:text-zinc-400">
                                                    Discount
                                                    {discountType === "PERCENTAGE" && discountValue && ` (${discountValue}%)`}
                                                    {discountReason.trim() && ` · ${discountReason.trim()}`}
                                                </span>
                                                <span className="shrink-0 tabular-nums font-medium text-emerald-600 dark:text-emerald-400">
                                                    −{money(discountPreview.amount, currency)}
                                                </span>
                                            </div>
                                        )}
                                        <div className="flex items-baseline justify-between gap-4 pt-1">
                                            <span className="font-medium text-[#0B1E3D] dark:text-white">
                                                {hasDiscount ? "Net payable" : "Student will owe"}
                                            </span>
                                            <span className="text-2xl font-semibold tabular-nums text-[#0B1E3D] dark:text-white">
                                                {netPayable !== null ? money(netPayable, currency) : "—"}
                                            </span>
                                        </div>
                                    </div>

                                    {missing.length > 0 ? (
                                        <div className="mt-5 rounded-sm bg-zinc-50 p-3 dark:bg-white/5">
                                            <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                                                Still needed
                                            </p>
                                            <ul className="mt-2 space-y-1.5">
                                                {missing.map((m) => (
                                                    <li key={m} className="flex items-start gap-2 text-sm text-zinc-700 dark:text-zinc-200">
                                                        <Circle size={14} className="mt-1 shrink-0 text-orange-400" aria-hidden />
                                                        {m}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    ) : (
                                        <p className="mt-5 flex items-center gap-2 rounded-sm bg-emerald-50 p-3 text-sm font-medium text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-300">
                                            <CircleCheck size={16} aria-hidden /> Ready to assign
                                        </p>
                                    )}

                                    {courseAssignments.length > 0 && (
                                        <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
                                            {courseAssignments.length} other assignment
                                            {courseAssignments.length === 1 ? "" : "s"} on this course.
                                        </p>
                                    )}

                                    <p className="mt-4 text-xs text-zinc-500 dark:text-zinc-400">
                                        This links the student, course and fee structure. Payments are recorded
                                        separately against the net payable amount.
                                    </p>

                                    <div className="mt-5 hidden flex-col gap-2 lg:flex">
                                        <button type="submit" disabled={!canSubmit} className={`${PRIMARY} ${FOCUS} w-full`}>
                                            {submitContent}
                                        </button>
                                        <Link href="/finance/student-payments" className={`${BTN} ${FOCUS}`}>
                                            {success ? "Done" : "Cancel"}
                                        </Link>
                                    </div>
                                </div>
                            </section>
                        </aside>
                    </div>

                    {/* Mobile action bar: total and button always in reach */}
                    <div
                        className="fixed inset-x-0 bottom-0 z-30 border-t border-zinc-200 bg-white/95 px-4 pt-3 shadow-lg shadow-blue-950/20 backdrop-blur lg:hidden dark:border-white/10 dark:bg-[#0B1E3D]/95"
                        style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom, 0px))" }}
                    >
                        <div className="mx-auto flex max-w-xl items-center gap-3">
                            <div className="min-w-0 flex-1">
                                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                                    {hasDiscount ? "Net payable" : "Student will owe"}
                                </p>
                                <p className="truncate text-lg font-semibold tabular-nums text-[#0B1E3D] dark:text-white">
                                    {netPayable !== null ? money(netPayable, currency) : "—"}
                                </p>
                            </div>
                            <Link href="/finance/student-payments" className={`${BTN} ${FOCUS}`}>
                                {success ? "Done" : "Cancel"}
                            </Link>
                            <button type="submit" disabled={!canSubmit} className={`${PRIMARY} min-w-0 ${FOCUS}`}>
                                {submitContent}
                            </button>
                        </div>
                        {missing.length > 0 && (
                            <p className="mx-auto mt-2 max-w-xl truncate text-xs text-zinc-500 dark:text-zinc-400">
                                Still needed: {missing[0]}
                            </p>
                        )}
                    </div>
                </form>
            )}
        </main>
    );
}