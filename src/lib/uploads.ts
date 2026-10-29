import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileTypeFromBuffer } from "file-type";
import sharp from "sharp";
import { v7 as uuidv7 } from "uuid";
import { getDb } from "@/db";
import { mediaAssets } from "@/db/schema";
import { ApiError } from "@/lib/api";
import { getEnv } from "@/lib/env";

const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
]);

export type UploadKind = "avatar" | "background" | "image" | "attachment";

type SaveImageInput = {
  userId: string;
  buffer: Buffer;
  originalName?: string | null;
  kind?: UploadKind;
};

export type SavedImage = {
  id: string;
  url: string;
  mimeType: string;
  size: number;
  width: number;
  height: number;
};

/**
 * 校验图片魔数并用 sharp 重新编码，避免伪装文件与携带元数据的图片直接落盘。
 * 返回可直接用于 <img src> 的站内地址。
 */
export async function saveImage({
  userId,
  buffer,
  originalName,
  kind = "image",
}: SaveImageInput): Promise<SavedImage> {
  const env = getEnv();
  if (buffer.byteLength === 0) {
    throw new ApiError(400, "EMPTY_FILE", "文件为空");
  }
  if (buffer.byteLength > env.MAX_UPLOAD_MB * 1024 * 1024) {
    throw new ApiError(
      413,
      "FILE_TOO_LARGE",
      `图片不能超过 ${env.MAX_UPLOAD_MB} MB`,
    );
  }

  const detected = await fileTypeFromBuffer(buffer);
  if (!detected || !ALLOWED_MIME.has(detected.mime)) {
    throw new ApiError(
      400,
      "INVALID_IMAGE",
      "只支持 JPEG、PNG、WebP 或 AVIF 图片",
    );
  }

  const maxDimension = kind === "avatar" ? 512 : 1800;
  const pipeline = sharp(buffer, { failOn: "error" })
    .rotate()
    .resize({
      width: maxDimension,
      height: maxDimension,
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({ quality: 84 });

  const { data, info } = await pipeline.toBuffer({ resolveWithObject: true });
  const id = uuidv7();
  const filename = `${id}.webp`;
  const directory = path.resolve(env.UPLOAD_DIR);
  await mkdir(directory, { recursive: true });
  await writeFile(path.join(directory, filename), data);

  const url = `/uploads/${filename}`;
  await getDb().insert(mediaAssets).values({
    id,
    userId,
    kind,
    url,
    mimeType: "image/webp",
    size: data.byteLength,
    width: info.width,
    height: info.height,
    originalName: originalName?.slice(0, 255) || null,
  });

  return {
    id,
    url,
    mimeType: "image/webp",
    size: data.byteLength,
    width: info.width,
    height: info.height,
  };
}
