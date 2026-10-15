"use client";

import { Building2 } from "lucide-react";
import { useRouter } from "next/navigation";

import { Department } from "@/app/types/department";

interface DepartmentCardProps {
    department: Department;
    deleting: boolean;
    onDelete: () => void;
}

export default function DepartmentCard({ department }: DepartmentCardProps) {
    const router = useRouter();

    const handleClick = () => {
        router.push(`/departments/${department._id}`);
    };

    return (
        <article
            onClick={handleClick}
            role="button"
            tabIndex={0}
            onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    handleClick();
                }
            }}
            className="
        group relative cursor-pointer overflow-hidden rounded-sm
        border border-zinc-200 bg-white
        transition-all duration-200 ease-out
        hover:-translate-y-0.5
        hover:border-[#082B66]
        hover:shadow-md hover:shadow-[#082B66]/10
        focus:outline-none focus:ring-2 focus:ring-orange-400 focus:ring-offset-2
        dark:border-zinc-800 dark:bg-zinc-900
        dark:hover:border-orange-400
        dark:hover:shadow-orange-400/5
        dark:focus:ring-orange-400 dark:focus:ring-offset-zinc-950
        sm:grid sm:grid-cols-[1fr_180px] lg:grid-cols-[1fr_200px]
      "
        >
            {/* Content — gets its own column, with right padding so text never
          runs under the offset image panel. */}
            <div className="relative z-10 min-w-0 p-5 sm:self-center sm:py-6 sm:pl-6 sm:pr-5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-orange-600 dark:text-orange-400">
                    Department
                </p>

                <h2
                    className="
            mt-2 line-clamp-2 text-base font-semibold leading-snug
            text-zinc-900
            transition-colors duration-200
            group-hover:text-[#082B66]
            dark:text-white dark:group-hover:text-orange-400
          "
                >
                    {department.name}
                </h2>

                {department.description && (
                    <p
                        className="
              mt-3 line-clamp-2 border-t border-zinc-100 pt-3
              text-sm leading-6 text-zinc-600
              dark:border-zinc-800 dark:text-zinc-400
            "
                    >
                        {department.description}
                    </p>
                )}
            </div>

            {/* Image panel — offset, rounded, on a solid white background so
          transparent / dark logos stay legible. */}
            <div className="relative h-40 sm:h-auto sm:min-h-42.5">
                <div
                    className="
            absolute inset-0 flex items-center justify-center
            overflow-hidden rounded-md
            border border-zinc-200 bg-white shadow-sm
            transform translate-x-3 translate-y-3
            transition-transform duration-300 ease-out
            group-hover:translate-x-2 group-hover:translate-y-2
            sm:translate-x-4 sm:translate-y-4
            dark:border-zinc-700 dark:bg-zinc-100
          "
                >
                    {department.iconLink ? (
                        <img
                            src={department.iconLink}
                            alt=""
                            className="h-full w-full object-cover object-center"
                        />
                    ) : (
                        <Building2 className="h-10 w-10 text-[#082B66]" />
                    )}
                </div>
            </div>
        </article>
    );
}