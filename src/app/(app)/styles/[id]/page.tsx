import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { and, eq, isNull } from "drizzle-orm";
import { getDb } from "@/db";
import { chatStyles } from "@/db/schema";
import { StyleEditor } from "@/components/styles/style-editor";
import { requireUserPage } from "@/lib/auth/page";
import { toChatStyleDTO } from "@/lib/content/serializers";

export const metadata: Metadata = {
  title: "编辑对话样式",
};

export const dynamic = "force-dynamic";

export default async function StyleDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const context = await requireUserPage(`/styles/${id}`);

  const [row] = await getDb()
    .select()
    .from(chatStyles)
    .where(
      and(
        eq(chatStyles.id, id),
        eq(chatStyles.userId, context.user.id),
        isNull(chatStyles.deletedAt),
      ),
    )
    .limit(1);

  if (!row) notFound();

  return <StyleEditor initial={toChatStyleDTO(row)} />;
}
