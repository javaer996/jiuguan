import { randomBytes } from "node:crypto";

/** 把拉丁字符分类名转成 URL 友好的 slug；中文等无法转写时返回 null。 */
export function slugifyCategoryName(name: string): string | null {
  const slug = name
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48)
    .replace(/-+$/g, "");
  return slug.length >= 2 ? slug : null;
}

export function randomCategorySlug(): string {
  return `cat-${randomBytes(4).toString("hex")}`;
}

export function randomSlugSuffix(length = 6): string {
  return randomBytes(Math.ceil(length / 2))
    .toString("hex")
    .slice(0, length);
}
