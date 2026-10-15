import api from "./api";
import {
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  RegisterResponse,
  User,
} from "./types";

export async function login(
  data: LoginRequest,
): Promise<LoginResponse> {
  const response = await api.post<LoginResponse>(
    "/auth/login",
    data,
  );

  return response.data;
}

export async function register(
  data: RegisterRequest,
): Promise<RegisterResponse> {
  const response = await api.post<RegisterResponse>(
    "/auth/register",
    data,
  );

  return response.data;
}

export async function getCurrentUser(): Promise<User | null> {
  try {
    const response = await api.get<User>("/users/me");
    return response.data;
  } catch (error) {
    // Return null if no user is authenticated (401 Unauthorized or 404)
    return null;
  }
}