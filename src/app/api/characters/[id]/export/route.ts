import { and, eq, isNull } from "drizzle-orm";
import { getDb } from "@/db";
import { characters } from "@/db/schema";
import { ApiError, handleApiError } from "@/lib/api";
import { requireUser } from "@/lib/auth/guard";

type RouteContext = { params: Promise<{ id: string }> };

function downloadName(name: string) {
  const safe = name.replace(/[\\/:*?"<>|\r\n]/g, "_").slice(0, 60) || "character";
  return `${safe}.json`;
}

export async function GET(_request: Request, { params }: RouteContext) {
  try {
    const context = await requireUser();
    const { id } = await params;

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

    if (!row) {
      throw new ApiError(404, "CHARACTER_NOT_FOUND", "角色不存在或无权访问");
    }

    const card = {
      spec: "chara_card_v2",
      spec_version: "2.0",
      data: {
        name: row.name,
        description: row.description ?? "",
        personality: row.personality ?? "",
        scenario: row.scenario ?? "",
        first_mes: row.firstMessage ?? "",
        mes_example: row.exampleDialogue ?? "",
        creator_notes: row.creatorNotes ?? "",
        system_prompt: row.systemPrompt ?? "",
        post_history_instructions: row.postHistoryInstructions ?? "",
        alternate_greetings: row.alternateGreetings ?? [],
        tags: row.tags ?? [],
        creator: "醉语",
        character_version: "1.0",
        extensions: row.extensions ?? {},
      },
    };

    const filename = downloadName(row.name);
    return new Response(JSON.stringify(card, null, 2), {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="character.json"; filename*=UTF-8''${encodeURIComponent(filename)}`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
