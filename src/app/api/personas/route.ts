import { and, asc, desc, eq, isNull } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";
import { getDb } from "@/db";
import { personas } from "@/db/schema";
import { handleApiError, jsonOk, readJson } from "@/lib/api";
import { assertSameOrigin } from "@/lib/auth/csrf";
import { requireUser } from "@/lib/auth/guard";
import { personaInputSchema } from "@/lib/validation/content";

/** 身份描述里的 {{user}} 直接落成身份名称，避免在设置界面显示占位符。 */
function normalizeDescription(
  name: string,
  description?: string | null,
) {
  const trimmed = description?.trim();
  if (!trimmed) return null;
  return trimmed.replace(/\{\{\s*user\s*\}\}/gi, name);
}

export async function GET() {
  try {
    const context = await requireUser();
    const rows = await getDb()
      .select({
        id: personas.id,
        name: personas.name,
        description: personas.description,
        avatarUrl: personas.avatarUrl,
        isDefault: personas.isDefault,
      })
      .from(personas)
      .where(
        and(
          eq(personas.userId, context.user.id),
          isNull(personas.deletedAt),
        ),
      )
      .orderBy(desc(personas.isDefault), asc(personas.name));

    return jsonOk({ personas: rows });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const context = await requireUser();
    const input = await readJson(request, personaInputSchema);
    const isDefault = input.isDefault === true;
    const id = uuidv7();
    const db = getDb();

    await db.transaction(async (tx) => {
      if (isDefault) {
        await tx
          .update(personas)
          .set({ isDefault: false })
          .where(
            and(
              eq(personas.userId, context.user.id),
              isNull(personas.deletedAt),
            ),
          );
      }

      await tx.insert(personas).values({
        id,
        userId: context.user.id,
        name: input.name,
        avatarUrl: input.avatarUrl ?? null,
        description: normalizeDescription(input.name, input.description),
        isDefault,
      });
    });

    const [row] = await db
      .select()
      .from(personas)
      .where(eq(personas.id, id))
      .limit(1);

    if (!row) throw new Error("身份创建失败");

    return jsonOk(
      {
        persona: {
          id: row.id,
          name: row.name,
          description: row.description,
          avatarUrl: row.avatarUrl,
          isDefault: row.isDefault,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    return handleApiError(error);
  }
}
