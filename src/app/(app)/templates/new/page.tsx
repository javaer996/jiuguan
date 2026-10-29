import type { Metadata } from "next";
import { TemplateEditor } from "@/components/templates/template-editor";
import { requireUserPage } from "@/lib/auth/page";
import { loadTemplateOptions } from "@/lib/content/template-options";

export const metadata: Metadata = {
  title: "新建对话模板",
};

export const dynamic = "force-dynamic";

export default async function NewTemplatePage() {
  const context = await requireUserPage("/templates/new");
  const options = await loadTemplateOptions(context.user.id);
  return <TemplateEditor options={options} />;
}
