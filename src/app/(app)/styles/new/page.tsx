import type { Metadata } from "next";
import { StyleEditor } from "@/components/styles/style-editor";
import { requireUserPage } from "@/lib/auth/page";

export const metadata: Metadata = {
  title: "新建对话样式",
};

export const dynamic = "force-dynamic";

export default async function NewStylePage() {
  await requireUserPage("/styles/new");
  return <StyleEditor />;
}
