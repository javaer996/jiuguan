import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Wand2 } from "lucide-react";
import { AdminAiPromptsForm } from "@/components/admin/admin-ai-prompts-form";
import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import { DEFAULT_GENERATION_PROMPTS } from "@/lib/ai/drafts";
import { getGenerationPromptSettings } from "@/lib/ai/prompt-settings";
import { requireUserPage } from "@/lib/auth/page";

export const metadata: Metadata = {
  title: "创作提示词",
};

export const dynamic = "force-dynamic";

export default async function AdminAiPromptsPage() {
  const context = await requireUserPage("/admin/ai-prompts");
  if (context.user.role !== "admin") redirect("/chats");

  const prompts = await getGenerationPromptSettings();

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-7 sm:px-6 lg:px-10 lg:py-10">
      <PageHeader
        eyebrow="Admin · AI Prompts"
        title="创作提示词"
        description="查看并调整 AI 创作工坊生成角色卡、世界书、提示词预设、对话样式和聊天主题时使用的默认提示词。全部修改只对管理员开放。"
        actions={
          <Button variant="outline" asChild className="rounded-xl">
            <Link href="/studio">
              <Wand2 data-icon="inline-start" />
              去创作工坊验证
            </Link>
          </Button>
        }
      />

      <div className="mt-6">
        <AdminAiPromptsForm
          initial={prompts}
          defaults={DEFAULT_GENERATION_PROMPTS}
        />
      </div>
    </div>
  );
}
