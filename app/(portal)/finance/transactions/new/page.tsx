"use client";

import {
    useCallback,
    useEffect,
    useMemo,
    useState,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
    ArrowLeft,
    Receipt,
    Loader2,
    CheckCircle2,
    AlertCircle,
    Wallet,
    Calendar,
    Hash,
    FileText,
    Info,
    CalendarClock,
} from "lucide-react";

import SelectStudent from "@/app/(portal)/students/selectStudent";
import api from "@/app/lib/api";

import {
    CreateFeeTransactionDto,
    PaymentMethod,
    feeTransactionApi,
} from "@/app/types/fee-transaction";
import { StudentFee, studentFeeApi } from "@/app/types/student-fee";
import type { Student } from "@/app/types/students";
import RequireRole from "@/app/components/navigation/RequireRole";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const FOCUS_RING =
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400";

const INPUT_BASE =
    "h-10 w-full rounded-sm border border-zinc-200 bg-white px-3 text-sm text-[#0B1E3D] outline-none transition-colors placeholder:text-zinc-400 focus:border-orange-400 focus:ring-2 focus:ring-orange-400/25 disabled:cursor-not-allowed disabled:bg-zinc-100 disabled:text-zinc-400 dark:border-white/10 dark:bg-[#0B1E3D] dark:text-white dark:placeholder:text-zinc-500 dark:disabled:bg-white/5";

const LABEL_BASE =
    "mb-1.5 block text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400";

const METHOD_OPTIONS: { value: PaymentMethod; label: string }[] = [
    { value: "CASH", label: "Cash" },
    { value: "MPESA", label: "M-Pesa" },
    { value: "BANK_TRANSFER", label: "Bank Transfer" },
    { value: "OTHER", label: "Other" },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface CourseLite {
    _id: string;
    name?: string;
    courseCode?: string;
}

async function fetchCourses(): Promise<CourseLite[]> {
    try {
        const res = await api.get<CourseLite[]>("/courses");
        return Array.isArray(res.data) ? res.data : [];
    } catch {
        return [];
    }
}

function formatMoney(amount: number, currency = "KES"): string {
    const code = currency?.toUpperCase() || "KES";
    try {
        return new Intl.NumberFormat("en-KE", {
            style: "currency",
            currency: code,
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(amount);
    } catch {
        return `${code} ${amount.toFixed(2)}`;
    }
}

/**
 * `datetime-local` value for "now" in the user's local timezone.
 * Format: "YYYY-MM-DDTHH:mm" (no seconds, no timezone suffix).
 */
function nowInputValue(): string {
    const d = new Date();
    const offset = d.getTimezoneOffset();
    const local = new Date(d.getTime() - offset * 60 * 1000);
    return local.toISOString().slice(0, 16);
}

/**
 * Convert the `<input type="datetime-local">` value (local wall time,
 * "YYYY-MM-DDTHH:mm") into an ISO string the backend can round-trip.
 * Returns `undefined` if the value is empty or unparseable so callers can
 * safely omit the field.
 */
function toIsoOrUndefined(value: string): string | undefined {
    if (!value) return undefined;
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return undefined;
    return parsed.toISOString();
}

/** Guards against scientific notation, NaN, and >2 decimals. */
function sanitizeAmountInput(raw: string): string {
    let value = raw.replace(/[^\d.]/g, "");
    const firstDot = value.indexOf(".");
    if (firstDot !== -1) {
        value =
            value.slice(0, firstDot + 1) +
            value.slice(firstDot + 1).replace(/\./g, "");
    }
    const [whole, fraction] = value.split(".");
    if (fraction !== undefined) {
        return `${whole}.${fraction.slice(0, 2)}`;
    }
    return value;
}

function round2(n: number): number {
    return Math.round(n * 100) / 100;
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

function NewTransactionContent() {
    const router = useRouter();

    // Student selection
    const [studentId, setStudentId] = useState("");
    const [selectedStudent, setSelectedStudent] = useState<
        Student | undefined
    >();

    // Student fee assessments
    const [studentFees, setStudentFees] = useState<StudentFee[]>([]);
    const [loadingFees, setLoadingFees] = useState(false);
    const [feesError, setFeesError] = useState<string | null>(null);
    const [selectedFeeId, setSelectedFeeId] = useState("");

    // Course lookup
    const [courses, setCourses] = useState<CourseLite[]>([]);

    // Form fields
    const [amount, setAmount] = useState("");
    const [paymentMethod, setPaymentMethod] =
        useState<PaymentMethod>("MPESA");
    const [transactionDate, setTransactionDate] = useState(
        nowInputValue(),
    );
    const [confirmationCode, setConfirmationCode] = useState("");
    const [notes, setNotes] = useState("");

    // Submission
    const [submitting, setSubmitting] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    // -----------------------------------------------------------------------
    // Course lookup
    // -----------------------------------------------------------------------

    useEffect(() => {
        let cancelled = false;
        fetchCourses().then((list) => {
            if (!cancelled) setCourses(list);
        });
        return () => {
            cancelled = true;
        };
    }, []);

    const coursesById = useMemo(() => {
        const map = new Map<string, CourseLite>();
        courses.forEach((c) => map.set(c._id, c));
        return map;
    }, [courses]);

    const getCourseLabel = useCallback(
        (fee: StudentFee): string => {
            const ref = fee.courseId;

            if (typeof ref === "object" && ref !== null) {
                return (
                    ref.name ??
                    ref.courseCode ??
                    "Course"
                );
            }

            const course = coursesById.get(ref);
            if (course) {
                return (
                    course.name ??
                    course.courseCode ??
                    course._id.slice(-6)
                );
            }

            return ref.slice(-6);
        },
        [coursesById],
    );

    // -----------------------------------------------------------------------
    // Load the student's active fee assessments when a student is picked
    // -----------------------------------------------------------------------

    const loadStudentFees = useCallback(async (id: string) => {
        if (!id) {
            setStudentFees([]);
            setSelectedFeeId("");
            return;
        }

        setLoadingFees(true);
        setFeesError(null);

        try {
            const all = await studentFeeApi.getByStudentId(id);
            const active = (Array.isArray(all) ? all : []).filter(
                (fee) =>
                    fee.status === "ACTIVE" &&
                    fee.amountPaid < fee.totalAmount,
            );
            setStudentFees(active);

            if (active.length > 0) {
                setSelectedFeeId(active[0]._id);
            } else {
                setSelectedFeeId("");
            }
        } catch (err) {
            console.error("Failed to load student fees:", err);
            setFeesError(
                "Could not load this student's fee assessments.",
            );
            setStudentFees([]);
            setSelectedFeeId("");
        } finally {
            setLoadingFees(false);
        }
    }, []);

    useEffect(() => {
        if (studentId) {
            loadStudentFees(studentId);
        } else {
            setStudentFees([]);
            setSelectedFeeId("");
        }
    }, [studentId, loadStudentFees]);

    // -----------------------------------------------------------------------
    // Selected fee + derived values
    // -----------------------------------------------------------------------

    const selectedFee = useMemo(
        () => studentFees.find((f) => f._id === selectedFeeId),
        [studentFees, selectedFeeId],
    );

    const outstanding = useMemo(() => {
        if (!selectedFee) return 0;
        return round2(
            Math.max(
                0,
                selectedFee.totalAmount - selectedFee.amountPaid,
            ),
        );
    }, [selectedFee]);

    // Prefill the amount with the full outstanding balance when a fee is
    // selected. Only do this on fee change so the user's edits aren't
    // clobbered while typing.
    useEffect(() => {
        if (selectedFee) {
            setAmount(outstanding.toFixed(2));
        } else {
            setAmount("");
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedFeeId]);

    // -----------------------------------------------------------------------
    // Validation
    // -----------------------------------------------------------------------

    const amountNumber = Number(amount);
    const amountIsValid =
        amount.trim() !== "" &&
        !Number.isNaN(amountNumber) &&
        amountNumber >= 0.01;

    const amountExceedsBalance =
        selectedFee !== undefined &&
        amountIsValid &&
        amountNumber > outstanding + 0.0001;

    const canSubmit =
        !!selectedFee &&
        amountIsValid &&
        !amountExceedsBalance &&
        !submitting;

    // -----------------------------------------------------------------------
    // Submit
    // -----------------------------------------------------------------------

    const handleSubmit = async (
        e: React.FormEvent<HTMLFormElement>,
    ) => {
        e.preventDefault();
        setFormError(null);

        if (!selectedFee) {
            setFormError("Select a fee assessment to pay against.");
            return;
        }

        if (!amountIsValid) {
            setFormError("Enter a valid amount of at least 0.01.");
            return;
        }

        if (amountExceedsBalance) {
            setFormError(
                "Amount exceeds the outstanding balance for this assessment.",
            );
            return;
        }

        setSubmitting(true);

        try {
            const payload: CreateFeeTransactionDto = {
                studentFeeId: selectedFee._id,
                amount: round2(amountNumber),
                paymentMethod,
            };

            const isoDate = toIsoOrUndefined(transactionDate);
            if (isoDate) {
                payload.transactionDate = isoDate;
            }

            if (confirmationCode.trim()) {
                payload.confirmationCode =
                    confirmationCode.trim().toUpperCase();
            }
            if (notes.trim()) {
                payload.notes = notes.trim();
            }

            const created = await feeTransactionApi.create(payload);

            setSuccess(true);

            // Navigate to the new transaction's detail page. Fall back to
            // the list if the API response is missing an _id (shouldn't
            // happen, but avoids pushing "/undefined").
            const createdId =
                (created as { _id?: string } | undefined)?._id ?? "";
            const destination = createdId
                ? `/finance/transactions/${createdId}`
                : "/finance/transactions";

            setTimeout(() => {
                router.push(destination);
            }, 900);
        } catch (err: unknown) {
            console.error("Failed to record transaction:", err);

            const message =
                (err as { response?: { data?: { message?: string } } })
                    ?.response?.data?.message;

            setFormError(
                typeof message === "string"
                    ? message
                    : "Could not record the transaction. Please try again.",
            );
            setSubmitting(false);
        }
    };

    // -----------------------------------------------------------------------
    // Render
    // -----------------------------------------------------------------------

    return (
        <div className="mx-auto w-full max-w-full py-6 sm:px-6 lg:px-8">
            {/* Header */}
            <div className="mb-6">
                <Link
                    href="/finance/transactions"
                    className={`mb-3 inline-flex items-center gap-1.5 text-sm text-zinc-500 transition-colors hover:text-[#0B1E3D] dark:text-zinc-400 dark:hover:text-white ${FOCUS_RING}`}
                >
                    <ArrowLeft className="h-4 w-4" />
                    Back to transactions
                </Link>

                <div className="flex items-start gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-sm bg-orange-400/15 text-orange-500 dark:bg-orange-400/10 dark:text-orange-300">
                        <Receipt className="h-5 w-5" />
                    </span>
                    <div>
                        <h1 className="text-lg font-semibold text-[#0B1E3D] dark:text-white">
                            Record Payment
                        </h1>
                        <p className="text-sm text-zinc-500 dark:text-zinc-400">
                            Register a payment against a student&rsquo;s
                            fee assessment.
                        </p>
                    </div>
                </div>
            </div>

            {success ? (
                <div className="flex flex-col items-center gap-3 rounded-sm border border-emerald-200 bg-emerald-50 px-4 py-10 text-center dark:border-emerald-400/25 dark:bg-emerald-400/10">
                    <CheckCircle2 className="h-8 w-8 text-emerald-600 dark:text-emerald-300" />
                    <p className="text-base font-semibold text-emerald-800 dark:text-emerald-200">
                        Payment recorded
                    </p>
                    <p className="text-sm text-emerald-700 dark:text-emerald-300">
                        Opening the receipt…
                    </p>
                </div>
            ) : (
                <form
                    onSubmit={handleSubmit}
                    className="space-y-5 rounded-sm border border-zinc-200 bg-white p-5 dark:border-white/10 dark:bg-[#0B1E3D]"
                >
                    {/* Error banner */}
                    {formError && (
                        <div className="flex items-start gap-2 rounded-sm border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-400/25 dark:bg-rose-400/10 dark:text-rose-300">
                            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                            <span>{formError}</span>
                        </div>
                    )}

                    {/* Student */}
                    <div>
                        <label className={LABEL_BASE}>
                            Student
                        </label>
                        <SelectStudent
                            value={studentId}
                            onChange={(id, student) => {
                                setStudentId(id);
                                setSelectedStudent(student);
                                setFormError(null);
                            }}
                            required
                            placeholder="Select or search a student..."
                        />
                    </div>

                    {/* Fee assessments */}
                    {studentId && (
                        <div>
                            <label className={LABEL_BASE}>
                                Fee assessment
                            </label>

                            {loadingFees ? (
                                <div className="flex items-center gap-2 rounded-sm border border-zinc-200 px-3 py-3 text-sm text-zinc-500 dark:border-white/10 dark:text-zinc-400">
                                    <Loader2 className="h-4 w-4 animate-spin text-orange-500 dark:text-orange-400" />
                                    Loading fee assessments...
                                </div>
                            ) : feesError ? (
                                <div className="flex items-start gap-2 rounded-sm border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-400/25 dark:bg-rose-400/10 dark:text-rose-300">
                                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                                    <div className="flex-1">
                                        {feesError}
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() =>
                                            loadStudentFees(studentId)
                                        }
                                        className="text-xs font-medium underline"
                                    >
                                        Retry
                                    </button>
                                </div>
                            ) : studentFees.length === 0 ? (
                                <div className="flex items-start gap-2 rounded-sm border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-800 dark:border-amber-400/25 dark:bg-amber-400/10 dark:text-amber-200">
                                    <Info className="mt-0.5 h-4 w-4 shrink-0" />
                                    <span>
                                        This student has no active fee
                                        assessments with an outstanding
                                        balance.
                                    </span>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {studentFees.map((fee) => {
                                        const isSelected =
                                            fee._id === selectedFeeId;
                                        const remaining = round2(
                                            Math.max(
                                                0,
                                                fee.totalAmount -
                                                fee.amountPaid,
                                            ),
                                        );

                                        return (
                                            <button
                                                key={fee._id}
                                                type="button"
                                                onClick={() =>
                                                    setSelectedFeeId(
                                                        fee._id,
                                                    )
                                                }
                                                className={`flex w-full items-center gap-3 rounded-sm border p-3 text-left transition-colors ${FOCUS_RING} ${isSelected
                                                    ? "border-orange-400 bg-orange-50/60 ring-2 ring-orange-400/25 dark:bg-orange-400/10"
                                                    : "border-zinc-200 hover:border-zinc-300 dark:border-white/10 dark:hover:border-white/20"
                                                    }`}
                                            >
                                                <span
                                                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-sm ${isSelected
                                                        ? "bg-orange-500 text-white"
                                                        : "bg-[#0B1E3D]/5 text-[#0B1E3D] dark:bg-white/10 dark:text-orange-300"
                                                        }`}
                                                >
                                                    <Wallet className="h-4 w-4" />
                                                </span>

                                                <div className="min-w-0 flex-1">
                                                    <p className="truncate text-sm font-medium text-[#0B1E3D] dark:text-white">
                                                        {getCourseLabel(
                                                            fee,
                                                        )}
                                                    </p>
                                                    <p className="mt-0.5 text-[11px] text-zinc-500 dark:text-zinc-400">
                                                        Paid{" "}
                                                        {formatMoney(
                                                            fee.amountPaid,
                                                            fee.currency,
                                                        )}{" "}
                                                        of{" "}
                                                        {formatMoney(
                                                            fee.totalAmount,
                                                            fee.currency,
                                                        )}
                                                    </p>
                                                </div>

                                                <div className="text-right">
                                                    <p className="text-[10px] uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                                                        Outstanding
                                                    </p>
                                                    <p className="text-sm font-semibold text-[#0B1E3D] tabular-nums dark:text-white">
                                                        {formatMoney(
                                                            remaining,
                                                            fee.currency,
                                                        )}
                                                    </p>
                                                </div>

                                                <span
                                                    aria-hidden
                                                    className={`ml-1 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border transition-colors ${isSelected
                                                        ? "border-orange-500 bg-orange-500"
                                                        : "border-zinc-300 dark:border-white/20"
                                                        }`}
                                                >
                                                    {isSelected && (
                                                        <span className="h-1.5 w-1.5 rounded-full bg-white" />
                                                    )}
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Amount + method */}
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                            <label
                                htmlFor="amount"
                                className={LABEL_BASE}
                            >
                                Amount
                            </label>
                            <input
                                id="amount"
                                type="text"
                                inputMode="decimal"
                                value={amount}
                                onChange={(e) =>
                                    setAmount(
                                        sanitizeAmountInput(
                                            e.target.value,
                                        ),
                                    )
                                }
                                disabled={!selectedFee}
                                placeholder="0.00"
                                className={`${INPUT_BASE} ${amountExceedsBalance
                                    ? "border-rose-400 focus:border-rose-400 focus:ring-rose-400/25"
                                    : ""
                                    }`}
                                required
                            />
                            {selectedFee && (
                                <p className="mt-1.5 text-[11px] text-zinc-500 dark:text-zinc-400">
                                    Outstanding:{" "}
                                    {formatMoney(
                                        outstanding,
                                        selectedFee.currency,
                                    )}
                                </p>
                            )}
                            {amountExceedsBalance && (
                                <p className="mt-1.5 text-[11px] text-rose-600 dark:text-rose-400">
                                    Amount exceeds the outstanding
                                    balance.
                                </p>
                            )}
                        </div>

                        <div>
                            <label
                                htmlFor="paymentMethod"
                                className={LABEL_BASE}
                            >
                                Payment method
                            </label>
                            <select
                                id="paymentMethod"
                                value={paymentMethod}
                                onChange={(e) =>
                                    setPaymentMethod(
                                        e.target
                                            .value as PaymentMethod,
                                    )
                                }
                                className={`${INPUT_BASE} pr-8`}
                            >
                                {METHOD_OPTIONS.map((m) => (
                                    <option
                                        key={m.value}
                                        value={m.value}
                                    >
                                        {m.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Date + confirmation code */}
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                            <label
                                htmlFor="transactionDate"
                                className={LABEL_BASE}
                            >
                                Transaction date &amp; time
                            </label>
                            <div className="relative">
                                <CalendarClock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400 dark:text-zinc-500" />
                                <input
                                    id="transactionDate"

                                    type="datetime-local"
                                    value={transactionDate}
                                    onChange={(e) =>
                                        setTransactionDate(
                                            e.target.value,
                                        )
                                    }
                                    className={`${INPUT_BASE} pl-9`}
                                />
                            </div>
                        </div>

                        <div>
                            <label
                                htmlFor="confirmationCode"
                                className={LABEL_BASE}
                            >
                                Confirmation code{" "}
                                <span className="font-normal normal-case tracking-normal text-zinc-400">
                                    (optional)
                                </span>
                            </label>
                            <div className="relative">
                                <Hash className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400 dark:text-zinc-500" />
                                <input
                                    id="confirmationCode"
                                    type="text"
                                    value={confirmationCode}
                                    onChange={(e) =>
                                        setConfirmationCode(
                                            e.target.value,
                                        )
                                    }
                                    maxLength={100}
                                    placeholder="e.g. MPESA receipt no."
                                    className={`${INPUT_BASE} pl-9 font-mono uppercase placeholder:normal-case placeholder:font-sans`}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Notes */}
                    <div>
                        <label
                            htmlFor="notes"
                            className={LABEL_BASE}
                        >
                            Notes{" "}
                            <span className="font-normal normal-case tracking-normal text-zinc-400">
                                (optional)
                            </span>
                        </label>
                        <div className="relative">
                            <FileText className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-zinc-400 dark:text-zinc-500" />
                            <textarea
                                id="notes"
                                value={notes}
                                onChange={(e) =>
                                    setNotes(e.target.value)
                                }
                                maxLength={500}
                                rows={3}
                                placeholder="Add any context for this payment..."
                                className="w-full resize-none rounded-sm border border-zinc-200 bg-white py-2.5 pl-9 pr-3 text-sm text-[#0B1E3D] outline-none transition-colors placeholder:text-zinc-400 focus:border-orange-400 focus:ring-2 focus:ring-orange-400/25 dark:border-white/10 dark:bg-[#0B1E3D] dark:text-white dark:placeholder:text-zinc-500"
                            />
                        </div>
                        <p className="mt-1.5 text-right text-[11px] text-zinc-400 dark:text-zinc-500">
                            {notes.length}/500
                        </p>
                    </div>

                    {/* Submit */}
                    <div className="flex flex-col-reverse gap-3 border-t border-zinc-100 pt-4 sm:flex-row sm:items-center sm:justify-end dark:border-white/5">
                        <Link
                            href="/finance/transactions"
                            className={`inline-flex h-10 items-center justify-center rounded-sm border border-zinc-200 px-4 text-sm font-medium text-[#0B1E3D] transition-colors hover:bg-zinc-50 dark:border-white/10 dark:text-white dark:hover:bg-white/5 ${FOCUS_RING}`}
                        >
                            Cancel
                        </Link>
                        <button
                            type="submit"
                            disabled={!canSubmit}
                            className={`inline-flex h-10 items-center justify-center gap-2 rounded-sm bg-orange-500 px-4 text-sm font-medium text-white shadow-sm transition-colors hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50 ${FOCUS_RING}`}
                        >
                            {submitting ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Recording...
                                </>
                            ) : (
                                <>
                                    <CheckCircle2 className="h-4 w-4" />
                                    Record payment
                                </>
                            )}
                        </button>
                    </div>
                </form>
            )}
        </div>
    );
}

export default function NewTransactionPage() {
    return (
        <RequireRole roles={["admin", "registrar"]}>
            <NewTransactionContent />
        </RequireRole>
    );
}