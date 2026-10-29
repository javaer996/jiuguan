"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Compass,
  Cpu,
  KeyRound,
  LayoutDashboard,
  ScrollText,
  SlidersHorizontal,
  Users,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

const ITEMS: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/admin", label: "概览", icon: LayoutDashboard },
  { href: "/admin/plaza", label: "广场审核", icon: Compass },
  { href: "/admin/users", label: "用户", icon: Users },
  { href: "/admin/invites", label: "邀请码", icon: KeyRound },
  { href: "/admin/providers", label: "共享 API", icon: Cpu },
  { href: "/admin/settings", label: "系统设置", icon: SlidersHorizontal },
  { href: "/admin/audit", label: "审计日志", icon: ScrollText },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="-mx-1 flex gap-1 overflow-x-auto py-3">
      {ITEMS.map((item) => {
        const active =
          item.href === "/admin"
            ? pathname === "/admin"
            : pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "inline-flex shrink-0 items-center gap-2 rounded-full px-3.5 py-2 text-xs transition-colors",
              active
                ? "bg-primary/12 font-medium text-primary"
                : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground",
            )}
          >
            <item.icon className="size-3.5" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
