// lib/types.ts

export type UserRole = "admin" | "staff" | "student";

export interface User {
  /**
   * Mongo's canonical identifier.
   * Always present on responses from the backend.
   */
  _id: string;

  /**
   * Optional virtual mirror of `_id`. Present when the backend serializes
   * with `toJSON({ virtuals: true })` or when a service explicitly adds it.
   * New code should prefer `_id`.
   */
  id?: string;

  email: string;
  name: string;
  profileImage?: string;
  role: UserRole;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
  profileImage?: string;
}

export interface ChangePasswordRequest {
  oldPassword: string;
  newPassword: string;
}

export interface ChangePasswordResponse {
  message: string;
}

export interface LoginResponse {
  message: string;
  access_token: string;
  user: User;
}

export interface RegisterResponse {
  message: string;
  user: User;
}

export interface ApiError {
  message: string | string[];
  statusCode?: number;
  error?: string;
}