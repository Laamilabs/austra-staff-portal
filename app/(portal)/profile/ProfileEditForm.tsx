"use client";

import { Loader2 } from "lucide-react";

import { UserRole } from "@/app/lib/types";
import { CloudinaryUpload } from "@/app/components/ui/cloudinary";

export interface ProfileFormData {
    name: string;
    email: string;
    role: UserRole;
    profileImage: string;
}

interface ProfileEditFormProps {
    formData: ProfileFormData;
    saving: boolean;
    onChange: (data: ProfileFormData) => void;
    onSubmit: (e: React.FormEvent) => void;
    onCancel: () => void;
}

export default function ProfileEditForm({
    formData,
    saving,
    onChange,
    onSubmit,
    onCancel,
}: ProfileEditFormProps) {
    return (
        <form
            onSubmit={onSubmit}
            className="space-y-5 border-t border-zinc-100 pt-4 dark:border-zinc-800"
        >
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                        Full Name
                    </label>
                    <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) =>
                            onChange({ ...formData, name: e.target.value })
                        }
                        className="mt-1 w-full rounded-sm border border-zinc-200 bg-white px-3 py-2 text-sm outline-none transition-colors focus:border-[#082B66] dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-orange-400"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                        Email Address
                    </label>
                    <input
                        type="email"
                        required
                        value={formData.email}
                        onChange={(e) =>
                            onChange({ ...formData, email: e.target.value })
                        }
                        className="mt-1 w-full rounded-sm border border-zinc-200 bg-white px-3 py-2 text-sm outline-none transition-colors focus:border-[#082B66] dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-orange-400"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                        User Role
                    </label>
                    <select
                        disabled
                        value={formData.role}
                        className="mt-1 w-full cursor-not-allowed rounded-sm border border-zinc-200 bg-zinc-100 px-3 py-2 text-sm text-zinc-500 outline-none dark:border-zinc-800 dark:bg-zinc-800 dark:text-zinc-400"
                    >
                        <option value="admin">Admin</option>
                        <option value="staff">Staff</option>
                        <option value="student">Student</option>
                    </select>
                </div>

                {/* Cloudinary Upload for Profile Image */}
                <div className="md:col-span-1">
                    <CloudinaryUpload
                        value={formData.profileImage}
                        onChange={(url) =>
                            onChange({ ...formData, profileImage: url })
                        }
                        preset="photos"
                        label="Profile Image"
                    />
                </div>
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-zinc-100 pt-4 dark:border-zinc-800">
                <button
                    type="button"
                    onClick={onCancel}
                    className="rounded-sm border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
                >
                    Cancel
                </button>
                <button
                    type="submit"
                    disabled={saving}
                    className="inline-flex items-center gap-2 rounded-sm bg-[#082B66] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#082B66]/90 disabled:opacity-50 dark:bg-orange-500 dark:text-zinc-950 dark:hover:bg-orange-400"
                >
                    {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                    Save Changes
                </button>
            </div>
        </form>
    );
}