import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { and, eq, isNull, sql } from "drizzle-orm";
import {
  ArrowRight,
  Compass,
  Cpu,
  KeyRound,
  ScrollText,
  Shield,
  SlidersHorizontal,
  Users,
  Wand2,
} from "lucide-react";
import { getDb } from "@/db";
import { inviteCodes, plazaTemplates, users } from "@/db/schema";
import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import { requireUserPage } from "@/lib/auth/page";

export const metadata: Metadata = {
  title: "管理后台",
};

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const context = await requireUserPage("/admin");
  if (context.user.role !== "admin") redirect("/chats");

  const db = getDb();
  const [pendingRow, userRow, inviteRow] = await Promise.all([
    db
      .select({ total: sql<number>`count(*)`.mapWith(Number) })
      .from(plazaTemplates)
      .where(
        and(
          eq(plazaTemplates.status, "pending"),
          isNull(plazaTemplates.deletedAt),
        ),
      ),
    db
      .select({ total: sql<number>`count(*)`.mapWith(Number) })
      .from(users)
      .where(isNull(users.deletedAt)),
    db
      .select({ total: sql<number>`count(*)`.mapWith(Number) })
      .from(inviteCodes)
      .where(eq(inviteCodes.disabled, false)),
  ]);

  const pending = pendingRow[0]?.total ?? 0;
  const userCount = userRow[0]?.total ?? 0;
  const inviteCount = inviteRow[0]?.total ?? 0;

  const cards = [
    {
      title: "广场审核",
      description: "审核投稿、设置推荐与下架内容。",
      href: "/admin/plaza",
      icon: Compass,
      stat: `${pending} 份待审核`,
      ready: true,
    },
    {
      title: "用户管理",
      description: "查看用户、调整状态与角色权限。",
      href: "/admin/users",
      icon: Users,
      stat: `${userCount} 位注册用户`,
      ready: true,
    },
    {
      title: "邀请码",
      description: "生成、停用与追踪邀请码使用情况。",
      href: "/admin/invites",
      icon: KeyRound,
      stat: `${inviteCount} 个可用邀请码`,
      ready: true,
    },
    {
      title: "共享 API",
      description: "把自己的供应商授权给指定用户使用。",
      href: "/admin/providers",
      icon: Cpu,
      stat: "管理共享与授权",
      ready: true,
    },
    {
      title: "创作提示词",
      description: "查看并调整 AI 生成角色卡、世界书等使用的默认提示词。",
      href: "/admin/ai-prompts",
      icon: Wand2,
      stat: "仅管理员可见",
      ready: true,
    },
    {
      title: "系统设置",
      description: "控制注册开关、邀请码要求与站点公告。",
      href: "/admin/settings",
      icon: SlidersHorizontal,
      stat: "注册与公告",
      ready: true,
    },
    {
      title: "审计日志",
      description: "回溯管理员对用户、邀请码与内容的操作。",
      href: "/admin/audit",
      icon: ScrollText,
      stat: "最近 150 条",
      ready: true,
    },
  ];

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-7 sm:px-6 lg:px-10 lg:py-10">
      <PageHeader
        eyebrow="Admin · 掌柜的账房"
        title="管理后台"
        description="审核广场投稿、打理用户与共享资源。酒馆的灯油与账本都在这里。"
        actions={
          <Button variant="outline" asChild className="rounded-xl">
            <Link href="/plaza">
              <Compass data-icon="inline-start" />
              去广场看看
            </Link>
          </Button>
        }
      />

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {cards.map((card) => (
          <div
            key={card.title}
            className="relative overflow-hidden rounded-2xl border border-border/60 bg-card/30 p-5 transition-colors hover:border-primary/30"
          >
            <div className="pointer-events-none absolute -top-12 -right-8 size-32 rounded-full bg-primary/[0.06] blur-2xl" />
            <div className="relative flex items-start gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
                <card.icon className="size-5" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h2 className="font-display text-lg font-medium">
                    {card.title}
                  </h2>
                  {!card.ready && (
                    <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] text-muted-foreground">
                      即将开放
                    </span>
                  )}
                </div>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  {card.description}
                </p>
                <p className="mt-3 text-[11px] text-primary/80">{card.stat}</p>
              </div>
            </div>

            <div className="relative mt-4 flex justify-end">
              {card.ready ? (
                <Button size="sm" asChild className="rounded-lg">
                  <Link href={card.href}>
                    进入
                    <ArrowRight data-icon="inline-end" />
                  </Link>
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="ghost"
                  disabled
                  className="rounded-lg"
                >
                  筹备中
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 flex items-start gap-3 rounded-2xl border border-border/60 bg-card/20 p-4 text-xs leading-relaxed text-muted-foreground">
        <Shield className="mt-0.5 size-4 shrink-0 text-primary" />
        <p>
          管理操作会写入审计日志，记录操作人、时间与来源 IP。删除用户会立即撤销其所有登录会话，请谨慎操作。
        </p>
      </div>
    </div>
  );
}
