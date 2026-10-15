import api from "../lib/api";

// ---------------------------------------------------------------------------
// Enums — mirror the backend result.schema.ts exactly
// ---------------------------------------------------------------------------

export enum AssessmentType {
    CAT = "cat",
    PRACTICAL = "practical",
    FINAL_EXAM = "final_exam",
}

export enum ResultStatus {
    PENDING = "pending",
    COMPLETED = "completed",
}

// ---------------------------------------------------------------------------
// Populated references
// ---------------------------------------------------------------------------

/**
 * Populated Student reference.
 *
 * All reads that populate `studentId` currently select only
 * `fullName` and `admissionNumber`, so those are the only fields
 * guaranteed to be present. Everything else is marked optional.
 */
export interface ResultStudentRef {
    _id: string;
    fullName?: {
        firstName?: string;
        middleName?: string;
        lastName?: string;
    };
    admissionNumber?: string;
}

/**
 * Populated Course reference.
 *
 * `getStudentAggregates` populates this with `name courseCode`
 * (see result.service.ts). Other endpoints do not select it.
 */
export interface ResultCourseRef {
    _id: string;
    name?: string;
    courseCode?: string;
}

/**
 * Populated Unit reference.
 *
 * - `findAll` and `findOne` select `name code`.
 * - `findByStudent` / `findByStudentAndUnit` also select `type optionalUnit`.
 * - `getStudentAggregates` additionally populates `courseId`.
 */
export interface ResultUnitRef {
    _id: string;
    name?: string;
    code?: string;
    /**
     * Populated Course reference, only present on the aggregates
     * endpoint (which selects `name courseCode`). Treat as optional.
     */
    courseId?: ResultCourseRef | string;
    type?: "common" | "basic" | "core";
    optionalUnit?: boolean;
}

// ---------------------------------------------------------------------------
// Result entity
// ---------------------------------------------------------------------------

/**
 * A single assessment result.
 *
 * - `studentId` / `unitId` are populated objects on read endpoints,
 *   or raw ObjectId strings when the populate projection was skipped.
 * - `assessmentNumber` is only ever populated for CAT assessments.
 *   For PRACTICAL and FINAL_EXAM the backend strips it.
 * - `marks` is a percentage (0–100).
 * - `status` defaults to "completed" server-side.
 */
export interface Result {
    _id: string;

    studentId: ResultStudentRef | string;
    unitId: ResultUnitRef | string;

    assessmentType: AssessmentType;
    assessmentNumber?: number;

    marks: number;
    grade?: string;
    remarks?: string;

    status: ResultStatus;

    createdAt?: string;
    updatedAt?: string;
    __v?: number;
}

// ---------------------------------------------------------------------------
// Create / update DTOs
// ---------------------------------------------------------------------------

/**
 * Payload for POST /result.
 *
 * `assessmentNumber` is optional for CAT assessments — omit it and the
 * backend assigns the next sequential number (max existing + 1) for the
 * given student + unit pair. It is ignored and stripped for PRACTICAL
 * and FINAL_EXAM.
 */
export interface CreateResultDto {
    studentId: string;
    unitId: string;
    assessmentType: AssessmentType;

    /**
     * Optional. Only meaningful for CAT assessments.
     * Auto-assigned when omitted.
     */
    assessmentNumber?: number;

    marks: number;
    grade?: string;
    remarks?: string;
    status?: ResultStatus;
}

/**
 * Payload for PATCH /result/:id.
 *
 * All fields optional. Note: switching a result INTO a CAT without
 * supplying `assessmentNumber` causes the backend to auto-allocate
 * the next number for the record's student + unit pair. Switching
 * away from CAT clears the number.
 */
export type UpdateResultDto = Partial<CreateResultDto>;

// ---------------------------------------------------------------------------
// Aggregates
// ---------------------------------------------------------------------------

/**
 * Per-assessment breakdown inside a unit aggregate.
 * Matches the shape produced by the backend's `aggregateByStudent`.
 */
export interface AggregateAssessment {
    assessmentType: AssessmentType;
    assessmentNumber?: number;
    marks: number;
    grade?: string;
    status: ResultStatus;
}

/**
 * Per-unit aggregate for a single student.
 *
 * Mirrors the `UnitAggregate` / `StudentAggregate` output from
 * `aggregates/aggregates.ts` on the backend.
 */
export interface StudentUnitAggregate {
    unitId: string;
    unitName?: string;
    unitCode?: string;
    unitType?: string;
    optionalUnit?: boolean;
    courseId?: string;
    courseName?: string;
    courseCode?: string;

    totalMarks: number;
    averageMarks: number;
    assessmentCount: number;
    assessments: AggregateAssessment[];
}

/**
 * Aggregate bundle for one student across all units.
 */
export interface StudentAggregate {
    studentId: string;
    studentName?: string;
    admissionNumber?: string;
    units: StudentUnitAggregate[];
}

// ---------------------------------------------------------------------------
// API client
// ---------------------------------------------------------------------------

export const resultApi = {
    /**
     * Create a result.
     *
     * POST /result
     */
    create(data: CreateResultDto) {
        return api.post<Result>("/result", data);
    },

    /**
     * List results, optionally filtered by student and/or unit.
     *
     * GET /result
     * GET /result?studentId=...
     * GET /result?unitId=...
     * GET /result?studentId=...&unitId=...
     */
    getAll(params?: { studentId?: string; unitId?: string }) {
        return api.get<Result[]>("/result", { params });
    },

    /**
     * Get per-student aggregates.
     *
     * GET /result/aggregates/students
     * GET /result/aggregates/students?studentId=...&unitId=...
     */
    getStudentAggregates(params?: { studentId?: string; unitId?: string }) {
        return api.get<StudentAggregate[]>("/result/aggregates/students", {
            params,
        });
    },

    /**
     * Get a single result by Result ObjectId.
     *
     * GET /result/:id
     */
    getById(id: string) {
        return api.get<Result>(`/result/${id}`);
    },

    /**
     * All results for one student (across every unit).
     *
     * GET /result/student/:studentId
     */
    getByStudent(studentId: string) {
        return api.get<Result[]>(`/result/student/${studentId}`);
    },

    /**
     * All results for one unit (across every student).
     *
     * GET /result/unit/:unitId
     */
    getByUnit(unitId: string) {
        return api.get<Result[]>(`/result/unit/${unitId}`);
    },

    /**
     * All results for one student in one unit.
     *
     * GET /result/student/:studentId/unit/:unitId
     */
    getByStudentAndUnit(studentId: string, unitId: string) {
        return api.get<Result[]>(
            `/result/student/${studentId}/unit/${unitId}`,
        );
    },

    /**
     * Update a result.
     *
     * PATCH /result/:id
     */
    update(id: string, data: UpdateResultDto) {
        return api.patch<Result>(`/result/${id}`, data);
    },

    /**
     * Delete a result.
     *
     * DELETE /result/:id
     */
    delete(id: string) {
        return api.delete<{ message: string }>(`/result/${id}`);
    },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Extract a plain Student id from a possibly-populated reference.
 */
export function getResultStudentId(
    student: Result["studentId"],
): string | null {
    if (!student) return null;
    if (typeof student === "string") return student;
    return student._id ?? null;
}

/**
 * Extract a plain Unit id from a possibly-populated reference.
 */
export function getResultUnitId(unit: Result["unitId"]): string | null {
    if (!unit) return null;
    if (typeof unit === "string") return unit;
    return unit._id ?? null;
}

/**
 * Human-friendly label for an assessment type + number pair.
 *
 *   cat, 2                  -> "CAT 2"
 *   practical               -> "Practical"
 *   final_exam              -> "Final Exam"
 */
export function formatAssessmentLabel(result: Result): string {
    switch (result.assessmentType) {
        case AssessmentType.CAT:
            return result.assessmentNumber
                ? `CAT ${result.assessmentNumber}`
                : "CAT";
        case AssessmentType.PRACTICAL:
            return "Practical";
        case AssessmentType.FINAL_EXAM:
            return "Final Exam";
        default:
            return "Assessment";
    }
}

/**
 * Parse a marks value (0–100) into a Kenyan-style letter grade.
 *
 * Adjust the thresholds here if your institution uses a different scale.
 */
export function marksToGrade(marks: number): string {
    if (marks >= 70) return "Distinction";
    if (marks >= 60) return "Credit";
    if (marks >= 40) return "Pass";
    return "Fail";
}