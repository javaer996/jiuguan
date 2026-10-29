import type { Metadata } from "next";
import { CharacterEditor } from "@/components/characters/character-editor";
import { requireUserPage } from "@/lib/auth/page";

export const metadata: Metadata = {
  title: "新建角色",
};

export const dynamic = "force-dynamic";

export default async function NewCharacterPage() {
  await requireUserPage("/characters/new");
  return <CharacterEditor />;
}
