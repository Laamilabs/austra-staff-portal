import api from "../lib/api";

// ---------------------------------------------------------------------------
// Populated references
//
// Every read path in `StudentFeeService` now runs the same `POPULATE_SPEC`,
// so these refs are populated on the wire. They are still typed as
// `Ref | string` on the entity to stay correct if a referenced document was
// deleted after the fact.
// ---------------------------------------------------------------------------

/**
 * A single course enrollment on a populated Student.
 *
 * The enrollment's `courseId` is what `StudentFee.courseId._id` matches
 * against — use it to resolve the correct `admissionNumber` when a student
 * is enrolled in more than one course.
 */
export interface StudentCourseRef {
    _id: string;
    admissionNumber: string;
    courseId: string | CourseRef;
    dateOfAdmission?: string;
    dateOfCompletion?: string;
}

/**
 * Populated Student reference.
 *
 * The backend selects:
 *   `fullName contact identification gender courses`
 * and nothing else. Fields beyond those are typed optional so nothing breaks
 * if a route later widens or narrows its projection.
 */
export interface StudentRef {
    _id: string;

    fullName?: {
        firstName: string;
        middleName?: string;
        lastName: string;
    };

    gender?: string;

    contact?: {
        email: string;
        phoneNumber: string;
    };

    identification?: {
        idNumber: string;
        passportNumber?: string;
        bloodGroup?: string;
    };

    /**
     * Per-course enrollments. `admissionNumber` lives here, keyed by
     * `courseId`, not on the Student root.
     */
    courses?: StudentCourseRef[];

    // Not selected by the populate spec today, but possible extras.
    dateOfBirth?: string;
    nationality?: string;
}

/**
 * Populated Course reference.
 *
 * The backend selects:
 *   `name courseCode level duration department`
 * `department` remains a raw ObjectId string — the populate spec does not
 * nest a second join for it.
 */
export interface CourseRef {
    _id: string;
    name?: string;
    courseCode?: string;
    level?: string;
    duration?: string;

    /** Raw Department ObjectId — not populated. */
    department?: string;

    /** Only present if a route widens its projection. */
    description?: string;
    prerequisites?: string;
    featured?: boolean;
}

/**
 * Populated FeeStructure reference.
 *
 * The backend selects:
 *   `name totalAmount currency isActive feeItems`
 */
export interface FeeStructureRef {
    _id: string;
    name?: string;
    totalAmount?: number;
    currency?: string;
    isActive?: boolean;
    feeItems?: Array<{
        name: string;
        amount: number;
        description?: string;
    }>;
}

// ---------------------------------------------------------------------------
// Status + discount enums (mirror the server schemas)
// ---------------------------------------------------------------------------

/**
 * Lifecycle of a student fee assignment.
 *
 * - `ACTIVE`    — set on create; the amount may still be payable.
 * - `COMPLETED` — set by the backend once `amountPaid >= netAmount`
 *                 (there is no explicit route for this yet).
 * - `CANCELLED` — soft-delete target of `DELETE /student-fees/:id`.
 *                 Cancelled rows are excluded from most queries and cannot be
 *                 updated.
 */
export type StudentFeeStatus = "ACTIVE" | "COMPLETED" | "CANCELLED";

/**
 * How a discount is expressed.
 *
 * - `PERCENTAGE` — `discountValue` is a percentage of `totalAmount`
 *                  (0–100). Recomputed when the fee structure is swapped.
 * - `FIXED`      — `discountValue` is an absolute amount in the assignment's
 *                  `currency`. Clamped to `totalAmount` on the server, so a
 *                  swap to a cheaper structure can't push the net negative.
 */
export type DiscountType = "PERCENTAGE" | "FIXED";

// ---------------------------------------------------------------------------
// Student fee entity
// ---------------------------------------------------------------------------

/**
 * A fee assignment: one student, one course, **one fee structure**.
 *
 * Uniqueness on the server is keyed by `(studentId, courseId,
 * feeStructureId)` while `status != CANCELLED` — **not** by
 * `(studentId, courseId)` alone. A student may therefore hold several
 * active assignments on the same course, one per fee structure (e.g.
 * Semester 1, Semester 2, Semester 3). Any code that used to treat
 * "student + course" as a single row must now resolve the structure too,
 * or address the row by its `_id`.
 *
 * - `studentId` / `courseId` / `feeStructureId` are populated on every read
 *   path today. They're typed as `Ref | string` so the client stays correct
 *   if a referenced document was deleted or a future endpoint skips populate.
 * - `totalAmount` is snapshotted from the fee structure on create (and again
 *   on update while `amountPaid === 0`). It is **not** a live reference —
 *   changing the underlying fee structure after payments have started is
 *   blocked by the backend.
 * - `discountAmount` is derived on the server from `totalAmount`,
 *   `discountType`, and `discountValue`. Do not set it directly — use
 *   `getNetAmount(fee)` when you need "what the student owes".
 * - `amountPaid` is derived from recorded payments; the client never sets it.
 * - `currency` is upper-cased by the schema and defaults to `"KES"`.
 * - Timestamps are added by `@Schema({ timestamps: true })`.
 */
export interface StudentFee {
    _id: string;

    studentId: StudentRef | string;

    courseId: CourseRef | string;

    feeStructureId: FeeStructureRef | string;

    /**
     * Snapshot of the fee structure's total at assignment time.
     * This is the **gross** amount, before discount.
     */
    totalAmount: number;

    /** `undefined` when no discount is applied. */
    discountType?: DiscountType;

    /**
     * Raw input, not the computed amount:
     *   - `PERCENTAGE` → 10 means 10%
     *   - `FIXED`      → 5000 means KES 5,000
     * Kept so a fee-structure swap can recompute `discountAmount`.
     */
    discountValue?: number;

    /**
     * Derived on the server: absolute amount knocked off `totalAmount`.
     * Always `0` when no discount is applied, and never exceeds
     * `totalAmount`. Read-only for the client.
     */
    discountAmount: number;

    /** Free-text justification (e.g. "Merit scholarship"). */
    discountReason?: string;

    /**
     * Server virtual: `totalAmount - discountAmount`. Present on every
     * response because the schema enables `toJSON: { virtuals: true }`.
     * Prefer `getNetAmount(fee)`, which falls back gracefully if a route
     * ever omits the virtual.
     */
    netAmount?: number;

    /**
     * Server-tracked; the client never writes this directly.
     */
    amountPaid: number;

    currency: string;

    status: StudentFeeStatus;

    createdAt?: string;
    updatedAt?: string;
    __v?: number;
}

// ---------------------------------------------------------------------------
// Create / update DTOs
// ---------------------------------------------------------------------------

/**
 * Assign a fee structure to a student for a course.
 *
 * POST /student-fees
 *
 * Backend derives everything else:
 *   - `totalAmount` and `currency` come from the referenced FeeStructure
 *   - `amountPaid` is initialised to `0`
 *   - `status` is initialised to `ACTIVE`
 *   - `discountAmount` is derived from `discountType` + `discountValue`
 *
 * The referenced FeeStructure must exist, be `isActive: true`, and belong to
 * the given `courseId` — otherwise the backend returns 404.
 *
 * Multiple active assignments per `(studentId, courseId)` are **allowed**
 * as long as `feeStructureId` differs — this is how semester-based fee
 * structures are modelled. Re-assigning the *same* `feeStructureId` for the
 * same student + course while the previous one is non-cancelled returns
 * `400 Bad Request`. Cancelling the previous assignment (`DELETE
 * /student-fees/:id`) frees the slot up again.
 */
export interface CreateStudentFeeDto {
    /** Student ObjectId. */
    studentId: string;

    /** Course ObjectId. */
    courseId: string;

    /** FeeStructure ObjectId. Must belong to `courseId` and be active. */
    feeStructureId: string;

    /**
     * Optional discount. Omit for no discount.
     *
     * - `PERCENTAGE` → `discountValue` must be 0–100.
     * - `FIXED`      → `discountValue` must be ≤ `feeStructure.totalAmount`.
     *
     * Sending `discountType` without `discountValue` (or vice versa) is
     * rejected with 400.
     */
    discountType?: DiscountType;

    /**
     * Required when `discountType` is set. Percentage or absolute amount
     * depending on `discountType`.
     */
    discountValue?: number;

    /** Free-text justification; max 200 chars. */
    discountReason?: string;
}

/**
 * Update a student fee assignment.
 *
 * PATCH /student-fees/:id
 *
 * Every field is optional; omitted fields are left untouched.
 *
 * **`feeStructureId`** — when supplied:
 *   - the assignment must not be `CANCELLED`
 *   - `amountPaid` must be `0` (no re-assessment after payments)
 *   - the new fee structure must be active and belong to the same course
 *   - it must not already be attached to another non-cancelled assignment
 *     for the same student + course
 *
 * **Discount fields** — when supplied:
 *   - `discountType: null` clears the entire discount (type, value, reason)
 *   - `discountType` / `discountValue` edits are blocked once
 *     `amountPaid > 0` (they change what's owed)
 *   - `discountReason`-only edits are allowed at any time (they don't
 *     affect the amount)
 *   - partial updates are merged onto the current document before range
 *     validation, so `{ discountValue: 150 }` on an existing `PERCENTAGE`
 *     discount is rejected just like a full update would be
 */
export interface UpdateStudentFeeDto {
    /** Optional — swap the fee structure attached to this assignment. */
    feeStructureId?: string;

    /**
     * Optional — set to a `DiscountType` to change the kind of discount,
     * or `null` to clear the discount entirely (value + reason too).
     * Omit to leave the current discount untouched.
     */
    discountType?: DiscountType | null;

    /**
     * Optional — new raw value. Merged with the current `discountType`
     * before validation, so this can be sent on its own.
     */
    discountValue?: number;

    /**
     * Optional — new reason. Does not affect validation of the amount and
     * is the only discount field editable after a payment is recorded.
     */
    discountReason?: string;
}

// ---------------------------------------------------------------------------
// Populated-field helpers
//
// Safe against both populated objects and raw ObjectId strings, so callers
// never need to branch on the union themselves.
// ---------------------------------------------------------------------------

function refId(ref: unknown): string | undefined {
    if (!ref) return undefined;
    if (typeof ref === "string") return ref;
    if (typeof ref === "object" && "_id" in (ref as object)) {
        return (ref as { _id: string })._id;
    }
    return undefined;
}

/** Full name of the populated student, or `""` if not populated. */
export function getStudentName(fee: StudentFee): string {
    const ref = fee.studentId;
    if (!ref || typeof ref === "string") return "";

    const n = ref.fullName;
    if (!n) return "";

    return [n.firstName, n.middleName, n.lastName]
        .filter((part) => part?.trim())
        .join(" ");
}

/** Contact email of the populated student, or `""`. */
export function getStudentEmail(fee: StudentFee): string {
    const ref = fee.studentId;
    if (!ref || typeof ref === "string") return "";
    return ref.contact?.email ?? "";
}

/**
 * Admission number for the enrollment that matches `fee.courseId`.
 * Falls back to the first enrollment if no course match is found — better
 * than hiding info the operator may need.
 */
export function getAdmissionNumber(fee: StudentFee): string {
    const studentRef = fee.studentId;
    if (!studentRef || typeof studentRef === "string") return "";

    const enrollments = studentRef.courses ?? [];
    if (enrollments.length === 0) return "";

    const targetCourseId = refId(fee.courseId);
    if (targetCourseId) {
        const match = enrollments.find(
            (enrollment) => refId(enrollment.courseId) === targetCourseId,
        );
        if (match?.admissionNumber) return match.admissionNumber;
    }

    return enrollments[0]?.admissionNumber ?? "";
}

/** Course name (falls back to code, then `""`). */
export function getCourseName(fee: StudentFee): string {
    const ref = fee.courseId;
    if (!ref || typeof ref === "string") return "";
    return ref.name ?? ref.courseCode ?? "";
}

/** Course code, or `""`. */
export function getCourseCode(fee: StudentFee): string {
    const ref = fee.courseId;
    if (!ref || typeof ref === "string") return "";
    return ref.courseCode ?? "";
}

/** Fee structure name, or `""`. */
export function getFeeStructureName(fee: StudentFee): string {
    const ref = fee.feeStructureId;
    if (!ref || typeof ref === "string") return "";
    return ref.name ?? "";
}

/**
 * The id of the fee structure attached to an assignment, regardless of
 * whether it is populated. Useful as a key when grouping multiple
 * assignments on the same course.
 */
export function getFeeStructureId(fee: StudentFee): string {
    return refId(fee.feeStructureId) ?? "";
}

// ---------------------------------------------------------------------------
// Discount helpers
// ---------------------------------------------------------------------------

/** `true` when the assignment carries any discount at all. */
export function hasDiscount(fee: StudentFee): boolean {
    return Boolean(fee.discountType) && (fee.discountAmount ?? 0) > 0;
}

/**
 * What the student actually owes: `totalAmount - discountAmount`.
 *
 * Prefers the server's `netAmount` virtual when present, and falls back to
 * computing it locally — same formula, same rounding, so the two should
 * agree. Clamped to `0` so a stale `discountAmount > totalAmount` (from a
 * pre-hook document loaded before a structure swap persisted) can never
 * produce a negative payable amount in the UI.
 */
export function getNetAmount(fee: StudentFee): number {
    if (typeof fee.netAmount === "number") {
        return Math.max(0, fee.netAmount);
    }
    return Math.max(0, fee.totalAmount - (fee.discountAmount ?? 0));
}

/**
 * Human-readable summary of the discount, e.g. `"10% (Merit scholarship)"`
 * or `"KES 5,000 (Staff waiver)"`. Returns `""` when no discount is set.
 *
 * Percentages render the raw `discountValue`, not a recomputed figure, so
 * they stay stable across fee-structure swaps.
 */
export function getDiscountLabel(
    fee: StudentFee,
    currency = fee.currency,
): string {
    if (!fee.discountType || fee.discountValue == null) return "";

    const valueLabel =
        fee.discountType === "PERCENTAGE"
            ? `${fee.discountValue}%`
            : new Intl.NumberFormat("en-KE", {
                  style: "currency",
                  currency,
                  maximumFractionDigits: 2,
              }).format(fee.discountValue);

    return fee.discountReason
        ? `${valueLabel} (${fee.discountReason})`
        : valueLabel;
}

// ---------------------------------------------------------------------------
// API client
// ---------------------------------------------------------------------------

export const studentFeeApi = {
    async create(data: CreateStudentFeeDto): Promise<StudentFee> {
        const { data: sf } = await api.post<StudentFee>("/student-fees", data);
        return sf;
    },

    async getAll(): Promise<StudentFee[]> {
        const { data } = await api.get<StudentFee[]>("/student-fees");
        return data;
    },

    async getByStudentId(studentId: string): Promise<StudentFee[]> {
        const { data } = await api.get<StudentFee[]>(
            `/student-fees/by-student/${studentId}`,
        );
        return data;
    },

    async getByCourseId(courseId: string): Promise<StudentFee[]> {
        const { data } = await api.get<StudentFee[]>(
            `/student-fees/by-course/${courseId}`,
        );
        return data;
    },

    /**
     * All active fee assignments for one student on one course.
     *
     * Returns an **array** — a student may hold multiple assignments on the
     * same course (e.g. Semester 1, Semester 2, Semester 3 fee structures).
     * `[]` means no assignments exist yet.
     *
     * If you need to resolve which row a payment applies to, take an
     * explicit `feeStructureId` from the UI and use
     * `getByStudentCourseAndStructure`, or address the row by its `_id`.
     */
    async getAllByStudentAndCourse(
        studentId: string,
        courseId: string,
    ): Promise<StudentFee[]> {
        const { data } = await api.get<StudentFee[]>(
            `/student-fees/by-student/${studentId}/course/${courseId}`,
        );
        return data;
    },

    /**
     * The specific assignment for a student + course + fee structure.
     *
     * Returns `StudentFee` on success, throws (404) when no non-cancelled
     * assignment exists for that triple. Useful for idempotency checks
     * before `create` (the exact rule the backend enforces).
     */
    async getByStudentCourseAndStructure(
        studentId: string,
        courseId: string,
        feeStructureId: string,
    ): Promise<StudentFee> {
        const { data } = await api.get<StudentFee>(
            `/student-fees/by-student/${studentId}/course/${courseId}/structure/${feeStructureId}`,
        );
        return data;
    },

    async getById(id: string): Promise<StudentFee> {
        const { data } = await api.get<StudentFee>(`/student-fees/${id}`);
        return data;
    },

    async update(id: string, data: UpdateStudentFeeDto): Promise<StudentFee> {
        const { data: sf } = await api.patch<StudentFee>(
            `/student-fees/${id}`,
            data,
        );
        return sf;
    },

    async cancel(id: string): Promise<StudentFee> {
        const { data } = await api.delete<StudentFee>(`/student-fees/${id}`);
        return data;
    },
};