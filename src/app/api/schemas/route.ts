import { and, desc, eq, isNull } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";
import { getDb } from "@/db";
import { outputSchemas } from "@/db/schema";
import { handleApiError, jsonOk, readJson } from "@/lib/api";
import { assertSameOrigin } from "@/lib/auth/csrf";
import { requireUser } from "@/lib/auth/guard";
import { DEFAULT_OUTPUT_SCHEMA } from "@/lib/content/defaults";
import { parseLimit } from "@/lib/content/query";
import { toOutputSchemaDTO } from "@/lib/content/serializers";
import { assertValidJsonSchema } from "@/lib/schema/validate";
import { outputSchemaInputSchema } from "@/lib/validation/content";

export async function GET(request: Request) {
  try {
    const context = await requireUser();
    const url = new URL(request.url);
    const limit = parseLimit(url.searchParams.get("limit"), 100, 200);

    const rows = await getDb()
      .select()
      .from(outputSchemas)
      .where(
        and(
          eq(outputSchemas.userId, context.user.id),
          isNull(outputSchemas.deletedAt),
        ),
      )
      .orderBy(desc(outputSchemas.isDefault), desc(outputSchemas.updatedAt))
      .limit(limit);

    return jsonOk({ schemas: rows.map(toOutputSchemaDTO) });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const context = await requireUser();
    const input = await readJson(request, outputSchemaInputSchema);

    const schema = input.schema ?? DEFAULT_OUTPUT_SCHEMA;
    assertValidJsonSchema(schema);

    const id = uuidv7();
    const isDefault = input.isDefault ?? false;

    await getDb().transaction(async (tx) => {
      if (isDefault) {
        await tx
          .update(outputSchemas)
          .set({ isDefault: false })
          .where(eq(outputSchemas.userId, context.user.id));
      }

      await tx.insert(outputSchemas).values({
        id,
        userId: context.user.id,
        name: input.name,
        description: input.description ?? null,
        schema,
        sample: input.sample ?? null,
        mode: input.mode ?? "json_object",
        strict: input.strict ?? false,
        isDefault,
      });
    });

    const [row] = await getDb()
      .select()
      .from(outputSchemas)
      .where(eq(outputSchemas.id, id))
      .limit(1);

    if (!row) throw new Error("输出格式创建失败");

    return jsonOk({ schema: toOutputSchemaDTO(row) }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
