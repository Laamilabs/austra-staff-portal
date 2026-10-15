import api from "../lib/api";
import { Course } from "./courses";

export interface FacultyMember {
  _id: string;
  name?: string;
  email?: string;
  [key: string]: any;
}

export interface Department {
  _id: string;
  name: string;
  description?: string;
  iconLink?: string;
  courses?: Course[]; // Populated by backend
  faculty?: FacultyMember[]; // Populated by backend
  hod?: FacultyMember; // Populated by backend
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
  __v?: number;
}

export interface CreateDepartmentDto {
  name: string;
  description?: string;
  iconLink?: string;
  courses?: string[];
  faculty?: string[];
  hod?: string;
  isActive?: boolean;
}

export type UpdateDepartmentDto = Partial<CreateDepartmentDto>;

export const departmentApi = {
  create(data: CreateDepartmentDto) {
    return api.post<Department>("/departments", data);
  },
  getAll() {
    return api.get<Department[]>("/departments");
  },
  getById(id: string) {
    return api.get<Department>(`/departments/${id}`);
  },
  update(id: string, data: UpdateDepartmentDto) {
    return api.patch<Department>(`/departments/${id}`, data);
  },
  delete(id: string) {
    return api.delete<Department>(`/departments/${id}`);
  },
};