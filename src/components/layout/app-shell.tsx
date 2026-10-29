"use client";

import {
  useMemo,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type ReactNode,
} from "react";
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
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  ScrollText,
  Settings,
  Shield,
  Users,
  Wand2,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { BrandLockup, TavernMark } from "@/components/brand/logo";
import {
  ShellThemeContext,
  type ShellTheme,
} from "@/components/layout/shell-theme";
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

const SIDEBAR_STORAGE_KEY = "zy-sidebar-collapsed";
const SIDEBAR_CHANGE_EVENT = "zy-sidebar-change";

function subscribeSidebar(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(SIDEBAR_CHANGE_EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(SIDEBAR_CHANGE_EVENT, callback);
  };
}

function getCollapsedSnapshot() {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(SIDEBAR_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

function getCollapsedServerSnapshot() {
  return false;
}

function setCollapsedPreference(collapsed: boolean) {
  try {
    window.localStorage.setItem(
      SIDEBAR_STORAGE_KEY,
      collapsed ? "1" : "0",
    );
  } catch {
    // 隐私模式下 localStorage 可能不可用，保持当前会话内生效。
  }
  window.dispatchEvent(new Event(SIDEBAR_CHANGE_EVENT));
}

/**
 * 把聊天主题变量映射到侧栏变量。
 * Tailwind 的 sidebar / background / muted 等工具类都引用 CSS 变量，
 * 因此在容器上覆盖变量即可让整个侧栏跟随聊天主题。
 */
function buildShellStyle(theme: ShellTheme | null): CSSProperties {
  if (!theme) return {};

  const tokens = theme.tokens;
  const style: Record<string, string> = { ...tokens };
  const background = tokens["--background"];
  const foreground = tokens["--foreground"];
  const secondary = tokens["--secondary"] ?? tokens["--card"];
  const border = tokens["--border"];
  const primary = tokens["--primary"];
  const primaryForeground = tokens["--primary-foreground"];
  const ring = tokens["--ring"];

  if (background) {
    style["--sidebar"] = background;
    style.backgroundColor = background;
  }
  if (foreground) style["--sidebar-foreground"] = foreground;
  if (secondary) {
    style["--sidebar-accent"] = secondary;
    style["--sidebar-accent-foreground"] = foreground ?? secondary;
  }
  if (primary) style["--sidebar-primary"] = primary;
  if (primaryForeground) {
    style["--sidebar-primary-foreground"] = primaryForeground;
  }
  if (border) style["--sidebar-border"] = border;
  if (ring) style["--sidebar-ring"] = ring;

  if (theme.backgroundUrl) {
    const scrim = background
      ? `color-mix(in srgb, ${background} 88%, transparent)`
      : "transparent";
    style.backgroundImage = `linear-gradient(${scrim}, ${scrim}), url("${theme.backgroundUrl}")`;
    style.backgroundSize = "cover";
    style.backgroundPosition = "center";
  }

  return style as CSSProperties;
}

function NavLinks({
  onNavigate,
  collapsed = false,
}: {
  onNavigate?: () => void;
  collapsed?: boolean;
}) {
  const pathname = usePathname();

  return (
    <nav
      className={cn(
        "flex-1 space-y-6 overflow-y-auto py-4",
        collapsed ? "px-2" : "px-3",
      )}
    >
      {NAV_GROUPS.map((group) => (
        <div key={group.label}>
          {!collapsed && (
            <p className="mb-2 px-3 text-[10px] font-medium tracking-[0.28em] text-muted-foreground/70 uppercase">
              {group.label}
            </p>
          )}
          <div className="space-y-0.5">
            {group.items.map((item) => {
              const active = isActive(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNavigate}
                  title={collapsed ? item.label : undefined}
                  aria-label={item.label}
                  className={cn(
                    "group relative flex items-center rounded-xl text-sm transition-all",
                    collapsed
                      ? "justify-center px-0 py-2.5"
                      : "gap-3 px-3 py-2.5",
                    active
                      ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground shadow-sm"
                      : "text-muted-foreground hover:bg-sidebar-accent/50 hover:text-foreground",
                  )}
                >
                  <item.icon
                    className={cn(
                      "size-4 shrink-0 transition-colors",
                      active
                        ? "text-primary"
                        : "text-muted-foreground/80 group-hover:text-foreground",
                    )}
                  />
                  {!collapsed && item.label}
                  {active && !collapsed && (
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

function UserCard({
  user,
  collapsed = false,
}: {
  user: ShellUser;
  collapsed?: boolean;
}) {
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
          title={collapsed ? `${user.displayName} · @${user.username}` : undefined}
          aria-label={collapsed ? "打开用户菜单" : undefined}
          className={cn(
            "flex w-full items-center rounded-xl text-left transition-colors hover:bg-sidebar-accent/60",
            collapsed ? "justify-center px-0 py-2" : "gap-3 px-2.5 py-2.5",
          )}
        >
          <Avatar className="size-9">
            {user.avatarUrl && <AvatarImage src={user.avatarUrl} alt="" />}
            <AvatarFallback className="bg-primary/15 text-xs font-medium text-primary">
              {initials(user.displayName)}
            </AvatarFallback>
          </Avatar>
          {!collapsed && (
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium">
                {user.displayName}
              </span>
              <span className="block truncate text-[11px] text-muted-foreground">
                @{user.username}
                {user.role === "admin" && " · 掌柜"}
              </span>
            </span>
          )}
          {!collapsed &&
            (loggingOut ? (
              <Loader2 className="size-3.5 animate-spin text-muted-foreground" />
            ) : (
              <Settings className="size-3.5 text-muted-foreground/60" />
            ))}
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
  collapsed = false,
  onToggleCollapse,
}: {
  user: ShellUser;
  onNavigate?: () => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}) {
  return (
    <div className="flex h-full flex-col">
      <div
        className={cn(
          "flex h-20 shrink-0 items-center",
          collapsed ? "justify-center px-2" : "px-6",
        )}
      >
        <Link
          href="/chats"
          onClick={onNavigate}
          aria-label="醉语酒馆"
          title={collapsed ? "醉语酒馆" : undefined}
        >
          {collapsed ? <TavernMark /> : <BrandLockup />}
        </Link>
      </div>

      <div className={cn("pb-2", collapsed ? "px-2" : "px-4")}>
        <Button
          asChild
          className={cn(
            "h-10 rounded-xl shadow-glow",
            collapsed
              ? "mx-auto flex w-11 justify-center px-0"
              : "w-full justify-start",
          )}
        >
          <Link
            href="/chats/new"
            onClick={onNavigate}
            aria-label="新建对话"
            title={collapsed ? "新建对话" : undefined}
          >
            <Plus data-icon={collapsed ? undefined : "inline-start"} />
            {!collapsed && "新建对话"}
          </Link>
        </Button>
      </div>

      <NavLinks onNavigate={onNavigate} collapsed={collapsed} />

      <div className="shrink-0 border-t border-sidebar-border/70 p-3">
        {onToggleCollapse && (
          <div className="mb-2 hidden lg:block">
            <Button
              type="button"
              variant="ghost"
              size={collapsed ? "icon" : "sm"}
              className={cn(
                "rounded-lg text-muted-foreground",
                collapsed
                  ? "mx-auto flex size-9"
                  : "w-full justify-start gap-2 text-xs",
              )}
              onClick={onToggleCollapse}
              title={collapsed ? "展开侧栏" : "收起侧栏"}
              aria-label={collapsed ? "展开侧栏" : "收起侧栏"}
            >
              {collapsed ? (
                <PanelLeftOpen />
              ) : (
                <>
                  <PanelLeftClose />
                  收起侧栏
                </>
              )}
            </Button>
          </div>
        )}
        <UserCard user={user} collapsed={collapsed} />
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
  const collapsed = useSyncExternalStore(
    subscribeSidebar,
    getCollapsedSnapshot,
    getCollapsedServerSnapshot,
  );
  const [shellTheme, setShellTheme] = useState<ShellTheme | null>(null);
  const shellStyle = useMemo(() => buildShellStyle(shellTheme), [shellTheme]);
  const contextValue = useMemo(
    () => ({ theme: shellTheme, setTheme: setShellTheme }),
    [shellTheme],
  );

  return (
    <ShellThemeContext.Provider value={contextValue}>
      <div className="relative min-h-dvh">
        <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
          <div className="absolute -top-48 left-1/4 size-[36rem] rounded-full bg-primary/[0.06] blur-[140px]" />
          <div className="absolute right-[-12rem] bottom-[-14rem] size-[32rem] rounded-full bg-accent/[0.08] blur-[140px]" />
        </div>

        <aside
          className={cn(
            "fixed inset-y-0 left-0 z-40 hidden flex-col border-r border-sidebar-border bg-sidebar/75 backdrop-blur-xl transition-[width] duration-200 lg:flex",
            collapsed ? "w-[4.5rem]" : "w-[17rem]",
          )}
          style={shellStyle}
        >
          <SidebarContent
            user={user}
            collapsed={collapsed}
            onToggleCollapse={() =>
              setCollapsedPreference(!collapsed)
            }
          />
        </aside>

        <div
          className={cn(
            "transition-[padding] duration-200",
            collapsed ? "lg:pl-[4.5rem]" : "lg:pl-[17rem]",
          )}
        >
          <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border/60 bg-background/75 px-4 backdrop-blur-xl lg:hidden">
            <div className="flex items-center gap-2">
              <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" aria-label="打开导航">
                    <Menu />
                  </Button>
                </SheetTrigger>
                <SheetContent
                  side="left"
                  className="w-[18rem] p-0"
                  style={shellStyle}
                >
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
    </ShellThemeContext.Provider>
  );
}
