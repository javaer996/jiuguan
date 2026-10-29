import { getDb } from "@/db";
import { ApiError, handleApiError, jsonOk } from "@/lib/api";
import { assertSameOrigin } from "@/lib/auth/csrf";
import { requireUser } from "@/lib/auth/guard";
import { getEnv } from "@/lib/env";
import { extractWorldbook, parseJsonBuffer } from "@/lib/import/sillytavern";
import { insertWorldbook } from "@/lib/import/persist";

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
      throw new ApiError(400, "FILE_REQUIRED", "请选择 JSON 世界书文件");
    }

    const env = getEnv();
    if (file.size > env.MAX_UPLOAD_MB * 1024 * 1024) {
      throw new ApiError(
        413,
        "FILE_TOO_LARGE",
        `文件不能超过 ${env.MAX_UPLOAD_MB} MB`,
      );
    }

    const raw = parseJsonBuffer(Buffer.from(await file.arrayBuffer()));
    const book = extractWorldbook(raw);

    const id = await getDb().transaction((tx) =>
      insertWorldbook(tx, context.user.id, book),
    );

    return jsonOk(
      {
        worldbook: {
          id,
          name: book.name,
          href: `/worldbooks/${id}`,
          entryCount: book.entries.length,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    return handleApiError(error);
  }
}
