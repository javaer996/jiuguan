import { loadEnvConfig } from "@next/env";
import { defineConfig } from "drizzle-kit";

// drizzle-kit 不会自动读取 .env.local，这里复用 Next.js 的环境加载逻辑
loadEnvConfig(process.cwd());

export default defineConfig({
  dialect: "mysql",
  schema: "./src/db/schema/index.ts",
  out: "./drizzle",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "",
  },
  verbose: true,
  strict: true,
});
