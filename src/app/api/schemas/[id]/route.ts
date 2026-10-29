import { and, eq, isNull } from "drizzle-orm";
import { getDb } from "@/db";
import { outputSchemas } from "@/db/schema";
import { ApiError, handleApiError, jsonOk, readJson } from "@/lib/api";
import { assertSameOrigin } from "@/lib/auth/csrf";
import { requireUser } from "@/lib/auth/guard";
import { toOutputSchemaDTO } from "@/lib/content/serializers";
import { assertValidJsonSchema } from "@/lib/schema/validate";
import { outputSchemaInputSchema } from "@/lib/validation/content";

type RouteParams = { params: Promise<{ id: string }> };

async function findOwned(id: string, userId: string) {
  const [row] = await getDb()
    .select()
    .from(outputSchemas)
    .where(
      and(
        eq(outputSchemas.id, id),
        eq(outputSchemas.userId, userId),
        isNull(outputSchemas.deletedAt),
      ),
    )
    .limit(1);

  if (!row) {
    throw new ApiError(404, "SCHEMA_NOT_FOUND", "输出格式不存在或无权访问");
  }
  return row;
}

export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const context = await requireUser();
    const { id } = await params;
    const row = await findOwned(id, context.user.id);
    return jsonOk({ schema: toOutputSchemaDTO(row) });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    assertSameOrigin(request);
    const context = await requireUser();
    const { id } = await params;
    await findOwned(id, context.user.id);

    const input = await readJson(request, outputSchemaInputSchema);
    assertValidJsonSchema(input.schema);

    const isDefault = input.isDefault ?? false;

    await getDb().transaction(async (tx) => {
      if (isDefault) {
        await tx
          .update(outputSchemas)
          .set({ isDefault: false })
          .where(eq(outputSchemas.userId, context.user.id));
      }

      await tx
        .update(outputSchemas)
        .set({
          name: input.name,
          description: input.description ?? null,
          schema: input.schema,
          sample: input.sample ?? null,
          mode: input.mode ?? "json_object",
          strict: input.strict ?? false,
          isDefault,
        })
        .where(
          and(
            eq(outputSchemas.id, id),
            eq(outputSchemas.userId, context.user.id),
          ),
        );
    });

    const row = await findOwned(id, context.user.id);
    return jsonOk({ schema: toOutputSchemaDTO(row) });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    assertSameOrigin(request);
    const context = await requireUser();
    const { id } = await params;
    await findOwned(id, context.user.id);

    await getDb()
      .update(outputSchemas)
      .set({ deletedAt: new Date(), isDefault: false })
      .where(
        and(
          eq(outputSchemas.id, id),
          eq(outputSchemas.userId, context.user.id),
        ),
      );

    return jsonOk({ deleted: true });
  } catch (error) {
    return handleApiError(error);
  }
}
