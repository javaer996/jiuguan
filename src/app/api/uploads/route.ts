import { ApiError, handleApiError, jsonOk } from "@/lib/api";
import { assertSameOrigin } from "@/lib/auth/csrf";
import { requireUser } from "@/lib/auth/guard";
import { saveImage, type UploadKind } from "@/lib/uploads";

const KINDS = new Set<UploadKind>([
  "avatar",
  "background",
  "image",
  "attachment",
]);

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
      throw new ApiError(400, "FILE_REQUIRED", "请选择要上传的图片");
    }

    const rawKind = String(form.get("kind") ?? "image");
    const kind = KINDS.has(rawKind as UploadKind)
      ? (rawKind as UploadKind)
      : "image";

    const buffer = Buffer.from(await file.arrayBuffer());
    const asset = await saveImage({
      userId: context.user.id,
      buffer,
      originalName: file.name,
      kind,
    });

    return jsonOk({ asset }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
