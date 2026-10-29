"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ApiClientError, apiFetch } from "@/lib/client/api";

export type SubmissionTemplateOption = {
  id: string;
  name: string;
  characterName: string | null;
  worldbookCount: number;
};

export type SubmissionCategoryOption = {
  id: string;
  name: string;
};

type SubmissionFormProps = {
  templates: SubmissionTemplateOption[];
  categories: SubmissionCategoryOption[];
  initial?: {
    plazaTemplateId?: string;
    templateId?: string;
    title?: string;
    summary?: string;
    categoryId?: string;
    tags?: string[];
  };
};

export function SubmissionForm({
  templates,
  categories,
  initial,
}: SubmissionFormProps) {
  const router = useRouter();
  const [templateId, setTemplateId] = useState(initial?.templateId ?? "");
  const [title, setTitle] = useState(initial?.title ?? "");
  const [summary, setSummary] = useState(initial?.summary ?? "");
  const [categoryId, setCategoryId] = useState(initial?.categoryId ?? "");
  const [tags, setTags] = useState((initial?.tags ?? []).join("，"));
  const [changelog, setChangelog] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function handleTemplateChange(value: string) {
    setTemplateId(value);
    const selected = templates.find((item) => item.id === value);
    if (selected && !title.trim()) {
      setTitle(selected.name);
    }
  }

  async function submit() {
    if (submitting) return;
    if (!templateId) {
      toast.error("请先选择一套对话模板");
      return;
    }
    if (!title.trim()) {
      toast.error("请填写情景标题");
      return;
    }

    const tagList = tags
      .split(/[,，]/)
      .map((tag) => tag.trim())
      .filter(Boolean)
      .slice(0, 8);

    setSubmitting(true);
    try {
      await apiFetch("/api/plaza/submissions", {
        method: "POST",
        body: JSON.stringify({
          templateId,
          plazaTemplateId: initial?.plazaTemplateId ?? null,
          title: title.trim(),
          summary: summary.trim() || undefined,
          categoryId: categoryId || null,
          tags: tagList,
          changelog: changelog.trim() || undefined,
        }),
      });
      toast.success(
        initial?.plazaTemplateId
          ? "新版本已提交，等待掌柜审核"
          : "投稿已提交，等待掌柜审核",
      );
      router.push("/plaza/submit");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof ApiClientError ? error.message : "投稿失败");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="rounded-2xl border border-border/60 bg-card/30 p-5 sm:p-6">
      {initial?.plazaTemplateId && (
        <div className="mb-5 rounded-xl border border-primary/20 bg-primary/5 px-3.5 py-2.5 text-xs text-primary">
          正在为已有投稿提交新版本。审核通过后，广场会切换到新版本。
        </div>
      )}

      <div className="space-y-5">
        <div className="space-y-2">
          <Label>来源模板</Label>
          <Select value={templateId} onValueChange={handleTemplateChange}>
            <SelectTrigger className="w-full rounded-xl">
              <SelectValue placeholder="选择一套「我的对话模板」" />
            </SelectTrigger>
            <SelectContent>
              {templates.map((template) => (
                <SelectItem key={template.id} value={template.id}>
                  {template.name}
                  {template.characterName ? ` · ${template.characterName}` : ""}
                  {template.worldbookCount > 0
                    ? ` · ${template.worldbookCount} 本世界书`
                    : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-[11px] text-muted-foreground">
            投稿会冻结当前模板的角色、世界书、提示词、样式与输出格式，之后的修改不会影响已提交版本。
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="plaza-title">情景标题</Label>
            <Input
              id="plaza-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              maxLength={80}
              placeholder="例如：雾港最后一班渡轮"
              className="rounded-xl"
            />
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="plaza-summary">一句话简介</Label>
            <Textarea
              id="plaza-summary"
              value={summary}
              onChange={(event) => setSummary(event.target.value)}
              maxLength={500}
              placeholder="告诉旅人，这扇门后是什么样的故事。"
              className="min-h-20 resize-none rounded-xl"
            />
          </div>

          <div className="space-y-2">
            <Label>分类</Label>
            <Select
              value={categoryId || "none"}
              onValueChange={(value) =>
                setCategoryId(value === "none" ? "" : value)
              }
            >
              <SelectTrigger className="w-full rounded-xl">
                <SelectValue placeholder="选择分类" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">不分类</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="plaza-tags">标签</Label>
            <Input
              id="plaza-tags"
              value={tags}
              onChange={(event) => setTags(event.target.value)}
              placeholder="用逗号分隔，最多 8 个"
              className="rounded-xl"
            />
          </div>

          {initial?.plazaTemplateId && (
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="plaza-changelog">版本说明</Label>
              <Input
                id="plaza-changelog"
                value={changelog}
                onChange={(event) => setChangelog(event.target.value)}
                maxLength={500}
                placeholder="这一版改了什么？（可选）"
                className="rounded-xl"
              />
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-border/50 pt-4">
          <p className="text-[11px] text-muted-foreground">
            提交后由管理员审核，通过后才会出现在广场。
          </p>
          <Button
            onClick={() => void submit()}
            disabled={submitting}
            className="rounded-xl shadow-glow"
          >
            {submitting ? (
              <Loader2 data-icon="inline-start" className="animate-spin" />
            ) : (
              <Send data-icon="inline-start" />
            )}
            提交审核
          </Button>
        </div>
      </div>
    </div>
  );
}
