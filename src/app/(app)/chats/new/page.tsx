import type { Metadata } from "next";
import Link from "next/link";
import { and, desc, eq, isNull } from "drizzle-orm";
import { Layers, Plus, Sparkles, Users } from "lucide-react";
import { getDb } from "@/db";
import { characters, chatTemplates } from "@/db/schema";
import { StartChatButton } from "@/components/chat/start-chat-button";
import { EmptyState } from "@/components/common/empty-state";
import { PageHeader } from "@/components/common/page-header";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { requireUserPage } from "@/lib/auth/page";
import { initials } from "@/lib/utils";

export const metadata: Metadata = {
  title: "新建对话",
};

export const dynamic = "force-dynamic";

export default async function NewChatPage() {
  const context = await requireUserPage("/chats/new");
  const db = getDb();

  const [characterRows, templateRows] = await Promise.all([
    db
      .select()
      .from(characters)
      .where(
        and(
          eq(characters.userId, context.user.id),
          isNull(characters.deletedAt),
        ),
      )
      .orderBy(desc(characters.updatedAt))
      .limit(24),
    db
      .select({
        template: chatTemplates,
        characterName: characters.name,
      })
      .from(chatTemplates)
      .leftJoin(characters, eq(characters.id, chatTemplates.characterId))
      .where(
        and(
          eq(chatTemplates.userId, context.user.id),
          isNull(chatTemplates.deletedAt),
        ),
      )
      .orderBy(desc(chatTemplates.updatedAt))
      .limit(12),
  ]);

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-7 sm:px-6 lg:px-10 lg:py-10">
      <PageHeader
        eyebrow="New story"
        title="新建对话"
        description="从一位角色或一套模板开始。角色决定语气，模板会把世界书、提示词与样式一起带上。"
        actions={
          <Button asChild variant="outline" className="rounded-xl">
            <Link href="/characters/new">
              <Plus data-icon="inline-start" />
              新建角色
            </Link>
          </Button>
        }
      />

      <section className="mt-8">
        <div className="flex items-center gap-2">
          <Users className="size-4 text-primary" />
          <h2 className="font-display text-lg font-medium">从角色开始</h2>
        </div>

        {characterRows.length === 0 ? (
          <EmptyState
            icon={Users}
            title="还没有角色"
            description="先创建一位角色，让故事有一个声音。"
            className="mt-4"
            action={
              <Button asChild className="rounded-xl">
                <Link href="/characters/new">创建角色</Link>
              </Button>
            }
          />
        ) : (
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {characterRows.map((character) => (
              <div
                key={character.id}
                className="flex flex-col rounded-2xl border border-border/60 bg-card/35 p-4 transition-colors hover:border-primary/30"
              >
                <div className="flex items-center gap-3">
                  <Avatar className="size-11 rounded-xl">
                    {character.avatarUrl && (
                      <AvatarImage src={character.avatarUrl} alt="" />
                    )}
                    <AvatarFallback className="rounded-xl bg-primary/12 font-display text-sm text-primary">
                      {initials(character.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="truncate font-display text-sm font-medium">
                      {character.name}
                    </p>
                    <p className="truncate text-[11px] text-muted-foreground">
                      {character.tagline || "还没有写下简介"}
                    </p>
                  </div>
                </div>
                <StartChatButton
                  characterId={character.id}
                  variant="outline"
                  size="sm"
                  className="mt-4 w-full rounded-lg"
                >
                  开始对话
                </StartChatButton>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="mt-10">
        <div className="flex items-center gap-2">
          <Layers className="size-4 text-primary" />
          <h2 className="font-display text-lg font-medium">从模板开始</h2>
        </div>

        {templateRows.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-dashed border-border/70 bg-card/25 px-5 py-8 text-center">
            <p className="text-sm text-muted-foreground">
              还没有对话模板。把角色、世界书与样式打包后，就能在这里一键开演。
            </p>
            <Button asChild variant="outline" size="sm" className="mt-4 rounded-lg">
              <Link href="/templates/new">
                <Sparkles data-icon="inline-start" />
                创建模板
              </Link>
            </Button>
          </div>
        ) : (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {templateRows.map(({ template, characterName }) => (
              <div
                key={template.id}
                className="flex flex-col rounded-2xl border border-border/60 bg-card/35 p-4 transition-colors hover:border-primary/30"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-display text-sm font-medium">
                      {template.name}
                    </p>
                    <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                      {characterName ?? "未绑定角色"}
                      {template.worldbookIds?.length
                        ? ` · ${template.worldbookIds.length} 本世界书`
                        : ""}
                    </p>
                  </div>
                  <Sparkles className="size-4 shrink-0 text-primary/50" />
                </div>
                <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                  {template.description || "一套即开即用的情景。"}
                </p>
                <StartChatButton
                  templateId={template.id}
                  variant="outline"
                  size="sm"
                  className="mt-4 w-full rounded-lg"
                >
                  使用这套模板
                </StartChatButton>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
