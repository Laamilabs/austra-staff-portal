import api from "../lib/api";

export type DocumentType =
  | "resource"
  | "academic"
  | "professional"
  | "institutional";

/**
 * Populated User returned by the backend.
 */
export interface DocumentOwner {
  _id: string;
  name?: string;
  email?: string;
  profileImage?: string;
  role?: string;
  [key: string]: any;
}

/**
 * Populated Course returned by the backend.
 *
 * The backend currently populates:
 * .populate("course", "name")
 */
export interface DocumentCourse {
  _id: string;
  name: string;
  [key: string]: any;
}

/**
 * Populated Unit returned by the backend.
 *
 * This is included for compatibility with the backend schema.
 * If the backend later populates Unit fields, they can be added here.
 */
export interface DocumentUnit {
  _id: string;
  name?: string;
  [key: string]: any;
}

/**
 * Matches the NestJS/Mongoose Document schema.
 *
 * Backend fields:
 * - name
 * - url
 * - type
 * - owner
 * - course
 * - unit
 */
export interface DocumentItem {
  _id: string;
  name: string;
  url: string;
  type: DocumentType;

  /**
   * Populated owner object from backend.
   *
   * null/undefined means the document is public.
   */
  owner?: DocumentOwner | null;

  /**
   * Populated Course object.
   *
   * null/undefined means the document is not associated
   * with a course.
   */
  course?: DocumentCourse | null;

  /**
   * Populated Unit object.
   *
   * null/undefined means the document is not associated
   * with a unit.
   */
  unit?: DocumentUnit | null;

  createdAt?: string;
  updatedAt?: string;
  __v?: number;
}

/**
 * DTO used when creating a document.
 *
 * Matches:
 * src/documents/dto/create-document.dto.ts
 */
export interface CreateDocumentDto {
  name: string;
  url: string;
  type: DocumentType;

  /**
   * User ID of owner.
   *
   * Omit or set to null for public documents.
   */
  owner?: string | null;

  /**
   * Course ObjectId.
   *
   * Omit or set to null when the document is not
   * associated with a course.
   */
  course?: string | null;

  /**
   * Unit ObjectId.
   *
   * Omit or set to null when the document is not
   * associated with a unit.
   */
  unit?: string | null;
}

/**
 * DTO used when updating a document.
 *
 * Partial fields allow updating only the properties
 * that have changed.
 */
export type UpdateDocumentDto = Partial<CreateDocumentDto>;

/**
 * Optional filters supported by the backend.
 *
 * Corresponds to:
 * GET /documents?courseId=...&unitId=...
 */
export interface FindAllDocumentFilters {
  courseId?: string;
  unitId?: string;
}

/**
 * POST /documents response
 */
export interface CreateDocumentResponse {
  id: string;
}

/**
 * DELETE /documents/:id response
 */
export interface DeleteDocumentResponse {
  message: string;
}

export const documentApi = {
  create(data: CreateDocumentDto) {
    return api.post<CreateDocumentResponse>(
      "/documents",
      data,
    );
  },

  getAll(filters?: FindAllDocumentFilters) {
    return api.get<DocumentItem[]>(
      "/documents",
      {
        params: filters,
      },
    );
  },

  getById(id: string) {
    return api.get<DocumentItem>(
      `/documents/${id}`,
    );
  },

  getByUser(userId: string) {
    return api.get<DocumentItem[]>(
      `/documents/user/${userId}`,
    );
  },

  getByCourse(courseId: string) {
    return api.get<DocumentItem[]>(
      `/documents/course/${courseId}`,
    );
  },

  getByUnit(unitId: string) {
    return api.get<DocumentItem[]>(
      `/documents/unit/${unitId}`,
    );
  },

  update(
    id: string,
    data: UpdateDocumentDto,
  ) {
    return api.patch<DocumentItem>(
      `/documents/${id}`,
      data,
    );
  },

  delete(id: string) {
    return api.delete<DeleteDocumentResponse>(
      `/documents/${id}`,
    );
  },
};