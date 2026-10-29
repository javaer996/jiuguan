import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { and, desc, eq, isNull } from "drizzle-orm";
import {
  Archive,
  ChevronRight,
  Compass,
  MessageSquare,
  Pin,
  Plus,
  Sparkles,
} from "lucide-react";
import { getDb } from "@/db";
import { characters, chatSessions } from "@/db/schema";
import { EmptyState } from "@/components/common/empty-state";
import { PageHeader } from "@/components/common/page-header";
import { SessionActions } from "@/components/chat/session-actions";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth/session";
import { formatRelativeTime, initials } from "@/lib/utils";

export const metadata: Metadata = {
  title: "会话",
};

export const dynamic = "force-dynamic";

type ChatsPageProps = {
  searchParams: Promise<{ archived?: string }>;
};

export default async function ChatsPage({ searchParams }: ChatsPageProps) {
  const context = await getCurrentUser();
  if (!context) redirect("/login");

  const { archived: archivedParam } = await searchParams;
  const showArchived = archivedParam === "1";

  const sessions = await getDb()
    .select({
      id: chatSessions.id,
      title: chatSessions.title,
      pinned: chatSessions.pinned,
      messageCount: chatSessions.messageCount,
      lastMessageAt: chatSessions.lastMessageAt,
      updatedAt: chatSessions.updatedAt,
      characterName: characters.name,
      characterAvatar: characters.avatarUrl,
    })
    .from(chatSessions)
    .leftJoin(characters, eq(chatSessions.characterId, characters.id))
    .where(
      and(
        eq(chatSessions.userId, context.user.id),
        isNull(chatSessions.deletedAt),
        eq(chatSessions.archived, showArchived),
      ),
    )
    .orderBy(desc(chatSessions.pinned), desc(chatSessions.updatedAt))
    .limit(60);

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-7 sm:px-6 lg:px-10 lg:py-10">
      <PageHeader
        eyebrow="Your stories"
        title="会话"
        description="每一次推门，都是一段只属于你的故事。"
        actions={
          <>
            <Button variant="outline" asChild className="rounded-xl">
              <Link href="/plaza">
                <Compass data-icon="inline-start" />
                兴趣广场
              </Link>
            </Button>
            <Button asChild className="rounded-xl shadow-glow">
              <Link href="/chats/new">
                <Plus data-icon="inline-start" />
                开始新故事
              </Link>
            </Button>
          </>
        }
      />

      <div className="mt-8 space-y-2.5">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <p className="text-xs tracking-[0.2em] text-muted-foreground uppercase">
              {showArchived ? "已归档" : "最近的故事"}
            </p>
            <Link
              href={showArchived ? "/chats" : "/chats?archived=1"}
              className="inline-flex items-center gap-1 rounded-full border border-border/60 px-2.5 py-1 text-[11px] text-muted-foreground transition-colors hover:border-primary/30 hover:text-primary"
            >
              <Archive className="size-3" />
              {showArchived ? "返回会话" : "查看归档"}
            </Link>
          </div>
          <span className="text-xs text-muted-foreground">
            共 {sessions.length} 段
          </span>
        </div>

        {sessions.length === 0 ? (
          showArchived ? (
            <EmptyState
              icon={Archive}
              title="归档里还是空的"
              description="暂时收起的对话会出现在这里，随时可以恢复。"
              className="mt-4"
            />
          ) : (
            <EmptyState
              icon={MessageSquare}
              title="炉火已经点好，故事还没开始"
              description="去兴趣广场挑一个情景，或用你自己的角色，在炉火旁坐下，写下第一句话。"
              className="mt-4"
              action={
                <div className="flex flex-wrap items-center justify-center gap-3">
                  <Button asChild className="rounded-xl shadow-glow">
                    <Link href="/plaza">
                      <Sparkles data-icon="inline-start" />
                      逛逛兴趣广场
                    </Link>
                  </Button>
                  <Button variant="outline" asChild className="rounded-xl">
                    <Link href="/chats/new">从角色开始</Link>
                  </Button>
                </div>
              }
            />
          )
        ) : (
          sessions.map((session) => (
            <div
              key={session.id}
              className="group relative flex items-center gap-4 rounded-2xl border border-border/60 bg-card/35 p-3.5 transition-all hover:border-primary/30 hover:bg-card/70 sm:p-4"
            >
              <Link
                href={`/chats/${session.id}`}
                aria-label={`打开对话 ${session.title}`}
                className="absolute inset-0 rounded-2xl focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              />
              <Avatar className="pointer-events-none size-12 shrink-0 rounded-2xl">
                {session.characterAvatar && (
                  <AvatarImage src={session.characterAvatar} alt="" />
                )}
                <AvatarFallback className="rounded-2xl bg-primary/10 text-sm font-medium text-primary">
                  {initials(session.characterName ?? session.title)}
                </AvatarFallback>
              </Avatar>

              <div className="pointer-events-none min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h2 className="truncate text-sm font-medium sm:text-[15px]">
                    {session.title}
                  </h2>
                  {session.pinned && (
                    <Pin className="size-3 shrink-0 rotate-45 text-primary" />
                  )}
                </div>
                <p className="mt-1 truncate text-xs text-muted-foreground">
                  {session.characterName ? `${session.characterName} · ` : ""}
                  {session.messageCount} 条消息
                </p>
              </div>

              <span className="pointer-events-none hidden shrink-0 text-xs text-muted-foreground sm:block">
                {formatRelativeTime(session.lastMessageAt ?? session.updatedAt)}
              </span>
              <ChevronRight className="pointer-events-none size-4 shrink-0 text-muted-foreground/50 transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
              <div className="relative z-10 shrink-0">
                <SessionActions
                  sessionId={session.id}
                  title={session.title}
                  pinned={session.pinned}
                  archived={showArchived}
                />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
