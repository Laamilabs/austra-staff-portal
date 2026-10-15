"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Search,
  DatabaseBackup,
  LoaderCircle,
} from "lucide-react";

import { useAuth } from "../../context/AuthContext";
import { portalNav } from "./portalNav";
import { downloadDatabaseBackup } from "../../types/db-backup";
import BackupModal, { type BackupStatus } from "./BackupModal";

interface PortalSidebarProps {
  collapsed: boolean;
  setCollapsed: React.Dispatch<React.SetStateAction<boolean>>;
  mobileOpen: boolean;
  setMobileOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

/**
 * Icon accents. Assigned by the item's position in `portalNav`, so a page keeps
 * its colour while the menu is being filtered. Class names are written out in
 * full so Tailwind can see them.
 */
const ICON_ACCENTS = [
  "text-orange-500 dark:text-orange-400",
  "text-sky-600 dark:text-sky-400",
  "text-emerald-600 dark:text-emerald-400",
  "text-violet-600 dark:text-violet-400",
  "text-rose-600 dark:text-rose-400",
  "text-amber-600 dark:text-amber-400",
  "text-teal-600 dark:text-teal-400",
  "text-indigo-600 dark:text-indigo-400",
];

/** Search box appears once the menu is long enough to need it. */
const SEARCH_THRESHOLD = 6;

/** Hides the scrollbar everywhere without disabling scrolling. */
const HIDE_SCROLLBAR =
  "[scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden";

const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400";

/* ------------------------------------------------------------------ */
/* Small shared pieces                                                */
/* ------------------------------------------------------------------ */

function Avatar({
  src,
  name,
  initials,
  loading = false,
  onError,
  className = "h-9 w-9",
}: {
  src: string;
  name: string;
  initials: string;
  loading?: boolean;
  onError: () => void;
  className?: string;
}) {
  return (
    <span
      className={`
        relative flex shrink-0 items-center justify-center overflow-hidden rounded-sm
        bg-orange-400/10 text-xs font-bold text-orange-600 dark:text-orange-400
        ring-1 ring-inset ring-orange-400/30
        ${className}
      `}
    >
      {loading ? (
        <span className="h-full w-full animate-pulse bg-zinc-200 dark:bg-white/10" />
      ) : src ? (
        <img
          src={src}
          alt={name}
          className="h-full w-full object-cover"
          onError={onError}
        />
      ) : (
        initials
      )}
    </span>
  );
}

function BrandMark() {
  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-sm bg-[#0B1E3D]/5 p-1 ring-1 ring-inset ring-[#0B1E3D]/10 dark:bg-white/10 dark:ring-white/10">
      <img
        src="/logo2.png"
        alt="Austra"
        className="h-full w-full object-contain"
      />
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Sidebar                                                            */
/* ------------------------------------------------------------------ */

export default function PortalSidebar({
  collapsed,
  setCollapsed,
  mobileOpen,
  setMobileOpen,
}: PortalSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const { user, isLoading, isAuthenticated, logout } = useAuth();

  // On mobile the drawer is always expanded (full labels + icons).
  // Only desktop view honors the `collapsed` state.
  const isCollapsed = collapsed && !mobileOpen;

  const asideRef = useRef<HTMLElement>(null);
  const navRef = useRef<HTMLElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const [imageFailed, setImageFailed] = useState(false);
  const [query, setQuery] = useState("");
  const [edges, setEdges] = useState({ top: false, bottom: false });
  const [tip, setTip] = useState<{ label: string; top: number } | null>(null);
  const [backupStatus, setBackupStatus] =
    useState<BackupStatus>("idle");
  const [backupError, setBackupError] = useState("");
  const backupLoading = backupStatus === "loading";

  /* ---------------- derived data ---------------- */

  const showSearch = portalNav.length > SEARCH_THRESHOLD;

  const items = useMemo(() => {
    const q = query.trim().toLowerCase();
    return portalNav
      .map((item, index) => ({ item, index }))
      .filter(({ item }) => !q || item.label.toLowerCase().includes(q));
  }, [query]);

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  const displayName = user?.name?.trim() || "Staff Member";
  const displayEmail = user?.email?.trim() || "Staff account";
  const initials = user?.name?.trim()?.charAt(0)?.toUpperCase() || "U";

  const rawRole = user?.role?.toString()?.trim() || "staff";
  const role = rawRole.charAt(0).toUpperCase() + rawRole.slice(1).toLowerCase();

  const profileImage =
    !imageFailed && user?.profileImage?.trim() ? user.profileImage.trim() : "";
  const isAdmin = String(user?.role || "").trim().toLowerCase() === "admin";

  const handleDatabaseBackup = async () => {
    if (backupStatus === "loading") return;

    setBackupStatus("loading");
    setBackupError("");

    try {
      await downloadDatabaseBackup();
      setBackupStatus("success");
    } catch (error) {
      console.error("Database backup download failed:", error);

      setBackupError(
        "The database backup could not be downloaded. Check your connection and try again.",
      );

      setBackupStatus("error");
    }
  };

  /* ---------------- effects ---------------- */

  // Reset failure flag if profile image changes.
  useEffect(() => {
    setImageFailed(false);
  }, [user?.profileImage]);

  // Close mobile drawer and clear the filter whenever route changes.
  useEffect(() => {
    setMobileOpen(false);
    setQuery("");
  }, [pathname, setMobileOpen]);

  // Lock body scroll + close on ESC while drawer is open.
  useEffect(() => {
    if (!mobileOpen) return;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileOpen(false);
    };
    window.addEventListener("keydown", onKey);

    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [mobileOpen, setMobileOpen]);

  // Track whether the menu can scroll up/down, to drive the edge fades.
  const updateEdges = useCallback(() => {
    const el = navRef.current;
    if (!el) return;

    const top = el.scrollTop > 4;
    const bottom =
      el.scrollTop + el.clientHeight < el.scrollHeight - 4;

    setEdges((prev) =>
      prev.top === top && prev.bottom === bottom
        ? prev
        : { top, bottom },
    );
  }, []);

  useEffect(() => {
    updateEdges();
    const el = navRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(updateEdges);
    ro.observe(el);
    return () => ro.disconnect();
  }, [updateEdges, items.length, isCollapsed]);

  // Keep the current page visible in a long menu.
  useEffect(() => {
    navRef.current
      ?.querySelector('[aria-current="page"]')
      ?.scrollIntoView({ block: "nearest" });
  }, [pathname]);

  // Tooltips only make sense while the rail is collapsed.
  useEffect(() => {
    if (!isCollapsed) setTip(null);
  }, [isCollapsed]);

  // Clicking outside the sidebar collapses it (desktop) or closes the drawer (mobile).
  useEffect(() => {
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target;

      if (
        target instanceof Element &&
        target.closest("[data-backup-modal]")
      ) {
        return;
      }

      const el = asideRef.current;
      if (!el) return;

      if (el.contains(target as Node)) return;

      if (mobileOpen) {
        setMobileOpen(false);
        return;
      }

      if (
        !collapsed &&
        window.matchMedia("(min-width: 1024px)").matches
      ) {
        setCollapsed(true);
      }
    };

    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [collapsed, mobileOpen, setCollapsed, setMobileOpen]);

  /* ---------------- handlers ---------------- */

  const handleLogout = async () => {
    await logout();
    router.replace("/login");
  };

  const showTip = (label: string) => (e: React.SyntheticEvent<HTMLElement>) => {
    if (!isCollapsed || !asideRef.current) return;
    const r = e.currentTarget.getBoundingClientRect();
    const a = asideRef.current.getBoundingClientRect();
    setTip({ label, top: r.top - a.top + r.height / 2 });
  };
  const hideTip = () => setTip(null);
  const tipProps = (label: string) => ({
    onMouseEnter: showTip(label),
    onFocus: showTip(label),
    onMouseLeave: hideTip,
    onBlur: hideTip,
  });

  const onNavKeyDown = (e: React.KeyboardEvent<HTMLElement>) => {
    const links = Array.from(
      navRef.current?.querySelectorAll<HTMLAnchorElement>("[data-nav-item]") ?? []
    );
    const current = links.indexOf(document.activeElement as HTMLAnchorElement);
    if (current === -1 || links.length === 0) return;

    let next = -1;
    if (e.key === "ArrowDown") next = (current + 1) % links.length;
    else if (e.key === "ArrowUp") next = (current - 1 + links.length) % links.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = links.length - 1;

    if (next !== -1) {
      e.preventDefault();
      links[next].focus();
    }
  };

  const onSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      setQuery("");
    } else if (e.key === "Enter" && items[0]) {
      router.push(items[0].item.href);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      navRef.current?.querySelector<HTMLAnchorElement>("[data-nav-item]")?.focus();
    }
  };

  const openSearch = () => {
    setCollapsed(false);
    window.setTimeout(() => searchRef.current?.focus(), 320);
  };

  const fade = 28;
  const maskImage = `linear-gradient(to bottom, transparent 0, #000 ${edges.top ? fade : 0
    }px, #000 calc(100% - ${edges.bottom ? fade : 0}px), transparent 100%)`;

  /* ---------------- render ---------------- */

  return (
    <>
      {/* ---------------- Mobile Header ---------------- */}
      <header
        className="
          fixed inset-x-0 top-0 z-40 flex h-16 items-center
          border-b border-zinc-200/70 bg-white/85
          backdrop-blur-xl transition-colors
          dark:border-white/10 dark:bg-[#0B1E3D]/90 lg:hidden
        "
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >
        <div className="flex w-full items-center justify-between px-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className={`
                inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-sm
                text-zinc-600 transition-colors dark:text-zinc-300
                hover:bg-[#0B1E3D]/5 hover:text-[#0B1E3D]
                dark:hover:bg-white/10 dark:hover:text-white
                ${FOCUS_RING}
              `}
              aria-label="Open navigation"
              aria-expanded={mobileOpen}
              aria-controls="portal-sidebar"
            >
              <Menu size={22} />
            </button>

            <Link
              href="/dashboard"
              className={`group flex items-center gap-3 rounded-sm ${FOCUS_RING}`}
              onClick={() => setMobileOpen(false)}
            >
              <BrandMark />
              <span className="min-w-0 leading-tight">
                <span className="block truncate text-sm font-bold text-[#0B1E3D] dark:text-white">
                  Austra
                </span>
                <span className="block truncate text-[10px] font-semibold text-orange-500 dark:text-orange-400">
                  Staff Portal
                </span>
              </span>
            </Link>
          </div>

          <div className="flex items-center gap-1.5">
            {!isLoading && isAuthenticated && isAdmin && (
              <button
                type="button"
                onClick={handleDatabaseBackup}
                disabled={backupLoading}
                aria-label="Download database backup"
                title={backupError || "Database backup"}
                className={`
                  flex h-9 w-9 items-center justify-center rounded-sm border border-orange-400/30
                  bg-orange-400/10 text-orange-700 transition-colors hover:bg-orange-400/20
                  disabled:cursor-wait disabled:opacity-60 dark:text-orange-300
                  ${FOCUS_RING}
                `}
              >
                {backupLoading ? <LoaderCircle size={17} className="animate-spin" /> : <DatabaseBackup size={17} />}
              </button>
            )}

            {!isLoading && isAuthenticated && (
              <Link
                href="/profile"
                aria-label="Open profile"
                className={`rounded-sm transition-transform hover:scale-105 active:scale-95 ${FOCUS_RING}`}
              >
                <Avatar
                  src={profileImage}
                  name={displayName}
                  initials={initials}
                  onError={() => setImageFailed(true)}
                />
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* ---------------- Mobile Overlay ---------------- */}
      <div
        aria-hidden={!mobileOpen}
        onClick={() => setMobileOpen(false)}
        className={`
          fixed inset-0 z-40 bg-[#0B1E3D]/50 backdrop-blur-sm
          transition-opacity duration-300 lg:hidden
          ${mobileOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"}
        `}
      />

      {/* ---------------- Sidebar ---------------- */}
      <aside
        ref={asideRef}
        id="portal-sidebar"
        className={`
          fixed inset-y-0 left-0 z-50 flex flex-col
          border-r border-zinc-200/70 bg-white/85 backdrop-blur-xl
          dark:border-white/10 dark:bg-[#0B1E3D]/95
          shadow-xl transition-all duration-300 ease-in-out lg:shadow-none
          w-72 max-w-[calc(100vw-3rem)]
          ${isCollapsed ? "lg:w-16" : "lg:w-64"}
          lg:translate-x-0
          ${mobileOpen ? "translate-x-0" : "-translate-x-full"}
        `}
        style={{
          paddingTop: "env(safe-area-inset-top)",
          paddingBottom: "env(safe-area-inset-bottom)",
        }}
      >
        {/* Brand + collapse control */}
        <div
          className={`
            flex shrink-0 items-center pt-3
            ${isCollapsed ? "flex-col gap-2 px-2" : "justify-between gap-2 px-3"}
          `}
        >
          <Link
            href="/dashboard"
            onClick={() => setMobileOpen(false)}
            className={`flex min-w-0 items-center gap-3 rounded-sm p-1 ${FOCUS_RING}`}
            aria-label="Austra staff portal home"
            {...tipProps("Dashboard")}
          >
            <BrandMark />
            {!isCollapsed && (
              <span className="min-w-0 leading-tight">
                <span className="block truncate text-sm font-bold text-[#0B1E3D] dark:text-white">
                  Austra
                </span>
                <span className="block truncate text-[10px] font-semibold text-orange-500 dark:text-orange-400">
                  Staff Portal
                </span>
              </span>
            )}
          </Link>

          {/* Desktop: collapse / expand */}
          <button
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            className={`
              hidden h-8 w-8 shrink-0 items-center justify-center rounded-sm
              text-zinc-400 transition-colors lg:flex
              hover:bg-[#0B1E3D]/5 hover:text-[#0B1E3D]
              dark:text-zinc-500 dark:hover:bg-white/10 dark:hover:text-white
              ${FOCUS_RING}
            `}
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            {...tipProps(isCollapsed ? "Expand sidebar" : "Collapse sidebar")}
          >
            {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>

          {/* Mobile: close drawer */}
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className={`
              inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-sm
              text-zinc-500 transition-colors lg:hidden
              hover:bg-[#0B1E3D]/5 hover:text-[#0B1E3D]
              dark:text-zinc-400 dark:hover:bg-white/10 dark:hover:text-white
              ${FOCUS_RING}
            `}
            aria-label="Close navigation"
          >
            <X size={20} />
          </button>
        </div>

        {/* Find a page */}
        {showSearch && (
          <div className={`shrink-0 pt-3 ${isCollapsed ? "px-2" : "px-3"}`}>
            {isCollapsed ? (
              <button
                type="button"
                onClick={openSearch}
                aria-label="Find a page"
                className={`
                  flex h-9 w-full items-center justify-center rounded-sm
                  bg-zinc-100 text-zinc-500 transition-colors
                  hover:text-[#0B1E3D]
                  dark:bg-white/5 dark:text-zinc-400 dark:hover:bg-white/10 dark:hover:text-white
                  ${FOCUS_RING}
                `}
                {...tipProps("Find a page")}
              >
                <Search size={16} />
              </button>
            ) : (
              <label
                className="
                  flex h-9 items-center gap-2 rounded-sm border-b-2 border-transparent
                  bg-zinc-100 px-2.5 text-zinc-400 transition-colors
                  focus-within:border-orange-400 focus-within:bg-white focus-within:shadow-sm
                  dark:bg-white/5 dark:text-zinc-500 dark:focus-within:bg-white/10
                "
              >
                <Search size={15} className="shrink-0" />
                <input
                  ref={searchRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={onSearchKeyDown}
                  placeholder="Find a page"
                  aria-label="Find a page"
                  autoComplete="off"
                  spellCheck={false}
                  className="
                    min-w-0 flex-1 bg-transparent text-[13px] text-[#0B1E3D] outline-none
                    placeholder:text-zinc-400 dark:text-white dark:placeholder:text-zinc-500
                  "
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => {
                      setQuery("");
                      searchRef.current?.focus();
                    }}
                    aria-label="Clear search"
                    className={`flex h-5 w-5 items-center justify-center rounded-sm hover:text-[#0B1E3D] dark:hover:text-white ${FOCUS_RING}`}
                  >
                    <X size={13} />
                  </button>
                )}
              </label>
            )}
          </div>
        )}

        {/* Navigation */}
        <nav
          ref={navRef}
          onScroll={() => {
            updateEdges();
            hideTip();
          }}
          onKeyDown={onNavKeyDown}
          aria-label="Main navigation"
          className={`mt-2 min-h-0 flex-1 overflow-y-auto overscroll-contain py-2 ${isCollapsed ? "px-2" : "px-3"} ${HIDE_SCROLLBAR}`}
          style={{ maskImage, WebkitMaskImage: maskImage }}
        >
          {!isCollapsed && (
            <div className="mb-2 flex items-center justify-between px-2">
              <span className="text-xs font-semibold text-zinc-400 dark:text-zinc-500">
                {query.trim() ? "Results" : "Menu"}
              </span>
              {!isLoading && isAuthenticated && isAdmin && !query.trim() && (
                <button
                  type="button"
                  onClick={handleDatabaseBackup}
                  disabled={backupLoading}
                  aria-label="Download database backup"
                  {...tipProps(backupError || "Download DB Backup")}
                  className={`
                    inline-flex items-center gap-1.5 text-[11px] font-medium text-orange-600 transition-colors hover:underline dark:text-orange-400
                    ${FOCUS_RING}
                  `}
                >
                  {backupLoading ? <LoaderCircle size={13} className="animate-spin" /> : <DatabaseBackup size={13} />}
                  <span>Backup</span>
                </button>
              )}
            </div>
          )}

          <ul className="space-y-0.5">
            {items.map(({ item, index }) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              const accent = ICON_ACCENTS[index % ICON_ACCENTS.length];

              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    data-nav-item
                    onClick={() => setMobileOpen(false)}
                    aria-current={active ? "page" : undefined}
                    aria-label={isCollapsed ? item.label : undefined}
                    {...tipProps(item.label)}
                    className={`
                      group relative flex h-10 items-center rounded-sm
                      text-[13px] font-medium transition-colors duration-150
                      ${FOCUS_RING}
                      ${isCollapsed ? "justify-center" : "gap-3 px-3"}
                      ${active
                        ? "bg-[#0B1E3D]/[0.07] font-semibold text-[#0B1E3D] dark:bg-white/10 dark:text-white"
                        : "text-zinc-600 hover:bg-[#0B1E3D]/4 hover:text-[#0B1E3D] dark:text-zinc-300 dark:hover:bg-white/6 dark:hover:text-white"
                      }
                    `}
                  >
                    <span
                      aria-hidden
                      className={`
                        absolute left-0 top-1/2 h-4 w-0.75 -translate-y-1/2 rounded-sm bg-orange-400
                        origin-center transition-transform duration-200
                        ${active ? "scale-y-100 group-active:scale-y-50" : "scale-y-0"}
                      `}
                    />

                    <Icon
                      size={19}
                      strokeWidth={active ? 2.2 : 1.9}
                      className={`shrink-0 transition-transform duration-150 group-active:scale-90 ${accent}`}
                    />

                    {!isCollapsed && <span className="truncate">{item.label}</span>}
                  </Link>
                </li>
              );
            })}
          </ul>

          {items.length === 0 && !isCollapsed && (
            <p className="px-2 py-6 text-center text-xs text-zinc-400 dark:text-zinc-500">
              No pages match &ldquo;{query.trim()}&rdquo;
            </p>
          )}
        </nav>

        {/* Account Footer */}
        <div
          className={`
            shrink-0 border-t border-zinc-200/70 p-2 dark:border-white/10
            ${isCollapsed ? "flex flex-col items-center gap-1.5" : "flex items-center gap-1"}
          `}
        >
          <Link
            href="/profile"
            onClick={() => setMobileOpen(false)}
            aria-label="My profile"
            {...tipProps("My profile")}
            className={`
              flex items-center rounded-sm transition-colors
              hover:bg-[#0B1E3D]/4 dark:hover:bg-white/6
              ${FOCUS_RING}
              ${isCollapsed ? "p-1.5" : "min-w-0 flex-1 gap-3 p-2"}
            `}
          >
            <Avatar
              src={profileImage}
              name={displayName}
              initials={initials}
              loading={isLoading}
              onError={() => setImageFailed(true)}
              className="h-9 w-9"
            />

            {!isCollapsed && (
              <span className="min-w-0 flex-1 leading-tight">
                {isLoading ? (
                  <>
                    <span className="block h-3.5 w-24 animate-pulse rounded-sm bg-zinc-200 dark:bg-white/10" />
                    <span className="mt-1.5 block h-3 w-32 animate-pulse rounded-sm bg-zinc-100 dark:bg-white/5" />
                  </>
                ) : (
                  <>
                    <span className="block truncate text-[13px] font-semibold text-[#0B1E3D] dark:text-white">
                      {displayName}
                    </span>
                    <span className="block truncate text-[11px] text-zinc-500 dark:text-zinc-400">
                      {displayEmail}
                    </span>
                    <span className="block text-[11px] font-semibold text-orange-500 dark:text-orange-400">
                      {role}
                    </span>
                  </>
                )}
              </span>
            )}
          </Link>
          {!isLoading && isAuthenticated && isAdmin && (
            <button
              type="button"
              onClick={() => setBackupStatus("confirm")}
              disabled={backupStatus === "loading"}
              aria-label="Database backup"
              title="Database backup"
              {...tipProps("Database backup")}
              className={`
      flex h-9 w-9 shrink-0 items-center justify-center rounded-sm
      text-zinc-500 transition-colors
      hover:bg-orange-400/10 hover:text-orange-600
      disabled:cursor-wait disabled:opacity-60
      dark:text-zinc-400 dark:hover:text-orange-300
      ${FOCUS_RING}
    `}
            >
              {backupStatus === "loading" ? (
                <LoaderCircle
                  size={18}
                  className="animate-spin text-orange-500"
                />
              ) : (
                <DatabaseBackup size={18} strokeWidth={1.9} />
              )}
            </button>
          )}
          <button
            type="button"
            onClick={handleLogout}
            aria-label="Sign out"
            {...tipProps("Sign out")}
            className={`
              flex h-9 w-9 shrink-0 items-center justify-center rounded-sm
              text-zinc-500 transition-colors dark:text-zinc-400
              hover:bg-red-50 hover:text-red-600
              dark:hover:bg-red-500/10 dark:hover:text-red-400
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400
            `}
          >
            <LogOut size={18} strokeWidth={1.9} />
          </button>
        </div>

        {/* Collapsed-rail tooltip */}
        {isCollapsed && tip && (
          <div
            role="tooltip"
            style={{ top: tip.top }}
            className="
              pointer-events-none absolute left-full z-50 ml-2 hidden -translate-y-1/2
              whitespace-nowrap rounded-sm bg-[#0B1E3D] px-2.5 py-1.5 text-xs font-medium
              text-white shadow-lg ring-1 ring-orange-400/50 lg:block
              dark:bg-zinc-900
            "
          >
            {tip.label}
          </div>
        )}
      </aside>
      <BackupModal
        status={backupStatus}
        error={backupError}
        onConfirm={handleDatabaseBackup}
        onClose={() => setBackupStatus("idle")}
      />
    </>
  );
}