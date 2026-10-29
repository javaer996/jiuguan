import type { Metadata } from "next";
import { AdminSettingsForm } from "@/components/admin/admin-settings-form";
import { PageHeader } from "@/components/common/page-header";
import { requireUserPage } from "@/lib/auth/page";
import { getSettings, SETTING_KEYS } from "@/lib/settings";
import type { AdminSettingsDTO } from "@/lib/types/admin";

export const metadata: Metadata = {
  title: "系统设置",
};

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  await requireUserPage("/admin/settings");

  const values = await getSettings({
    [SETTING_KEYS.registrationEnabled]: true,
    [SETTING_KEYS.inviteRequired]: true,
    [SETTING_KEYS.siteNotice]: "",
  });

  const settings: AdminSettingsDTO = {
    registrationEnabled: Boolean(values[SETTING_KEYS.registrationEnabled]),
    inviteRequired: Boolean(values[SETTING_KEYS.inviteRequired]),
    siteNotice:
      typeof values[SETTING_KEYS.siteNotice] === "string"
        ? values[SETTING_KEYS.siteNotice]
        : "",
  };

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-7 sm:px-6 lg:px-10 lg:py-10">
      <PageHeader
        eyebrow="Admin · Settings"
        title="系统设置"
        description="控制注册入口与站点公告。修改会立即生效，并记录在审计日志中。"
      />

      <div className="mt-6">
        <AdminSettingsForm initial={settings} />
      </div>
    </div>
  );
}
