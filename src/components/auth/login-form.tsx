"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  Eye,
  EyeOff,
  Loader2,
  LogIn,
  Megaphone,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiClientError, apiFetch } from "@/lib/client/api";

type LoginResponse = {
  user: { id: string; displayName: string; username: string };
};

export function LoginForm({
  next,
  siteNotice = "",
}: {
  next: string;
  siteNotice?: string;
}) {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;

    setLoading(true);
    setError(null);

    try {
      await apiFetch<LoginResponse>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ identifier, password, remember }),
      });
      router.push(next);
      router.refresh();
    } catch (err) {
      setError(
        err instanceof ApiClientError
          ? err.message
          : "登录失败，请稍后再试",
      );
      setLoading(false);
    }
  }

  return (
    <div className="animate-fade-in">
      <div className="mb-8">
        <p className="text-xs tracking-[0.3em] text-muted-foreground uppercase">
          Welcome back
        </p>
        <h1 className="mt-3 font-display text-3xl font-semibold">
          推开酒馆的门
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          炉火还温着，你的故事正等你继续。
        </p>
      </div>

      {siteNotice && (
        <div className="mb-5 flex items-start gap-2 rounded-xl border border-primary/20 bg-primary/5 px-3.5 py-2.5 text-xs leading-relaxed text-muted-foreground">
          <Megaphone className="mt-0.5 size-3.5 shrink-0 text-primary" />
          <span>{siteNotice}</span>
        </div>
      )}

      {error && (
        <Alert
          variant="destructive"
          className="mb-5 border-destructive/30 bg-destructive/10"
        >
          <AlertCircle />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="identifier">用户名或邮箱</Label>
          <Input
            id="identifier"
            name="identifier"
            autoComplete="username"
            placeholder="admin"
            value={identifier}
            onChange={(event) => setIdentifier(event.target.value)}
            className="h-11 rounded-xl bg-background/50"
            required
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">密码</Label>
            <span className="text-xs text-muted-foreground">
              忘记密码请联系掌柜
            </span>
          </div>
          <div className="relative">
            <Input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="h-11 rounded-xl bg-background/50 pr-11"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              className="absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
              aria-label={showPassword ? "隐藏密码" : "显示密码"}
            >
              {showPassword ? (
                <EyeOff className="size-4" />
              ) : (
                <Eye className="size-4" />
              )}
            </button>
          </div>
        </div>

        <label className="flex w-fit cursor-pointer items-center gap-2.5 text-sm text-muted-foreground">
          <Checkbox
            checked={remember}
            onCheckedChange={(value) => setRemember(value === true)}
          />
          三十天内记住我
        </label>

        <Button
          type="submit"
          size="lg"
          disabled={loading}
          className="h-11 w-full rounded-xl text-sm font-medium shadow-glow"
        >
          {loading ? (
            <Loader2 className="animate-spin" />
          ) : (
            <LogIn data-icon="inline-start" />
          )}
          {loading ? "正在推门…" : "进入酒馆"}
        </Button>
      </form>

      <div className="mt-7 flex items-center justify-between text-sm">
        <span className="text-muted-foreground">第一次来？</span>
        <Link
          href="/register"
          className="font-medium text-primary underline-offset-4 hover:underline"
        >
          用邀请码入座
        </Link>
      </div>
    </div>
  );
}
