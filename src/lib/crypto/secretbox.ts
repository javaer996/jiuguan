import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";
import { getEnv } from "@/lib/env";

const ALGORITHM = "aes-256-gcm";
const VERSION = "v1";

function deriveKey(): Buffer {
  // 配置中的密钥本身由 openssl rand 生成，再做一次哈希得到固定 32 字节密钥
  return createHash("sha256")
    .update(getEnv().API_KEY_ENC_SECRET)
    .digest();
}

/** 加密 API Key 等敏感配置，格式：v1.iv.tag.ciphertext（base64url）。 */
export function encryptSecret(plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, deriveKey(), iv);
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return [
    VERSION,
    iv.toString("base64url"),
    tag.toString("base64url"),
    ciphertext.toString("base64url"),
  ].join(".");
}

export function decryptSecret(payload: string): string {
  const [version, ivPart, tagPart, dataPart] = payload.split(".");
  if (version !== VERSION || !ivPart || !tagPart || !dataPart) {
    throw new Error("密钥密文格式不正确");
  }

  const decipher = createDecipheriv(
    ALGORITHM,
    deriveKey(),
    Buffer.from(ivPart, "base64url"),
  );
  decipher.setAuthTag(Buffer.from(tagPart, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(dataPart, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}

/** 只展示末四位，用于界面回显。 */
export function maskSecret(secret: string): string {
  const trimmed = secret.trim();
  if (trimmed.length <= 4) return "••••";
  return `••••${trimmed.slice(-4)}`;
}
