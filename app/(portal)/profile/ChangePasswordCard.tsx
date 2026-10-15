"use client";

import { useState } from "react";
import { Loader2, Key, Check, AlertCircle } from "lucide-react";

import api from "@/app/lib/api";

interface ChangePasswordCardProps {
    userId: string;
}

export default function ChangePasswordCard({ userId }: ChangePasswordCardProps) {
    const [form, setForm] = useState({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
    });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSuccess(null);

        if (form.newPassword !== form.confirmPassword) {
            setError("New password and confirmation do not match.");
            return;
        }

        try {
            setSaving(true);
            await api.post(`/users/${userId}/change-password`, {
                currentPassword: form.currentPassword,
                newPassword: form.newPassword,
            });
            setSuccess("Password changed successfully.");
            setForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
            setTimeout(() => setSuccess(null), 3000);
        } catch (err: any) {
            console.error("Failed to change password:", err);
            setError(
                err.response?.data?.message ||
                "Failed to change password. Please try again.",
            );
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="overflow-hidden rounded-sm border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <div className="border-b border-zinc-100 px-6 py-4 dark:border-zinc-800">
                <div className="flex items-center gap-2">
                    <Key className="h-4 w-4 text-zinc-400" />
                    <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                        Change Password
                    </h3>
                </div>
                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                    Update your account password. Use a strong, unique password.
                </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 px-6 py-5">
                {success && (
                    <div className="flex items-center gap-3 rounded-sm border border-emerald-200 bg-emerald-50 p-3 text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300">
                        <Check className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                        <p className="text-xs font-medium">{success}</p>
                    </div>
                )}

                {error && (
                    <div className="flex items-center gap-3 rounded-sm border border-red-200 bg-red-50 p-3 text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-400">
                        <AlertCircle className="h-4 w-4 shrink-0" />
                        <p className="text-xs">{error}</p>
                    </div>
                )}

                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <div>
                        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                            Current Password
                        </label>
                        <input
                            type="password"
                            required
                            value={form.currentPassword}
                            onChange={(e) =>
                                setForm({ ...form, currentPassword: e.target.value })
                            }
                            className="mt-1 w-full rounded-sm border border-zinc-200 bg-white px-3 py-2 text-sm outline-none transition-colors focus:border-[#082B66] dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-orange-400"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                            New Password
                        </label>
                        <input
                            type="password"
                            required
                            value={form.newPassword}
                            onChange={(e) =>
                                setForm({ ...form, newPassword: e.target.value })
                            }
                            className="mt-1 w-full rounded-sm border border-zinc-200 bg-white px-3 py-2 text-sm outline-none transition-colors focus:border-[#082B66] dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-orange-400"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                            Confirm New Password
                        </label>
                        <input
                            type="password"
                            required
                            value={form.confirmPassword}
                            onChange={(e) =>
                                setForm({ ...form, confirmPassword: e.target.value })
                            }
                            className="mt-1 w-full rounded-sm border border-zinc-200 bg-white px-3 py-2 text-sm outline-none transition-colors focus:border-[#082B66] dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-orange-400"
                        />
                    </div>
                </div>

                <div className="flex justify-end border-t border-zinc-100 pt-4 dark:border-zinc-800">
                    <button
                        type="submit"
                        disabled={saving}
                        className="inline-flex items-center gap-2 rounded-sm bg-[#082B66] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#082B66]/90 disabled:opacity-50 dark:bg-orange-500 dark:text-zinc-950 dark:hover:bg-orange-400"
                    >
                        {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                        Update Password
                    </button>
                </div>
            </form>
        </div>
    );
}