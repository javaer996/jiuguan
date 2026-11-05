import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Compass, FolderOpen, Inbox, Layers, Tags } from "lucide-react";
import { PlazaCategoryActions } from "@/components/admin/plaza-category-actions";
import { PlazaCategoryCreateDialog } from "@/components/admin/plaza-category-create-dialog";
import { EmptyState } from "@/components/common/empty-state";
import { PageHeader } from "@/components/common/page-header";
import { PlazaCategoryIcon } from "@/components/plaza/category-icon";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { requireUserPage } from "@/lib/auth/page";
import {
  countUncategorizedPlazaTemplates,
  listAdminPlazaCategories,
} from "@/lib/plaza/categories";

export const metadata: Metadata = {
  title: "广场分类",
};

export const dynamic = "force-dynamic";

export default async function AdminPlazaCategoriesPage() {
  const context = await requireUserPage("/admin/plaza/categories");
  if (context.user.role !== "admin") redirect("/chats");

  const [categories, uncategorized] = await Promise.all([
    listAdminPlazaCategories(),
    countUncategorizedPlazaTemplates(),
  ]);

  const categorizedCount = categories.reduce(
    (sum, category) => sum + category.totalTemplateCount,
    0,
  );
  const publishedCount = categories.reduce(
    (sum, category) => sum + category.publicTemplateCount,
    0,
  );

  const stats = [
    {
      label: "分类总数",
      value: categories.length,
      icon: Tags,
      className: "text-primary",
    },
    {
      label: "已归类投稿",
      value: categorizedCount,
      icon: Layers,
      className: "text-emerald-500",
    },
    {
      label: "未分类投稿",
      value: uncategorized,
      icon: Inbox,
      className: "text-amber-500",
    },
  ];

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-7 sm:px-6 lg:px-10 lg:py-10">
      <PageHeader
        eyebrow="Admin · Plaza"
        title="广场分类"
        description="管理广场筛选条与投稿表单里的分类名称、图标与排序。删除分类不会删除投稿。"
        actions={
          <>
            <Button variant="outline" asChild className="rounded-xl">
              <Link href="/admin/plaza">
                <Compass data-icon="inline-start" />
                广场审核
              </Link>
            </Button>
            <PlazaCategoryCreateDialog />
          </>
        }
      />

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="flex items-center gap-3 rounded-2xl border border-border/60 bg-card/30 px-4 py-3"
          >
            <stat.icon className={`size-4 ${stat.className}`} />
            <div>
              <p className="font-display text-xl font-medium">{stat.value}</p>
              <p className="text-[11px] text-muted-foreground">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {categories.length === 0 ? (
        <EmptyState
          icon={FolderOpen}
          title="还没有任何分类"
          description="新建第一个分类后，它就会出现在广场筛选条和投稿表单里。"
          className="mt-6"
          action={<PlazaCategoryCreateDialog />}
        />
      ) : (
        <div className="mt-6 overflow-hidden rounded-2xl border border-border/60 bg-card/25">
          {categories.map((category) => (
            <div
              key={category.id}
              className="flex flex-wrap items-center gap-3 border-b border-border/40 px-4 py-3.5 last:border-b-0"
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
                <PlazaCategoryIcon name={category.icon} className="size-5" />
              </span>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-display text-sm font-medium">
                    {category.name}
                  </h2>
                  <Badge
                    variant="outline"
                    className="rounded-full px-2 py-0 font-mono text-[10px] text-muted-foreground"
                  >
                    {category.slug}
                  </Badge>
                </div>
                <p className="mt-0.5 line-clamp-1 text-[11px] text-muted-foreground">
                  {category.description || "没有填写描述"}
                </p>
                <p className="mt-1 text-[10px] text-muted-foreground">
                  排序 {category.sortOrder} · 已发布 {category.publicTemplateCount}{" "}
                  · 全部投稿 {category.totalTemplateCount}
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  asChild
                  className="rounded-lg text-muted-foreground"
                >
                  <Link href={`/plaza?category=${category.slug}`}>
                    查看
                  </Link>
                </Button>
                <PlazaCategoryActions category={category} />
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="mt-4 text-[11px] leading-relaxed text-muted-foreground">
        目前共有 {publishedCount} 套已发布投稿归类在广场上。删除分类后，相关投稿会保留并变为「未分类」，可以在投稿详情里重新指定。
      </p>
    </div>
  );
}
