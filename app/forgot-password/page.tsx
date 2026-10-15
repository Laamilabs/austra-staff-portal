"use client";

import Link from "next/link";
import AcademicGrid from "../login/DotMatrix";

export default function ForgotPasswordPage() {
    const adminPhone = "0703710401";
    const whatsappUrl = `https://wa.me/254703710401?text=${encodeURIComponent(
        "Hello Admin, I need assistance resetting my staff portal password."
    )}`;

    return (
        <main className="relative min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center lg:py-20">
            {/* Background Image Overlay */}
            <div
                className="absolute inset-0 z-0 bg-cover bg-center opacity-25 dark:opacity-10 dark:invert"
                style={{ backgroundImage: "url('/white.avif')" }}
            />

            <div className="relative z-10 flex flex-col items-center justify-center p-6 w-full max-w-xl mx-auto">
                <div className="w-full relative">

                    {/* Card Wrapper */}
                    <div className="flex flex-col items-center text-center p-8 lg:p-10 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xl rounded-xl relative z-10">

                        {/* Header Icon */}
                        <div className="w-14 h-14 rounded-full bg-orange-100 dark:bg-orange-950/50 text-orange-500 flex items-center justify-center mb-4">
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                                strokeWidth={1.75}
                                stroke="currentColor"
                                className="w-7 h-7"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z"
                                />
                            </svg>
                        </div>

                        {/* Institution Brand & Title */}
                        <p className="text-xs font-semibold uppercase tracking-[0.15em] text-orange-500">
                            Austra Training Institute
                        </p>
                        <h1 className="mt-2 text-2xl lg:text-3xl font-bold tracking-tight text-[#0B1F3A] dark:text-white">
                            Password Reset Help
                        </h1>
                        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400 max-w-md">
                            For security reasons, password resets are handled directly by the system administrator. Please use one of the options below to get assistance.
                        </p>

                        {/* Support Actions Box */}
                        <div className="w-full mt-6 space-y-4 text-left">

                            {/* Option 1: In-person Visit */}
                            <div className="p-4 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/60 flex items-start space-x-3">
                                <div className="p-2 rounded-md bg-[#0B1F3A]/10 text-[#0B1F3A] dark:bg-orange-400/10 dark:text-orange-400 mt-0.5">
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        strokeWidth={1.5}
                                        stroke="currentColor"
                                        className="w-5 h-5"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3a1.5 1.5 0 0 1 1.5-1.5h3a1.5 1.5 0 0 1 1.5 1.5v3"
                                        />
                                    </svg>
                                </div>
                                <div>
                                    <h2 className="text-sm font-semibold text-[#0B1F3A] dark:text-white">
                                        Visit IT Department
                                    </h2>
                                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                                        Drop by the ICT office on campus during standard working hours with your staff identification card.
                                    </p>
                                </div>
                            </div>

                            {/* Option 2: WhatsApp / Call Contact Buttons */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">

                                {/* WhatsApp Button */}
                                <a
                                    href={whatsappUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition shadow-sm"
                                >
                                    <svg
                                        className="w-4 h-4 fill-current"
                                        viewBox="0 0 24 24"
                                        xmlns="http://www.w3.org/2000/svg"
                                    >
                                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.572-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.99c-.002 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c-.001 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662a11.87 11.87 0 005.71 1.455h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                                    </svg>
                                    <span>WhatsApp Admin</span>
                                </a>

                                {/* Call Button */}
                                <a
                                    href={`tel:${adminPhone}`}
                                    className="flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium text-white bg-[#0B1F3A] hover:bg-[#102b50] dark:bg-orange-400 dark:text-zinc-950 dark:hover:bg-orange-500 rounded-lg transition shadow-sm"
                                >
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        strokeWidth={1.75}
                                        stroke="currentColor"
                                        className="w-4 h-4"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 0 1-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z"
                                        />
                                    </svg>
                                    <span>Call {adminPhone}</span>
                                </a>

                            </div>
                        </div>

                        {/* Back to Login Link */}
                        <div className="w-full mt-8 pt-4 border-t border-zinc-100 dark:border-zinc-800 text-center">
                            <Link
                                href="/login"
                                className="inline-flex items-center text-xs font-semibold text-orange-500 hover:text-orange-600 dark:text-orange-400 gap-1"
                            >
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    strokeWidth={2}
                                    stroke="currentColor"
                                    className="w-3.5 h-3.5"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18"
                                    />
                                </svg>
                                <span>Back to sign in</span>
                            </Link>
                        </div>

                    </div>

                    {/* Decorative Top Left Academic Grid */}
                    <AcademicGrid className="absolute top-0 left-0 z-0 w-32 h-32 -mt-8 -ml-8 text-orange-400 opacity-80" />

                    {/* Decorative Bottom Right Academic Grid */}
                    <AcademicGrid className="absolute bottom-0 right-0 z-0 w-32 h-32 -mb-8 -mr-8 text-[#0B1F3A] dark:text-orange-400 opacity-80" />

                </div>
            </div>
        </main>
    );
}