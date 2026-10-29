import type { Metadata } from "next";
import Link from "next/link";
import { Bookmark, Compass } from "lucide-react";
import { EmptyState } from "@/components/common/empty-state";
import { PageHeader } from "@/components/common/page-header";
import { PlazaCard } from "@/components/plaza/plaza-card";
import { Button } from "@/components/ui/button";
import { requireUserPage } from "@/lib/auth/page";
import { listPlazaTemplates } from "@/lib/plaza/query";

export const metadata: Metadata = {
  title: "我的收藏",
};

export const dynamic = "force-dynamic";

export default async function PlazaFavoritesPage() {
  const context = await requireUserPage("/plaza/favorites");
  const result = await listPlazaTemplates({
    viewerId: context.user.id,
    favoritedBy: context.user.id,
    sort: "new",
    limit: 60,
  });

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-7 sm:px-6 lg:px-10 lg:py-10">
      <PageHeader
        eyebrow="Bookmarks"
        title="我的收藏"
        description="收在书架上的情景，等一个合适的夜晚再打开。"
        actions={
          <Button variant="outline" asChild className="rounded-xl">
            <Link href="/plaza">
              <Compass data-icon="inline-start" />
              回到广场
            </Link>
          </Button>
        }
      />

      {result.items.length === 0 ? (
        <EmptyState
          icon={Bookmark}
          title="书架还是空的"
          description="在广场上遇到喜欢的情景时，点一下书签，它就会留在这里。"
          className="mt-8"
          action={
            <Button asChild className="rounded-xl shadow-glow">
              <Link href="/plaza">
                <Compass data-icon="inline-start" />
                去广场逛逛
              </Link>
            </Button>
          }
        />
      ) : (
        <>
          <p className="mt-6 text-xs text-muted-foreground">
            共收藏 {result.total} 套情景
          </p>
          <div className="mt-3 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {result.items.map((template) => (
              <PlazaCard key={template.id} template={template} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
