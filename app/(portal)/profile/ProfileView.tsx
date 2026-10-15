"use client";

import { Mail, Key } from "lucide-react";

import { User as UserType } from "@/app/lib/types";
import { getUserId } from "@/app/utilities/userWithId";
import { getUserInitials, getRoleBadge } from "../users/[id]/getRoleBadge";


interface ProfileViewProps {
    user: UserType;
}

export default function ProfileView({ user }: ProfileViewProps) {
    return (
        <>
            {/* Banner */}
            <div className="h-28 bg-[#082B66] dark:bg-zinc-800/80" />

            <div className="relative px-6 pb-6">
                {/* Avatar Header */}
                <div className="-mt-12 mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                    <div className="flex items-end gap-4">
                        {user.profileImage ? (
                            <img
                                src={user.profileImage}
                                alt={user.name}
                                className="h-24 w-24 rounded-full border-4 border-white object-cover shadow-md dark:border-zinc-900"
                            />
                        ) : (
                            <div className="flex h-24 w-24 items-center justify-center rounded-full border-4 border-white bg-[#082B66] text-2xl font-bold text-white shadow-md dark:border-zinc-900 dark:bg-orange-500 dark:text-zinc-950">
                                {getUserInitials(user.name)}
                            </div>
                        )}
                        <div>
                            <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                                {user.name}
                            </h2>
                            <p className="text-sm text-zinc-500 dark:text-zinc-400">
                                {user.email}
                            </p>
                        </div>
                    </div>
                    <div>{getRoleBadge(user.role)}</div>
                </div>

                {/* View Details Mode */}
                <div className="grid grid-cols-1 gap-6 border-t border-zinc-100 pt-4 dark:border-zinc-800 md:grid-cols-2">
                    <div className="space-y-4">
                        <div>
                            <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                                Full Name
                            </label>
                            <p className="mt-1 text-sm font-medium text-zinc-900 dark:text-zinc-100">
                                {user.name}
                            </p>
                        </div>

                        <div>
                            <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                                Email Address
                            </label>
                            <div className="mt-1 flex items-center gap-2">
                                <Mail className="h-4 w-4 text-zinc-400" />
                                <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                                    {user.email}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                                Assigned Role
                            </label>
                            <p className="mt-1 text-sm font-medium capitalize text-zinc-900 dark:text-zinc-100">
                                {user.role}
                            </p>
                        </div>

                        <div>
                            <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                                System ID
                            </label>
                            <div className="mt-1 flex items-center gap-2">
                                <Key className="h-4 w-4 text-zinc-400" />
                                <p className="font-mono text-xs text-zinc-600 dark:text-zinc-400">
                                    {getUserId(user as UserType & { _id?: string })}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}