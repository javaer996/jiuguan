"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  Eye,
  EyeOff,
  Loader2,
  Megaphone,
  Sparkles,
  UserPlus,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiClientError, apiFetch } from "@/lib/client/api";

type RegisterResponse = {
  user: { id: string; displayName: string; username: string };
};

export function RegisterForm({
  inviteRequired,
  registrationClosed,
  siteNotice = "",
}: {
  inviteRequired: boolean;
  registrationClosed: boolean;
  siteNotice?: string;
}) {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading || registrationClosed) return;

    if (password !== confirmPassword) {
      setError("两次输入的密码不一致");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await apiFetch<RegisterResponse>("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({
          username,
          displayName,
          email: email.trim() || undefined,
          password,
          inviteCode,
        }),
      });
      router.push("/chats");
      router.refresh();
    } catch (err) {
      if (err instanceof ApiClientError) {
        if (Array.isArray(err.details) && err.details.length > 0) {
          const first = err.details[0] as { message?: string };
          setError(first.message ?? err.message);
        } else {
          setError(err.message);
        }
      } else {
        setError("注册失败，请稍后再试");
      }
      setLoading(false);
    }
  }

  return (
    <div className="animate-fade-in">
      <div className="mb-7">
        <p className="text-xs tracking-[0.3em] text-muted-foreground uppercase">
          New traveler
        </p>
        <h1 className="mt-3 font-display text-3xl font-semibold">
          领取你的酒馆席位
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          每一个故事，都从一次推门开始。
        </p>
      </div>

      {siteNotice && (
        <div className="mb-5 flex items-start gap-2 rounded-xl border border-primary/20 bg-primary/5 px-3.5 py-2.5 text-xs leading-relaxed text-muted-foreground">
          <Megaphone className="mt-0.5 size-3.5 shrink-0 text-primary" />
          <span>{siteNotice}</span>
        </div>
      )}

      {registrationClosed && (
        <Alert className="mb-5 border-primary/30 bg-primary/10">
          <AlertCircle />
          <AlertDescription>
            当前暂未开放注册，请稍后再来，或联系掌柜获取邀请码。
          </AlertDescription>
        </Alert>
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

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="username">用户名</Label>
            <Input
              id="username"
              name="username"
              autoComplete="username"
              placeholder="luna_01"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              className="h-11 rounded-xl bg-background/50"
              minLength={3}
              maxLength={24}
              pattern="[a-zA-Z0-9_-]+"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="displayName">昵称</Label>
            <Input
              id="displayName"
              name="displayName"
              placeholder="月见"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              className="h-11 rounded-xl bg-background/50"
              maxLength={24}
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">
            邮箱
            <span className="text-xs font-normal text-muted-foreground">
              （选填）
            </span>
          </Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="h-11 rounded-xl bg-background/50"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">密码</Label>
          <div className="relative">
            <Input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              placeholder="至少 8 位"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="h-11 rounded-xl bg-background/50 pr-11"
              minLength={8}
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

        <div className="space-y-2">
          <Label htmlFor="confirmPassword">确认密码</Label>
          <Input
            id="confirmPassword"
            name="confirmPassword"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            placeholder="再输入一次"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            className="h-11 rounded-xl bg-background/50"
            minLength={8}
            required
          />
        </div>

        {inviteRequired && (
          <div className="space-y-2">
            <Label htmlFor="inviteCode">邀请码</Label>
            <Input
              id="inviteCode"
              name="inviteCode"
              placeholder="ANLG-TW4F-XM"
              value={inviteCode}
              onChange={(event) =>
                setInviteCode(event.target.value.toUpperCase())
              }
              className="h-11 rounded-xl border-primary/30 bg-primary/5 font-mono tracking-[0.18em] uppercase"
              maxLength={32}
              required
            />
            <p className="text-xs text-muted-foreground">
              邀请码由掌柜发放，不区分大小写。
            </p>
          </div>
        )}

        <Button
          type="submit"
          size="lg"
          disabled={loading || registrationClosed}
          className="mt-2 h-11 w-full rounded-xl text-sm font-medium shadow-glow"
        >
          {loading ? (
            <Loader2 className="animate-spin" />
          ) : (
            <UserPlus data-icon="inline-start" />
          )}
          {loading ? "正在安排座位…" : "领取席位"}
        </Button>
      </form>

      <div className="mt-6 flex items-center justify-between text-sm">
        <span className="text-muted-foreground">已经有席位？</span>
        <Link
          href="/login"
          className="inline-flex items-center gap-1.5 font-medium text-primary underline-offset-4 hover:underline"
        >
          <Sparkles className="size-3.5" />
          回到登录
        </Link>
      </div>
    </div>
  );
}
