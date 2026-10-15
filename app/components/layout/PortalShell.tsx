"use client";

import type { CSSProperties, ReactNode } from "react";
import { useEffect, useState } from "react";

import PortalSidebar from "./PortalSidebar";
import BackupModal, { type BackupStatus } from "./BackupModal";
import { useAuth } from "../../context/AuthContext";
import {
  DATABASE_BACKUP_PROMPT_KEY,
  downloadDatabaseBackup,
} from "../../types/db-backup";

interface PortalShellProps {
  children: ReactNode;
}

const STORAGE_KEY = "portal:sidebar-collapsed";

/** Below this width the sidebar starts as an icon rail (when nothing is saved). */
const AUTO_COLLAPSE_BELOW = 1280;

/** Pass rotation to the keyframes via a custom property, not `transform`. */
const rot = (deg: number) => ({ "--r": `${deg}deg` }) as CSSProperties;

export default function PortalShell({ children }: PortalShellProps) {
  const { user, isLoading, isAuthenticated } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [backupStatus, setBackupStatus] = useState<BackupStatus>("idle");
  const [backupError, setBackupError] = useState("");

  // Auto-open the prompt for admins once, right after a login handoff.
  useEffect(() => {
    if (isLoading || !isAuthenticated || !user) return;
    try {
      if (window.sessionStorage.getItem(DATABASE_BACKUP_PROMPT_KEY) !== "1") return;
      window.sessionStorage.removeItem(DATABASE_BACKUP_PROMPT_KEY);
      if (String(user.role).trim().toLowerCase() === "admin") {
        setBackupStatus("confirm");
      }
    } catch {
      // Ignore unavailable session storage.
    }
  }, [isAuthenticated, isLoading, user]);

  const handleBackupDownload = async () => {
    setBackupStatus("loading");
    setBackupError("");
    try {
      await downloadDatabaseBackup();
      setBackupStatus("success");
    } catch (err) {
      setBackupError(
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again.",
      );
      setBackupStatus("error");
    }
  };

  const closeBackupModal = () => {
    setBackupStatus("idle");
    setBackupError("");
  };

  // Restore the saved preference. With no saved value, start as a rail on
  // narrower desktops so the working area gets the room.
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved !== null) {
        setCollapsed(saved === "1");
      } else if (window.innerWidth < AUTO_COLLAPSE_BELOW) {
        setCollapsed(true);
      }
    } catch {
      /* storage unavailable: keep the default */
    }
    setHydrated(true);
  }, []);

  // Remember the choice. Waits for hydration so the default never overwrites it.
  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, collapsed ? "1" : "0");
    } catch {
      /* ignore */
    }
  }, [collapsed, hydrated]);

  // Ctrl/Cmd + \ toggles the sidebar.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "\\") {
        e.preventDefault();
        setCollapsed((c) => !c);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="relative min-h-screen bg-zinc-100 text-zinc-900 selection:bg-orange-400/20 selection:text-orange-600 dark:bg-[#050F20] dark:text-zinc-100 dark:selection:text-orange-400">
      {/* Skip link for keyboard users */}
      <a
        href="#main-content"
        className="sr-only z-60 rounded-sm bg-[#0B1E3D] px-3 py-2 text-sm font-semibold text-white focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:outline-none focus:ring-2 focus:ring-orange-400"
      >
        Skip to content
      </a>

      {/* ---------------- Ambient Background Shapes ---------------- */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
      >
        <div
          className="portal-shape portal-shape--drift absolute -top-16 right-[8%] h-64 w-64 rounded-sm bg-[#0B1E3D]/8 dark:bg-[#0B1E3D]/60"
          style={rot(12)}
        />
        <div
          className="portal-shape portal-shape--spin absolute top-[22%] right-[18%] h-24 w-24 rounded-sm bg-orange-400/15 dark:bg-orange-400/10"
          style={rot(45)}
        />
        <div
          className="portal-shape portal-shape--drift-rev absolute top-[55%] right-[4%] h-40 w-16 rounded-sm bg-[#0B1E3D]/10 dark:bg-[#0B1E3D]/70"
          style={rot(-8)}
        />
        <div
          className="portal-shape portal-shape--drift absolute bottom-[12%] right-[26%] h-14 w-14 rounded-sm bg-orange-400/20 dark:bg-orange-400/15"
          style={{ ...rot(20), animationDelay: "-4s" }}
        />
        <div
          className="portal-shape portal-shape--spin-rev absolute bottom-[-4%] right-[38%] h-32 w-32 rounded-sm border border-[#0B1E3D]/15 dark:border-orange-400/15"
          style={rot(15)}
        />
        <div
          className="portal-shape portal-shape--drift-rev absolute top-[70%] left-[10%] hidden h-20 w-20 rounded-sm bg-[#0B1E3D]/6 dark:bg-[#0B1E3D]/50 lg:block"
          style={rot(-15)}
        />
      </div>

      <PortalSidebar
        collapsed={collapsed}
        setCollapsed={setCollapsed}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
      />

      <BackupModal
        status={backupStatus}
        error={backupError}
        onConfirm={handleBackupDownload}
        onClose={closeBackupModal}
      />

      {/* Content column: follows the sidebar width (64px rail / 256px full) */}
      <div
        className={`relative z-10 flex min-h-screen flex-col pt-16 transition-[padding] duration-300 ease-in-out lg:pt-0 ${
          collapsed ? "lg:pl-16" : "lg:pl-64"
        }`}
      >
        <div className="flex flex-1 flex-col lg:m-2 lg:ml-0 lg:min-h-[calc(100vh-1rem)] lg:rounded-sm lg:border lg:border-zinc-200/80 lg:bg-white/75 lg:shadow-sm dark:lg:border-white/10 dark:lg:bg-zinc-900/60 dark:lg:shadow-none">
          <main
            id="main-content"
            tabIndex={-1}
            className={`mx-auto w-full flex-1 px-4 py-6 outline-none transition-[max-width] duration-300 ease-in-out sm:px-6 lg:px-8 ${
              collapsed ? "max-w-[100rem]" : "max-w-400"
            }`}
          >
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}