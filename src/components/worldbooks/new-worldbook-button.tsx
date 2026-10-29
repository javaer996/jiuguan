"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { BookOpen, Loader2, Plus } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ApiClientError, apiFetch } from "@/lib/client/api";
import type { WorldbookDTO } from "@/lib/types/content";

export function NewWorldbookButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading || !name.trim()) return;

    setLoading(true);
    try {
      const result = await apiFetch<{ worldbook: WorldbookDTO }>(
        "/api/worldbooks",
        {
          method: "POST",
          body: JSON.stringify({
            name: name.trim(),
            description: description.trim() || null,
          }),
        },
      );
      toast.success("世界书已创建");
      setOpen(false);
      setName("");
      setDescription("");
      router.push(`/worldbooks/${result.worldbook.id}`);
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof ApiClientError
          ? error.message
          : "创建失败，请稍后再试",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="rounded-xl shadow-glow">
          <Plus data-icon="inline-start" />
          新建世界书
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display">
            <BookOpen className="size-4 text-primary" />
            新建世界书
          </DialogTitle>
          <DialogDescription>
            世界书决定故事里的规则、地点与人物关系。先起一个名字，之后可以慢慢补充条目。
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="worldbook-name">名称</Label>
            <Input
              id="worldbook-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="例如：雾港设定集"
              maxLength={80}
              autoFocus
              className="h-10 rounded-xl"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="worldbook-description">
              简介
              <span className="text-xs font-normal text-muted-foreground">
                （选填）
              </span>
            </Label>
            <Textarea
              id="worldbook-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="这个世界的基本氛围与背景…"
              className="min-h-20 rounded-xl"
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              className="rounded-xl"
            >
              取消
            </Button>
            <Button
              type="submit"
              disabled={loading || !name.trim()}
              className="rounded-xl"
            >
              {loading && <Loader2 className="animate-spin" />}
              创建并开始编辑
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
