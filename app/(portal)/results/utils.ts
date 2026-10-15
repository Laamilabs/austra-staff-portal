import {
    AssessmentType,
    Result,
    marksToGrade,
    getResultStudentId,
    getResultUnitId,
} from "@/app/types/results";

/* -------------------------------------------------------------------------- */
/* Aggregates                                                                 */
/* -------------------------------------------------------------------------- */

export interface UnitAggregate {
    unitId: string;
    unitCode: string;
    unitName: string;
    /** Average of CAT + Practical marks (0–100). */
    catPracticalAvg: number;
    /** CAT/Practical portion scaled to a max of 30. */
    catPracticalScore: number;
    /** Final exam portion scaled to a max of 70. */
    finalExamScore: number;
    /** Unit total out of 100. 0 when incomplete. */
    total: number;
    grade: string;
    /** True when CATs are contiguous from 1 and the final exam is present. */
    isComplete: boolean;
    /** Human-readable list of what is missing (empty when complete). */
    missing: string[];
    hasFinal: boolean;
    hasCatPractical: boolean;
    results: Result[];
}

export interface CourseAggregate {
    courseId: string;
    courseCode: string;
    courseName: string;

    units: UnitAggregate[];
    unitCount: number;

    /** Average of all unit totals (0–100). 0 when the course is incomplete. */
    totalScore: number;
    grade: string;
    isComplete: boolean;

    resultCount: number;
    latestAt: number;
}

export interface StudentAggregate {
    studentId: string;
    studentName: string;
    admissionNumber: string;

    courses: CourseAggregate[];
    courseCount: number;

    unitCount: number;
    resultCount: number;
    latestAt: number;
}

/* -------------------------------------------------------------------------- */
/* Course resolution                                                          */
/* -------------------------------------------------------------------------- */

/**
 * Resolved course information for a unit.
 */
export interface CourseRef {
    courseId: string;
    courseCode: string;
    courseName: string;
}

/**
 * External unitId -> course lookup.
 *
 * The default `findAll` projection for `result.unitId` only selects
 * `name code`, so we cannot rely on `unit.courseId` being present. When the
 * caller supplies a lookup, results are grouped by the course it resolves to.
 */
export type UnitCourseLookup = (unitId: string) => CourseRef | null;

const UNKNOWN_COURSE: CourseRef = {
    courseId: "__unknown__",
    courseCode: "—",
    courseName: "Unknown course",
};

/**
 * Resolve the course attached to a result's unit.
 *
 * Priority:
 *   1. A populated `unit.courseId` object on the unit itself.
 *   2. A bare `unit.courseId` string, enriched by the external lookup.
 *   3. The external lookup keyed by the unit's id.
 *   4. A stable "Unknown course" placeholder.
 */
function readUnitCourse(
    unit: Result["unitId"],
    lookup?: UnitCourseLookup,
): CourseRef {
    if (typeof unit === "object" && unit) {
        const raw = (unit as { courseId?: unknown }).courseId;

        // 1. Fully populated Course object.
        if (raw && typeof raw === "object") {
            const obj = raw as {
                _id?: string;
                courseCode?: string;
                code?: string;
                name?: string;
            };
            return {
                courseId: obj._id ?? UNKNOWN_COURSE.courseId,
                // Course uses `courseCode`; keep `code` as a fallback in case
                // a leaner projection ever returns it.
                courseCode: obj.courseCode ?? obj.code ?? UNKNOWN_COURSE.courseCode,
                courseName: obj.name ?? UNKNOWN_COURSE.courseName,
            };
        }

        // 2. Bare ObjectId — prefer the lookup when it agrees on the id.
        if (typeof raw === "string") {
            const enriched = lookup?.(unit._id);
            if (enriched && enriched.courseId === raw) return enriched;
            return { ...UNKNOWN_COURSE, courseId: raw };
        }

        // 3. No courseId at all — fall back to the lookup.
        const found = lookup?.(unit._id);
        if (found) return found;
    } else if (typeof unit === "string" && lookup) {
        const found = lookup(unit);
        if (found) return found;
    }

    return UNKNOWN_COURSE;
}

/* -------------------------------------------------------------------------- */
/* Reference readers                                                          */
/* -------------------------------------------------------------------------- */

export function getStudentName(r: Result): string {
    if (typeof r.studentId === "object" && r.studentId) {
        const n = r.studentId.fullName;
        if (n) {
            const full = [n.firstName, n.middleName, n.lastName]
                .filter(Boolean)
                .join(" ")
                .trim();
            if (full) return full;
        }
        return r.studentId.admissionNumber ?? "Unknown student";
    }
    return "Unknown student";
}

export function getStudentAdmission(r: Result): string {
    if (typeof r.studentId === "object" && r.studentId?.admissionNumber) {
        return r.studentId.admissionNumber;
    }
    return "—";
}

export function getUnitCode(r: Result): string {
    if (typeof r.unitId === "object" && r.unitId?.code) return r.unitId.code;
    return "—";
}

export function getUnitName(r: Result): string {
    if (typeof r.unitId === "object" && r.unitId?.name) return r.unitId.name;
    return "Unknown unit";
}

/* -------------------------------------------------------------------------- */
/* Unit aggregation                                                           */
/* -------------------------------------------------------------------------- */

/**
 * Detect missing pieces for a unit.
 *
 *   - CATs must be a contiguous sequence starting from 1.
 *   - A Final Exam mark must exist.
 *
 * Practicals are optional and single-valued.
 */
function findMissing(results: Result[]): string[] {
    const missing: string[] = [];

    const catNumbers = Array.from(
        new Set(
            results
                .filter((r) => r.assessmentType === AssessmentType.CAT)
                .map((r) => r.assessmentNumber)
                .filter(
                    (n): n is number =>
                        typeof n === "number" && Number.isFinite(n),
                ),
        ),
    ).sort((a, b) => a - b);

    if (catNumbers.length > 0) {
        const max = catNumbers[catNumbers.length - 1];
        for (let i = 1; i <= max; i++) {
            if (!catNumbers.includes(i)) missing.push(`CAT ${i}`);
        }
    }

    const hasFinal = results.some(
        (r) => r.assessmentType === AssessmentType.FINAL_EXAM,
    );
    if (!hasFinal) missing.push("Final Exam");

    return missing;
}

function aggregateUnit(unitId: string, results: Result[]): UnitAggregate {
    const catPracticals = results.filter(
        (r) =>
            r.assessmentType === AssessmentType.CAT ||
            r.assessmentType === AssessmentType.PRACTICAL,
    );
    const finals = results.filter(
        (r) => r.assessmentType === AssessmentType.FINAL_EXAM,
    );

    const missing = findMissing(results);
    const isComplete = missing.length === 0;

    const catPracticalAvg = catPracticals.length
        ? catPracticals.reduce((s, r) => s + (r.marks ?? 0), 0) /
        catPracticals.length
        : 0;

    const finalExamAvg = finals.length
        ? finals.reduce((s, r) => s + (r.marks ?? 0), 0) / finals.length
        : 0;

    // Average CAT/practical percentage -> max 30.
    const catPracticalScore = (catPracticalAvg * 30) / 100;
    // Final exam percentage -> max 70.
    const finalExamScore = (finalExamAvg * 70) / 100;

    // Only compute a total when the unit is complete.
    const total = isComplete ? catPracticalScore + finalExamScore : 0;

    return {
        unitId,
        unitCode: getUnitCode(results[0]),
        unitName: getUnitName(results[0]),
        catPracticalAvg,
        catPracticalScore,
        finalExamScore,
        total,
        grade: isComplete ? marksToGrade(total) : "Incomplete",
        isComplete,
        missing,
        hasFinal: finals.length > 0,
        hasCatPractical: catPracticals.length > 0,
        results,
    };
}

/* -------------------------------------------------------------------------- */
/* Course aggregation                                                         */
/* -------------------------------------------------------------------------- */

function aggregateCourse(
    courseId: string,
    results: Result[],
    lookup?: UnitCourseLookup,
): CourseAggregate {
    // 1. Group this course's results by unit.
    const byUnit = new Map<string, Result[]>();
    for (const r of results) {
        const uid = getResultUnitId(r.unitId);
        if (!uid) continue;
        const arr = byUnit.get(uid);
        if (arr) arr.push(r);
        else byUnit.set(uid, [r]);
    }

    // 2. Aggregate each unit independently.
    const units: UnitAggregate[] = [];
    for (const [uid, unitResults] of byUnit) {
        units.push(aggregateUnit(uid, unitResults));
    }

    units.sort((a, b) =>
        a.unitCode.localeCompare(b.unitCode, undefined, {
            sensitivity: "base",
        }),
    );

    // 3. A course is complete only when every unit in it is complete.
    const isComplete = units.length > 0 && units.every((u) => u.isComplete);

    // 4. Course score = average of unit totals.
    const totalScore = isComplete
        ? units.reduce((s, u) => s + u.total, 0) / units.length
        : 0;

    const latestAt = results.reduce((max, r) => {
        const t = r.createdAt ? new Date(r.createdAt).getTime() : 0;
        return t > max ? t : max;
    }, 0);

    const { courseCode, courseName } = readUnitCourse(results[0].unitId, lookup);

    return {
        courseId,
        courseCode,
        courseName,
        units,
        unitCount: units.length,
        totalScore: isComplete ? Math.round(totalScore * 10) / 10 : 0,
        grade: isComplete ? marksToGrade(totalScore) : "Incomplete",
        isComplete,
        resultCount: results.length,
        latestAt,
    };
}

/* -------------------------------------------------------------------------- */
/* Student aggregation                                                        */
/* -------------------------------------------------------------------------- */

export function aggregateByStudent(
    results: Result[],
    lookup?: UnitCourseLookup,
): StudentAggregate[] {
    const byStudent = new Map<string, Result[]>();

    for (const r of results) {
        const sid = getResultStudentId(r.studentId);
        if (!sid) continue;
        const arr = byStudent.get(sid);
        if (arr) arr.push(r);
        else byStudent.set(sid, [r]);
    }

    const aggregates: StudentAggregate[] = [];

    for (const [studentId, studentResults] of byStudent) {
        // Group this student's results by the course their unit belongs to.
        const byCourse = new Map<string, Result[]>();
        for (const r of studentResults) {
            const cid = readUnitCourse(r.unitId, lookup).courseId;
            const arr = byCourse.get(cid);
            if (arr) arr.push(r);
            else byCourse.set(cid, [r]);
        }

        const courses: CourseAggregate[] = [];
        for (const [cid, courseResults] of byCourse) {
            courses.push(aggregateCourse(cid, courseResults, lookup));
        }

        courses.sort((a, b) =>
            a.courseCode.localeCompare(b.courseCode, undefined, {
                sensitivity: "base",
            }),
        );

        const latestAt = studentResults.reduce((max, r) => {
            const t = r.createdAt ? new Date(r.createdAt).getTime() : 0;
            return t > max ? t : max;
        }, 0);

        aggregates.push({
            studentId,
            studentName: getStudentName(studentResults[0]),
            admissionNumber: getStudentAdmission(studentResults[0]),
            courses,
            courseCount: courses.length,
            unitCount: courses.reduce((s, c) => s + c.unitCount, 0),
            resultCount: studentResults.length,
            latestAt,
        });
    }

    return aggregates;
}