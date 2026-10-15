import api from "../lib/api";
import { Course } from "./courses";

export enum UnitType {
  COMMON = "common",
  BASIC = "basic",
  CORE = "core",
}

export interface Unit {
  _id: string;
  name: string;
  code: string;

  // Populated Course reference (can be an ID string if unpopulated)
  courseId: Course | string;

  description?: string;
  type?: UnitType;
  optionalUnit?: boolean;

  createdAt?: string;
  updatedAt?: string;
  __v?: number;
}

export interface CreateUnitDto {
  name: string;
  code: string;

  // MongoDB Course ObjectId string
  courseId: string;

  description?: string;
  type?: UnitType;
  optionalUnit?: boolean;
}

export type UpdateUnitDto = Partial<CreateUnitDto>;

export const unitApi = {
  /**
   * Create a new unit
   * POST /api/unit
   */
  create(data: CreateUnitDto) {
    return api.post<Unit>("/unit", data);
  },

  /**
   * Get all units
   * GET /api/unit
   */
  getAll() {
    return api.get<Unit[]>("/unit");
  },

  /**
   * Get a single unit by ID
   * GET /api/unit/:id
   */
  getById(id: string) {
    return api.get<Unit>(`/unit/${id}`);
  },

  /**
   * Get all units for a specific course
   * GET /api/unit/course/:courseId
   */
  getByCourse(courseId: string) {
    return api.get<Unit[]>(`/unit/course/${courseId}`);
  },

  /**
   * Update a unit
   * PATCH /api/unit/:id
   */
  update(id: string, data: UpdateUnitDto) {
    return api.patch<Unit>(`/unit/${id}`, data);
  },

  /**
   * Delete a unit
   * DELETE /api/unit/:id
   */
  delete(id: string) {
    return api.delete<Unit>(`/unit/${id}`);
  },
};