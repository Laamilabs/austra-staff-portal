"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { courseApi, Course } from "@/app/types/courses";
import { CreateStudentDto, studentApi } from "@/app/types/students";
import { userApi } from "@/app/types/users";

import {
    FormState,
    initialState,
    emptyCourse,
    StepKey,
    STEPS,
    btnPrimary,
    btnSecondary,
} from "./_types";
import { AccountStep } from "./_steps/AccountStep";
import { CoursesStep, ReviewStep } from "./_steps/CoursesReviewSteps";
import { PersonalStep, ContactStep, IdentificationStep } from "./_steps/DetailsSteps";
import RequireRole from "@/app/components/navigation/RequireRole";

// ============================================================================
// Static copy
// ============================================================================

const STEP_DESCRIPTIONS: Partial<Record<StepKey, string>> = {
    account: "Create the login the student will use to access the portal.",
    personal: "Basic personal details as they appear on official documents.",
    contact: "How we reach the student, and where they live.",
    identification: "Government and medical identification details.",
    courses: "Choose the courses the student is being enrolled in.",
    review: "Check everything below before creating the records.",
};

function CheckIcon({ className = "h-4 w-4" }: { className?: string }) {
    return (
        <svg
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
            aria-hidden="true"
        >
            <path d="M4 10.5l4 4 8-9" />
        </svg>
    );
}

function Spinner() {
    return (
        <span
            className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-orange-400 border-t-transparent"
            aria-hidden="true"
        />
    );
}

// ============================================================================
// Page
// ============================================================================

export default function NewStudentPage() {
    const router = useRouter();

    const [stepIndex, setStepIndex] = useState(0);
    const [form, setForm] = useState<FormState>(initialState);
    const [errors, setErrors] = useState<Record<string, string>>({});

    const [courses, setCourses] = useState<Course[]>([]);
    const [coursesLoading, setCoursesLoading] = useState(true);
    const [coursesError, setCoursesError] = useState<string | null>(null);

    const [emailStatus, setEmailStatus] = useState<
        "idle" | "checking" | "available" | "taken" | "error"
    >("idle");

    const [submitting, setSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [submitStage, setSubmitStage] = useState<
        "idle" | "creating-user" | "creating-student" | "done"
    >("idle");

    const currentStep = STEPS[stepIndex];
    const progress = Math.round(((stepIndex + 1) / STEPS.length) * 100);
    const hasErrors = Object.keys(errors).length > 0;

    // --------------------------------------------------------------------------
    // Load course options (GET /course)
    // --------------------------------------------------------------------------
    useEffect(() => {
        let cancelled = false;
        (async () => {
            setCoursesLoading(true);
            setCoursesError(null);
            try {
                const res = await courseApi.getAll();
                if (!cancelled) setCourses(res.data);
            } catch (err) {
                if (!cancelled) {
                    setCoursesError(
                        err instanceof Error ? err.message : "Failed to load courses",
                    );
                }
            } finally {
                if (!cancelled) setCoursesLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, []);

    // --------------------------------------------------------------------------
    // Keep present address in sync with permanent when "sameAddress" is on
    // --------------------------------------------------------------------------
    useEffect(() => {
        if (form.sameAddress) {
            setForm((prev) => ({ ...prev, present: { ...prev.permanent } }));
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [form.sameAddress, form.permanent]);

    // --------------------------------------------------------------------------
    // Helpers
    // --------------------------------------------------------------------------

    function update<K extends keyof FormState>(key: K, value: FormState[K]) {
        setForm((prev) => ({ ...prev, [key]: value }));
    }

    function updateAddress(
        scope: "permanent" | "present",
        key: keyof FormState["permanent"],
        value: string,
    ) {
        setForm((prev) => ({
            ...prev,
            [scope]: { ...prev[scope], [key]: value },
        }));
    }

    function updateCourse(
        index: number,
        key: keyof FormState["courses"][number],
        value: string,
    ) {
        setForm((prev) => {
            const next = [...prev.courses];
            next[index] = { ...next[index], [key]: value };
            return { ...prev, courses: next };
        });
    }

    function addCourse() {
        setForm((prev) => ({
            ...prev,
            courses: [...prev.courses, { ...emptyCourse }],
        }));
    }

    function removeCourse(index: number) {
        setForm((prev) => ({
            ...prev,
            courses: prev.courses.filter((_, i) => i !== index),
        }));
    }

    // --------------------------------------------------------------------------
    // Email uniqueness check (Step 1)
    // --------------------------------------------------------------------------
    async function checkEmailAvailability(email: string): Promise<boolean> {
        if (!email) return false;
        setEmailStatus("checking");
        try {
            const res = await userApi.getAll();
            const taken = res.data.some(
                (u) => u.email?.toLowerCase() === email.toLowerCase(),
            );
            setEmailStatus(taken ? "taken" : "available");
            return !taken;
        } catch {
            setEmailStatus("error");
            return false;
        }
    }

    // --------------------------------------------------------------------------
    // Validation per step
    // --------------------------------------------------------------------------
    function validateStep(step: StepKey): boolean {
        const next: Record<string, string> = {};

        if (step === "account" && form.createUser) {
            if (!form.userEmail.trim()) next.userEmail = "Email is required";
            else if (!/^\S+@\S+\.\S+$/.test(form.userEmail))
                next.userEmail = "Enter a valid email";

            if (!form.userPassword) next.userPassword = "Password is required";
            else if (form.userPassword.length < 6)
                next.userPassword = "Password must be at least 6 characters";

            if (form.userPassword !== form.userConfirmPassword)
                next.userConfirmPassword = "Passwords do not match";

            if (emailStatus === "taken")
                next.userEmail = "A user with this email already exists";
        }

        if (step === "personal") {
            if (!form.firstName.trim()) next.firstName = "First name is required";
            if (!form.lastName.trim()) next.lastName = "Last name is required";
            if (!form.dateOfBirth) next.dateOfBirth = "Date of birth is required";
            if (!form.nationality.trim())
                next.nationality = "Nationality is required";
            if (!form.occupation.trim()) next.occupation = "Occupation is required";
            if (!form.physicalDisability.trim())
                next.physicalDisability = "Physical disability is required";
        }

        if (step === "contact") {
            if (!form.contactEmail.trim())
                next.contactEmail = "Contact email is required";
            else if (!/^\S+@\S+\.\S+$/.test(form.contactEmail))
                next.contactEmail = "Enter a valid email";

            if (!form.phoneNumber.trim())
                next.phoneNumber = "Phone number is required";

            const checkAddr = (scope: "permanent" | "present") => {
                const a = form[scope];
                if (!a.address.trim()) next[`${scope}.address`] = "Required";
                if (!a.constituency.trim()) next[`${scope}.constituency`] = "Required";
                if (!a.county.trim()) next[`${scope}.county`] = "Required";
                if (!a.postalCode.trim()) next[`${scope}.postalCode`] = "Required";
            };
            checkAddr("permanent");
            if (!form.sameAddress) checkAddr("present");
        }

        if (step === "identification") {
            if (!form.idNumber.trim()) next.idNumber = "ID number is required";
        }

        if (step === "courses") {
            if (form.courses.length === 0)
                next.courses = "Enrol the student in at least one course";
            form.courses.forEach((c, i) => {
                if (!c.courseId) next[`courses.${i}.courseId`] = "Select a course";
                if (!c.dateOfAdmission)
                    next[`courses.${i}.dateOfAdmission`] = "Admission date is required";
            });
        }

        setErrors(next);
        return Object.keys(next).length === 0;
    }

    // --------------------------------------------------------------------------
    // Navigation
    // --------------------------------------------------------------------------
    function scrollTop() {
        if (typeof window !== "undefined") {
            window.scrollTo({ top: 0, behavior: "smooth" });
        }
    }

    async function handleNext() {
        if (currentStep.key === "account" && form.createUser) {
            const ok = await checkEmailAvailability(form.userEmail.trim());
            if (!ok) {
                validateStep("account");
                return;
            }
        }

        if (!validateStep(currentStep.key)) return;
        setStepIndex((i) => Math.min(i + 1, STEPS.length - 1));
        scrollTop();
    }

    function handleBack() {
        setErrors({});
        setStepIndex((i) => Math.max(i - 1, 0));
        scrollTop();
    }

    function goToStep(key: StepKey) {
        setErrors({});
        setStepIndex(STEPS.findIndex((s) => s.key === key));
        scrollTop();
    }

    // --------------------------------------------------------------------------
    // Submit
    // --------------------------------------------------------------------------
    async function handleSubmit() {
        for (const s of STEPS) {
            if (s.key === "review") continue;
            if (!validateStep(s.key)) {
                setStepIndex(STEPS.findIndex((step) => step.key === s.key));
                return;
            }
        }

        setSubmitting(true);
        setSubmitError(null);

        let createdUserId: string | null = null;

        try {
            // ---- Stage 1: create user ----
            if (form.createUser) {
                setSubmitStage("creating-user");
                const userRes = await userApi.create({
                    name:
                        form.userName.trim() ||
                        `${form.firstName} ${form.lastName}`.trim(),
                    email: form.userEmail.trim(),
                    password: form.userPassword,
                    role: "student",
                });

                createdUserId = userRes.data.id ?? userRes.data._id ?? null;

                if (!createdUserId) {
                    throw new Error(
                        "User creation succeeded but no id was returned by the server.",
                    );
                }
            }

            // ---- Stage 2: create student ----
            setSubmitStage("creating-student");

            const base = {
                fullName: {
                    firstName: form.firstName.trim(),
                    middleName: form.middleName.trim() || undefined,
                    lastName: form.lastName.trim(),
                },
                gender: form.gender,
                dateOfBirth: form.dateOfBirth,
                nationality: form.nationality.trim(),
                maritalStatus: form.maritalStatus,
                occupation: form.occupation.trim(),
                physicalDisability: form.physicalDisability.trim(),
                religion: form.religion.trim() || undefined,
                contact: {
                    email: form.contactEmail.trim(),
                    phoneNumber: form.phoneNumber.trim(),
                },
                addresses: {
                    permanent: { ...form.permanent },
                    present: { ...(form.sameAddress ? form.permanent : form.present) },
                },
                identification: {
                    bloodGroup: form.bloodGroup.trim(),
                    idNumber: form.idNumber.trim(),
                    passportNumber: form.passportNumber.trim(),
                },
                courses: form.courses.map((c) => ({
                    courseId: c.courseId,
                    dateOfAdmission: c.dateOfAdmission,
                    dateOfCompletion: c.dateOfCompletion || undefined,
                })),
            };

            const payload = (
                createdUserId ? { ...base, userId: createdUserId } : base
            ) as CreateStudentDto;

            const studentRes = await studentApi.create(payload);
            setSubmitStage("done");

            router.push(`/students/${studentRes.data._id}`);
        } catch (err: any) {
            if (createdUserId) {
                try {
                    await userApi.delete(createdUserId);
                } catch {
                    /* best-effort cleanup */
                }
            }
            setSubmitError(
                err?.response?.data?.message ??
                err?.message ??
                "Failed to create student",
            );
        } finally {
            setSubmitting(false);
            setSubmitStage("idle");
        }
    }

    // --------------------------------------------------------------------------
    // Derived
    // --------------------------------------------------------------------------
    const courseLookup = useMemo(() => {
        const map = new Map<string, Course>();
        courses.forEach((c) => map.set(c._id, c));
        return map;
    }, [courses]);

    // ==========================================================================
    // Render
    // ==========================================================================

    return (
        <div className="min-h-screen bg-zinc-50 py-6 dark:bg-zinc-950 sm:py-10">
            <div className="mx-auto max-w-full rounded-sm border border-zinc-200 bg-white shadow-lg shadow-zinc-900/5 dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-zinc-950/20 lg:grid lg:grid-cols-[300px_1fr] lg:items-start">
                {/* ============================================================ */}
                {/* Sidebar (sticky on lg+)                                      */}
                {/* ============================================================ */}
                <aside className="relative self-start bg-zinc-50 px-6 py-6 text-zinc-900 transition-colors dark:bg-zinc-950 dark:text-zinc-100 lg:sticky lg:top-6 lg:max-h-[calc(100vh-3rem)] lg:overflow-y-auto lg:rounded-l-sm lg:px-8 lg:py-10">
                    {/* accent bar */}
                    <span
                        className="absolute inset-x-0 top-0 h-1 bg-blue-950 transition-colors dark:bg-orange-400 lg:inset-y-0 lg:left-0 lg:right-auto lg:h-auto lg:w-1"
                        aria-hidden="true"
                    />

                    <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-blue-950 dark:text-orange-400">
                        Student Admissions
                    </p>
                    <h1 className="mt-2 text-2xl font-semibold leading-tight text-blue-950 dark:text-orange-400">
                        Enrol New Student
                    </h1>
                    <p className="mt-2 hidden text-sm leading-relaxed text-zinc-600 dark:text-zinc-400 lg:block">
                        Complete each step. A user account is created first, then the
                        student record.
                    </p>

                    {/* Mobile / tablet progress */}
                    <div className="mt-5 lg:hidden">
                        <div className="flex items-center justify-between text-xs text-zinc-600 dark:text-zinc-400">
                            <span>
                                Step {stepIndex + 1} of {STEPS.length}
                            </span>
                            <span className="font-medium text-blue-950 dark:text-orange-400">
                                {currentStep.label}
                            </span>
                        </div>
                        <div className="mt-2 h-1.5 w-full rounded-sm bg-zinc-200 dark:bg-zinc-800">
                            <div
                                className="h-full rounded-sm bg-blue-950 transition-all duration-300 dark:bg-orange-400"
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                    </div>

                    {/* Desktop vertical stepper */}
                    <ol className="mt-10 hidden lg:block">
                        {STEPS.map((s, i) => {
                            const active = i === stepIndex;
                            const complete = i < stepIndex;
                            const last = i === STEPS.length - 1;
                            return (
                                <li key={s.key} className="relative pb-6 last:pb-0">
                                    {!last && (
                                        <span
                                            className={[
                                                "absolute left-4 top-9 -ml-px h-[calc(100%-2rem)] w-0.5 transition-colors",
                                                complete
                                                    ? "bg-blue-950 dark:bg-orange-400"
                                                    : "bg-zinc-200 dark:bg-zinc-800",
                                            ].join(" ")}
                                            aria-hidden="true"
                                        />
                                    )}
                                    <button
                                        type="button"
                                        onClick={() => complete && goToStep(s.key)}
                                        disabled={!complete}
                                        aria-current={active ? "step" : undefined}
                                        className="group relative flex w-full items-center gap-3 text-left disabled:cursor-default"
                                    >
                                        <span
                                            className={[
                                                "flex h-8 w-8 shrink-0 items-center justify-center rounded-sm border text-xs font-semibold transition-colors",
                                                active
                                                    ? "border-blue-950 bg-blue-950 text-white dark:border-orange-400 dark:bg-orange-400 dark:text-zinc-950"
                                                    : complete
                                                        ? "border-blue-950 bg-blue-100 text-blue-950 group-hover:bg-blue-950 group-hover:text-white dark:border-orange-400 dark:bg-zinc-900 dark:text-orange-400 dark:group-hover:bg-orange-400 dark:group-hover:text-zinc-950"
                                                        : "border-zinc-300 bg-transparent text-zinc-400 dark:border-zinc-800 dark:text-zinc-600",
                                            ].join(" ")}
                                        >
                                            {complete ? <CheckIcon /> : i + 1}
                                        </span>
                                        <span
                                            className={[
                                                "text-sm transition-colors",
                                                active
                                                    ? "font-semibold text-blue-950 dark:text-orange-400"
                                                    : complete
                                                        ? "text-zinc-800 group-hover:text-blue-950 dark:text-zinc-200 dark:group-hover:text-orange-400"
                                                        : "text-zinc-400 dark:text-zinc-600",
                                            ].join(" ")}
                                        >
                                            {s.label}
                                        </span>
                                    </button>
                                </li>
                            );
                        })}
                    </ol>

                    {/* Desktop progress footer */}
                    <div className="mt-10 hidden border-t border-zinc-200 pt-5 dark:border-zinc-800 lg:block">
                        <div className="flex items-center justify-between text-xs text-zinc-600 dark:text-zinc-400">
                            <span>Progress</span>
                            <span className="font-semibold text-blue-950 dark:text-orange-400">{progress}%</span>
                        </div>
                        <div className="mt-2 h-1.5 w-full rounded-sm bg-zinc-200 dark:bg-zinc-800">
                            <div
                                className="h-full rounded-sm bg-blue-950 transition-all duration-300 dark:bg-orange-400"
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                    </div>
                </aside>

                {/* ============================================================ */}
                {/* Main panel                                                   */}
                {/* ============================================================ */}
                <RequireRole roles={["admin", "registrar"]}>
                    <section className="flex min-w-0 flex-col">
                        {/* Step header */}
                        <div className="border-b border-zinc-200 px-6 py-6 dark:border-zinc-800 sm:px-10">
                            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-orange-500 dark:text-orange-400">
                                Step {stepIndex + 1} of {STEPS.length}
                            </p>
                            <h2 className="mt-1 text-xl font-semibold text-navy-900 dark:text-zinc-100 sm:text-2xl">
                                {currentStep.label}
                            </h2>
                            {STEP_DESCRIPTIONS[currentStep.key] && (
                                <p className="mt-1 text-sm text-zinc-900 dark:text-zinc-400">
                                    {STEP_DESCRIPTIONS[currentStep.key]}
                                </p>
                            )}
                        </div>

                        {/* Step content */}
                        <div className="flex-1 px-6 py-6 sm:px-10 sm:py-8">
                            {hasErrors && (
                                <div
                                    role="alert"
                                    className="mb-6 rounded-sm border-l-4 border-orange-400 bg-orange-50 px-4 py-3 text-sm text-navy-900 dark:border-orange-500 dark:bg-orange-950/30 dark:text-orange-100"
                                >
                                    Please fix the highlighted fields to continue.
                                </div>
                            )}

                            {currentStep.key === "account" && (
                                <AccountStep
                                    form={form}
                                    errors={errors}
                                    update={update}
                                    emailStatus={emailStatus}
                                    onCheckEmail={() =>
                                        checkEmailAvailability(form.userEmail.trim())
                                    }
                                />
                            )}

                            {currentStep.key === "personal" && (
                                <PersonalStep form={form} errors={errors} update={update} />
                            )}

                            {currentStep.key === "contact" && (
                                <ContactStep
                                    form={form}
                                    errors={errors}
                                    update={update}
                                    updateAddress={updateAddress}
                                />
                            )}

                            {currentStep.key === "identification" && (
                                <IdentificationStep
                                    form={form}
                                    errors={errors}
                                    update={update}
                                />
                            )}

                            {currentStep.key === "courses" && (
                                <CoursesStep
                                    form={form}
                                    errors={errors}
                                    courses={courses}
                                    coursesLoading={coursesLoading}
                                    coursesError={coursesError}
                                    updateCourse={updateCourse}
                                    addCourse={addCourse}
                                    removeCourse={removeCourse}
                                />
                            )}

                            {currentStep.key === "review" && (
                                <ReviewStep
                                    form={form}
                                    courseLookup={courseLookup}
                                    goToStep={goToStep}
                                />
                            )}
                        </div>

                        {/* Status + errors */}
                        {(submitError || submitting) && (
                            <div className="space-y-3 px-6 pb-4 sm:px-10">
                                {submitError && (
                                    <div
                                        role="alert"
                                        className="rounded-sm border-l-4 border-red-500 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-600 dark:bg-red-950/30 dark:text-red-300"
                                    >
                                        {submitError}
                                    </div>
                                )}
                                {submitting && (
                                    <div className="flex items-center gap-3 rounded-sm bg-zinc-50 px-4 py-3 text-sm text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200">
                                        <Spinner />
                                        <span>
                                            {submitStage === "creating-user" &&
                                                "Creating user account…"}
                                            {submitStage === "creating-student" &&
                                                "Creating student record…"}
                                            {submitStage === "done" && "Redirecting…"}
                                        </span>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Footer actions */}
                        <div className="flex items-center justify-between gap-3 border-t border-zinc-200 bg-zinc-50/50 px-6 py-4 dark:border-zinc-800 dark:bg-zinc-800/50 sm:px-10">
                            <button
                                type="button"
                                className={btnSecondary}
                                onClick={handleBack}
                                disabled={stepIndex === 0 || submitting}
                            >
                                ← Previous
                            </button>

                            {currentStep.key !== "review" ? (
                                <button
                                    type="button"
                                    className={btnPrimary}
                                    onClick={handleNext}
                                    disabled={submitting || emailStatus === "checking"}
                                >
                                    {emailStatus === "checking" ? "Checking…" : "Continue →"}
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    className={btnPrimary}
                                    onClick={handleSubmit}
                                    disabled={submitting}
                                >
                                    {submitting ? "Submitting…" : "Create User & Student"}
                                </button>
                            )}
                        </div>
                    </section>
                </RequireRole>
            </div>
        </div>
    );
}