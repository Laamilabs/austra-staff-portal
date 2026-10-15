import {
  LayoutDashboard,
  Users,
  UserCheck,
  GraduationCap,
  Building2,
  CalendarCheck,
  FileText,
  UserPlus,
  BookOpen,
  BookMarked,
  UserCog,
  Library,
  Wallet,
} from "lucide-react";

export interface PortalNavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  roles?: string[];
}

export const portalNav: PortalNavItem[] = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "Students",
    href: "/students",
    icon: Users,
  },
  {
    label: "Register Student",
    href: "/students/new",
    icon: UserPlus,
  },
  {
    label: "Applications",
    href: "/applications",
    icon: CalendarCheck,
  },
  {
    label: "Academics",
    href: "/results",
    icon: GraduationCap,
  },
  {
    label: "Courses",
    href: "/courses",
    icon: BookOpen,
  },
  {
    label: "Units",
    href: "/units",
    icon: BookMarked,
  },
  {
    label: "Library",
    href: "/resources",
    icon: Library,
  },
  {
    label: "Faculty",
    href: "/faculty",
    icon: UserCheck,
  },
  {
    label: "Departments",
    href: "/departments",
    icon: Building2,
  },
  {
    label: "Finance",
    href: "/finance",
    icon: Wallet,
  },
  {
    label: "User Management",
    href: "/users",
    icon: UserCog,
    roles: ["admin", "superadmin"],
  },
  {
    label: "Documents",
    href: "/documents",
    icon: FileText,
  },
];