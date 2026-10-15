"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Search, UserPlus, X } from "lucide-react";

import { User } from "@/app/lib/types";
import { getUserId } from "@/app/utilities/userWithId";

interface AssignUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (userId: string) => Promise<void>;
  users: User[];
  facultyName: string;
  currentUserId?: string;
  isReassign?: boolean;
}

export default function AssignUserModal({
  isOpen,
  onClose,
  onSubmit,
  users,
  facultyName,
  currentUserId,
  isReassign = false,
}: AssignUserModalProps) {
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [assigning, setAssigning] = useState(false);
  const [assignError, setAssignError] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setSelectedUserId(currentUserId || "");
      setSearchQuery("");
      setAssignError("");
      // Focus search input after modal renders
      setTimeout(() => searchInputRef.current?.focus(), 100);
    }
  }, [isOpen, currentUserId]);

  // Filter users based on search query
  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return users;

    const query = searchQuery.toLowerCase().trim();
    return users.filter((user) => {
      const name = user.name?.toLowerCase() || "";
      const email = user.email?.toLowerCase() || "";
      const role = user.role?.toLowerCase() || "";
      return (
        name.includes(query) || email.includes(query) || role.includes(query)
      );
    });
  }, [users, searchQuery]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !assigning) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
    }
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, assigning, onClose]);

  const handleSubmit = async () => {
    if (!selectedUserId) return;

    try {
      setAssigning(true);
      setAssignError("");
      await onSubmit(selectedUserId);
      onClose();
    } catch (err: any) {
      setAssignError(
        err?.response?.data?.message ||
          "Failed to assign user account. Please try again.",
      );
    } finally {
      setAssigning(false);
    }
  };

  const handleSelectUser = (userId: string) => {
    setSelectedUserId(userId);
    setAssignError("");
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
      <div className="flex w-full max-w-md flex-col rounded-sm border border-slate-800 bg-slate-900 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 p-6 pb-4">
          <h3 className="text-lg font-semibold tracking-wide text-slate-100">
            {isReassign ? "Reassign User Account" : "Assign User Account"}
          </h3>
          <button
            type="button"
            onClick={onClose}
            disabled={assigning}
            className="rounded-sm p-1 text-slate-400 transition hover:bg-slate-800 hover:text-slate-200 disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-hidden p-6">
          <p className="text-sm text-slate-400">
            Select a user account to link with{" "}
            <strong className="font-semibold text-orange-400">
              {facultyName}
            </strong>
            .
          </p>

          {assignError && (
            <div className="mt-4 rounded-sm border border-red-500/30 bg-red-950/40 p-3 text-xs text-red-300">
              {assignError}
            </div>
          )}

          {/* Search Input */}
          <div className="relative mt-4">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, email, or role..."
              className="w-full rounded-sm border border-slate-700 bg-slate-950 py-2.5 pl-9 pr-8 text-sm text-slate-100 outline-none transition focus:border-orange-400 focus:ring-1 focus:ring-orange-400"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-sm p-0.5 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* User List */}
          <div className="mt-3 max-h-64 overflow-y-auto rounded-sm border border-slate-800 bg-slate-950">
            {filteredUsers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <UserPlus className="h-8 w-8 text-slate-600" />
                <p className="mt-2 text-sm text-slate-400">
                  {searchQuery
                    ? "No users match your search."
                    : "No unlinked users available."}
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-slate-800">
                {filteredUsers.map((user) => {
                  const uid = getUserId(user);
                  const isSelected = selectedUserId === uid;
                  return (
                    <li key={uid}>
                      <button
                        type="button"
                        onClick={() => handleSelectUser(uid)}
                        className={`flex w-full items-center gap-3 px-4 py-3 text-left transition ${
                          isSelected
                            ? "bg-slate-800/80 border-l-2 border-orange-400"
                            : "hover:bg-slate-800/40"
                        }`}
                      >
                        {/* Checkbox indicator */}
                        <span
                          className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border transition ${
                            isSelected
                              ? "border-orange-400 bg-orange-400 text-slate-950"
                              : "border-slate-600 bg-slate-900"
                          }`}
                        >
                          {isSelected && <Check className="h-3 w-3 stroke-3" />}
                        </span>

                        {/* User info */}
                        <div className="min-w-0 flex-1">
                          <p
                            className={`truncate text-sm font-medium ${
                              isSelected ? "text-orange-300" : "text-slate-200"
                            }`}
                          >
                            {user.name}
                          </p>
                          <p className="truncate text-xs text-slate-400">
                            {user.email}
                          </p>
                        </div>

                        {/* Role badge */}
                        <span className="shrink-0 rounded-sm bg-slate-800 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-orange-400 border border-slate-700">
                          {user.role}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* Selection summary */}
          {selectedUserId && (
            <p className="mt-3 text-xs text-slate-400">
              {filteredUsers.length} user{filteredUsers.length !== 1 ? "s" : ""}{" "}
              found
              {searchQuery && ` matching "${searchQuery}"`}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-slate-800 p-6 pt-4">
          <button
            type="button"
            onClick={onClose}
            disabled={assigning}
            className="rounded-sm border border-slate-700 px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-slate-800 hover:text-white disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!selectedUserId || assigning}
            className="inline-flex items-center gap-2 rounded-sm bg-orange-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-orange-500 disabled:opacity-50"
          >
            <Check className="h-4 w-4 stroke-[2.5]" />
            {assigning ? "Saving..." : "Save Assignment"}
          </button>
        </div>
      </div>
    </div>
  );
}