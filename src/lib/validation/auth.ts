import { z } from "zod";
import {
  PASSWORD_MAX_BYTES,
  PASSWORD_MIN_LENGTH,
} from "@/lib/auth/constants";

export const usernameSchema = z
  .string()
  .trim()
  .min(3, "用户名至少 3 个字符")
  .max(24, "用户名最多 24 个字符")
  .regex(
    /^[a-zA-Z0-9_-]+$/,
    "用户名只能包含字母、数字、下划线和连字符",
  );

export const displayNameSchema = z
  .string()
  .trim()
  .min(1, "昵称不能为空")
  .max(24, "昵称最多 24 个字符");

export const passwordSchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH, `密码至少 ${PASSWORD_MIN_LENGTH} 位`)
  .refine(
    (value) => Buffer.byteLength(value, "utf8") <= PASSWORD_MAX_BYTES,
    "密码过长（最多 72 字节）",
  );

export const registerSchema = z.object({
  username: usernameSchema,
  displayName: displayNameSchema,
  password: passwordSchema,
  email: z
    .union([z.email("邮箱格式不正确").max(255), z.literal("")])
    .optional()
    .transform((value) => (value ? value : undefined)),
  inviteCode: z.string().trim().min(1, "请输入邀请码").max(32, "邀请码过长"),
});

export const loginSchema = z.object({
  identifier: z.string().trim().min(1, "请输入用户名或邮箱").max(255),
  password: z.string().min(1, "请输入密码").max(200),
  remember: z.boolean().optional().default(true),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "请输入当前密码"),
    newPassword: passwordSchema,
    confirmPassword: z.string().min(1, "请再次输入新密码"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "两次输入的新密码不一致",
  })
  .refine((data) => data.newPassword !== data.currentPassword, {
    path: ["newPassword"],
    message: "新密码不能与当前密码相同",
  });

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
