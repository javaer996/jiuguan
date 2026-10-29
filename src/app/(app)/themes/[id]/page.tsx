import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { and, eq, isNull } from "drizzle-orm";
import { getDb } from "@/db";
import { themes } from "@/db/schema";
import { ThemeEditor } from "@/components/themes/theme-editor";
import { requireUserPage } from "@/lib/auth/page";
import { toThemeDTO } from "@/lib/content/serializers";

export const metadata: Metadata = {
  title: "编辑主题",
};

export const dynamic = "force-dynamic";

export default async function ThemeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const context = await requireUserPage(`/themes/${id}`);

  const [row] = await getDb()
    .select()
    .from(themes)
    .where(
      and(
        eq(themes.id, id),
        eq(themes.userId, context.user.id),
        isNull(themes.deletedAt),
      ),
    )
    .limit(1);

  if (!row) notFound();

  return <ThemeEditor initial={toThemeDTO(row)} />;
}
