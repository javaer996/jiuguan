import type { Metadata } from "next";
import Link from "next/link";
import {
  Bookmark,
  Coffee,
  Compass,
  Flame,
  Heart,
  Plus,
  Rocket,
  Search,
  Sparkles,
  Swords,
  Tag,
  type LucideIcon,
} from "lucide-react";
import { EmptyState } from "@/components/common/empty-state";
import { PlazaCard } from "@/components/plaza/plaza-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { requireUserPage } from "@/lib/auth/page";
import {
  listPlazaCategories,
  listPlazaTemplates,
  type PlazaListSort,
} from "@/lib/plaza/query";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "兴趣广场",
};

export const dynamic = "force-dynamic";

const ICONS: Record<string, LucideIcon> = {
  Heart,
  Sword: Swords,
  Swords,
  Coffee,
  Search,
  Flame,
  Rocket,
  Compass,
  Sparkles,
  Tag,
};

const SORTS: { key: PlazaListSort; label: string }[] = [
  { key: "hot", label: "热门" },
  { key: "new", label: "最新" },
  { key: "rating", label: "高分" },
];

const PAGE_SIZE = 24;

type PlazaPageProps = {
  searchParams: Promise<{
    q?: string;
    category?: string;
    tag?: string;
    sort?: string;
    page?: string;
  }>;
};

function buildHref(
  base: {
    q: string;
    category: string;
    tag: string;
    sort: PlazaListSort;
  },
  overrides: Partial<typeof base & { page: number }>,
) {
  const merged = { ...base, ...overrides };
  const params = new URLSearchParams();
  if (merged.q) params.set("q", merged.q);
  if (merged.category) params.set("category", merged.category);
  if (merged.tag) params.set("tag", merged.tag);
  if (merged.sort !== "hot") params.set("sort", merged.sort);
  if (overrides.page && overrides.page > 1) {
    params.set("page", String(overrides.page));
  }
  const query = params.toString();
  return query ? `/plaza?${query}` : "/plaza";
}

export default async function PlazaPage({ searchParams }: PlazaPageProps) {
  const context = await requireUserPage("/plaza");
  const sp = await searchParams;

  const q = sp.q?.trim() ?? "";
  const category = sp.category?.trim() ?? "";
  const tag = sp.tag?.trim() ?? "";
  const sort: PlazaListSort =
    sp.sort === "new" || sp.sort === "rating" ? sp.sort : "hot";
  const page = Math.max(1, Number(sp.page) || 1);

  const [result, categories] = await Promise.all([
    listPlazaTemplates({
      viewerId: context.user.id,
      q,
      category,
      tag,
      sort,
      limit: PAGE_SIZE,
      offset: (page - 1) * PAGE_SIZE,
    }),
    listPlazaCategories(),
  ]);

  const base = { q, category, tag, sort };
  const totalPages = Math.max(1, Math.ceil(result.total / PAGE_SIZE));
  const activeCategory = categories.find((item) => item.slug === category);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-7 sm:px-6 lg:px-10 lg:py-10">
      <section className="relative overflow-hidden rounded-3xl border border-primary/15 bg-[radial-gradient(circle_at_15%_0%,color-mix(in_oklch,var(--primary)_20%,transparent),transparent_45%),radial-gradient(circle_at_90%_100%,color-mix(in_oklch,var(--chart-4)_14%,transparent),transparent_40%)] px-6 py-10 sm:px-10 sm:py-12">
        <div className="pointer-events-none absolute -top-24 right-0 size-72 rounded-full bg-primary/10 blur-[90px]" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-[11px] font-medium tracking-[0.28em] text-primary/80 uppercase">
              Plaza · 推门而入
            </p>
            <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
              兴趣广场
            </h1>
            <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground">
              从别人写好的情景里挑一段故事，一键复制角色、世界书与样式，坐下就能开演。
            </p>
          </div>
          <div className="flex w-fit flex-wrap items-center gap-2">
            <Button variant="outline" asChild className="rounded-xl">
              <Link href="/plaza/favorites">
                <Bookmark data-icon="inline-start" />
                我的收藏
              </Link>
            </Button>
            <Button asChild className="rounded-xl shadow-glow">
              <Link href="/plaza/submit">
                <Plus data-icon="inline-start" />
                投稿我的情景
              </Link>
            </Button>
          </div>
        </div>

        <form
          action="/plaza"
          method="get"
          className="relative mt-7 flex max-w-2xl flex-col gap-2 sm:flex-row"
        >
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              name="q"
              defaultValue={q}
              placeholder="搜索情景、角色或关键词…"
              className="h-11 rounded-xl border-border/70 bg-background/60 pl-9 text-sm backdrop-blur"
            />
          </div>
          {category && <input type="hidden" name="category" value={category} />}
          {sort !== "hot" && <input type="hidden" name="sort" value={sort} />}
          <Button type="submit" className="h-11 rounded-xl px-6">
            寻找故事
          </Button>
        </form>

        <p className="relative mt-4 text-[11px] text-muted-foreground">
          {categories.length} 个分类 · {result.total} 套情景正在炉火上温着
        </p>
      </section>

      <div className="mt-7 flex flex-wrap items-center gap-2">
        <Link
          href={buildHref(base, { category: "" })}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition-colors",
            !category
              ? "border-primary/40 bg-primary/12 text-primary"
              : "border-border/60 text-muted-foreground hover:border-primary/30 hover:text-foreground",
          )}
        >
          <Compass className="size-3.5" />
          全部
        </Link>
        {categories.map((item) => {
          const Icon = ICONS[item.icon ?? ""] ?? Sparkles;
          return (
            <Link
              key={item.id}
              href={buildHref(base, { category: item.slug })}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition-colors",
                category === item.slug
                  ? "border-primary/40 bg-primary/12 text-primary"
                  : "border-border/60 text-muted-foreground hover:border-primary/30 hover:text-foreground",
              )}
            >
              <Icon className="size-3.5" />
              {item.name}
              <span className="text-[10px] opacity-60">{item.templateCount}</span>
            </Link>
          );
        })}
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-b border-border/50 pb-3">
        <div className="flex items-center gap-1 rounded-full bg-secondary/40 p-1">
          {SORTS.map((item) => (
            <Link
              key={item.key}
              href={buildHref(base, { sort: item.key })}
              className={cn(
                "rounded-full px-3.5 py-1.5 text-xs transition-colors",
                sort === item.key
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {item.label}
            </Link>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          {tag && (
            <Link
              href={buildHref(base, { tag: "" })}
              className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-primary"
            >
              <Tag className="size-3" />
              {tag}
              <span className="opacity-60">×</span>
            </Link>
          )}
          {q && <span>「{q}」的搜索结果</span>}
          {activeCategory && <span>· {activeCategory.name}</span>}
        </div>
      </div>

      {result.items.length === 0 ? (
        <EmptyState
          icon={Compass}
          title={q || tag || category ? "这扇门后暂时没有故事" : "广场还在等第一盏灯"}
          description={
            q || tag || category
              ? "换个关键词或分类看看，也可以把你的情景投稿到广场。"
              : "把你的角色、世界书与样式打包成一套情景，成为广场上的第一位说书人。"
          }
          className="mt-8"
          action={
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Button variant="outline" asChild className="rounded-xl">
                <Link href="/plaza">看看全部情景</Link>
              </Button>
              <Button asChild className="rounded-xl shadow-glow">
                <Link href="/plaza/submit">
                  <Plus data-icon="inline-start" />
                  投稿情景
                </Link>
              </Button>
            </div>
          }
        />
      ) : (
        <>
          <div className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {result.items.map((template) => (
              <PlazaCard key={template.id} template={template} />
            ))}
          </div>

          {totalPages > 1 && (
            <div className="mt-8 flex items-center justify-center gap-2">
              {page > 1 ? (
                <Button variant="outline" asChild className="rounded-xl">
                  <Link href={buildHref(base, { page: page - 1 })}>上一页</Link>
                </Button>
              ) : (
                <Button variant="outline" disabled className="rounded-xl">
                  上一页
                </Button>
              )}
              <span className="px-3 text-xs text-muted-foreground">
                第 {page} / {totalPages} 页
              </span>
              {page < totalPages ? (
                <Button variant="outline" asChild className="rounded-xl">
                  <Link href={buildHref(base, { page: page + 1 })}>下一页</Link>
                </Button>
              ) : (
                <Button variant="outline" disabled className="rounded-xl">
                  下一页
                </Button>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
