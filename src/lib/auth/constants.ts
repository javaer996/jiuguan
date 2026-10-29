export const SESSION_COOKIE = "jiuguan_session";
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 天
export const SESSION_ISSUER = "jiuguan";
export const SESSION_AUDIENCE = "jiuguan-web";
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_BYTES = 72; // bcrypt 只处理前 72 字节
