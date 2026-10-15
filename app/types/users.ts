// app/types/users.ts
import api from "../lib/api";
import {
    ChangePasswordRequest,
    ChangePasswordResponse,
    User,
    UserRole,
} from "../lib/types";

export interface CreateUserDto {
    name: string;
    email: string;
    password: string;
    role?: UserRole;
    profileImage?: string;
}

export type UpdateUserDto = Partial<Omit<CreateUserDto, "password">>;

export interface UpdateProfileImageDto {
    profileImage: string;
}

/**
 * Response shape returned by POST /users.
 *
 * The backend now always includes both `_id` (Mongo's canonical id) and
 * `id` (a string mirror of `_id`, so callers on either convention work).
 */
export type CreateUserResponse = User & {
    _id: string;
    id: string;
};

export const userApi = {
    /**
     * Create a new user
     * POST /users
     */
    create(data: CreateUserDto) {
        return api.post<CreateUserResponse>("/users", data);
    },

    /**
     * Get all users
     * GET /users
     */
    getAll() {
        return api.get<User[]>("/users");
    },

    /**
     * Get user by ID
     * GET /users/:id
     */
    getById(id: string) {
        return api.get<User>(`/users/${id}`);
    },

    /**
     * Update user details
     * PATCH /users/:id
     */
    update(id: string, data: UpdateUserDto) {
        return api.patch<User>(`/users/${id}`, data);
    },

    /**
     * Update or add user's profile image
     * PATCH /users/:id/profile-image
     */
    updateProfileImage(
        userId: string,
        data: UpdateProfileImageDto,
    ) {
        return api.patch<User>(
            `/users/${userId}/profile-image`,
            data,
        );
    },

    /**
     * Delete user
     * DELETE /users/:id
     */
    delete(id: string) {
        return api.delete<User>(`/users/${id}`);
    },

    /**
     * Change user password
     * PATCH /users/:id/change-password
     */
    changePassword(
        userId: string,
        payload: ChangePasswordRequest,
    ) {
        return api.patch<ChangePasswordResponse>(
            `/users/${userId}/change-password`,
            payload,
        );
    },
};