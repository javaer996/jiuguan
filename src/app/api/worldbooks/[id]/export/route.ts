import { and, asc, eq, isNull } from "drizzle-orm";
import { getDb } from "@/db";
import { worldbookEntries, worldbooks } from "@/db/schema";
import { ApiError, handleApiError } from "@/lib/api";
import { requireUser } from "@/lib/auth/guard";

type RouteContext = { params: Promise<{ id: string }> };

const POSITION_REVERSE: Record<string, number> = {
  before_char: 0,
  after_char: 1,
  before_an: 2,
  after_an: 3,
  at_depth: 4,
  top: 0,
  bottom: 1,
};

const LOGIC_REVERSE: Record<string, number> = {
  and_any: 0,
  and_all: 1,
  not_all: 2,
  not_any: 3,
};

function downloadName(name: string) {
  const safe = name.replace(/[\\/:*?"<>|\r\n]/g, "_").slice(0, 60) || "worldbook";
  return `${safe}.json`;
}

export async function GET(_request: Request, { params }: RouteContext) {
  try {
    const context = await requireUser();
    const { id } = await params;

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

    if (!book) {
      throw new ApiError(404, "WORLDBOOK_NOT_FOUND", "世界书不存在或无权访问");
    }

    const entries = await getDb()
      .select()
      .from(worldbookEntries)
      .where(eq(worldbookEntries.worldbookId, id))
      .orderBy(asc(worldbookEntries.sortOrder), asc(worldbookEntries.name));

    const payload = {
      name: book.name,
      description: book.description ?? "",
      scanDepth: book.scanDepth,
      tokenBudget: book.tokenBudget,
      recursive: book.recursive,
      maxRecursionDepth: book.maxRecursionDepth,
      caseSensitive: book.caseSensitive,
      matchWholeWords: book.matchWholeWords,
      entries: Object.fromEntries(
        entries.map((entry, index) => [
          String(index),
          {
            uid: index,
            key: entry.keys ?? [],
            keysecondary: entry.secondaryKeys ?? [],
            comment: entry.name,
            content: entry.content,
            constant: entry.constant,
            selective: entry.selective,
            selectiveLogic: LOGIC_REVERSE[entry.selectiveLogic] ?? 0,
            order: entry.sortOrder,
            position: POSITION_REVERSE[entry.position] ?? 1,
            disable: !entry.enabled,
            depth: entry.depth,
            probability: entry.probability,
            useProbability: entry.useProbability,
            caseSensitive: entry.caseSensitive,
            matchWholeWords: entry.matchWholeWords,
            group: entry.groupName ?? "",
            groupWeight: entry.groupWeight,
            excludeRecursion: entry.excludeRecursion,
            preventRecursion: entry.preventRecursion,
            delayUntilRecursion: entry.delayUntilRecursion,
            scanDepth: entry.scanDepth,
            tokenBudget: entry.tokenBudget,
          },
        ]),
      ),
    };

    const filename = downloadName(book.name);
    return new Response(JSON.stringify(payload, null, 2), {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="worldbook.json"; filename*=UTF-8''${encodeURIComponent(filename)}`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
