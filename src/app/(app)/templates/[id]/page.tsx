import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { and, eq, isNull } from "drizzle-orm";
import { getDb } from "@/db";
import { characters, chatTemplates } from "@/db/schema";
import { TemplateEditor } from "@/components/templates/template-editor";
import { requireUserPage } from "@/lib/auth/page";
import { toChatTemplateDTO } from "@/lib/content/serializers";
import { loadTemplateOptions } from "@/lib/content/template-options";

export const metadata: Metadata = {
  title: "编辑对话模板",
};

export const dynamic = "force-dynamic";

export default async function TemplateDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const context = await requireUserPage(`/templates/${id}`);

  const [row] = await getDb()
    .select({
      template: chatTemplates,
      characterName: characters.name,
      characterAvatar: characters.avatarUrl,
    })
    .from(chatTemplates)
    .leftJoin(characters, eq(characters.id, chatTemplates.characterId))
    .where(
      and(
        eq(chatTemplates.id, id),
        eq(chatTemplates.userId, context.user.id),
        isNull(chatTemplates.deletedAt),
      ),
    )
    .limit(1);

  if (!row) notFound();

  const options = await loadTemplateOptions(context.user.id);

  return (
    <TemplateEditor
      initial={toChatTemplateDTO(row.template, {
        characterName: row.characterName,
        characterAvatar: row.characterAvatar,
      })}
      options={options}
    />
  );
}
