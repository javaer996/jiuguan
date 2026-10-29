"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { ApiClientError, apiFetch } from "@/lib/client/api";
import type { AdminSettingsDTO } from "@/lib/types/admin";

export function AdminSettingsForm({
  initial,
}: {
  initial: AdminSettingsDTO;
}) {
  const router = useRouter();
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);

  async function save() {
    if (saving) return;
    setSaving(true);
    try {
      const data = await apiFetch<{ settings: AdminSettingsDTO }>(
        "/api/admin/settings",
        {
          method: "PATCH",
          body: JSON.stringify(form),
        },
      );
      setForm(data.settings);
      toast.success("系统设置已保存");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof ApiClientError ? error.message : "保存失败");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-border/60 bg-card/30 p-5">
        <h2 className="font-display text-base font-medium">注册与邀请</h2>
        <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
          关闭注册后，登录页仍可访问，但注册接口会拒绝新账号。邀请码开关只影响新注册。
        </p>

        <div className="mt-4 space-y-3">
          <div className="flex items-center justify-between gap-4 rounded-xl border border-border/50 bg-background/30 px-3.5 py-3">
            <div>
              <Label htmlFor="registration-enabled" className="text-xs">
                开放注册
              </Label>
              <p className="mt-0.5 text-[10px] text-muted-foreground">
                允许新用户通过注册页创建账号
              </p>
            </div>
            <Switch
              id="registration-enabled"
              checked={form.registrationEnabled}
              onCheckedChange={(checked) =>
                setForm((previous) => ({
                  ...previous,
                  registrationEnabled: checked,
                }))
              }
            />
          </div>

          <div className="flex items-center justify-between gap-4 rounded-xl border border-border/50 bg-background/30 px-3.5 py-3">
            <div>
              <Label htmlFor="invite-required" className="text-xs">
                注册需要邀请码
              </Label>
              <p className="mt-0.5 text-[10px] text-muted-foreground">
                关闭后任何人都可以直接注册
              </p>
            </div>
            <Switch
              id="invite-required"
              checked={form.inviteRequired}
              onCheckedChange={(checked) =>
                setForm((previous) => ({
                  ...previous,
                  inviteRequired: checked,
                }))
              }
            />
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-border/60 bg-card/30 p-5">
        <h2 className="font-display text-base font-medium">站点公告</h2>
        <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
          会显示在登录页与注册页顶部，适合写维护通知或一句话欢迎语。留空则不显示。
        </p>
        <Textarea
          value={form.siteNotice}
          onChange={(event) =>
            setForm((previous) => ({
              ...previous,
              siteNotice: event.target.value,
            }))
          }
          placeholder="例如：本周六凌晨 2:00-4:00 进行维护，酒馆暂不营业。"
          maxLength={2000}
          className="mt-3 min-h-28 rounded-xl bg-background/50 leading-relaxed"
        />
        <p className="mt-1 text-right text-[10px] text-muted-foreground">
          {form.siteNotice.length}/2000
        </p>
      </section>

      <div className="flex justify-end">
        <Button
          onClick={() => void save()}
          disabled={saving}
          className="rounded-xl shadow-glow"
        >
          {saving ? (
            <Loader2 data-icon="inline-start" className="animate-spin" />
          ) : (
            <Save data-icon="inline-start" />
          )}
          {saving ? "保存中…" : "保存设置"}
        </Button>
      </div>
    </div>
  );
}
