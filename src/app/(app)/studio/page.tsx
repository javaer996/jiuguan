import type { Metadata } from "next";
import Link from "next/link";
import { and, asc, desc, eq, isNull } from "drizzle-orm";
import { BookOpen, Braces, Compass, Wand2 } from "lucide-react";
import { getDb } from "@/db";
import { apiProviders } from "@/db/schema";
import { PageHeader } from "@/components/common/page-header";
import { AiStudio } from "@/components/studio/ai-studio";
import { Button } from "@/components/ui/button";
import { requireUserPage } from "@/lib/auth/page";

export const metadata: Metadata = {
  title: "创作工坊",
};

export const dynamic = "force-dynamic";

export default async function StudioPage() {
  const context = await requireUserPage("/studio");

  const providers = await getDb()
    .select({
      id: apiProviders.id,
      name: apiProviders.name,
      model: apiProviders.model,
      isDefault: apiProviders.isDefault,
    })
    .from(apiProviders)
    .where(
      and(
        eq(apiProviders.userId, context.user.id),
        eq(apiProviders.status, "active"),
        isNull(apiProviders.deletedAt),
      ),
    )
    .orderBy(desc(apiProviders.isDefault), asc(apiProviders.name));

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-7 sm:px-6 lg:px-10 lg:py-10">
      <PageHeader
        eyebrow="AI Studio"
        title="创作工坊"
        description="把一句灵感交给你的 AI，生成角色、世界书、提示词与对话样式；预览满意后再保存为可编辑资产。"
        actions={
          <>
            <Button variant="outline" asChild className="rounded-xl">
              <Link href="/schemas/docs">
                <Braces data-icon="inline-start" />
                Schema 文档
              </Link>
            </Button>
            <Button variant="outline" asChild className="rounded-xl">
              <Link href="/plaza">
                <Compass data-icon="inline-start" />
                兴趣广场
              </Link>
            </Button>
          </>
        }
      />

      <div className="mt-6 flex flex-wrap gap-3 text-[11px] text-muted-foreground">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-border/60 px-2.5 py-1">
          <Wand2 className="size-3 text-primary" />
          使用你自己的 API Key
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-border/60 px-2.5 py-1">
          <BookOpen className="size-3 text-primary" />
          生成结果不会公开
        </span>
      </div>

      <div className="mt-6">
        <AiStudio providers={providers} />
      </div>
    </div>
  );
}
