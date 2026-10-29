import type { Metadata } from "next";
import { ThemeEditor } from "@/components/themes/theme-editor";
import { requireUserPage } from "@/lib/auth/page";

export const metadata: Metadata = {
  title: "新建主题",
};

export const dynamic = "force-dynamic";

export default async function NewThemePage() {
  await requireUserPage("/themes/new");
  return <ThemeEditor />;
}
