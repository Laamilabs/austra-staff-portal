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
// Status enum (mirrors StudentFeeStatus on the server)
// ---------------------------------------------------------------------------

/**
 * Lifecycle of a student fee assignment.
 *
 * - `ACTIVE`    — set on create; the amount may still be payable.
 * - `COMPLETED` — set by the backend once `amountPaid >= totalAmount`
 *                 (there is no explicit route for this yet).
 * - `CANCELLED` — soft-delete target of `DELETE /student-fees/:id`.
 *                 Cancelled rows are excluded from most queries and cannot be
 *                 updated.
 */
export type StudentFeeStatus = "ACTIVE" | "COMPLETED" | "CANCELLED";

// ---------------------------------------------------------------------------
// Student fee entity
// ---------------------------------------------------------------------------

/**
 * A fee assignment: one student, one course, one fee structure.
 *
 * - `studentId` / `courseId` / `feeStructureId` are populated on every read
 *   path today. They're typed as `Ref | string` so the client stays correct
 *   if a referenced document was deleted or a future endpoint skips populate.
 * - `totalAmount` is snapshotted from the fee structure on create (and again
 *   on update while `amountPaid === 0`). It is **not** a live reference —
 *   changing the underlying fee structure after payments have started is
 *   blocked by the backend.
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
     */
    totalAmount: number;

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
 *
 * The referenced FeeStructure must exist, be `isActive: true`, and belong to
 * the given `courseId` — otherwise the backend returns 404.
 */
export interface CreateStudentFeeDto {
    /** Student ObjectId. */
    studentId: string;

    /** Course ObjectId. */
    courseId: string;

    /** FeeStructure ObjectId. Must belong to `courseId` and be active. */
    feeStructureId: string;
}

/**
 * Update a student fee assignment.
 *
 * PATCH /student-fees/:id
 *
 * Only `feeStructureId` is honoured by the current service. When supplied:
 *   - the assignment must not be `CANCELLED`
 *   - `amountPaid` must be `0` (no re-assessment after payments)
 *   - the new fee structure must be active and belong to the same course
 *
 * Omitted fields are left untouched.
 */
export interface UpdateStudentFeeDto {
    /** Optional — swap the fee structure attached to this assignment. */
    feeStructureId?: string;
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

    async getByStudentAndCourse(
        studentId: string,
        courseId: string,
    ): Promise<StudentFee> {
        const { data } = await api.get<StudentFee>(
            `/student-fees/by-student/${studentId}/course/${courseId}`,
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