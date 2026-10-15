// app/types/finance.ts
import api from "../lib/api";

// ---------------------------------------------------------------------------
// Shared enums
// ---------------------------------------------------------------------------

export type StudentFeeStatus = "ACTIVE" | "COMPLETED" | "CANCELLED";

export type PaymentMethod = "CASH" | "MPESA" | "BANK_TRANSFER" | "OTHER";

export type TransactionStatus = "PENDING" | "CONFIRMED" | "REVERSED";

// ---------------------------------------------------------------------------
// Populated references
// ---------------------------------------------------------------------------

export interface FeeStudentRef {
    _id: string;
    fullName?: {
        firstName: string;
        lastName: string;
        middleName: string;
    };
    contact?: {
        email: string;
        phoneNumber: string;
    };
    identification?: {
        bloodGroup: string;
        idNumber: string;
        passportNumber: string;
    };
    gender?: "Male" | "Female" | "Other";
    courses?: {
        _id?: string;
        admissionNumber: string;
        courseId: string | { _id: string };
        dateOfAdmission?: string;
        dateOfCompletion?: string;
    }[];
}

export interface FeeCourseRef {
    _id: string;
    name?: string;
    courseCode?: string;
    level?: string;
    duration?: string;
    department?: string | { _id: string; name?: string };
}

export interface FeeUserRef {
    _id: string;
    email?: string;
    name?: string;
    role?: "admin" | "staff" | "student";
    profileImage?: string;
}

export interface FeeStructureRef {
    _id: string;
    name?: string;
    totalAmount?: number;
    currency?: string;
    isActive?: boolean;
    feeItems?: FeeItem[];
}

export interface StudentFeeSnapshot {
    _id: string;
    totalAmount: number;
    amountPaid: number;
    currency: string;
    status: StudentFeeStatus;
}

// ---------------------------------------------------------------------------
// Sub-documents
// ---------------------------------------------------------------------------

export interface FeeItem {
    name: string;
    amount: number;
    description?: string;
}

// ---------------------------------------------------------------------------
// Entities
// ---------------------------------------------------------------------------

export interface FeeStructure {
    _id: string;
    courseId: FeeCourseRef | string | null;
    name: string;
    feeItems: FeeItem[];
    totalAmount: number;
    currency: string;
    isActive: boolean;
    createdAt?: string;
    updatedAt?: string;
    __v?: number;
}

export interface StudentFee {
    _id: string;
    studentId: FeeStudentRef | string | null;
    courseId: FeeCourseRef | string | null;
    feeStructureId: FeeStructureRef | string | null;
    totalAmount: number;
    amountPaid: number;
    currency: string;
    status: StudentFeeStatus;
    createdAt?: string;
    updatedAt?: string;
    __v?: number;
}

export interface FeeTransaction {
    _id: string;
    studentFeeId: StudentFeeSnapshot | string | null;
    studentId: FeeStudentRef | string | null;
    courseId: FeeCourseRef | string | null;
    amount: number;
    paymentMethod: PaymentMethod;
    transactionDate: string;
    confirmationCode?: string;
    confirmedBy: FeeUserRef | string | null;
    status: TransactionStatus;
    currency: string;
    notes?: string;
    createdAt?: string;
    updatedAt?: string;
    __v?: number;
}

// ---------------------------------------------------------------------------
// DTOs
// ---------------------------------------------------------------------------

export interface CreateFeeStructureDto {
    courseId: string;
    name: string;
    feeItems: FeeItem[];
    currency?: string;
    isActive?: boolean;
}

export type UpdateFeeStructureDto = Partial<CreateFeeStructureDto>;

export interface CreateStudentFeeDto {
    studentId: string;
    courseId: string;
    feeStructureId: string;
}

export interface UpdateStudentFeeDto {
    feeStructureId?: string;
}

export interface CreateFeeTransactionDto {
    studentFeeId: string;
    amount: number;
    paymentMethod: PaymentMethod;
    transactionDate?: string;
    confirmationCode?: string;
    notes?: string;
}

export interface UpdateFeeTransactionDto {
    notes?: string;
}

// ---------------------------------------------------------------------------
// Analytics DTOs
// ---------------------------------------------------------------------------

export interface MonthlyTotal {
    key: string;
    label: string;
    full: string;
    total: number;
    count: number;
    current: boolean;
}

export interface MethodTotal {
    method: PaymentMethod;
    amount: number;
    count: number;
}

export interface CourseBalance {
    courseId: string;
    name: string;
    code: string;
    owed: number;
    count: number;
}

export interface StudentBalance {
    studentFeeId: string;
    studentId: string;
    studentName: string;
    admissionNumber: string;
    courseName: string;
    courseCode: string;
    totalAmount: number;
    amountPaid: number;
    owed: number;
    currency: string;
}

export interface FinanceSummary {
    transactions: {
        confirmedCount: number;
        pendingCount: number;
        reversedCount: number;
        totalConfirmed: number;
        totalPending: number;
        totalReversed: number;
    };
    assessments: {
        activeCount: number;
        completedCount: number;
        activeStructures: number;
        totalBilled: number;
        totalPaid: number;
        outstanding: number;
        collectionRate: number;
    };
    thisMonth: number;
    lastMonth: number;
    delta: number | null;
    months: MonthlyTotal[];
    byMethod: MethodTotal[];
    topBalances: StudentBalance[];
    byCourse: CourseBalance[];
}

export interface StudentSnapshot {
    fees: StudentFee[];
    billed: number;
    paid: number;
    outstanding: number;
    transactionsByStatus: {
        _id: TransactionStatus;
        total: number;
        count: number;
    }[];
}

export interface CourseSnapshot {
    courseId: string;
    assessments: StudentBalance[];
    activeAssessments: number;
    activeStructures: number;
    billed: number;
    paid: number;
    outstanding: number;
    collectionRate: number;
    transactionsByStatus: {
        status: TransactionStatus;
        total: number;
        count: number;
    }[];
}

export interface DailyTotal {
    date: string;
    total: number;
    count: number;
}

// ---------------------------------------------------------------------------
// API clients — every method unwraps `response.data`
// ---------------------------------------------------------------------------

export const feeStructureApi = {
    /** POST /fee-structures */
    async create(data: CreateFeeStructureDto): Promise<FeeStructure> {
        const res = await api.post<FeeStructure>("/fee-structures", data);
        return res.data;
    },

    /** GET /fee-structures */
    async getAll(): Promise<FeeStructure[]> {
        const res = await api.get<FeeStructure[]>("/fee-structures");
        return res.data;
    },

    /** GET /fee-structures/course/:courseId */
    async getByCourseId(courseId: string): Promise<FeeStructure[]> {
        const res = await api.get<FeeStructure[]>(
            `/fee-structures/course/${courseId}`,
        );
        return res.data;
    },

    /** GET /fee-structures/:id */
    async getById(id: string): Promise<FeeStructure> {
        const res = await api.get<FeeStructure>(`/fee-structures/${id}`);
        return res.data;
    },

    /** PATCH /fee-structures/:id */
    async update(
        id: string,
        data: UpdateFeeStructureDto,
    ): Promise<FeeStructure> {
        const res = await api.patch<FeeStructure>(`/fee-structures/${id}`, data);
        return res.data;
    },

    /** DELETE /fee-structures/:id */
    async delete(
        id: string,
    ): Promise<{ message: string; data: FeeStructure }> {
        const res = await api.delete<{ message: string; data: FeeStructure }>(
            `/fee-structures/${id}`,
        );
        return res.data;
    },
};

export const studentFeeApi = {
    /** POST /student-fees */
    async create(data: CreateStudentFeeDto): Promise<StudentFee> {
        const res = await api.post<StudentFee>("/student-fees", data);
        return res.data;
    },

    /** GET /student-fees */
    async getAll(): Promise<StudentFee[]> {
        const res = await api.get<StudentFee[]>("/student-fees");
        return res.data;
    },

    /** GET /student-fees/student/:studentId */
    async getByStudentId(studentId: string): Promise<StudentFee[]> {
        const res = await api.get<StudentFee[]>(
            `/student-fees/student/${studentId}`,
        );
        return res.data;
    },

    /** GET /student-fees/course/:courseId */
    async getByCourseId(courseId: string): Promise<StudentFee[]> {
        const res = await api.get<StudentFee[]>(
            `/student-fees/course/${courseId}`,
        );
        return res.data;
    },

    /** GET /student-fees/student/:studentId/course/:courseId */
    async getByStudentAndCourse(
        studentId: string,
        courseId: string,
    ): Promise<StudentFee> {
        const res = await api.get<StudentFee>(
            `/student-fees/student/${studentId}/course/${courseId}`,
        );
        return res.data;
    },

    /** GET /student-fees/:id */
    async getById(id: string): Promise<StudentFee> {
        const res = await api.get<StudentFee>(`/student-fees/${id}`);
        return res.data;
    },

    /** PATCH /student-fees/:id */
    async update(id: string, data: UpdateStudentFeeDto): Promise<StudentFee> {
        const res = await api.patch<StudentFee>(`/student-fees/${id}`, data);
        return res.data;
    },

    /** DELETE /student-fees/:id — soft delete (status → CANCELLED) */
    async delete(id: string): Promise<StudentFee> {
        const res = await api.delete<StudentFee>(`/student-fees/${id}`);
        return res.data;
    },
};

export const feeTransactionApi = {
    /** POST /fee-transactions */
    async create(data: CreateFeeTransactionDto): Promise<FeeTransaction> {
        const res = await api.post<FeeTransaction>("/fee-transactions", data);
        return res.data;
    },

    /** GET /fee-transactions */
    async getAll(): Promise<FeeTransaction[]> {
        const res = await api.get<FeeTransaction[]>("/fee-transactions");
        return res.data;
    },

    /** GET /fee-transactions/student/:studentId */
    async getByStudentId(studentId: string): Promise<FeeTransaction[]> {
        const res = await api.get<FeeTransaction[]>(
            `/fee-transactions/student/${studentId}`,
        );
        return res.data;
    },

    /** GET /fee-transactions/course/:courseId */
    async getByCourseId(courseId: string): Promise<FeeTransaction[]> {
        const res = await api.get<FeeTransaction[]>(
            `/fee-transactions/course/${courseId}`,
        );
        return res.data;
    },

    /** GET /fee-transactions/student-fee/:studentFeeId */
    async getByStudentFeeId(
        studentFeeId: string,
    ): Promise<FeeTransaction[]> {
        const res = await api.get<FeeTransaction[]>(
            `/fee-transactions/student-fee/${studentFeeId}`,
        );
        return res.data;
    },

    /** GET /fee-transactions/:id */
    async getById(id: string): Promise<FeeTransaction> {
        const res = await api.get<FeeTransaction>(`/fee-transactions/${id}`);
        return res.data;
    },

    /** PATCH /fee-transactions/:id — notes only. */
    async update(
        id: string,
        data: UpdateFeeTransactionDto,
    ): Promise<FeeTransaction> {
        const res = await api.patch<FeeTransaction>(
            `/fee-transactions/${id}`,
            data,
        );
        return res.data;
    },

    /** PATCH /fee-transactions/:id/reverse */
    async reverse(id: string): Promise<FeeTransaction> {
        const res = await api.patch<FeeTransaction>(
            `/fee-transactions/${id}/reverse`,
            {},
        );
        return res.data;
    },
};

export const financeAnalyticsApi = {
    /** GET /finance/analytics/summary?months=6&top=5 */
    async summary(months = 6, top = 5): Promise<FinanceSummary> {
        const res = await api.get<FinanceSummary>(
            `/finance/analytics/summary?months=${months}&top=${top}`,
        );
        return res.data;
    },

    /** GET /finance/analytics/student/:studentId */
    async student(studentId: string): Promise<StudentSnapshot> {
        const res = await api.get<StudentSnapshot>(
            `/finance/analytics/student/${studentId}`,
        );
        return res.data;
    },

    /** GET /finance/analytics/course/:courseId */
    async course(courseId: string): Promise<CourseSnapshot> {
        const res = await api.get<CourseSnapshot>(
            `/finance/analytics/course/${courseId}`,
        );
        return res.data;
    },

    /** GET /finance/analytics/daily?from=YYYY-MM-DD&to=YYYY-MM-DD */
    async daily(from: string, to: string): Promise<DailyTotal[]> {
        const res = await api.get<DailyTotal[]>(
            `/finance/analytics/daily?from=${from}&to=${to}`,
        );
        return res.data;
    },
};

// ---------------------------------------------------------------------------
// Display helpers (unchanged)
// ---------------------------------------------------------------------------

export function getStudentName(
    fee: { studentId?: FeeStudentRef | string | null } | null | undefined,
): string {
    const s = fee?.studentId;
    if (!s || typeof s === "string") return "";
    const fn = s.fullName;
    if (!fn) return "";
    return [fn.firstName, fn.middleName, fn.lastName]
        .filter(Boolean)
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();
}

export function getAdmissionNumber(
    fee: {
        studentId?: FeeStudentRef | string | null;
        courseId?: FeeCourseRef | string | null;
    } | null | undefined,
): string {
    const s = fee?.studentId;
    const c = fee?.courseId;
    if (!s || typeof s === "string" || !s.courses?.length) return "";
    const courseId = typeof c === "string" ? c : c?._id;
    if (!courseId) return "";
    const enrollment = s.courses.find((e) => {
        const eid =
            typeof e.courseId === "string" ? e.courseId : e.courseId?._id;
        return eid === courseId;
    });
    return enrollment?.admissionNumber ?? "";
}

export function getCourseName(
    fee: { courseId?: FeeCourseRef | string | null } | null | undefined,
): string {
    const c = fee?.courseId;
    if (!c || typeof c === "string") return "";
    return c.name ?? "";
}

export function getCourseCode(
    fee: { courseId?: FeeCourseRef | string | null } | null | undefined,
): string {
    const c = fee?.courseId;
    if (!c || typeof c === "string") return "";
    return c.courseCode ?? "";
}

export function refId(ref: unknown): string | undefined {
    if (!ref) return undefined;
    if (typeof ref === "string") return ref;
    if (typeof ref === "object" && "_id" in (ref as object)) {
        return (ref as { _id: string })._id;
    }
    return undefined;
}