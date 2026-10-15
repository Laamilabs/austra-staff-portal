import api from "../lib/api";

export interface Department {
  _id: string;
  name: string;
}

export interface Course {
  _id: string;
  courseCode: string;
  name: string;

  // Populated department
  department: Department;

  level: string;
  featured: boolean;

  // Returned by GET /course/:id
  // Not returned by GET /course
  description?: string;
  duration?: string;
  prerequisites?: string;

  createdAt?: string;
  updatedAt?: string;
  __v?: number;
}

export interface CreateCourseDto {
  courseCode: string;

  // MongoDB Department ObjectId
  department: string;

  description: string;
  duration: string;
  featured?: boolean;
  level: string;
  name: string;
  prerequisites: string;
}

export type UpdateCourseDto = Partial<CreateCourseDto>;

export const courseApi = {
  /**
   * Create a course
   * POST /api/course
   */
  create(data: CreateCourseDto) {
    return api.post<Course>("/course", data);
  },

  /**
   * Get all courses
   *
   * Returns summary course information.
   * description, duration and prerequisites are excluded
   * by the backend.
   *
   * GET /api/course
   */
  getAll() {
    return api.get<Course[]>("/course");
  },

  /**
   * Get a single course by ID
   *
   * Returns the complete course including:
   * description
   * duration
   * prerequisites
   *
   * GET /api/course/:id
   */
  getById(id: string) {
    return api.get<Course>(`/course/${id}`);
  },

  /**
   * Update a course
   * PATCH /api/course/:id
   */
  update(id: string, data: UpdateCourseDto) {
    return api.patch<Course>(`/course/${id}`, data);
  },

  /**
   * Delete a course
   * DELETE /api/course/:id
   */
  delete(id: string) {
    return api.delete<Course>(`/course/${id}`);
  },
};