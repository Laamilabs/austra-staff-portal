// app/types/curriculum.ts
import api from "../lib/api";
import type {
    FinanceSummary,
    TransactionStatus,
} from "./finance";

// ---------------------------------------------------------------------------
// Shared enums
// ---------------------------------------------------------------------------

export type CourseLevel =
    | "CERTIFICATE"
    | "DIPLOMA"
    | "HIGHER_DIPLOMA"
    | "DEGREE"
    | "POSTGRADUATE"
    | "OTHER";

// ---------------------------------------------------------------------------
// Populated references
// ---------------------------------------------------------------------------

export interface CurriculumUserRef {
    _id: string;
    email?: string;
    name?: string;
    role?: "admin" | "staff" | "student";
    profileImage?: string;
}

/** Minimal shape of a populated Course inside a Department/Faculty. */
export interface CourseRef {
    _id: string;
    name?: string;
    courseCode?: string;
    level?: string;
    featured?: boolean;
    department?: DepartmentRef | string;
}

/** Minimal shape of a populated Faculty inside a Department/Course. */
export interface FacultyRef {
    _id: string;
    name?: string;
    staffNo?: string;
    qualification?: string;
    expertise?: string;
    department?: DepartmentRef | string;
    user?: CurriculumUserRef | string;
}

/** Minimal shape of a populated Department. */
export interface DepartmentRef {
    _id: string;
    name?: string;
    description?: string;
    iconLink?: string;
}

// ---------------------------------------------------------------------------
// Entities
// ---------------------------------------------------------------------------

export interface Department {
    _id: string;
    name: string;
    description?: string;
    iconLink?: string;
    courses: CourseRef[] | string[];
    faculty: FacultyRef[] | string[];
    hod?: FacultyRef | string | null;
    createdAt?: string;
    updatedAt?: string;
    __v?: number;
}

export interface Faculty {
    _id: string;
    name: string;
    staffNo: string;
    qualification: string;
    expertise: string;
    description: string;
    user?: CurriculumUserRef | string;
    department?: DepartmentRef | string;
    courses: CourseRef[] | string[];
    documents: string[];
    createdAt?: string;
    updatedAt?: string;
    __v?: number;
}

export interface Course {
    _id: string;
    name: string;
    courseCode: string;
    description: string;
    duration: string;
    level: string;
    /** Schema stores prerequisites as a single string, not an array. */
    prerequisites: string;
    featured?: boolean;
    department?: DepartmentRef | string;
    createdAt?: string;
    updatedAt?: string;
    __v?: number;
}

// ---------------------------------------------------------------------------
// DTOs
// ---------------------------------------------------------------------------

export interface CreateDepartmentDto {
    name: string;
    description?: string;
    iconLink?: string;
    courses?: string[];
    faculty?: string[];
    hod?: string;
}

export type UpdateDepartmentDto = Partial<CreateDepartmentDto>;

export interface CreateFacultyDto {
    name: string;
    staffNo: string;
    qualification: string;
    expertise: string;
    description: string;
    user?: string;
    department: string;
    courses?: string[];
    documents?: string[];
}

export type UpdateFacultyDto = Partial<CreateFacultyDto>;

export interface CreateCourseDto {
    name: string;
    courseCode: string;
    level?: CourseLevel;
    duration?: string;
    description?: string;
    prerequisites?: string[];
    department: string;
}

export type UpdateCourseDto = Partial<CreateCourseDto>;

// ---------------------------------------------------------------------------
// Aggregated curriculum summary (mirrors backend CurriculumSummaryDto)
// ---------------------------------------------------------------------------

export interface DepartmentOverview {
    id: string;
    name: string;
    description: string;
    iconLink: string;
    courseCount: number;
    facultyCount: number;
    hodName: string | null;
}

export interface FacultyByDepartment {
    departmentId: string;
    departmentName: string;
    facultyCount: number;
}

export interface RecentTransaction {
    id: string;
    amount: number;
    currency: string;
    status: TransactionStatus;
    paymentMethod: string;
    transactionDate: string;
    studentName: string;
    admissionNumber: string;
}

export interface CurriculumKpis {
    students: { total: number };
    faculty: { total: number };
    courses: { total: number };
    departments: { total: number };
    finance: {
        totalBilled: number;
        totalPaid: number;
        outstanding: number;
        collectionRate: number;
        thisMonth: number;
        lastMonth: number;
        delta: number | null;
    };
    transactions: {
        confirmedCount: number;
        pendingCount: number;
        reversedCount: number;
    };
}

export interface CurriculumSummary {
    generatedAt: string;
    kpis: CurriculumKpis;
    /** Full finance roll-up — identical to the shape returned by the finance API. */
    finance: FinanceSummary;
    departments: DepartmentOverview[];
    facultyByDepartment: FacultyByDepartment[];
    recentTransactions: RecentTransaction[];
}

export interface CurriculumSummaryParams {
    monthsBack?: number;
    topN?: number;
    recentLimit?: number;
}

// ---------------------------------------------------------------------------
// API clients — every method unwraps `response.data`
// ---------------------------------------------------------------------------

export const departmentApi = {
    /** POST /departments */
    async create(data: CreateDepartmentDto): Promise<Department> {
        const res = await api.post<Department>("/departments", data);
        return res.data;
    },

    /** GET /departments */
    async getAll(): Promise<Department[]> {
        const res = await api.get<Department[]>("/departments");
        return res.data;
    },

    /** GET /departments/:id — populates faculty + hod (sanitized). */
    async getById(id: string): Promise<Department> {
        const res = await api.get<Department>(`/departments/${id}`);
        return res.data;
    },

    /** PATCH /departments/:id */
    async update(
        id: string,
        data: UpdateDepartmentDto,
    ): Promise<Department> {
        const res = await api.patch<Department>(`/departments/${id}`, data);
        return res.data;
    },

    /** DELETE /departments/:id */
    async delete(
        id: string,
    ): Promise<{ message: string; id: string }> {
        const res = await api.delete<{ message: string; id: string }>(
            `/departments/${id}`,
        );
        return res.data;
    },
};

export const facultyApi = {
    /** POST /faculty */
    async create(data: CreateFacultyDto): Promise<Faculty> {
        const res = await api.post<Faculty>("/faculty", data);
        return res.data;
    },

    /** GET /faculty */
    async getAll(): Promise<Faculty[]> {
        const res = await api.get<Faculty[]>("/faculty");
        return res.data;
    },

    /** GET /faculty/:id */
    async getById(id: string): Promise<Faculty> {
        const res = await api.get<Faculty>(`/faculty/${id}`);
        return res.data;
    },

    /** PATCH /faculty/:id */
    async update(id: string, data: UpdateFacultyDto): Promise<Faculty> {
        const res = await api.patch<Faculty>(`/faculty/${id}`, data);
        return res.data;
    },

    /** PATCH /faculty/:id/assign-user */
    async assignUser(id: string, userId: string): Promise<Faculty> {
        const res = await api.patch<Faculty>(
            `/faculty/${id}/assign-user`,
            { userId },
        );
        return res.data;
    },

    /** DELETE /faculty/:id */
    async delete(id: string): Promise<Faculty> {
        const res = await api.delete<Faculty>(`/faculty/${id}`);
        return res.data;
    },
};

export const courseApi = {
    /** POST /courses */
    async create(data: CreateCourseDto): Promise<Course> {
        const res = await api.post<Course>("/courses", data);
        return res.data;
    },

    /** GET /courses — lean list (drops description, prerequisites, duration). */
    async getAll(): Promise<Course[]> {
        const res = await api.get<Course[]>("/courses");
        return res.data;
    },

    /** GET /courses/:id — fully populated, including department. */
    async getById(id: string): Promise<Course> {
        const res = await api.get<Course>(`/courses/${id}`);
        return res.data;
    },

    /** PATCH /courses/:id */
    async update(id: string, data: UpdateCourseDto): Promise<Course> {
        const res = await api.patch<Course>(`/courses/${id}`, data);
        return res.data;
    },

    /** DELETE /courses/:id */
    async delete(id: string): Promise<Course> {
        const res = await api.delete<Course>(`/courses/${id}`);
        return res.data;
    },
};

export const curriculumApi = {
    /**
     * GET /curriculum/summary?monthsBack=6&topN=5&recentLimit=8
     *
     * Full Curriculum payload: KPIs + finance + departments +
     * faculty-by-department + recent transactions. Designed as a single
     * data source for the main dashboard.
     */
    async summary(
        params: CurriculumSummaryParams = {},
    ): Promise<CurriculumSummary> {
        const { monthsBack = 6, topN = 5, recentLimit = 8 } = params;
        const qs = new URLSearchParams({
            monthsBack: String(monthsBack),
            topN: String(topN),
            recentLimit: String(recentLimit),
        });
        const res = await api.get<CurriculumSummary>(
            `/curriculum/summary?${qs.toString()}`,
        );
        return res.data;
    },

    /**
     * GET /curriculum/kpis
     *
     * Lightweight KPI tiles only — good for polling / auto-refresh.
     */
    async kpis(): Promise<CurriculumKpis> {
        const res = await api.get<CurriculumKpis>("/curriculum/kpis");
        return res.data;
    },
};

// ---------------------------------------------------------------------------
// Display helpers
// ---------------------------------------------------------------------------

/** Extracts an `_id` string from a populated ref or a plain id. */
export function refId(ref: unknown): string | undefined {
    if (!ref) return undefined;
    if (typeof ref === "string") return ref;
    if (typeof ref === "object" && "_id" in (ref as object)) {
        const id = (ref as { _id?: unknown })._id;
        return typeof id === "string" ? id : undefined;
    }
    return undefined;
}

/** Runtime-narrow any unknown value to a record, else null. */
function asRecord(value: unknown): Record<string, unknown> | null {
    return value !== null && typeof value === "object"
        ? (value as Record<string, unknown>)
        : null;
}

/** Pulls a string-valued field off an unknown record, else "". */
function strField(
    value: unknown,
    key: string,
): string {
    const rec = asRecord(value);
    if (!rec) return "";
    const v = rec[key];
    return typeof v === "string" ? v : "";
}

/**
 * Resolves a department name from any of:
 *   - a `DepartmentRef` (has `.name`)
 *   - a wrapper like `{ department: DepartmentRef | string }`
 *   - a raw string id
 *   - null / undefined
 */
export function getDepartmentName(source: unknown): string {
    const obj = asRecord(source);
    if (!obj) return "";
    // If there's an embedded `department`, prefer it; otherwise use `source`.
    const candidate = asRecord(obj.department) ?? obj;
    return strField(candidate, "name");
}

/**
 * Resolves a course name from any of:
 *   - a `CourseRef` (has `.name`)
 *   - a wrapper like `{ course: CourseRef | string }`
 *   - a wrapper like `{ courseId: CourseRef | string }`
 *   - a raw string id
 *   - null / undefined
 */
export function getCourseName(source: unknown): string {
    const obj = asRecord(source);
    if (!obj) return "";
    const candidate =
        asRecord(obj.course) ??
        asRecord(obj.courseId) ??
        obj;
    return strField(candidate, "name");
}

/** Same resolution rules as `getCourseName`, but reads `courseCode`. */
export function getCourseCode(source: unknown): string {
    const obj = asRecord(source);
    if (!obj) return "";
    const candidate =
        asRecord(obj.course) ??
        asRecord(obj.courseId) ??
        obj;
    return strField(candidate, "courseCode");
}

/** Safe count of populated `courses[]` or `faculty[]` arrays. */
export function countRefs(
    refs: (string | { _id: string })[] | undefined | null,
): number {
    return Array.isArray(refs) ? refs.length : 0;
}