// app/types/fee-structure.ts
import api from "../lib/api";

// ---------------------------------------------------------------------------
// Populated references
// ---------------------------------------------------------------------------

/**
 * Populated Course reference.
 *
 * Population depends on the endpoint:
 *
 *   - `GET /fee-structures`      → populated with `{ _id, name, courseCode }`
 *   - `GET /fee-structures/:id`  → populated with `{ _id, name, courseCode }`
 *   - `GET /fee-structures/by-course/:courseId`
 *                                → **not** populated; returns a raw ObjectId
 *                                  string (the service does not call
 *                                  `.populate` on this path).
 *
 * `FeeStructure.courseId` is therefore typed as `Course | string`, and every
 * field except `_id` is optional so a partially-populated document remains
 * assignable.
 */
export interface Course {
    _id: string;
    name?: string;
    courseCode?: string;
    // The service's `select: "name courseCode"` currently excludes these,
    // but they're kept here so a future expansion of the projection (or a
    // richer populate elsewhere) doesn't break callers.
    level?: string;
    duration?: string;
    department?: string;
}

// ---------------------------------------------------------------------------
// Sub-documents
// ---------------------------------------------------------------------------

/**
 * One line item inside a fee structure.
 *
 * Mirrors the `FeeItem` sub-schema. `_id` is disabled on the schema
 * (`@Schema({ _id: false })`), so the sub-document never has an id of its own —
 * identify items by index, or by `name` if you enforce uniqueness.
 */
export interface FeeItem {
    name: string;
    amount: number;
    description?: string;
}

// ---------------------------------------------------------------------------
// Fee structure entity
// ---------------------------------------------------------------------------

/**
 * A fee structure belonging to a single Course.
 *
 * - `courseId` is a populated `Course` when returned from
 *   `GET /fee-structures` or `GET /fee-structures/:id`, and a raw ObjectId
 *   string when returned from `GET /fee-structures/by-course/:courseId`.
 *   Use `isPopulatedCourse` below to narrow.
 * - `totalAmount` is always computed by the backend from `feeItems`; it is
 *   never sent by the client on create or update.
 * - `currency` defaults to `"KES"` and is upper-cased by the schema.
 * - `isActive` defaults to `true`.
 * - Timestamps are added by `@Schema({ timestamps: true })`.
 */
export interface FeeStructure {
    _id: string;

    /**
     * Populated on list/detail reads; raw ObjectId on by-course reads.
     */
    courseId: Course | string;

    name: string;

    feeItems: FeeItem[];

    /**
     * Server-computed sum of `feeItems[].amount`.
     */
    totalAmount: number;

    currency: string;

    isActive: boolean;

    createdAt?: string;
    updatedAt?: string;
    __v?: number;
}

/**
 * Type guard: true when `courseId` has been populated into a `Course` object.
 *
 * ```ts
 * const c = fs.courseId;
 * if (isPopulatedCourse(c)) {
 *   console.log(c.name, c.courseCode); // safe
 * } else {
 *   console.log(c); // c is string
 * }
 * ```
 */
export function isPopulatedCourse(
    courseId: FeeStructure["courseId"],
): courseId is Course {
    return typeof courseId === "object" && courseId !== null;
}

// ---------------------------------------------------------------------------
// Create / update DTOs
// ---------------------------------------------------------------------------

/**
 * Fee item payload used when creating a fee structure.
 *
 * Same shape as `FeeItem`; kept as a separate alias so client-side payloads
 * and server responses can diverge later without a breaking change.
 */
export interface CreateFeeItemDto {
    name: string;
    amount: number;
    description?: string;
}

/**
 * Create a fee structure.
 *
 * POST /fee-structures
 *
 * `totalAmount` is intentionally omitted — the backend derives it from
 * `feeItems`. The DTO mirrors the `class-validator` rules on the server:
 *   - `courseId` must be a Mongo ObjectId
 *   - `name` non-empty
 *   - `amount` >= 0, max 2 decimal places
 */
export interface CreateFeeStructureDto {
    /**
     * Course ObjectId.
     */
    courseId: string;

    name: string;

    feeItems: CreateFeeItemDto[];

    /**
     * Optional; schema defaults to `"KES"`.
     */
    currency?: string;

    /**
     * Optional; schema defaults to `true`.
     */
    isActive?: boolean;
}

/**
 * Update a fee structure.
 *
 * PATCH /fee-structures/:id
 *
 * All fields optional. When `feeItems` is supplied, the backend recalculates
 * `totalAmount`.
 *
 * NOTE: the service's `update` uses `findByIdAndUpdate(...).exec()` *without*
 * a subsequent `.populate(...)`, so the response body from a `PATCH` comes
 * back with `courseId` as a raw ObjectId string, even though `findOne` returns
 * it populated. The client type stays the same (`Course | string`), but callers
 * that need `courseId.name` after an update should re-fetch via `getById`.
 */
export type UpdateFeeStructureDto = Partial<CreateFeeStructureDto>;

// ---------------------------------------------------------------------------
// API client
// ---------------------------------------------------------------------------

export const feeStructureApi = {
    /**
     * Create a fee structure.
     *
     * POST /fee-structures
     *
     * The service returns the raw saved document — `courseId` is a plain
     * ObjectId string here (no populate on create).
     */
    async create(data: CreateFeeStructureDto): Promise<FeeStructure> {
        const { data: fs } = await api.post<FeeStructure>(
            "/fee-structures",
            data,
        );
        return fs;
    },

    /**
     * Get all fee structures, newest first.
     *
     * GET /fee-structures
     *
     * `courseId` is populated with `{ _id, name, courseCode }`.
     */
    async getAll(): Promise<FeeStructure[]> {
        const { data } = await api.get<FeeStructure[]>("/fee-structures");
        return data;
    },

    /**
     * Get all fee structures belonging to a specific course.
     *
     * GET /fee-structures/by-course/:courseId
     *
     * `courseId` is **not** populated on this route — the service returns the
     * raw ObjectId. Use `isPopulatedCourse` if you need to branch.
     */
    async getByCourseId(courseId: string): Promise<FeeStructure[]> {
        const { data } = await api.get<FeeStructure[]>(
            `/fee-structures/by-course/${courseId}`,
        );
        return data;
    },

    /**
     * Get one fee structure by its `_id`.
     *
     * GET /fee-structures/:id
     *
     * `courseId` is populated with `{ _id, name, courseCode }`.
     */
    async getById(id: string): Promise<FeeStructure> {
        const { data } = await api.get<FeeStructure>(`/fee-structures/${id}`);
        return data;
    },

    /**
     * Update a fee structure.
     *
     * PATCH /fee-structures/:id
     *
     * If `feeItems` is sent, the backend recalculates `totalAmount`.
     *
     * NOTE: the response does not populate `courseId`, so the returned
     * `courseId` is a raw ObjectId string even though `getById` populates it.
     */
    async update(
        id: string,
        data: UpdateFeeStructureDto,
    ): Promise<FeeStructure> {
        const { data: fs } = await api.patch<FeeStructure>(
            `/fee-structures/${id}`,
            data,
        );
        return fs;
    },

    /**
     * Delete a fee structure.
     *
     * DELETE /fee-structures/:id
     *
     * Returns the deleted document along with a status message, matching the
     * `FeeStructureService.remove` return shape. The deleted document's
     * `courseId` is the raw ObjectId (it was never populated before deletion).
     */
    async delete(
        id: string,
    ): Promise<{ message: string; data: FeeStructure }> {
        const { data } = await api.delete<{
            message: string;
            data: FeeStructure;
        }>(`/fee-structures/${id}`);
        return data;
    },
};