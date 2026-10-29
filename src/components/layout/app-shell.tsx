"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BookOpen,
  Braces,
  Compass,
  Layers,
  Loader2,
  LogOut,
  Menu,
  MessageSquare,
  Paintbrush,
  Palette,
  Plus,
  ScrollText,
  Settings,
  Shield,
  Users,
  Wand2,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { BrandLockup } from "@/components/brand/logo";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { apiFetch } from "@/lib/client/api";
import { cn, initials } from "@/lib/utils";

export type ShellUser = {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  role: "user" | "admin";
};

type NavItem = { href: string; label: string; icon: LucideIcon };

const NAV_GROUPS: { label: string; items: NavItem[] }[] = [
  {
    label: "酒馆",
    items: [
      { href: "/chats", label: "会话", icon: MessageSquare },
      { href: "/plaza", label: "兴趣广场", icon: Compass },
    ],
  },
  {
    label: "创作",
    items: [
      { href: "/studio", label: "创作工坊", icon: Wand2 },
      { href: "/characters", label: "角色", icon: Users },
      { href: "/worldbooks", label: "世界书", icon: BookOpen },
      { href: "/prompts", label: "提示词", icon: ScrollText },
      { href: "/styles", label: "对话样式", icon: Palette },
      { href: "/themes", label: "主题", icon: Paintbrush },
      { href: "/schemas", label: "输出格式", icon: Braces },
      { href: "/templates", label: "对话模板", icon: Layers },
    ],
  },
  {
    label: "系统",
    items: [{ href: "/settings", label: "设置", icon: Settings }],
  },
];

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-4">
      {NAV_GROUPS.map((group) => (
        <div key={group.label}>
          <p className="mb-2 px-3 text-[10px] font-medium tracking-[0.28em] text-muted-foreground/70 uppercase">
            {group.label}
          </p>
          <div className="space-y-0.5">
            {group.items.map((item) => {
              const active = isActive(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNavigate}
                  className={cn(
                    "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all",
                    active
                      ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground shadow-sm"
                      : "text-muted-foreground hover:bg-sidebar-accent/50 hover:text-foreground",
                  )}
                >
                  <item.icon
                    className={cn(
                      "size-4 transition-colors",
                      active
                        ? "text-primary"
                        : "text-muted-foreground/80 group-hover:text-foreground",
                    )}
                  />
                  {item.label}
                  {active && (
                    <span className="absolute top-1/2 right-2 size-1.5 -translate-y-1/2 rounded-full bg-primary" />
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}

function UserCard({ user }: { user: ShellUser }) {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await apiFetch("/api/auth/logout", { method: "POST" });
      toast.success("已退出酒馆");
      router.push("/login");
      router.refresh();
    } catch {
      toast.error("退出失败，请稍后重试");
      setLoggingOut(false);
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex w-full items-center gap-3 rounded-xl px-2.5 py-2.5 text-left transition-colors hover:bg-sidebar-accent/60"
        >
          <Avatar className="size-9">
            {user.avatarUrl && <AvatarImage src={user.avatarUrl} alt="" />}
            <AvatarFallback className="bg-primary/15 text-xs font-medium text-primary">
              {initials(user.displayName)}
            </AvatarFallback>
          </Avatar>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium">
              {user.displayName}
            </span>
            <span className="block truncate text-[11px] text-muted-foreground">
              @{user.username}
              {user.role === "admin" && " · 掌柜"}
            </span>
          </span>
          {loggingOut ? (
            <Loader2 className="size-3.5 animate-spin text-muted-foreground" />
          ) : (
            <Settings className="size-3.5 text-muted-foreground/60" />
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="top" align="start" className="w-56">
        <DropdownMenuLabel className="px-2 py-1.5">
          <span className="block text-sm font-medium">{user.displayName}</span>
          <span className="block text-xs font-normal text-muted-foreground">
            @{user.username}
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/settings">
            <Settings />
            个人设置
          </Link>
        </DropdownMenuItem>
        {user.role === "admin" && (
          <DropdownMenuItem asChild>
            <Link href="/admin">
              <Shield />
              管理后台
            </Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          onSelect={(event) => {
            event.preventDefault();
            void handleLogout();
          }}
        >
          <LogOut />
          退出登录
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function SidebarContent({
  user,
  onNavigate,
}: {
  user: ShellUser;
  onNavigate?: () => void;
}) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex h-20 shrink-0 items-center px-6">
        <Link href="/chats" onClick={onNavigate} aria-label="醉语酒馆">
          <BrandLockup />
        </Link>
      </div>

      <div className="px-4 pb-2">
        <Button asChild className="h-10 w-full justify-start rounded-xl shadow-glow">
          <Link href="/chats/new" onClick={onNavigate}>
            <Plus data-icon="inline-start" />
            新建对话
          </Link>
        </Button>
      </div>

      <NavLinks onNavigate={onNavigate} />

      <div className="shrink-0 border-t border-sidebar-border/70 p-3">
        <UserCard user={user} />
      </div>
    </div>
  );
}

export function AppShell({
  user,
  children,
}: {
  user: ShellUser;
  children: ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="relative min-h-dvh">
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-48 left-1/4 size-[36rem] rounded-full bg-primary/[0.06] blur-[140px]" />
        <div className="absolute right-[-12rem] bottom-[-14rem] size-[32rem] rounded-full bg-accent/[0.08] blur-[140px]" />
      </div>

      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[17rem] flex-col border-r border-sidebar-border bg-sidebar/75 backdrop-blur-xl lg:flex">
        <SidebarContent user={user} />
      </aside>

      <div className="lg:pl-[17rem]">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border/60 bg-background/75 px-4 backdrop-blur-xl lg:hidden">
          <div className="flex items-center gap-2">
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="打开导航">
                  <Menu />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[18rem] p-0">
                <SheetTitle className="sr-only">酒馆导航</SheetTitle>
                <SheetDescription className="sr-only">
                  在酒馆的不同区域之间切换
                </SheetDescription>
                <SidebarContent
                  user={user}
                  onNavigate={() => setMobileOpen(false)}
                />
              </SheetContent>
            </Sheet>
            <Link href="/chats" aria-label="醉语酒馆">
              <BrandLockup compact />
            </Link>
          </div>

          <Link
            href="/settings"
            aria-label="个人设置"
            className="rounded-full ring-2 ring-border/60"
          >
            <Avatar className="size-8">
              {user.avatarUrl && <AvatarImage src={user.avatarUrl} alt="" />}
              <AvatarFallback className="bg-primary/15 text-[10px] font-medium text-primary">
                {initials(user.displayName)}
              </AvatarFallback>
            </Avatar>
          </Link>
        </header>

        <main className="relative min-h-[calc(100dvh-4rem)] lg:min-h-dvh">
          {children}
        </main>
      </div>
    </div>
  );
}
