import { and, desc, eq, isNull } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";
import { getDb } from "@/db";
import { promptPresets } from "@/db/schema";
import { handleApiError, jsonOk, readJson } from "@/lib/api";
import { assertSameOrigin } from "@/lib/auth/csrf";
import { requireUser } from "@/lib/auth/guard";
import {
  DEFAULT_POST_HISTORY_INSTRUCTIONS,
  DEFAULT_SYSTEM_PROMPT,
  defaultPromptBlocks,
} from "@/lib/content/defaults";
import { parseLimit } from "@/lib/content/query";
import { toPromptPresetDTO } from "@/lib/content/serializers";
import { promptPresetInputSchema } from "@/lib/validation/content";

export async function GET(request: Request) {
  try {
    const context = await requireUser();
    const url = new URL(request.url);
    const limit = parseLimit(url.searchParams.get("limit"), 100, 200);

    const rows = await getDb()
      .select()
      .from(promptPresets)
      .where(
        and(
          eq(promptPresets.userId, context.user.id),
          isNull(promptPresets.deletedAt),
        ),
      )
      .orderBy(desc(promptPresets.isDefault), desc(promptPresets.updatedAt))
      .limit(limit);

    return jsonOk({ presets: rows.map(toPromptPresetDTO) });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const context = await requireUser();
    const input = await readJson(request, promptPresetInputSchema);

    const id = uuidv7();
    const isDefault = input.isDefault ?? false;

    await getDb().transaction(async (tx) => {
      if (isDefault) {
        await tx
          .update(promptPresets)
          .set({ isDefault: false })
          .where(eq(promptPresets.userId, context.user.id));
      }

      await tx.insert(promptPresets).values({
        id,
        userId: context.user.id,
        name: input.name,
        description: input.description ?? null,
        systemPrompt: input.systemPrompt ?? DEFAULT_SYSTEM_PROMPT,
        postHistoryInstructions:
          input.postHistoryInstructions ?? DEFAULT_POST_HISTORY_INSTRUCTIONS,
        blocks: input.blocks ?? defaultPromptBlocks(),
        variables: input.variables ?? null,
        isDefault,
      });
    });

    const [row] = await getDb()
      .select()
      .from(promptPresets)
      .where(eq(promptPresets.id, id))
      .limit(1);

    if (!row) throw new Error("提示词创建失败");

    return jsonOk({ preset: toPromptPresetDTO(row) }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
