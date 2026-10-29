import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { and, eq, isNull } from "drizzle-orm";
import { getDb } from "@/db";
import { outputSchemas } from "@/db/schema";
import { SchemaEditor } from "@/components/schemas/schema-editor";
import { requireUserPage } from "@/lib/auth/page";
import { toOutputSchemaDTO } from "@/lib/content/serializers";

export const metadata: Metadata = {
  title: "编辑输出格式",
};

export const dynamic = "force-dynamic";

export default async function SchemaDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const context = await requireUserPage(`/schemas/${id}`);

  const [row] = await getDb()
    .select()
    .from(outputSchemas)
    .where(
      and(
        eq(outputSchemas.id, id),
        eq(outputSchemas.userId, context.user.id),
        isNull(outputSchemas.deletedAt),
      ),
    )
    .limit(1);

  if (!row) notFound();

  return <SchemaEditor initial={toOutputSchemaDTO(row)} />;
}
