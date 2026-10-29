import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

import { randomBytes } from "node:crypto";
import { eq, inArray } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";
import { closeDb, getDb } from "../src/db";
import {
  inviteCodes,
  plazaCategories,
  systemSettings,
  userSettings,
  users,
} from "../src/db/schema";
import { hashPassword } from "../src/lib/auth/password";
import { getEnv } from "../src/lib/env";

const CATEGORIES = [
  {
    slug: "romance",
    name: "情感陪伴",
    description: "温柔的、炽烈的、意难平的，都在这里。",
    icon: "Heart",
    sortOrder: 10,
  },
  {
    slug: "fantasy",
    name: "奇幻冒险",
    description: "剑与魔法、龙与地下城，踏上未知旅途。",
    icon: "Sword",
    sortOrder: 20,
  },
  {
    slug: "daily",
    name: "都市日常",
    description: "咖啡馆、雨夜、便利店，平凡生活里的微光。",
    icon: "Coffee",
    sortOrder: 30,
  },
  {
    slug: "mystery",
    name: "悬疑推理",
    description: "迷雾重重的案件，等你抽丝剥茧。",
    icon: "Search",
    sortOrder: 40,
  },
  {
    slug: "wuxia",
    name: "古风江湖",
    description: "一壶浊酒，一柄长剑，快意恩仇。",
    icon: "Flame",
    sortOrder: 50,
  },
  {
    slug: "scifi",
    name: "科幻未来",
    description: "星海、赛博都市与人工智能的边界。",
    icon: "Rocket",
    sortOrder: 60,
  },
];

function randomPassword(length = 16): string {
  const alphabet =
    "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%";
  const bytes = randomBytes(length);
  let result = "";
  for (let i = 0; i < length; i += 1) {
    result += alphabet[bytes[i]! % alphabet.length];
  }
  return result;
}

function randomInviteCode(length = 10): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = randomBytes(length);
  let result = "";
  for (let i = 0; i < length; i += 1) {
    result += alphabet[bytes[i]! % alphabet.length];
  }
  return result;
}

async function seedAdmin() {
  const env = getEnv();
  const db = getDb();
  const username = env.ADMIN_USERNAME;

  const [existing] = await db
    .select()
    .from(users)
    .where(eq(users.username, username))
    .limit(1);

  if (existing) {
    if (existing.role !== "admin") {
      await db
        .update(users)
        .set({ role: "admin", status: "active", deletedAt: null })
        .where(eq(users.id, existing.id));
      console.log(`[seed] 已将用户 ${username} 提升为管理员`);
    } else {
      console.log(`[seed] 管理员 ${username} 已存在，跳过创建`);
    }

    const [settings] = await db
      .select({ userId: userSettings.userId })
      .from(userSettings)
      .where(eq(userSettings.userId, existing.id))
      .limit(1);
    if (!settings) {
      await db.insert(userSettings).values({ userId: existing.id });
    }
    return;
  }

  const password = env.ADMIN_PASSWORD ?? randomPassword();
  const passwordHash = await hashPassword(password);
  const userId = uuidv7();

  await db.insert(users).values({
    id: userId,
    username,
    displayName: env.ADMIN_DISPLAY_NAME,
    passwordHash,
    role: "admin",
    status: "active",
  });
  await db.insert(userSettings).values({ userId });

  console.log(`[seed] 管理员已创建：${username}`);
  if (!env.ADMIN_PASSWORD) {
    console.log(`[seed] 初始密码（仅显示一次）：${password}`);
  }
}

async function seedInviteCode() {
  const db = getDb();
  const [existing] = await db
    .select({ id: inviteCodes.id })
    .from(inviteCodes)
    .limit(1);

  if (existing) {
    console.log("[seed] 已存在邀请码，跳过创建");
    return;
  }

  const code = randomInviteCode();
  await db.insert(inviteCodes).values({
    code,
    maxUses: 20,
    note: "初始邀请码",
  });
  console.log(`[seed] 初始邀请码：${code}（可用 20 次）`);
}

async function seedCategories() {
  const db = getDb();
  const slugs = CATEGORIES.map((category) => category.slug);
  const existing = await db
    .select({ slug: plazaCategories.slug })
    .from(plazaCategories)
    .where(inArray(plazaCategories.slug, slugs));

  const existingSlugs = new Set(existing.map((row) => row.slug));
  const missing = CATEGORIES.filter(
    (category) => !existingSlugs.has(category.slug),
  );

  if (missing.length > 0) {
    await db.insert(plazaCategories).values(missing);
    console.log(`[seed] 已创建 ${missing.length} 个广场分类`);
  } else {
    console.log("[seed] 广场分类已存在，跳过创建");
  }
}

async function seedSettings() {
  const db = getDb();
  const defaults = [
    { key: "registration.enabled", value: true },
    { key: "registration.invite_required", value: true },
  ];

  const existing = await db
    .select({ key: systemSettings.key })
    .from(systemSettings)
    .where(inArray(systemSettings.key, defaults.map((item) => item.key)));

  const keys = new Set(existing.map((row) => row.key));
  const missing = defaults.filter((item) => !keys.has(item.key));
  if (missing.length > 0) {
    await db.insert(systemSettings).values(missing);
  }
  console.log("[seed] 系统设置已就绪");
}

async function main() {
  try {
    await seedAdmin();
    await seedInviteCode();
    await seedCategories();
    await seedSettings();
    console.log("[seed] 完成");
  } finally {
    await closeDb();
  }
}

main().catch((error) => {
  console.error("[seed] 失败", error);
  process.exit(1);
});
