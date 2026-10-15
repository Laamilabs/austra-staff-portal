// app/(portal)/students/new/_steps/CoursesReviewSteps.tsx
"use client";

import { Course } from "@/app/types/courses";
import SelectCourse from "@/app/(portal)/courses/selectCourse";
import {
    CourseEntryForm,
    FormState,
    StepKey,
    btnPrimary,
    btnSecondary,
    errorClass,
    helpClass,
    labelClass,
    sectionTitleClass,
} from "../_types";
import { DatePicker } from "../components/DatePicker";

// ============================================================================
// Shared bits
// ============================================================================

const cardClass =
    "rounded-sm border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900";

function PlusIcon() {
    return (
        <svg
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            className="h-4 w-4"
            aria-hidden="true"
        >
            <path d="M10 4v12M4 10h12" />
        </svg>
    );
}

function Callout({ children }: { children: React.ReactNode }) {
    return (
        <div className="rounded-sm border-l-4 border-blue-950 bg-zinc-50 px-4 py-3 text-sm text-zinc-700 dark:border-orange-400 dark:bg-zinc-950 dark:text-zinc-300">
            {children}
        </div>
    );
}

// ============================================================================
// Courses
// ============================================================================

export function CoursesStep({
    form,
    errors,
    courses,
    coursesLoading,
    coursesError,
    updateCourse,
    addCourse,
    removeCourse,
}: {
    form: FormState;
    errors: Record<string, string>;
    courses: Course[];
    coursesLoading: boolean;
    coursesError: string | null;
    updateCourse: (i: number, key: keyof CourseEntryForm, value: string) => void;
    addCourse: () => void;
    removeCourse: (i: number) => void;
}) {
    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className={sectionTitleClass + " min-w-48 flex-1"}>
                    Enrolled courses ({form.courses.length})
                </h3>
                <button
                    type="button"
                    className={btnSecondary + " gap-1.5"}
                    onClick={addCourse}
                >
                    <PlusIcon />
                    Add course
                </button>
            </div>

            <Callout>
                Admission numbers are generated automatically by the server when the
                student is created.
            </Callout>

            {coursesError && (
                <div
                    role="alert"
                    className="rounded-sm border-l-4 border-red-500 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-600 dark:bg-red-950/30 dark:text-red-300"
                >
                    {coursesError}
                </div>
            )}

            {/* Empty state */}
            {form.courses.length === 0 && (
                <div
                    className={[
                        "flex flex-col items-center gap-3 rounded-sm border border-dashed px-6 py-10 text-center",
                        errors.courses
                            ? "border-red-400 dark:border-red-500"
                            : "border-zinc-300 dark:border-zinc-700",
                    ].join(" ")}
                >
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">
                        No courses added yet. Enrol the student in at least one course.
                    </p>
                    <button
                        type="button"
                        className={btnPrimary + " gap-1.5"}
                        onClick={addCourse}
                    >
                        <PlusIcon />
                        Add first course
                    </button>
                    {errors.courses && <p className={errorClass}>{errors.courses}</p>}
                </div>
            )}

            <div className="space-y-4">
                {form.courses.map((entry, i) => (
                    <div
                        key={i}
                        className="rounded-sm border border-l-4 border-zinc-200 border-l-blue-950 bg-zinc-50 p-5 dark:border-zinc-800 dark:border-l-orange-400 dark:bg-zinc-950"
                    >
                        <div className="mb-4 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <span className="flex h-6 w-6 items-center justify-center rounded-sm bg-blue-950 text-xs font-semibold text-white dark:bg-orange-400 dark:text-zinc-950">
                                    {i + 1}
                                </span>
                                <span className="text-xs font-semibold uppercase tracking-wide text-zinc-700 dark:text-zinc-300">
                                    Course
                                </span>
                            </div>
                            {form.courses.length > 1 && (
                                <button
                                    type="button"
                                    className="text-xs font-medium text-red-600 underline-offset-2 hover:underline dark:text-red-400"
                                    onClick={() => removeCourse(i)}
                                    aria-label={`Remove course ${i + 1}`}
                                >
                                    Remove
                                </button>
                            )}
                        </div>

                        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                            <div className="sm:col-span-2">
                                <label className={labelClass}>
                                    Course <span className="text-red-500">*</span>
                                </label>
                                <SelectCourse
                                    value={entry.courseId}
                                    courses={courses}
                                    loading={coursesLoading}
                                    required
                                    placeholder="Search and select a course…"
                                    onChange={(courseId) =>
                                        updateCourse(i, "courseId", courseId)
                                    }
                                />
                                {errors[`courses.${i}.courseId`] && (
                                    <p className={errorClass}>
                                        {errors[`courses.${i}.courseId`]}
                                    </p>
                                )}
                            </div>

                            <div>
                                <label className={labelClass}>
                                    Date of admission <span className="text-red-500">*</span>
                                </label>
                                <DatePicker
                                    value={entry.dateOfAdmission}
                                    onChange={(value) =>
                                        updateCourse(i, "dateOfAdmission", value)
                                    }
                                    placeholder="Select admission date"
                                    disableFuture
                                />
                                {errors[`courses.${i}.dateOfAdmission`] && (
                                    <p className={errorClass}>
                                        {errors[`courses.${i}.dateOfAdmission`]}
                                    </p>
                                )}
                            </div>

                            <div>
                                <label className={labelClass}>
                                    Date of completion{" "}
                                    <span className="font-normal normal-case text-zinc-500 dark:text-zinc-400">
                                        (optional)
                                    </span>
                                </label>
                                <DatePicker
                                    value={entry.dateOfCompletion}
                                    onChange={(value) =>
                                        updateCourse(i, "dateOfCompletion", value)
                                    }
                                    placeholder="Select completion date"
                                    disableFuture
                                />
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ============================================================================
// Review
// ============================================================================

function Row({ label, value }: { label: string; value: React.ReactNode }) {
    return (
        <div className="grid grid-cols-1 gap-0.5 py-3 text-sm sm:grid-cols-3 sm:gap-4">
            <dt className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400 sm:pt-0.5">
                {label}
            </dt>
            <dd className="wrap-break-word text-zinc-900 dark:text-zinc-100 sm:col-span-2">
                {value || <span className="text-zinc-400 dark:text-zinc-600">—</span>}
            </dd>
        </div>
    );
}

function ReviewSection({
    title,
    onEdit,
    children,
}: {
    title: string;
    onEdit: () => void;
    children: React.ReactNode;
}) {
    return (
        <section className={cardClass + " overflow-hidden"}>
            <div className="flex items-center justify-between border-b border-zinc-200 bg-zinc-50 px-4 py-2.5 dark:border-zinc-800 dark:bg-zinc-950">
                <h3 className="text-xs font-semibold uppercase tracking-[0.15em] text-blue-950 dark:text-orange-400">
                    {title}
                </h3>
                <button
                    type="button"
                    className="rounded-sm text-xs font-medium text-blue-950 underline-offset-2 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 dark:text-orange-400"
                    onClick={onEdit}
                >
                    Edit
                </button>
            </div>
            {children}
        </section>
    );
}

const dlClass = "divide-y divide-zinc-100 px-4 dark:divide-zinc-800";

function joinName(...parts: string[]) {
    return parts.map((p) => p.trim()).filter(Boolean).join(" ");
}

function formatAddress(a: FormState["permanent"]) {
    const line = [a.address, a.constituency, a.county]
        .map((p) => p.trim())
        .filter(Boolean)
        .join(", ");
    const postal = a.postalCode.trim();
    return [line, postal].filter(Boolean).join(" — ");
}

export function ReviewStep({
    form,
    courseLookup,
    goToStep,
}: {
    form: FormState;
    courseLookup: Map<string, Course>;
    goToStep: (key: StepKey) => void;
}) {
    return (
        <div className="space-y-6">
            <p className={helpClass}>
                Check each section below. Use Edit to jump back to a step; your
                answers are kept.
            </p>

            <ReviewSection title="User Account" onEdit={() => goToStep("account")}>
                {form.createUser ? (
                    <dl className={dlClass}>
                        <Row
                            label="Name"
                            value={form.userName || joinName(form.firstName, form.lastName)}
                        />
                        <Row label="Email" value={form.userEmail} />
                        <Row label="Role" value="student" />
                    </dl>
                ) : (
                    <div className="m-4 rounded-sm border-l-4 border-orange-400 bg-orange-50 px-4 py-3 text-sm text-zinc-800 dark:border-orange-400 dark:bg-orange-950/30 dark:text-orange-100">
                        No user account will be created. You&apos;ll need to assign one
                        later.
                    </div>
                )}
            </ReviewSection>

            <ReviewSection title="Personal Details" onEdit={() => goToStep("personal")}>
                <dl className={dlClass}>
                    <Row
                        label="Full name"
                        value={joinName(form.firstName, form.middleName, form.lastName)}
                    />
                    <Row label="Gender" value={form.gender} />
                    <Row label="Date of birth" value={form.dateOfBirth} />
                    <Row label="Nationality" value={form.nationality} />
                    <Row label="Marital status" value={form.maritalStatus} />
                    <Row label="Occupation" value={form.occupation} />
                    <Row label="Physical disability" value={form.physicalDisability} />
                    <Row label="Religion" value={form.religion} />
                </dl>
            </ReviewSection>

            <ReviewSection title="Contact & Address" onEdit={() => goToStep("contact")}>
                <dl className={dlClass}>
                    <Row label="Email" value={form.contactEmail} />
                    <Row label="Phone" value={form.phoneNumber} />
                    <Row label="Permanent" value={formatAddress(form.permanent)} />
                    <Row
                        label="Present"
                        value={
                            form.sameAddress
                                ? "Same as permanent"
                                : formatAddress(form.present)
                        }
                    />
                </dl>
            </ReviewSection>

            <ReviewSection
                title="Identification"
                onEdit={() => goToStep("identification")}
            >
                <dl className={dlClass}>
                    <Row label="Blood group" value={form.bloodGroup} />
                    <Row label="ID number" value={form.idNumber} />
                    <Row label="Passport number" value={form.passportNumber} />
                </dl>
            </ReviewSection>

            <ReviewSection title="Course Enrolment" onEdit={() => goToStep("courses")}>
                <ul className="divide-y divide-zinc-100 px-4 dark:divide-zinc-800">
                    {form.courses.map((c, i) => {
                        const course = courseLookup.get(c.courseId);
                        return (
                            <li key={i} className="flex items-start gap-3 py-3 text-sm">
                                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-sm bg-blue-950 text-xs font-semibold text-white dark:bg-orange-400 dark:text-zinc-950">
                                    {i + 1}
                                </span>
                                <div className="min-w-0">
                                    <div className="font-medium text-zinc-900 dark:text-zinc-100">
                                        {course
                                            ? `${course.courseCode} — ${course.name}`
                                            : c.courseId}
                                    </div>
                                    <div className="text-xs text-zinc-600 dark:text-zinc-400">
                                        Admitted {c.dateOfAdmission}
                                        {c.dateOfCompletion
                                            ? ` · Completed ${c.dateOfCompletion}`
                                            : ""}
                                    </div>
                                    <div className="mt-1 text-xs italic text-zinc-500 dark:text-zinc-500">
                                        Admission number will be generated by the server
                                    </div>
                                </div>
                            </li>
                        );
                    })}
                </ul>
            </ReviewSection>
        </div>
    );
}