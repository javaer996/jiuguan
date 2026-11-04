"use client";

import { useState } from "react";
import { Loader2, UserRound } from "lucide-react";
import { toast } from "sonner";
import { Field } from "@/components/common/field";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { ApiClientError, apiFetch } from "@/lib/client/api";

export type PersonaEditorValue = {
  id: string;
  name: string;
  description?: string | null;
  avatarUrl?: string | null;
  isDefault?: boolean;
};

/**
 * 新建或编辑用户身份。
 * 父组件应在每次打开时重新挂载（用 key），让输入框从最新数据初始化。
 */
export function PersonaEditorDialog({
  persona,
  initialName = "",
  initialDescription = "",
  onClose,
  onSaved,
}: {
  /** 传入时编辑，不传时新建。 */
  persona?: PersonaEditorValue | null;
  initialName?: string;
  initialDescription?: string;
  onClose: () => void;
  onSaved: (persona: PersonaEditorValue) => void;
}) {
  const [name, setName] = useState(persona?.name ?? initialName);
  const [description, setDescription] = useState(
    persona?.description ?? initialDescription,
  );
  const [isDefault, setIsDefault] = useState(persona?.isDefault ?? false);
  const [saving, setSaving] = useState(false);

  const editing = Boolean(persona);

  async function save() {
    if (saving) return;
    if (!name.trim()) {
      toast.error("先给身份起个名字");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        description: description.trim() || null,
        isDefault,
      };
      const result = await apiFetch<{ persona: PersonaEditorValue }>(
        editing ? `/api/personas/${persona!.id}` : "/api/personas",
        {
          method: editing ? "PATCH" : "POST",
          body: JSON.stringify(payload),
        },
      );
      toast.success(editing ? "用户身份已更新" : "用户身份已创建");
      onSaved(result.persona);
      onClose();
    } catch (error) {
      toast.error(
        error instanceof ApiClientError
          ? error.message
          : "保存失败，请稍后再试",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !saving) onClose();
      }}
    >
      <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display">
            <UserRound className="size-4 text-primary" />
            {editing ? "编辑用户身份" : "新建用户身份"}
          </DialogTitle>
          <DialogDescription>
            身份名称会替换对话里的 {"{{user}}"} 占位符；身份特点会随设定一起发给
            AI，让角色知道你是谁。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Field
            label="身份名称"
            hint={`${name.length}/48`}
            htmlFor="persona-name"
          >
            <Input
              id="persona-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={48}
              placeholder="例如：旅人"
              className="rounded-xl bg-background/50"
            />
          </Field>

          <Field
            label="身份特点"
            hint={`${description.length}/20000`}
            htmlFor="persona-description"
          >
            <Textarea
              id="persona-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              maxLength={20_000}
              rows={6}
              placeholder="外貌、性格、背景、能力、与角色的关系，以及希望 AI 记住的设定……"
              className="rounded-xl bg-background/50 text-xs leading-relaxed"
            />
          </Field>

          <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-border/60 bg-background/25 px-3 py-2.5">
            <span>
              <span className="block text-xs font-medium">设为默认身份</span>
              <span className="mt-0.5 block text-[10px] text-muted-foreground">
                没有单独指定身份的对话会使用它
              </span>
            </span>
            <Switch checked={isDefault} onCheckedChange={setIsDefault} />
          </label>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={saving}
            className="rounded-xl"
          >
            取消
          </Button>
          <Button
            type="button"
            onClick={() => void save()}
            disabled={saving || !name.trim()}
            className="rounded-xl shadow-glow"
          >
            {saving ? (
              <Loader2 data-icon="inline-start" className="animate-spin" />
            ) : null}
            {saving ? "保存中…" : editing ? "保存修改" : "创建身份"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
