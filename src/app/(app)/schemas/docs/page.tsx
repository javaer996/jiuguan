import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { SchemaDocs } from "@/components/schemas/schema-docs";
import { Button } from "@/components/ui/button";
import { requireUserPage } from "@/lib/auth/page";

export const metadata: Metadata = {
  title: "Schema 文档",
};

export const dynamic = "force-dynamic";

export default async function SchemaDocsPage() {
  await requireUserPage("/schemas/docs");

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-7 sm:px-6 lg:px-10 lg:py-10">
      <PageHeader
        eyebrow="Docs · Structured output"
        title="Schema 文档"
        description="了解如何用 JSON Schema 与 x-ui 扩展，把 AI 的回复渲染成旁白、对白、徽章与物品栏。"
        actions={
          <Button variant="outline" asChild className="rounded-xl">
            <Link href="/schemas">
              <ArrowLeft data-icon="inline-start" />
              返回输出格式
            </Link>
          </Button>
        }
      />

      <div className="mt-6">
        <SchemaDocs />
      </div>
    </div>
  );
}
