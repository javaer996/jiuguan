import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth/login-form";
import { getCurrentUser } from "@/lib/auth/session";
import { getSiteNotice } from "@/lib/settings";

export const metadata: Metadata = {
  title: "登录",
};

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[] }>;
}) {
  const user = await getCurrentUser();
  if (user) redirect("/chats");

  const params = await searchParams;
  const raw = Array.isArray(params.next) ? params.next[0] : params.next;
  const next =
    raw && raw.startsWith("/") && !raw.startsWith("//") ? raw : "/chats";

  const siteNotice = await getSiteNotice();

  return <LoginForm next={next} siteNotice={siteNotice} />;
}
