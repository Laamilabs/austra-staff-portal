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
      <div className="flex min-h-screen items-center justify-center bg-zinc-50">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-zinc-200 border-t-[#0B1F3A]" />

          <p className="mt-4 text-sm text-zinc-500">
            Checking your session...
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