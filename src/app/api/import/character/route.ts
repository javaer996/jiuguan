import { getDb } from "@/db";
import { ApiError, handleApiError, jsonOk } from "@/lib/api";
import { assertSameOrigin } from "@/lib/auth/csrf";
import { requireUser } from "@/lib/auth/guard";
import { getEnv } from "@/lib/env";
import {
  extractCardFromPng,
  looksLikeCharacterCard,
  normalizeCharacterCard,
  parseJsonBuffer,
} from "@/lib/import/sillytavern";
import { insertImportedCharacter } from "@/lib/import/persist";
import { saveImage } from "@/lib/uploads";

function isPng(buffer: Buffer) {
  return (
    buffer.length > 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  );
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const context = await requireUser();

    let form: FormData;
    try {
      form = await request.formData();
    } catch {
      throw new ApiError(400, "INVALID_FORM", "请使用 multipart/form-data 上传");
    }

    const file = form.get("file");
    if (!(file instanceof File)) {
      throw new ApiError(400, "FILE_REQUIRED", "请选择 PNG 或 JSON 角色卡");
    }

    const env = getEnv();
    if (file.size > env.MAX_UPLOAD_MB * 1024 * 1024) {
      throw new ApiError(
        413,
        "FILE_TOO_LARGE",
        `文件不能超过 ${env.MAX_UPLOAD_MB} MB`,
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const png = isPng(buffer);
    const raw = png ? extractCardFromPng(buffer) : parseJsonBuffer(buffer);

    if (!png && !looksLikeCharacterCard(raw)) {
      throw new ApiError(
        400,
        "INVALID_CARD",
        "这份 JSON 看起来不是角色卡；世界书请使用「导入世界书」",
      );
    }

    const imported = normalizeCharacterCard(raw);

    let avatarUrl = imported.cardAvatarUrl;
    if (png) {
      try {
        const asset = await saveImage({
          userId: context.user.id,
          buffer,
          originalName: file.name,
          kind: "avatar",
        });
        avatarUrl = asset.url;
      } catch (error) {
        console.warn("[import] 角色卡头像保存失败", error);
      }
    }

    const result = await getDb().transaction((tx) =>
      insertImportedCharacter(tx, context.user.id, imported, avatarUrl),
    );

    return jsonOk(
      {
        character: {
          id: result.characterId,
          name: imported.input.name,
          href: `/characters/${result.characterId}`,
        },
        worldbook: result.worldbookId
          ? {
              id: result.worldbookId,
              name: imported.worldbook?.name ?? "导入的世界书",
              href: `/worldbooks/${result.worldbookId}`,
            }
          : null,
        avatarUrl,
      },
      { status: 201 },
    );
  } catch (error) {
    return handleApiError(error);
  }
}
