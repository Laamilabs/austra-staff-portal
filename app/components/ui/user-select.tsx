"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Search, Check, Loader2 } from "lucide-react";
import { userApi } from "@/app/types/users";
import type { User } from "@/app/lib/types";

interface UserSelectProps {
  selectedUserId: string | null;
  onSelectUser: (userId: string | null) => void;
  label?: string;
}

export function UserSelect({
  selectedUserId,
  onSelectUser,
  label = "Select Permitted Owner",
}: UserSelectProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [userSearch, setUserSearch] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);
        const response = await userApi.getAll();
        setUsers(response.data || []);
      } catch (err) {
        console.error("Failed to load users:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  const filteredUsers = useMemo(() => {
    const query = userSearch.trim().toLowerCase();
    if (!query) return users;

    return users.filter(
      (user) =>
        user.name?.toLowerCase().includes(query) ||
        user.email?.toLowerCase().includes(query)
    );
  }, [users, userSearch]);

  const handleToggle = (userId: string) => {
    if (selectedUserId === userId) {
      onSelectUser(null);
    } else {
      onSelectUser(userId);
    }
  };

  return (
    <div className="space-y-3 rounded-sm border border-zinc-200 bg-zinc-50/50 p-4 dark:border-zinc-700 dark:bg-zinc-900/50">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
          {label} ({selectedUserId ? "1 selected" : "None selected"})
        </span>

        <div className="relative w-full sm:w-64">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            placeholder="Search name or email..."
            value={userSearch}
            onChange={(e) => setUserSearch(e.target.value)}
            className="w-full rounded-sm border border-zinc-300 bg-white py-1.5 pl-8 pr-3 text-xs outline-none focus:ring-1 focus:ring-[#082B66] dark:border-zinc-700 dark:bg-zinc-800 dark:text-white dark:focus:ring-orange-400"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-6 text-xs text-zinc-500">
          <Loader2 className="mr-2 h-4 w-4 animate-spin text-[#082B66] dark:text-orange-400" />
          Loading user accounts...
        </div>
      ) : filteredUsers.length === 0 ? (
        <p className="py-4 text-center text-xs text-zinc-400">
          No users found matching query.
        </p>
      ) : (
        <div className="max-h-48 space-y-1 overflow-y-auto rounded-sm border border-zinc-200 bg-white p-2 dark:border-zinc-700/60 dark:bg-zinc-800">
          {filteredUsers.map((user) => {
            const userId = user.id ?? (user as any)._id;
            const isSelected = selectedUserId === userId;

            return (
              <button
                key={userId}
                type="button"
                onClick={() => handleToggle(userId)}
                className={`flex w-full items-center justify-between rounded-sm p-2 text-left text-xs transition-colors ${
                  isSelected
                    ? "bg-[#082B66]/5 text-[#082B66] dark:bg-orange-400/10 dark:text-orange-300"
                    : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-700/50"
                }`}
              >
                <div>
                  <p className="font-medium">{user.name}</p>
                  <p className="text-[11px] text-zinc-400">{user.email}</p>
                </div>

                <div
                  className={`flex h-4 w-4 items-center justify-center rounded-full border ${
                    isSelected
                      ? "border-[#082B66] bg-[#082B66] text-white dark:border-orange-400 dark:bg-orange-400 dark:text-zinc-900"
                      : "border-zinc-300 bg-white dark:border-zinc-600 dark:bg-zinc-900"
                  }`}
                >
                  {isSelected && <Check className="h-3 w-3" />}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}