import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { RegisterForm } from "@/components/auth/register-form";
import { getCurrentUser } from "@/lib/auth/session";
import { getRegistrationPolicy, getSiteNotice } from "@/lib/settings";

export const metadata: Metadata = {
  title: "注册",
};

export const dynamic = "force-dynamic";

export default async function RegisterPage() {
  const user = await getCurrentUser();
  if (user) redirect("/chats");

  const [policy, siteNotice] = await Promise.all([
    getRegistrationPolicy(),
    getSiteNotice(),
  ]);

  return (
    <RegisterForm
      inviteRequired={policy.inviteRequired}
      registrationClosed={!policy.enabled}
      siteNotice={siteNotice}
    />
  );
}
