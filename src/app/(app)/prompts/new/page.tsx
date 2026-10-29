import type { Metadata } from "next";
import { PromptEditor } from "@/components/prompts/prompt-editor";
import { requireUserPage } from "@/lib/auth/page";

export const metadata: Metadata = {
  title: "新建提示词预设",
};

export const dynamic = "force-dynamic";

export default async function NewPromptPage() {
  await requireUserPage("/prompts/new");
  return <PromptEditor />;
}
