import { User } from "../lib/types";

export interface DepartmentRef {
  _id: string;
  name: string;
  description: string;
}

export interface CourseRef {
  _id: string;
  [key: string]: unknown;
}

export interface Faculty {
  _id: string;
  name: string;
  staffNo: string;
  user?: User | string;
  qualification: string;
  expertise: string;
  description: string;
  department: DepartmentRef | string;
  courses: (CourseRef | string)[];
  documents: string[];
  createdAt?: string;
  updatedAt?: string;
  __v?: number;
}

export interface CreateFacultyPayload {
  name: string;
  staffNo: string;
  user?: string;
  qualification: string;
  expertise: string;
  description: string;
  department: string;
  courses: string[];
  documents: string[];
}

export type UpdateFacultyPayload = Partial<CreateFacultyPayload>;

export interface AssignUserPayload {
  userId: string;
}