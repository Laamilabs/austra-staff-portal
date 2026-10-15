"use client";

import { useState } from "react";
import { AlertCircle, Check, Eye, EyeOff, Loader2, Lock } from "lucide-react";
import { userApi } from "@/app/types/users";

interface ChangePasswordCardProps {
  userId: string;
}

export default function ChangePasswordCard({ userId }: ChangePasswordCardProps) {
  const [passwordData, setPasswordData] = useState({
    oldPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  // State to track visibility for each field independently
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!passwordData.oldPassword) {
      setError("Please enter your current password.");
      return;
    }

    if (passwordData.newPassword.length < 6) {
      setError("New password must be at least 6 characters long.");
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setError("New passwords do not match.");
      return;
    }

    try {
      setSaving(true);
      const res = await userApi.changePassword(userId, {
        oldPassword: passwordData.oldPassword,
        newPassword: passwordData.newPassword,
      });

      setSuccess(res.data?.message || "Password changed successfully.");
      setPasswordData({ oldPassword: "", newPassword: "", confirmPassword: "" });

      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      console.error("Failed to change password:", err);
      const apiErrorMessage = Array.isArray(err.response?.data?.message)
        ? err.response?.data?.message.join(", ")
        : err.response?.data?.message;

      setError(
        apiErrorMessage || "Failed to change password. Please try again."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="overflow-hidden rounded-sm border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-center gap-2 border-b border-zinc-100 pb-4 dark:border-zinc-800">
        <Lock className="h-5 w-5 text-[#082B66] dark:text-orange-400" />
        <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
          Change Password
        </h3>
      </div>

      {success && (
        <div className="mt-4 flex items-center gap-3 rounded-sm border border-emerald-200 bg-emerald-50 p-4 text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300">
          <Check className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
          <p className="text-sm font-medium">{success}</p>
        </div>
      )}

      {error && (
        <div className="mt-4 flex items-center gap-3 rounded-sm border border-red-200 bg-red-50 p-4 text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-400">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-4 space-y-4">
        {/* Current Password */}
        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Current Password
          </label>
          <div className="relative mt-1">
            <input
              type={showOldPassword ? "text" : "password"}
              required
              value={passwordData.oldPassword}
              onChange={(e) =>
                setPasswordData({ ...passwordData, oldPassword: e.target.value })
              }
              className="w-full rounded-sm border border-zinc-200 bg-white py-2 pl-3 pr-10 text-sm outline-none transition-colors focus:border-[#082B66] dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-orange-400"
            />
            <button
              type="button"
              onClick={() => setShowOldPassword(!showOldPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
            >
              {showOldPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {/* New Password */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              New Password
            </label>
            <div className="relative mt-1">
              <input
                type={showNewPassword ? "text" : "password"}
                required
                value={passwordData.newPassword}
                onChange={(e) =>
                  setPasswordData({ ...passwordData, newPassword: e.target.value })
                }
                className="w-full rounded-sm border border-zinc-200 bg-white py-2 pl-3 pr-10 text-sm outline-none transition-colors focus:border-[#082B66] dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-orange-400"
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
              >
                {showNewPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          {/* Confirm New Password */}
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Confirm New Password
            </label>
            <div className="relative mt-1">
              <input
                type={showConfirmPassword ? "text" : "password"}
                required
                value={passwordData.confirmPassword}
                onChange={(e) =>
                  setPasswordData({
                    ...passwordData,
                    confirmPassword: e.target.value,
                  })
                }
                className="w-full rounded-sm border border-zinc-200 bg-white py-2 pl-3 pr-10 text-sm outline-none transition-colors focus:border-[#082B66] dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-orange-400"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
              >
                {showConfirmPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-2">
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