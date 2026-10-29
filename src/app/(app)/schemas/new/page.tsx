import type { Metadata } from "next";
import { SchemaEditor } from "@/components/schemas/schema-editor";
import { requireUserPage } from "@/lib/auth/page";

export const metadata: Metadata = {
  title: "新建输出格式",
};

export const dynamic = "force-dynamic";

export default async function NewSchemaPage() {
  await requireUserPage("/schemas/new");
  return <SchemaEditor />;
}
