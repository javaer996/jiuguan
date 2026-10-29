import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { and, eq, isNull } from "drizzle-orm";
import { getDb } from "@/db";
import { promptPresets } from "@/db/schema";
import { PromptEditor } from "@/components/prompts/prompt-editor";
import { requireUserPage } from "@/lib/auth/page";
import { toPromptPresetDTO } from "@/lib/content/serializers";

export const metadata: Metadata = {
  title: "编辑提示词预设",
};

export const dynamic = "force-dynamic";

export default async function PromptDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const context = await requireUserPage(`/prompts/${id}`);

  const [row] = await getDb()
    .select()
    .from(promptPresets)
    .where(
      and(
        eq(promptPresets.id, id),
        eq(promptPresets.userId, context.user.id),
        isNull(promptPresets.deletedAt),
      ),
    )
    .limit(1);

  if (!row) notFound();

  return <PromptEditor initial={toPromptPresetDTO(row)} />;
}
