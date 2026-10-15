"use client";

import { Loader2 } from "lucide-react";

interface DeleteUserModalProps {
  isOpen: boolean;
  userName?: string;
  deleting: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export default function DeleteUserModal({
  isOpen,
  userName,
  deleting,
  onClose,
  onConfirm,
}: DeleteUserModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-sm bg-white p-6 shadow-lg dark:bg-zinc-900">
        <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
          Confirm User Deletion
        </h3>
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
          Are you sure you want to delete user{" "}
          <strong className="text-zinc-900 dark:text-zinc-200">
            {userName}
          </strong>
          ? This action cannot be undone.
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={deleting}
            className="rounded-sm border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={deleting}
            className="inline-flex items-center gap-2 rounded-sm bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
          >
            {deleting && <Loader2 className="h-4 w-4 animate-spin" />}
            Delete User
          </button>
        </div>
      </div>
    </div>
  );
}