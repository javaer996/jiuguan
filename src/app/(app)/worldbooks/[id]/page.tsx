import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { and, asc, eq, isNull } from "drizzle-orm";
import { getDb } from "@/db";
import { worldbookEntries, worldbooks } from "@/db/schema";
import { WorldbookEditor } from "@/components/worldbooks/worldbook-editor";
import { requireUserPage } from "@/lib/auth/page";
import {
  toWorldbookDTO,
  toWorldbookEntryDTO,
} from "@/lib/content/serializers";

export const metadata: Metadata = {
  title: "编辑世界书",
};

export const dynamic = "force-dynamic";

export default async function WorldbookDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const context = await requireUserPage(`/worldbooks/${id}`);

  const [book] = await getDb()
    .select()
    .from(worldbooks)
    .where(
      and(
        eq(worldbooks.id, id),
        eq(worldbooks.userId, context.user.id),
        isNull(worldbooks.deletedAt),
      ),
    )
    .limit(1);

  if (!book) notFound();

  const entries = await getDb()
    .select()
    .from(worldbookEntries)
    .where(eq(worldbookEntries.worldbookId, id))
    .orderBy(asc(worldbookEntries.sortOrder), asc(worldbookEntries.name));

  return (
    <WorldbookEditor
      initial={{
        ...toWorldbookDTO(book, entries.length),
        entries: entries.map(toWorldbookEntryDTO),
      }}
    />
  );
}
