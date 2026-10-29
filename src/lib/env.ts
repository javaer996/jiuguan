import { z } from "zod";

const booleanString = z
  .enum(["true", "false", "1", "0"])
  .optional()
  .transform((v) => v === "true" || v === "1");

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  DATABASE_URL: z.string().min(1, "DATABASE_URL 不能为空"),
  AUTH_SECRET: z.string().min(32, "AUTH_SECRET 至少 32 个字符"),
  API_KEY_ENC_SECRET: z.string().min(32, "API_KEY_ENC_SECRET 至少 32 个字符"),
  APP_URL: z.url().default("http://localhost:3000"),
  ADMIN_USERNAME: z.string().min(3).default("admin"),
  ADMIN_PASSWORD: z.string().optional(),
  ADMIN_DISPLAY_NAME: z.string().default("掌柜"),
  ALLOW_PRIVATE_PROVIDER_URLS: booleanString,
  DB_POOL_SIZE: z.coerce.number().int().min(1).max(100).default(10),
  UPLOAD_DIR: z.string().default("./public/uploads"),
  MAX_UPLOAD_MB: z.coerce.number().int().min(1).max(64).default(8),
});

export type Env = z.infer<typeof envSchema>;

let cached: Env | undefined;

/**
 * 惰性读取并校验环境变量。
 * 构建阶段不调用，避免 Docker 构建镜像时因缺少运行时密钥而失败。
 */
export function getEnv(): Env {
  if (cached) return cached;

  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const detail = parsed.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("；");
    throw new Error(`环境变量配置有误：${detail}`);
  }

  cached = parsed.data;
  return cached;
}

export function isProduction() {
  return getEnv().NODE_ENV === "production";
}

/** Cookie 是否加 Secure：只有 HTTPS 部署才开启，避免本地 HTTP 登录失效。 */
export function secureCookiesEnabled() {
  try {
    return new URL(getEnv().APP_URL).protocol === "https:";
  } catch {
    return false;
  }
}
