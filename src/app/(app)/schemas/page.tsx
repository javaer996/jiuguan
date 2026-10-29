import type { Metadata } from "next";
import Link from "next/link";
import { and, desc, eq, isNull } from "drizzle-orm";
import { Braces, ChevronRight, FileJson, Plus, Star } from "lucide-react";
import { getDb } from "@/db";
import { outputSchemas } from "@/db/schema";
import { EmptyState } from "@/components/common/empty-state";
import { PageHeader } from "@/components/common/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { requireUserPage } from "@/lib/auth/page";
import { formatRelativeTime } from "@/lib/utils";

export const metadata: Metadata = {
  title: "输出格式",
};

export const dynamic = "force-dynamic";

const MODE_LABEL: Record<string, string> = {
  json_object: "JSON 对象",
  json_schema: "严格 Schema",
  text: "纯文本",
};

export default async function SchemasPage() {
  const context = await requireUserPage("/schemas");

  const rows = await getDb()
    .select()
    .from(outputSchemas)
    .where(
      and(
        eq(outputSchemas.userId, context.user.id),
        isNull(outputSchemas.deletedAt),
      ),
    )
    .orderBy(desc(outputSchemas.isDefault), desc(outputSchemas.updatedAt))
    .limit(100);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-7 sm:px-6 lg:px-10 lg:py-10">
      <PageHeader
        eyebrow="Schemas"
        title="输出格式"
        description="用 JSON Schema 定义 AI 的返回结构，让旁白、对白与状态各自落到该在的位置。"
        actions={
          <>
            <Button variant="outline" asChild className="rounded-xl">
              <Link href="/schemas/docs">
                <FileJson data-icon="inline-start" />
                Schema 文档
              </Link>
            </Button>
            <Button asChild className="rounded-xl shadow-glow">
              <Link href="/schemas/new">
                <Plus data-icon="inline-start" />
                新建格式
              </Link>
            </Button>
          </>
        }
      />

      {rows.length === 0 ? (
        <EmptyState
          icon={Braces}
          title="还没有定义输出格式"
          description="从内置的「叙事回复」开始，把回复拆成旁白、对白与情绪，再交给聊天界面渲染。"
          className="mt-8"
          action={
            <Button asChild className="rounded-xl shadow-glow">
              <Link href="/schemas/new">
                <Plus data-icon="inline-start" />
                创建第一份格式
              </Link>
            </Button>
          }
        />
      ) : (
        <>
          <div className="mt-6 flex items-center justify-between text-xs text-muted-foreground">
            <span>全部格式</span>
            <span>{rows.length} 份</span>
          </div>

          <div className="mt-3 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {rows.map((schema) => {
              const properties =
                schema.schema && typeof schema.schema === "object"
                  ? (schema.schema.properties as
                      | Record<string, Record<string, unknown>>
                      | undefined)
                  : undefined;
              const fields = Object.entries(properties ?? {}).slice(0, 5);
              return (
                <Link
                  key={schema.id}
                  href={`/schemas/${schema.id}`}
                  className="group relative flex flex-col overflow-hidden rounded-2xl border border-border/60 bg-card/35 p-5 transition-all hover:border-primary/30 hover:bg-card/65 hover:shadow-soft"
                >
                  <div className="pointer-events-none absolute -top-16 -right-10 size-40 rounded-full bg-primary/[0.06] blur-2xl" />

                  <div className="relative flex items-start justify-between gap-3">
                    <div className="flex size-10 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
                      <Braces className="size-4.5" />
                    </div>
                    <div className="flex items-center gap-1.5">
                      {schema.isDefault && (
                        <Badge
                          variant="outline"
                          className="gap-1 border-primary/30 px-1.5 py-0 text-[10px] text-primary"
                        >
                          <Star className="size-2.5 fill-current" />
                          默认
                        </Badge>
                      )}
                      <Badge
                        variant="outline"
                        className="px-1.5 py-0 text-[10px] font-normal text-muted-foreground"
                      >
                        {MODE_LABEL[schema.mode] ?? schema.mode}
                      </Badge>
                    </div>
                  </div>

                  <h2 className="relative mt-3 truncate font-display text-lg font-medium">
                    {schema.name}
                  </h2>
                  <p className="relative mt-1 line-clamp-2 min-h-9 text-xs leading-relaxed text-muted-foreground">
                    {schema.description || "还没有写下说明。"}
                  </p>

                  <div className="relative mt-3 flex flex-wrap gap-1.5">
                    {fields.length === 0 ? (
                      <span className="text-[10px] text-muted-foreground">
                        无顶层字段
                      </span>
                    ) : (
                      fields.map(([key, meta]) => (
                        <span
                          key={key}
                          className="rounded-md bg-secondary/70 px-1.5 py-0.5 text-[10px] text-muted-foreground"
                        >
                          {(typeof meta?.title === "string" && meta.title) || key}
                        </span>
                      ))
                    )}
                  </div>

                  <div className="relative mt-auto flex items-center justify-between border-t border-border/50 pt-3 text-[11px] text-muted-foreground">
                    <span>更新于 {formatRelativeTime(schema.updatedAt)}</span>
                    <ChevronRight className="size-3.5 transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
                  </div>
                </Link>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
