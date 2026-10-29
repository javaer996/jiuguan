import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { and, eq, isNull } from "drizzle-orm";
import { getDb } from "@/db";
import { characters } from "@/db/schema";
import { CharacterEditor } from "@/components/characters/character-editor";
import { requireUserPage } from "@/lib/auth/page";
import { toCharacterDTO } from "@/lib/content/serializers";

export const metadata: Metadata = {
  title: "编辑角色",
};

export const dynamic = "force-dynamic";

export default async function CharacterDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const context = await requireUserPage(`/characters/${id}`);

  const [row] = await getDb()
    .select()
    .from(characters)
    .where(
      and(
        eq(characters.id, id),
        eq(characters.userId, context.user.id),
        isNull(characters.deletedAt),
      ),
    )
    .limit(1);

  if (!row) notFound();

  return <CharacterEditor initial={toCharacterDTO(row)} />;
}
