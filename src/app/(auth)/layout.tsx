import type { ReactNode } from "react";
import Link from "next/link";
import { BookMarked, Feather, MoonStar, Sparkles } from "lucide-react";
import { BrandLockup } from "@/components/brand/logo";

const FEATURES = [
  {
    icon: Feather,
    title: "角色与人格",
    description: "从一句问候开始，塑造有呼吸感的角色。",
  },
  {
    icon: BookMarked,
    title: "世界书与记忆",
    description: "让设定随剧情生长，故事不会走失。",
  },
  {
    icon: MoonStar,
    title: "只属于你的酒馆",
    description: "对话隔离、私密保存，随时回到那一夜。",
  },
];

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-dvh lg:grid lg:grid-cols-[1.05fr_1fr]">
      <aside className="relative hidden overflow-hidden border-r border-border/60 bg-sidebar/50 lg:flex lg:flex-col lg:justify-between lg:p-12 xl:p-16">
        <div className="pointer-events-none absolute -top-40 -left-32 size-[30rem] rounded-full bg-primary/15 blur-[130px]" />
        <div className="pointer-events-none absolute right-[-10rem] bottom-[-8rem] size-[26rem] rounded-full bg-accent/20 blur-[120px]" />
        <div className="pointer-events-none absolute top-1/3 left-1/2 size-2 rounded-full bg-gold/60 shadow-[0_0_30px_10px_rgba(224,164,94,0.25)]" />

        <div className="relative flex items-center justify-between">
          <BrandLockup />
          <Link
            href="/"
            className="text-xs tracking-wide text-muted-foreground transition-colors hover:text-foreground"
          >
            返回门厅
          </Link>
        </div>

        <div className="relative max-w-lg">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs text-primary">
            <Sparkles className="size-3.5" />
            深夜营业中
          </div>
          <blockquote className="font-display text-[2.15rem] leading-[1.45] font-medium text-foreground xl:text-[2.5rem]">
            “每一个未曾说出口的夜晚，
            <br />
            都在这里有了回音。”
          </blockquote>
          <p className="mt-5 max-w-md text-sm leading-relaxed text-muted-foreground">
            醉语是一间只为你亮灯的酒馆。带上你的角色、世界与故事，
            在炉火旁坐下，让文字替你把夜晚说完。
          </p>

          <div className="mt-10 space-y-4">
            {FEATURES.map((feature) => (
              <div key={feature.title} className="flex items-start gap-3.5">
                <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
                  <feature.icon className="size-4" />
                </span>
                <div>
                  <p className="text-sm font-medium">{feature.title}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                    {feature.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative flex items-center gap-3 text-[11px] tracking-wide text-muted-foreground">
          <span className="h-px w-8 bg-border" />
          醉语 · 私人叙事酒馆
        </div>
      </aside>

      <main className="relative flex min-h-dvh items-center justify-center px-5 py-10 sm:px-8">
        <div className="pointer-events-none absolute top-[-6rem] right-[-6rem] size-72 rounded-full bg-primary/10 blur-[100px] lg:hidden" />
        <div className="relative w-full max-w-md">
          <div className="mb-8 flex justify-center lg:hidden">
            <BrandLockup />
          </div>
          <div className="glass-panel rounded-3xl p-6 shadow-soft sm:p-8">
            {children}
          </div>
          <p className="mt-6 text-center text-[11px] leading-relaxed text-muted-foreground">
            登录即表示你已阅读并同意酒馆的相处之道。
            <br />
            这里的故事，只属于你。
          </p>
        </div>
      </main>
    </div>
  );
}
