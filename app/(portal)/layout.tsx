"use client";

import type { ReactNode } from "react";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

import PortalShell from "../components/layout/PortalShell";
import { useAuth } from "../context/AuthContext";

interface PortalLayoutProps {
  children: ReactNode;
}

export default function PortalLayout({
  children,
}: PortalLayoutProps) {
  const router = useRouter();

  const {
    user,
    isLoading,
    isAuthenticated,
  } = useAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/");
    }
  }, [isLoading, isAuthenticated, router]);

  // Wait while AuthContext restores the session
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        {/* Keyframes are scoped here — they only exist while loading. */}
        <style>{`
          @keyframes portal-arc-cw  { to { transform: rotate(360deg);  } }
          @keyframes portal-arc-ccw { to { transform: rotate(-360deg); } }

          @media (prefers-reduced-motion: reduce) {
            .portal-arc,
            .portal-core,
            .portal-dot {
              animation: none !important;
            }
          }
        `}</style>

        <div className="flex flex-col items-center">
          {/* Brand mark */}
          <div
            role="status"
            aria-label="Checking your session"
            className="relative grid h-20 w-20 place-items-center"
          >
            {/* Outer track (navy) */}
            <svg
              viewBox="0 0 100 100"
              aria-hidden
              className="absolute inset-0 h-full w-full"
            >
              <circle
                cx="50"
                cy="50"
                r="44"
                fill="none"
                strokeWidth="5"
                className="stroke-[#0B1F3A]/15 dark:stroke-white/10"
              />
            </svg>

            {/* Outer arc (orange, clockwise) */}
            <svg
              viewBox="0 0 100 100"
              aria-hidden
              className="portal-arc absolute inset-0 h-full w-full"
              style={{ animation: "portal-arc-cw 1.2s linear infinite" }}
            >
              <circle
                cx="50"
                cy="50"
                r="44"
                fill="none"
                strokeWidth="5"
                strokeLinecap="round"
                strokeDasharray="55 240"
                className="stroke-orange-500 dark:stroke-orange-400"
              />
            </svg>

            {/* Inner track (navy, tighter) */}
            <svg
              viewBox="0 0 100 100"
              aria-hidden
              className="absolute inset-0 h-full w-full scale-[0.62]"
            >
              <circle
                cx="50"
                cy="50"
                r="44"
                fill="none"
                strokeWidth="6"
                className="stroke-[#0B1F3A]/10 dark:stroke-white/[0.07]"
              />
            </svg>

            {/* Inner arc (orange, counter-clockwise) */}
            <svg
              viewBox="0 0 100 100"
              aria-hidden
              className="portal-arc absolute inset-0 h-full w-full scale-[0.62]"
              style={{
                animation: "portal-arc-ccw 1.8s linear infinite",
              }}
            >
              <circle
                cx="50"
                cy="50"
                r="44"
                fill="none"
                strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray="30 240"
                className="stroke-orange-400 dark:stroke-orange-300"
              />
            </svg>

            {/* Pulsing navy core */}
            <span className="portal-core h-2.5 w-2.5 rounded-full bg-[#0B1F3A] motion-safe:animate-pulse dark:bg-orange-400" />
          </div>

          {/* Label + animated ellipsis */}
          <p className="mt-6 flex items-baseline gap-1.5 text-sm text-zinc-500 dark:text-zinc-400">
            Checking your session
            <span
              className="inline-flex gap-1 pb-[2px]"
              aria-hidden
            >
              <span
                className="portal-dot h-1 w-1 rounded-full bg-orange-500 motion-safe:animate-pulse dark:bg-orange-400"
                style={{ animationDelay: "0ms" }}
              />
              <span
                className="portal-dot h-1 w-1 rounded-full bg-orange-500 motion-safe:animate-pulse dark:bg-orange-400"
                style={{ animationDelay: "200ms" }}
              />
              <span
                className="portal-dot h-1 w-1 rounded-full bg-orange-500 motion-safe:animate-pulse dark:bg-orange-400"
                style={{ animationDelay: "400ms" }}
              />
            </span>
          </p>
        </div>
      </div>
    );
  }

  // Prevent protected content from flashing before redirect
  if (!isAuthenticated || !user) {
    return null;
  }

  return <PortalShell>{children}</PortalShell>;
}