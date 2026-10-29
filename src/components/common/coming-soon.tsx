import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ArrowLeft, Hammer } from "lucide-react";
import { EmptyState } from "@/components/common/empty-state";
import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";

export function ComingSoon({
  eyebrow,
  title,
  description,
  icon,
  note = "这间屋子正在布置，很快就会亮灯。先去会话或兴趣广场看看吧。",
}: {
  eyebrow: string;
  title: string;
  description: string;
  icon: LucideIcon;
  note?: string;
}) {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-7 sm:px-6 lg:px-10 lg:py-10">
      <PageHeader eyebrow={eyebrow} title={title} description={description} />
      <EmptyState
        icon={icon}
        title="这间屋子正在布置"
        description={note}
        className="mt-8"
        action={
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button variant="outline" asChild className="rounded-xl">
              <Link href="/chats">
                <ArrowLeft data-icon="inline-start" />
                回到会话
              </Link>
            </Button>
            <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <Hammer className="size-3.5" />
              施工中
            </span>
          </div>
        }
      />
    </div>
  );
}
