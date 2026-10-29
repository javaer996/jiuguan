import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  Brain,
  Braces,
  Compass,
  Feather,
  Lock,
  Palette,
  Send,
  Sparkles,
  Wine,
} from "lucide-react";
import { BrandLockup } from "@/components/brand/logo";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

const FEATURES = [
  {
    icon: Feather,
    title: "角色，由你塑造",
    description:
      "语气、经历、秘密与执念。写下人格与开场白，让角色带着自己的呼吸走进对话。",
  },
  {
    icon: BookOpen,
    title: "世界书，随剧情展开",
    description:
      "关键词触发、深度注入、递归扫描。设定不再是死板的背景，而是会回应故事的土壤。",
  },
  {
    icon: Braces,
    title: "结构化输出",
    description:
      "用 JSON Schema 约定 AI 的返回格式，把对话渲染成卡片、档案、物品栏或任何你想要的样子。",
  },
  {
    icon: Brain,
    title: "记得住的长夜",
    description:
      "把约定与线索写成长期记忆；对话太长时压缩成前情摘要。旧事不丢，上下文也不会溢出。",
  },
  {
    icon: Palette,
    title: "专属对话样式",
    description:
      "气泡、小说、信笺或自定义 CSS。暖金、墨绿、玫瑰——让每一段故事有自己的光线。",
  },
  {
    icon: Sparkles,
    title: "AI 辅助创作",
    description:
      "角色、世界书、提示词、外观，都可以让 AI 起草，再在实时预览里慢慢打磨。",
  },
  {
    icon: Lock,
    title: "只属于你的房间",
    description:
      "账号隔离、会话独立、密钥加密保存。酒馆里的每一句低语，都只留在你的桌上。",
  },
];

const STEPS = [
  {
    index: "01",
    title: "挑一个情景",
    description: "从兴趣广场选一张角色卡，或从空白开始，写下你的第一句。",
  },
  {
    index: "02",
    title: "接入你的 AI",
    description: "填入任意 OpenAI 兼容接口，温度、模型与上下文都由你决定。",
  },
  {
    index: "03",
    title: "把夜晚说完",
    description:
      "分支、回溯、长期记忆与自动压缩。故事可以很长，也可以随时重来。",
  },
];

export default async function LandingPage() {
  const context = await getCurrentUser().catch(() => null);
  const loggedIn = Boolean(context);

  return (
    <div className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-56 left-1/2 size-[52rem] -translate-x-1/2 rounded-full bg-primary/[0.09] blur-[160px]" />
        <div className="absolute top-1/3 -left-40 size-[30rem] rounded-full bg-accent/[0.07] blur-[130px]" />
        <div className="absolute right-[-14rem] bottom-0 size-[34rem] rounded-full bg-rose/[0.06] blur-[150px]" />
      </div>

      <header className="mx-auto flex h-20 w-full max-w-6xl items-center justify-between px-5 sm:px-8">
        <BrandLockup />
        <nav className="hidden items-center gap-7 text-sm text-muted-foreground md:flex">
          <Link href="#features" className="transition-colors hover:text-foreground">
            功能
          </Link>
          <Link href="#how" className="transition-colors hover:text-foreground">
            如何使用
          </Link>
          <Link href="/plaza" className="transition-colors hover:text-foreground">
            兴趣广场
          </Link>
        </nav>
        <div className="flex items-center gap-2">
          {loggedIn ? (
            <Button asChild className="rounded-xl shadow-glow">
              <Link href="/chats">
                进入酒馆
                <ArrowRight data-icon="inline-end" />
              </Link>
            </Button>
          ) : (
            <>
              <Button variant="ghost" asChild className="hidden rounded-xl sm:inline-flex">
                <Link href="/login">登录</Link>
              </Button>
              <Button asChild className="rounded-xl shadow-glow">
                <Link href="/register">
                  领取席位
                  <ArrowRight data-icon="inline-end" />
                </Link>
              </Button>
            </>
          )}
        </div>
      </header>

      <main>
        <section className="mx-auto grid w-full max-w-6xl items-center gap-14 px-5 pt-14 pb-20 sm:px-8 lg:grid-cols-[1.05fr_1fr] lg:pt-20 lg:pb-28">
          <div className="animate-fade-in">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3.5 py-1.5 text-xs text-primary">
              <Wine className="size-3.5" />
              一间只在深夜营业的私人酒馆
            </div>

            <h1 className="mt-6 font-display text-[2.7rem] leading-[1.18] font-semibold tracking-tight sm:text-6xl">
              在深夜酒馆，
              <br />
              <span className="text-gradient-gold">遇见你的故事</span>
            </h1>

            <p className="mt-6 max-w-xl text-[15px] leading-relaxed text-muted-foreground sm:text-base">
              角色、世界书、提示词与对话样式，一切由你定义。
              把 AI 接入你的酒馆，让每一个未曾说出口的夜晚，都有回音。
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Button asChild size="lg" className="h-11 rounded-xl px-5 shadow-glow">
                <Link href={loggedIn ? "/chats" : "/register"}>
                  {loggedIn ? "回到炉火旁" : "用邀请码入座"}
                  <ArrowRight data-icon="inline-end" />
                </Link>
              </Button>
              <Button
                variant="outline"
                size="lg"
                asChild
                className="h-11 rounded-xl px-5"
              >
                <Link href="/plaza">
                  <Compass data-icon="inline-start" />
                  逛逛兴趣广场
                </Link>
              </Button>
            </div>

            <div className="mt-10 flex flex-wrap gap-x-8 gap-y-3 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-2">
                <span className="size-1.5 rounded-full bg-teal" />
                支持任意 OpenAI 兼容接口
              </span>
              <span className="inline-flex items-center gap-2">
                <span className="size-1.5 rounded-full bg-primary" />
                对话与密钥独立隔离
              </span>
              <span className="inline-flex items-center gap-2">
                <span className="size-1.5 rounded-full bg-rose" />
                支持 SillyTavern 角色卡导入
              </span>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-md lg:max-w-none">
            <div className="pointer-events-none absolute -inset-10 rounded-[3rem] bg-gradient-to-br from-primary/15 via-transparent to-accent/15 blur-3xl" />
            <div className="absolute -top-5 -left-3 z-20 animate-float-slow rounded-2xl border border-primary/20 bg-card/90 px-3.5 py-2 text-[11px] text-primary shadow-soft backdrop-blur">
              世界书已加载 · 3 条设定
            </div>
            <div className="absolute -right-2 bottom-14 z-20 animate-float-slow rounded-2xl border border-border/70 bg-card/90 px-3.5 py-2 text-[11px] text-muted-foreground shadow-soft backdrop-blur [animation-delay:1.2s]">
              分支已保存 · 第 12 夜
            </div>

            <div className="glass-panel relative rounded-[1.8rem] p-4 shadow-soft sm:p-5">
              <div className="flex items-center gap-3 border-b border-border/60 pb-4">
                <Avatar className="size-11">
                  <AvatarFallback className="bg-primary/15 font-display text-sm text-primary">
                    月
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="font-display text-[15px] font-medium">月见</p>
                  <p className="text-[11px] text-muted-foreground">
                    雨夜书店的常客 · 古风 / 慢热
                  </p>
                </div>
                <span className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-teal/10 px-2.5 py-1 text-[10px] text-teal">
                  <span className="size-1.5 rounded-full bg-teal" />
                  在店里
                </span>
              </div>

              <div className="space-y-4 py-5">
                <div className="max-w-[88%] rounded-2xl rounded-tl-md border border-border/60 bg-surface-2/70 px-4 py-3 text-[13px] leading-relaxed">
                  “今晚的雨，像有人在窗外一页一页地翻书。”
                </div>
                <div className="ml-auto max-w-[82%] rounded-2xl rounded-tr-md bg-primary/90 px-4 py-3 text-[13px] leading-relaxed text-primary-foreground">
                  我推门进去，把湿透的伞靠在门边。
                </div>
                <div className="max-w-[88%] rounded-2xl rounded-tl-md border border-border/60 bg-surface-2/70 px-4 py-3 text-[13px] leading-relaxed">
                  她抬起头，目光在你的伞尖停了一瞬，又把书翻回刚才那一页。
                  <span className="ml-1 inline-block h-3.5 w-1.5 translate-y-0.5 animate-cursor bg-primary/70" />
                </div>
              </div>

              <div className="flex items-center gap-2 rounded-xl border border-border/70 bg-background/40 px-3.5 py-2.5 text-xs text-muted-foreground">
                说点什么，或者只是坐下…
                <span className="ml-auto flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <Send className="size-3.5" />
                </span>
              </div>
            </div>
          </div>
        </section>

        <section
          id="features"
          className="border-y border-border/50 bg-card/20"
        >
          <div className="mx-auto w-full max-w-6xl px-5 py-20 sm:px-8">
            <div className="max-w-2xl">
              <p className="text-[11px] tracking-[0.3em] text-muted-foreground uppercase">
                What&apos;s inside
              </p>
              <h2 className="mt-3 font-display text-3xl font-semibold sm:text-4xl">
                不只聊天，是一整套叙事工具
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                从角色卡到世界书，从提示词到结构化输出，把零散的灵感收进同一间酒馆。
              </p>
            </div>

            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map((feature) => (
                <div
                  key={feature.title}
                  className="group rounded-2xl border border-border/60 bg-card/35 p-5 transition-all hover:border-primary/25 hover:bg-card/60"
                >
                  <span className="flex size-10 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary transition-transform group-hover:-translate-y-0.5">
                    <feature.icon className="size-4.5" />
                  </span>
                  <h3 className="mt-4 font-display text-lg font-medium">
                    {feature.title}
                  </h3>
                  <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="how" className="mx-auto w-full max-w-6xl px-5 py-20 sm:px-8">
          <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
            <div>
              <p className="text-[11px] tracking-[0.3em] text-muted-foreground uppercase">
                How it works
              </p>
              <h2 className="mt-3 font-display text-3xl font-semibold sm:text-4xl">
                三步，把灯点亮
              </h2>
              <p className="mt-3 max-w-sm text-sm leading-relaxed text-muted-foreground">
                不需要复杂的配置。带上你的故事，剩下的交给酒馆。
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {STEPS.map((step) => (
                <div
                  key={step.index}
                  className="relative rounded-2xl border border-border/60 bg-card/30 p-5"
                >
                  <span className="font-display text-3xl text-primary/40">
                    {step.index}
                  </span>
                  <h3 className="mt-3 text-sm font-medium">{step.title}</h3>
                  <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                    {step.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto w-full max-w-6xl px-5 pb-24 sm:px-8">
          <div className="relative overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/[0.12] via-card/40 to-accent/[0.1] px-6 py-14 text-center sm:px-12">
            <div className="pointer-events-none absolute -top-24 left-1/2 size-72 -translate-x-1/2 rounded-full bg-primary/20 blur-[100px]" />
            <Wine className="relative mx-auto size-8 text-primary" />
            <h2 className="relative mt-4 font-display text-3xl font-semibold sm:text-4xl">
              炉火还温着，就差你了
            </h2>
            <p className="relative mx-auto mt-3 max-w-lg text-sm leading-relaxed text-muted-foreground">
              用邀请码领取一张酒馆席位。今晚的故事，从你推门的那一刻开始。
            </p>
            <div className="relative mt-7 flex flex-wrap items-center justify-center gap-3">
              <Button asChild size="lg" className="h-11 rounded-xl px-5 shadow-glow">
                <Link href={loggedIn ? "/chats" : "/register"}>
                  {loggedIn ? "回到酒馆" : "领取席位"}
                  <ArrowRight data-icon="inline-end" />
                </Link>
              </Button>
              <Button variant="outline" size="lg" asChild className="h-11 rounded-xl px-5">
                <Link href="/login">我已有席位</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border/50">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-3 px-5 py-7 text-xs text-muted-foreground sm:flex-row sm:px-8">
          <BrandLockup compact className="opacity-80" />
          <p>醉语 · 私人叙事酒馆 · 只在夜里营业</p>
          <p>© {new Date().getFullYear()} Jiuguan</p>
        </div>
      </footer>
    </div>
  );
}
