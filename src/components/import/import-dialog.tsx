"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BookOpen,
  FileJson,
  Image as ImageIcon,
  Loader2,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ApiClientError, apiFetch } from "@/lib/client/api";
import { cn } from "@/lib/utils";

type ImportKind = "character" | "worldbook";

type CharacterImportResponse = {
  character: { id: string; name: string; href: string };
  worldbook: { id: string; name: string; href: string } | null;
  avatarUrl: string | null;
};

type WorldbookImportResponse = {
  worldbook: { id: string; name: string; href: string; entryCount: number };
};

const COPY: Record<
  ImportKind,
  { title: string; description: string; accept: string; hint: string }
> = {
  character: {
    title: "导入角色卡",
    description:
      "支持 SillyTavern V1 / V2 / V3 角色卡。PNG 会读取内嵌的角色数据，并把图片保存为头像。",
    accept: ".png,.json,image/png,application/json",
    hint: "PNG 或 JSON · 最大 8 MB",
  },
  worldbook: {
    title: "导入世界书",
    description:
      "支持 SillyTavern 世界书 JSON，也可以直接导入角色卡里附带的 character_book。",
    accept: ".json,application/json",
    hint: "JSON · 最大 8 MB",
  },
};

export function ImportDialog({ kind }: { kind: ImportKind }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  const copy = COPY[kind];

  function reset() {
    setFile(null);
    setBusy(false);
    if (inputRef.current) inputRef.current.value = "";
  }

  async function submit() {
    if (!file || busy) return;
    setBusy(true);
    try {
      const body = new FormData();
      body.append("file", file);

      if (kind === "character") {
        const data = await apiFetch<CharacterImportResponse>(
          "/api/import/character",
          { method: "POST", body },
        );
        toast.success(
          data.worldbook
            ? `已导入「${data.character.name}」与附带世界书`
            : `已导入「${data.character.name}」`,
        );
        setOpen(false);
        reset();
        router.push(data.character.href);
        router.refresh();
      } else {
        const data = await apiFetch<WorldbookImportResponse>(
          "/api/import/worldbook",
          { method: "POST", body },
        );
        toast.success(
          `已导入「${data.worldbook.name}」，共 ${data.worldbook.entryCount} 个条目`,
        );
        setOpen(false);
        reset();
        router.push(data.worldbook.href);
        router.refresh();
      }
    } catch (error) {
      toast.error(error instanceof ApiClientError ? error.message : "导入失败");
      setBusy(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" className="rounded-xl">
          <Upload data-icon="inline-start" />
          导入
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{copy.title}</DialogTitle>
          <DialogDescription>{copy.description}</DialogDescription>
        </DialogHeader>

        <div className="py-2">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            className={cn(
              "flex w-full flex-col items-center justify-center gap-2 rounded-2xl border border-dashed px-4 py-9 text-center transition-colors",
              file
                ? "border-primary/40 bg-primary/[0.06]"
                : "border-border/70 bg-background/30 hover:border-primary/35 hover:bg-primary/[0.03]",
            )}
          >
            <span className="flex size-11 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
              {kind === "character" ? (
                <ImageIcon className="size-5" />
              ) : (
                <BookOpen className="size-5" />
              )}
            </span>
            <span className="text-sm font-medium">
              {file ? file.name : "点击选择文件"}
            </span>
            <span className="text-[11px] text-muted-foreground">
              {file
                ? `${(file.size / 1024).toFixed(1)} KB`
                : copy.hint}
            </span>
          </button>
          <input
            ref={inputRef}
            type="file"
            accept={copy.accept}
            className="hidden"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          />
          <p className="mt-3 flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <FileJson className="size-3" />
            导入的内容会保存为你的私有资产，不会自动公开。
          </p>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={busy}
            className="rounded-xl"
          >
            取消
          </Button>
          <Button
            onClick={() => void submit()}
            disabled={!file || busy}
            className="rounded-xl"
          >
            {busy ? (
              <Loader2 data-icon="inline-start" className="animate-spin" />
            ) : (
              <Upload data-icon="inline-start" />
            )}
            {busy ? "导入中…" : "开始导入"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
