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
  Tag,
  Users,
  Wand2,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

const ITEMS: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/admin", label: "概览", icon: LayoutDashboard },
  { href: "/admin/plaza", label: "广场审核", icon: Compass },
  { href: "/admin/plaza/categories", label: "广场分类", icon: Tag },
  { href: "/admin/users", label: "用户", icon: Users },
  { href: "/admin/invites", label: "邀请码", icon: KeyRound },
  { href: "/admin/providers", label: "共享 API", icon: Cpu },
  { href: "/admin/ai-prompts", label: "创作提示词", icon: Wand2 },
  { href: "/admin/settings", label: "系统设置", icon: SlidersHorizontal },
  { href: "/admin/audit", label: "审计日志", icon: ScrollText },
];

export function AdminNav() {
  const pathname = usePathname();

  // 最长前缀匹配，避免 /admin/plaza 与 /admin/plaza/categories 同时高亮。
  const activeHref = ITEMS.reduce((best, item) => {
    const matches =
      item.href === "/admin"
        ? pathname === "/admin"
        : pathname === item.href || pathname.startsWith(`${item.href}/`);
    return matches && item.href.length > best.length ? item.href : best;
  }, "");

  return (
    <nav className="-mx-1 flex gap-1 overflow-x-auto py-3">
      {ITEMS.map((item) => {
        const active = item.href === activeHref;
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
