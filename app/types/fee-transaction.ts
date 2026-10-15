// app/types/fee-transaction.ts
import api from "../lib/api";

// ---------------------------------------------------------------------------
// Enums (mirror the NestJS enums exactly)
// ---------------------------------------------------------------------------

export type PaymentMethod =
    | "CASH"
    | "MPESA"
    | "BANK_TRANSFER"
    | "OTHER";

export type TransactionStatus =
    | "PENDING"
    | "CONFIRMED"
    | "REVERSED";

/**
 * Mirrors `StudentFeeStatus` on the backend.
 * Re-declared here so the frontend does not import server-only modules.
 */
export type StudentFeeStatus =
    | "ACTIVE"
    | "COMPLETED"
    | "CANCELLED";

// ---------------------------------------------------------------------------
// Populated references
// ---------------------------------------------------------------------------

/**
 * Populated User reference (e.g. `confirmedBy`).
 *
 * Endpoints may populate only `email`, or the full user shape.
 * All non-`_id` fields are optional to cover both cases.
 */
export interface FeeUserRef {
    _id: string;
    email?: string;
    name?: string;
    role?: "admin" | "staff" | "student";
    profileImage?: string;
}

/**
 * Populated Student reference.
 * Kept loose on purpose — different endpoints populate different fields.
 */
/**
 * A single course enrollment on a populated Student.
 * The transaction's `courseId` points at `courseId` here, and
 * `admissionNumber` is the value you display in the transactions table.
 */
export interface FeeStudentCourseRef {
    _id: string;
    admissionNumber: string;
    courseId: string | FeeCourseRef;
    dateOfAdmission?: string;
    dateOfCompletion?: string;
}

/**
 * Populated Student reference.
 *
 * Kept loose on purpose — different endpoints populate different fields.
 * When present, `courses[].admissionNumber` carries the per-enrollment
 * admission number.
 */
export interface FeeStudentRef {
    _id: string;
    fullName?: {
        firstName: string;
        lastName: string;
        middleName?: string;
    };
    contact?: {
        email: string;
        phoneNumber: string;
    };
    identification?: {
        idNumber: string;
        passportNumber?: string;
    };
    gender?: string;
    courses?: FeeStudentCourseRef[];
}

/**
 * Populated Course reference.
 */
export interface FeeCourseRef {
    _id: string;
    name?: string;
    courseCode?: string;
    level?: string;
    duration?: string;
    department?: string;
}

/**
 * Populated StudentFee reference.
 * Kept minimal — the frontend usually only needs the totals + status.
 */
export interface FeeStudentFeeRef {
    _id: string;
    studentId?: string | FeeStudentRef;
    courseId?: string | FeeCourseRef;
    totalAmount?: number;
    amountPaid?: number;
    currency?: string;
    status?: StudentFeeStatus;
}

// ---------------------------------------------------------------------------
// FeeTransaction entity
// ---------------------------------------------------------------------------

/**
 * A recorded payment against a `StudentFee` assessment.
 *
 * Field names mirror the Mongoose schema exactly.
 *
 * On the wire, the current service returns `studentFeeId`, `studentId`,
 * `courseId`, and `confirmedBy` as raw ObjectId strings — the service never
 * calls `.populate(...)`. They are typed as `string | PopulatedRef` anyway so
 * the client stays correct if the backend later adds population.
 */
export interface FeeTransaction {
    _id: string;

    studentFeeId: string | FeeStudentFeeRef;
    studentId: string | FeeStudentRef;
    courseId: string | FeeCourseRef;

    amount: number;

    paymentMethod: PaymentMethod;

    /** ISO date string. Always set (defaults to now on the backend). */
    transactionDate: string;

    /**
     * Uppercased and trimmed on the backend. Sparse-indexed, so absent on
     * transactions that didn't capture a confirmation code (e.g. cash).
     */
    confirmationCode?: string;

    /**
     * User who confirmed the payment.
     * Server-side this is always an ObjectId; populated shape is for the
     * future-proof union.
     */
    confirmedBy: string | FeeUserRef;

    status: TransactionStatus;

    /** Uppercased on the backend. Defaults to `"KES"`. */
    currency: string;

    notes?: string;

    createdAt?: string;
    updatedAt?: string;
    __v?: number;
}

// ---------------------------------------------------------------------------
// Create / update DTOs (mirror class-validator DTOs)
// ---------------------------------------------------------------------------

/**
 * POST /fee-transactions
 *
 * Mirrors `CreateFeeTransactionDto` on the backend.
 *
 * - `amount` must be >= 0.01 with at most 2 decimal places.
 * - `transactionDate` is optional; omit for "pay now".
 * - `confirmedBy` is taken from the JWT, never sent by the client.
 * - `studentId` and `courseId` are derived server-side from the referenced
 *   StudentFee — they are NOT part of this DTO.
 */
export interface CreateFeeTransactionDto {
    /** Mongo ObjectId of the StudentFee assessment. */
    studentFeeId: string;

    /** Must be >= 0.01 and have at most 2 decimal places. */
    amount: number;

    paymentMethod: PaymentMethod;

    /** ISO date string. Omit for "now". */
    transactionDate?: string;

    /** Max length 100. */
    confirmationCode?: string;

    /** Max length 500. */
    notes?: string;
}

/**
 * PATCH /fee-transactions/:id
 *
 * The service only exposes `notes` as mutable — financial fields are
 * immutable. Mirrors `UpdateFeeTransactionDto`.
 */
export interface UpdateFeeTransactionDto {
    /** Max length 500. */
    notes?: string;
}

// ---------------------------------------------------------------------------
// Response helpers
// ---------------------------------------------------------------------------

/**
 * The backend `create` and `reverse` return the transaction document,
 * or `null` if the transaction block produced nothing (should not happen,
 * but typed defensively to match the service signature).
 */
export type FeeTransactionResponse = FeeTransaction | null;

// ---------------------------------------------------------------------------
// API client
// ---------------------------------------------------------------------------

export const feeTransactionApi = {
    /**
     * Record a payment against a student fee assessment.
     *
     * POST /fee-transactions
     *
     * `confirmedBy` is derived server-side from the JWT.
     * Requires authentication (controller is guarded by `AuthGuard('jwt')`).
     */
    async create(
        data: CreateFeeTransactionDto,
    ): Promise<FeeTransactionResponse> {
        const { data: tx } = await api.post<FeeTransactionResponse>(
            "/fee-transactions",
            data,
        );
        return tx;
    },

    /**
     * Get all fee transactions (newest first, by `transactionDate`).
     *
     * GET /fee-transactions
     */
    async getAll(): Promise<FeeTransaction[]> {
        const { data } = await api.get<FeeTransaction[]>("/fee-transactions");
        return data;
    },

    /**
     * Get one transaction by its ObjectId.
     *
     * GET /fee-transactions/:id
     */
    async getById(id: string): Promise<FeeTransaction> {
        const { data } = await api.get<FeeTransaction>(
            `/fee-transactions/${id}`,
        );
        return data;
    },

    /**
     * Transaction history for a student.
     *
     * GET /fee-transactions/by-student/:studentId
     */
    async getByStudentId(studentId: string): Promise<FeeTransaction[]> {
        const { data } = await api.get<FeeTransaction[]>(
            `/fee-transactions/by-student/${studentId}`,
        );
        return data;
    },

    /**
     * Transaction history for a course.
     *
     * GET /fee-transactions/by-course/:courseId
     */
    async getByCourseId(courseId: string): Promise<FeeTransaction[]> {
        const { data } = await api.get<FeeTransaction[]>(
            `/fee-transactions/by-course/${courseId}`,
        );
        return data;
    },

    /**
     * Transaction history for a single StudentFee assessment.
     *
     * GET /fee-transactions/by-student-fee/:studentFeeId
     */
    async getByStudentFeeId(
        studentFeeId: string,
    ): Promise<FeeTransaction[]> {
        const { data } = await api.get<FeeTransaction[]>(
            `/fee-transactions/by-student-fee/${studentFeeId}`,
        );
        return data;
    },

    /**
     * Update mutable fields on a transaction (currently `notes` only).
     *
     * PATCH /fee-transactions/:id
     */
    async update(
        id: string,
        data: UpdateFeeTransactionDto,
    ): Promise<FeeTransaction> {
        const { data: tx } = await api.patch<FeeTransaction>(
            `/fee-transactions/${id}`,
            data,
        );
        return tx;
    },

    /**
     * Reverse a confirmed payment without deleting its history.
     *
     * POST /fee-transactions/:id/reverse
     *
     * Only `CONFIRMED` transactions can be reversed. On success, the linked
     * StudentFee's `amountPaid` is decremented and its status is reset to
     * `ACTIVE` (unless it was `CANCELLED`).
     */
    async reverse(id: string): Promise<FeeTransactionResponse> {
        const { data } = await api.post<FeeTransactionResponse>(
            `/fee-transactions/${id}/reverse`,
        );
        return data;
    },
};