"use client";

import { useState, type FormEvent } from "react";
import { KeyRound, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiClientError, apiFetch } from "@/lib/client/api";

export function PasswordForm() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    if (newPassword !== confirmPassword) {
      toast.error("两次输入的新密码不一致");
      return;
    }

    setSaving(true);
    try {
      await apiFetch("/api/auth/password", {
        method: "POST",
        body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
      });
      toast.success("密码已更新，其他设备上的会话已注销");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error) {
      toast.error(
        error instanceof ApiClientError
          ? error.message
          : "修改失败，请稍后再试",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="space-y-2">
        <Label htmlFor="current-password">当前密码</Label>
        <Input
          id="current-password"
          type="password"
          autoComplete="current-password"
          value={currentPassword}
          onChange={(event) => setCurrentPassword(event.target.value)}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="new-password">新密码</Label>
        <Input
          id="new-password"
          type="password"
          autoComplete="new-password"
          value={newPassword}
          onChange={(event) => setNewPassword(event.target.value)}
          minLength={8}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="confirm-password">确认新密码</Label>
        <Input
          id="confirm-password"
          type="password"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          minLength={8}
          required
        />
      </div>
      <Button
        type="submit"
        variant="outline"
        className="w-full rounded-xl"
        disabled={saving}
      >
        {saving ? (
          <Loader2 data-icon="inline-start" className="animate-spin" />
        ) : (
          <KeyRound data-icon="inline-start" />
        )}
        更新密码
      </Button>
    </form>
  );
}
