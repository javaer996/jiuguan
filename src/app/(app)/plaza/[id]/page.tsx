import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  BookOpen,
  CalendarDays,
  Eye,
  Heart,
  Layers,
  MessageSquareQuote,
  Palette,
  ScrollText,
  Sparkles,
  Star,
  UserRound,
  Users,
} from "lucide-react";
import { PlazaActions } from "@/components/plaza/plaza-actions";
import { PlazaReviewForm } from "@/components/plaza/plaza-review-form";
import { PlazaViewTracker } from "@/components/plaza/plaza-view-tracker";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { requireUserPage } from "@/lib/auth/page";
import { getPlazaTemplateDetail } from "@/lib/plaza/query";
import type { PlazaStatus } from "@/lib/types/plaza";
import { formatNumber, formatRelativeTime, initials } from "@/lib/utils";

export const dynamic = "force-dynamic";

type PlazaDetailProps = {
  params: Promise<{ id: string }>;
};

const STATUS_LABELS: Record<PlazaStatus, string> = {
  draft: "草稿",
  pending: "待审核",
  published: "已发布",
  rejected: "未通过",
  archived: "已下架",
};

export async function generateMetadata({
  params,
}: PlazaDetailProps): Promise<Metadata> {
  const { id } = await params;
  const detail = await getPlazaTemplateDetail(id);
  return { title: detail?.title ?? "广场情景" };
}

export default async function PlazaDetailPage({ params }: PlazaDetailProps) {
  const context = await requireUserPage("/plaza");
  const { id } = await params;
  const detail = await getPlazaTemplateDetail(id, {
    id: context.user.id,
    role: context.user.role,
  });

  if (!detail) notFound();

  const snapshot = detail.snapshot;
  const isOwner = detail.author.id === context.user.id;
  const isAdmin = context.user.role === "admin";
  const showStatus = detail.status !== "published" || !detail.published;

  const greeting =
    snapshot?.character.firstMessage?.trim() ||
    snapshot?.character.alternateGreetings?.[0]?.trim() ||
    null;

  const resourceCount = [
    snapshot?.character ? 1 : 0,
    snapshot?.worldbooks.length ?? 0,
    snapshot?.promptPreset ? 1 : 0,
    snapshot?.chatStyle ? 1 : 0,
    snapshot?.outputSchema ? 1 : 0,
    snapshot?.theme ? 1 : 0,
    snapshot?.persona ? 1 : 0,
  ].reduce((sum, value) => sum + value, 0);

  const worldbookEntryCount =
    snapshot?.worldbooks.reduce((sum, book) => sum + book.entries.length, 0) ??
    0;

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-7 sm:px-6 lg:px-10 lg:py-10">
      <div className="flex items-center justify-between gap-3">
        <Button variant="ghost" asChild className="rounded-xl">
          <Link href="/plaza">
            <ArrowLeft data-icon="inline-start" />
            回到广场
          </Link>
        </Button>
        {(isOwner || isAdmin) && (
          <Button variant="outline" asChild className="rounded-xl">
            <Link href="/plaza/submit">投稿管理</Link>
          </Button>
        )}
      </div>

      <section className="relative mt-4 overflow-hidden rounded-3xl border border-border/60 bg-card/35">
        <div className="relative h-52 sm:h-64">
          {detail.coverUrl ? (
            <div
              className="absolute inset-0 bg-cover bg-center"
              style={{ backgroundImage: `url("${detail.coverUrl}")` }}
            />
          ) : (
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,color-mix(in_oklch,var(--primary)_28%,transparent),transparent_55%),radial-gradient(circle_at_85%_90%,color-mix(in_oklch,var(--chart-4)_18%,transparent),transparent_50%)]" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-card via-card/40 to-transparent" />
          <div className="absolute top-4 left-4 flex flex-wrap gap-2">
            {detail.featured && (
              <Badge className="rounded-full bg-primary/90 text-primary-foreground">
                <Sparkles className="size-3" />
                编辑推荐
              </Badge>
            )}
            {detail.isOfficial && (
              <Badge variant="secondary" className="rounded-full">
                官方
              </Badge>
            )}
            {detail.category && (
              <Badge variant="outline" className="rounded-full bg-background/50 backdrop-blur">
                {detail.category.name}
              </Badge>
            )}
            {showStatus && (
              <Badge variant="outline" className="rounded-full bg-background/70 backdrop-blur">
                {STATUS_LABELS[detail.status]}
                {detail.published ? " · 展示已发布版本" : ""}
              </Badge>
            )}
          </div>
        </div>

        <div className="relative px-6 pb-6 sm:px-8 sm:pb-8">
          <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
            {detail.title}
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">
            {detail.summary || "作者还没有留下简介。"}
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <Avatar className="size-6 rounded-full">
                {detail.author.avatarUrl && (
                  <AvatarImage src={detail.author.avatarUrl} alt="" />
                )}
                <AvatarFallback className="rounded-full bg-primary/10 text-[10px] text-primary">
                  {initials(detail.author.displayName)}
                </AvatarFallback>
              </Avatar>
              {detail.author.displayName}
            </span>
            <span className="inline-flex items-center gap-1">
              <CalendarDays className="size-3.5" />
              {formatRelativeTime(detail.publishedAt ?? detail.updatedAt)}
            </span>
            <span className="inline-flex items-center gap-1">
              <Users className="size-3.5" />
              {formatNumber(detail.cloneCount)} 人使用
            </span>
            <span className="inline-flex items-center gap-1">
              <Heart className="size-3.5" />
              {formatNumber(detail.likeCount)}
            </span>
            <span className="inline-flex items-center gap-1">
              <Eye className="size-3.5" />
              {formatNumber(detail.viewCount)}
            </span>
            <span className="inline-flex items-center gap-1 text-primary">
              <Star className="size-3.5 fill-current" />
              {detail.ratingCount > 0
                ? `${detail.ratingAvg.toFixed(1)}（${detail.ratingCount}）`
                : "暂无评分"}
            </span>
          </div>

          {detail.tags.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-1.5">
              {detail.tags.map((tag) => (
                <Link
                  key={tag}
                  href={`/plaza?tag=${encodeURIComponent(tag)}`}
                  className="rounded-full border border-border/60 px-2.5 py-1 text-[11px] text-muted-foreground transition-colors hover:border-primary/30 hover:text-primary"
                >
                  #{tag}
                </Link>
              ))}
            </div>
          )}

          <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-border/50 pt-5">
            <PlazaActions
              templateId={detail.id}
              published={detail.published}
              liked={detail.liked}
              likeCount={detail.likeCount}
              favorited={detail.favorited}
            />
          </div>

          {showStatus && (
            <div className="mt-4 rounded-xl border border-amber-500/25 bg-amber-500/5 px-3.5 py-2.5 text-xs text-amber-600 dark:text-amber-400">
              当前状态：{STATUS_LABELS[detail.status]}
              {detail.published
                ? "。广场上仍展示上一个审核通过的版本。"
                : "。审核通过后，其他旅人才能看到并使用这套情景。"}
              {detail.rejectReason ? ` 审核意见：${detail.rejectReason}` : ""}
            </div>
          )}
        </div>
      </section>

      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-6">
          <section className="rounded-2xl border border-border/60 bg-card/30 p-5 sm:p-6">
            <h2 className="flex items-center gap-2 font-display text-lg font-medium">
              <UserRound className="size-4 text-primary" />
              角色
            </h2>
            {snapshot ? (
              <div className="mt-4 flex flex-col gap-4 sm:flex-row">
                <Avatar className="size-16 rounded-2xl">
                  {snapshot.character.avatarUrl && (
                    <AvatarImage src={snapshot.character.avatarUrl} alt="" />
                  )}
                  <AvatarFallback className="rounded-2xl bg-primary/10 font-display text-xl text-primary">
                    {initials(snapshot.character.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <h3 className="font-display text-xl">
                    {snapshot.character.name}
                  </h3>
                  {snapshot.character.tagline && (
                    <p className="mt-1 text-sm text-primary/80">
                      {snapshot.character.tagline}
                    </p>
                  )}
                  {snapshot.character.description && (
                    <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                      {snapshot.character.description}
                    </p>
                  )}
                  {snapshot.character.personality && (
                    <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                      <span className="text-foreground/80">性格：</span>
                      {snapshot.character.personality}
                    </p>
                  )}
                  {snapshot.character.scenario && (
                    <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                      <span className="text-foreground/80">场景：</span>
                      {snapshot.character.scenario}
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <p className="mt-3 text-sm text-muted-foreground">
                这个版本还没有可预览的角色内容。
              </p>
            )}
          </section>

          {greeting && (
            <section className="rounded-2xl border border-border/60 bg-card/30 p-5 sm:p-6">
              <h2 className="flex items-center gap-2 font-display text-lg font-medium">
                <MessageSquareQuote className="size-4 text-primary" />
                开场白
              </h2>
              <blockquote className="mt-4 border-l-2 border-primary/40 pl-4 text-sm leading-relaxed whitespace-pre-wrap text-muted-foreground">
                {greeting}
              </blockquote>
              {(snapshot?.character.alternateGreetings?.length ?? 0) > 0 && (
                <p className="mt-3 text-[11px] text-muted-foreground">
                  另有 {snapshot?.character.alternateGreetings?.length} 个备选开场。
                </p>
              )}
            </section>
          )}

          {(snapshot?.worldbooks.length ?? 0) > 0 && (
            <section className="rounded-2xl border border-border/60 bg-card/30 p-5 sm:p-6">
              <h2 className="flex items-center gap-2 font-display text-lg font-medium">
                <BookOpen className="size-4 text-primary" />
                世界书
              </h2>
              <div className="mt-4 space-y-3">
                {snapshot?.worldbooks.map((book) => (
                  <div
                    key={book.name}
                    className="rounded-xl border border-border/50 bg-background/30 p-3.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-sm font-medium">{book.name}</h3>
                      <span className="text-[11px] text-muted-foreground">
                        {book.entries.length} 条设定
                      </span>
                    </div>
                    {book.description && (
                      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                        {book.description}
                      </p>
                    )}
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {book.entries.slice(0, 8).map((entry) => (
                        <span
                          key={`${book.name}-${entry.name}`}
                          className="rounded-md bg-secondary/70 px-1.5 py-0.5 text-[10px] text-muted-foreground"
                        >
                          {entry.name}
                        </span>
                      ))}
                      {book.entries.length > 8 && (
                        <span className="px-1 py-0.5 text-[10px] text-muted-foreground">
                          +{book.entries.length - 8}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          <section className="rounded-2xl border border-border/60 bg-card/30 p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="flex items-center gap-2 font-display text-lg font-medium">
                <Star className="size-4 text-primary" />
                旅人评价
              </h2>
              <span className="text-xs text-muted-foreground">
                {detail.ratingCount > 0
                  ? `平均 ${detail.ratingAvg.toFixed(1)} 分 · ${detail.ratingCount} 条`
                  : "还没有人留下评价"}
              </span>
            </div>

            {detail.published && (
              <div className="mt-4">
                <PlazaReviewForm
                  templateId={detail.id}
                  initialRating={detail.myReview?.rating ?? null}
                  initialContent={detail.myReview?.content ?? null}
                />
              </div>
            )}

            <div className="mt-5 space-y-4">
              {detail.reviews.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  坐过这张桌子的人，还没有开口。
                </p>
              ) : (
                detail.reviews.map((review) => (
                  <div
                    key={review.id}
                    className="border-b border-border/40 pb-4 last:border-0 last:pb-0"
                  >
                    <div className="flex items-center gap-2">
                      <Avatar className="size-7 rounded-full">
                        {review.author.avatarUrl && (
                          <AvatarImage src={review.author.avatarUrl} alt="" />
                        )}
                        <AvatarFallback className="rounded-full bg-primary/10 text-[10px] text-primary">
                          {initials(review.author.displayName)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-xs font-medium">
                        {review.author.displayName}
                      </span>
                      {review.mine && (
                        <Badge variant="secondary" className="h-4 rounded-full px-1.5 text-[9px]">
                          我
                        </Badge>
                      )}
                      <span className="ml-auto flex items-center gap-0.5 text-primary">
                        {Array.from({ length: 5 }).map((_, index) => (
                          <Star
                            key={index}
                            className={
                              index < review.rating
                                ? "size-3 fill-current"
                                : "size-3 text-muted-foreground/30"
                            }
                          />
                        ))}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {formatRelativeTime(review.createdAt)}
                      </span>
                    </div>
                    {review.content && (
                      <p className="mt-2 pl-9 text-sm leading-relaxed text-muted-foreground">
                        {review.content}
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>
          </section>
        </div>

        <aside className="space-y-4">
          <section className="rounded-2xl border border-border/60 bg-card/30 p-5">
            <h2 className="flex items-center gap-2 font-display text-base font-medium">
              <Layers className="size-4 text-primary" />
              这套情景包含
            </h2>
            <p className="mt-1 text-[11px] text-muted-foreground">
              共 {resourceCount} 项资源 · {worldbookEntryCount} 条世界书设定
            </p>
            <ul className="mt-4 space-y-2.5 text-sm">
              {snapshot?.character && (
                <li className="flex items-center gap-2 text-muted-foreground">
                  <UserRound className="size-3.5 text-primary/70" />
                  角色 · {snapshot.character.name}
                </li>
              )}
              {snapshot?.worldbooks.map((book) => (
                <li
                  key={book.name}
                  className="flex items-center gap-2 text-muted-foreground"
                >
                  <BookOpen className="size-3.5 text-primary/70" />
                  世界书 · {book.name}
                </li>
              ))}
              {snapshot?.promptPreset && (
                <li className="flex items-center gap-2 text-muted-foreground">
                  <ScrollText className="size-3.5 text-primary/70" />
                  提示词 · {snapshot.promptPreset.name}
                </li>
              )}
              {snapshot?.chatStyle && (
                <li className="flex items-center gap-2 text-muted-foreground">
                  <Palette className="size-3.5 text-primary/70" />
                  样式 · {snapshot.chatStyle.name}
                </li>
              )}
              {snapshot?.outputSchema && (
                <li className="flex items-center gap-2 text-muted-foreground">
                  <Sparkles className="size-3.5 text-primary/70" />
                  输出格式 · {snapshot.outputSchema.name}
                </li>
              )}
              {snapshot?.theme && (
                <li className="flex items-center gap-2 text-muted-foreground">
                  <Palette className="size-3.5 text-primary/70" />
                  主题 · {snapshot.theme.name}
                </li>
              )}
              {snapshot?.persona && (
                <li className="flex items-center gap-2 text-muted-foreground">
                  <UserRound className="size-3.5 text-primary/70" />
                  身份 · {snapshot.persona.name}
                </li>
              )}
            </ul>
            {snapshot?.character.tags && snapshot.character.tags.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-1.5 border-t border-border/40 pt-3">
                {snapshot.character.tags.slice(0, 8).map((tag) => (
                  <span
                    key={tag}
                    className="rounded-md bg-secondary/70 px-1.5 py-0.5 text-[10px] text-muted-foreground"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-border/60 bg-card/30 p-5">
            <h2 className="font-display text-base font-medium">说书人</h2>
            <div className="mt-3 flex items-center gap-3">
              <Avatar className="size-10 rounded-xl">
                {detail.author.avatarUrl && (
                  <AvatarImage src={detail.author.avatarUrl} alt="" />
                )}
                <AvatarFallback className="rounded-xl bg-primary/10 text-xs text-primary">
                  {initials(detail.author.displayName)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">
                  {detail.author.displayName}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {detail.isOfficial ? "官方说书人" : "旅人说书人"}
                </p>
              </div>
            </div>
            <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
              使用「一键开始」会把这套情景复制到你的账号下，不会影响原作者的内容。
            </p>
          </section>

          {detail.version && (
            <p className="px-1 text-[10px] text-muted-foreground">
              内容版本 v{detail.version}
              {detail.changelog ? ` · ${detail.changelog}` : ""}
            </p>
          )}
        </aside>
      </div>

      {detail.published && <PlazaViewTracker templateId={detail.id} />}
    </div>
  );
}
