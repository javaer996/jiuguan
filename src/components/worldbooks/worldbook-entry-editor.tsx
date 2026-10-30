"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ChevronDown,
  Loader2,
  Save,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { TagInput } from "@/components/common/tag-input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { ApiClientError, apiFetch } from "@/lib/client/api";
import type { WorldbookEntryDTO } from "@/lib/types/content";

type EntryDraft = {
  name: string;
  keys: string[];
  secondaryKeys: string[];
  content: string;
  constant: boolean;
  selective: boolean;
  selectiveLogic: string;
  position: string;
  depth: number;
  sortOrder: number;
  probability: number;
  useProbability: boolean;
  enabled: boolean;
  /** null 表示继承世界书 */
  caseSensitive: boolean | null;
  /** null 表示继承世界书 */
  matchWholeWords: boolean | null;
  groupName: string;
  groupWeight: number;
  excludeRecursion: boolean;
  preventRecursion: boolean;
  delayUntilRecursion: boolean;
  scanDepth: number | null;
  tokenBudget: number | null;
};

function toDraft(entry: WorldbookEntryDTO): EntryDraft {
  return {
    name: entry.name,
    keys: entry.keys ?? [],
    secondaryKeys: entry.secondaryKeys ?? [],
    content: entry.content,
    constant: entry.constant,
    selective: entry.selective,
    selectiveLogic: entry.selectiveLogic,
    position: entry.position,
    depth: entry.depth,
    sortOrder: entry.sortOrder,
    probability: entry.probability,
    useProbability: entry.useProbability,
    enabled: entry.enabled,
    caseSensitive: entry.caseSensitive,
    matchWholeWords: entry.matchWholeWords,
    groupName: entry.groupName ?? "",
    groupWeight: entry.groupWeight,
    excludeRecursion: entry.excludeRecursion,
    preventRecursion: entry.preventRecursion,
    delayUntilRecursion: entry.delayUntilRecursion,
    scanDepth: entry.scanDepth,
    tokenBudget: entry.tokenBudget,
  };
}

const POSITIONS = [
  { value: "before_char", label: "角色设定之前" },
  { value: "after_char", label: "角色设定之后" },
  { value: "before_an", label: "作者注之前" },
  { value: "after_an", label: "作者注之后" },
  { value: "at_depth", label: "指定深度" },
  { value: "top", label: "上下文顶部" },
  { value: "bottom", label: "上下文底部" },
];

const LOGIC = [
  { value: "and_any", label: "任一关键词" },
  { value: "and_all", label: "全部关键词" },
  { value: "not_all", label: "并非全部" },
  { value: "not_any", label: "不含任一" },
];

function NumberField({
  label,
  value,
  onChange,
  min,
  max,
  hint,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  hint?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <Input
        type="number"
        value={Number.isFinite(value) ? value : 0}
        min={min}
        max={max}
        onChange={(event) => {
          const parsed = Number(event.target.value);
          onChange(Number.isFinite(parsed) ? parsed : 0);
        }}
        className="h-9 rounded-xl bg-background/50"
      />
      {hint && <p className="text-[10px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  onCheckedChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-3 rounded-xl border border-border/50 bg-background/30 px-3 py-2.5">
      <span>
        <span className="block text-xs font-medium">{label}</span>
        <span className="mt-0.5 block text-[10px] leading-relaxed text-muted-foreground">
          {description}
        </span>
      </span>
      <Switch
        checked={checked}
        onCheckedChange={onCheckedChange}
        className="mt-0.5"
      />
    </label>
  );
}

function InheritSelect({
  label,
  description,
  value,
  inheritedValue,
  onChange,
}: {
  label: string;
  description: string;
  value: boolean | null;
  inheritedValue: boolean;
  onChange: (value: boolean | null) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-border/50 bg-background/30 px-3 py-2.5">
      <span className="min-w-0">
        <span className="block text-xs font-medium">{label}</span>
        <span className="mt-0.5 block text-[10px] leading-relaxed text-muted-foreground">
          {description}
        </span>
      </span>
      <Select
        value={value === null ? "inherit" : value ? "on" : "off"}
        onValueChange={(next) =>
          onChange(next === "inherit" ? null : next === "on")
        }
      >
        <SelectTrigger className="h-8 w-[8.5rem] shrink-0 rounded-lg bg-background/50 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="inherit">
            继承世界书（{inheritedValue ? "开启" : "关闭"}）
          </SelectItem>
          <SelectItem value="on">开启</SelectItem>
          <SelectItem value="off">关闭</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}

export function WorldbookEntryEditor({
  worldbookId,
  entry,
  bookCaseSensitive,
  bookMatchWholeWords,
  onSaved,
  onDeleted,
  onDirtyChange,
}: {
  worldbookId: string;
  entry: WorldbookEntryDTO;
  bookCaseSensitive: boolean;
  bookMatchWholeWords: boolean;
  onSaved: (entry: WorldbookEntryDTO) => void;
  onDeleted: (entryId: string) => void;
  onDirtyChange: (dirty: boolean) => void;
}) {
  const initialDraft = useMemo(() => toDraft(entry), [entry]);
  const [draft, setDraft] = useState<EntryDraft>(initialDraft);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const dirty = useMemo(
    () => JSON.stringify(draft) !== JSON.stringify(initialDraft),
    [draft, initialDraft],
  );

  useEffect(() => {
    onDirtyChange(dirty);
  }, [dirty, onDirtyChange]);

  useEffect(() => {
    if (!dirty) return;
    function handler(event: BeforeUnloadEvent) {
      event.preventDefault();
      event.returnValue = "";
    }
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  function set<K extends keyof EntryDraft>(key: K, value: EntryDraft[K]) {
    setDraft((previous) => ({ ...previous, [key]: value }));
  }

  async function handleSave() {
    if (saving) return;
    if (!draft.name.trim()) {
      toast.error("条目名称不能为空");
      return;
    }

    setSaving(true);
    try {
      const result = await apiFetch<{ entry: WorldbookEntryDTO }>(
        `/api/worldbooks/${worldbookId}/entries/${entry.id}`,
        {
          method: "PATCH",
          body: JSON.stringify({
            ...draft,
            name: draft.name.trim(),
            groupName: draft.groupName.trim() || null,
            uid: entry.uid,
            extensions: entry.extensions,
          }),
        },
      );
      toast.success("条目已保存");
      onSaved(result.entry);
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

  async function handleDelete() {
    if (deleting) return;
    setDeleting(true);
    try {
      await apiFetch(
        `/api/worldbooks/${worldbookId}/entries/${entry.id}`,
        { method: "DELETE" },
      );
      toast.success("条目已删除");
      onDeleted(entry.id);
    } catch (error) {
      toast.error(
        error instanceof ApiClientError ? error.message : "删除失败",
      );
      setDeleting(false);
    }
  }

  return (
    <div className="rounded-2xl border border-border/60 bg-card/30 p-5 sm:p-6">
      <div className="flex flex-col gap-3 border-b border-border/50 pb-5 sm:flex-row sm:items-center">
        <Input
          value={draft.name}
          onChange={(event) => set("name", event.target.value)}
          placeholder="条目名称"
          maxLength={128}
          className="h-10 flex-1 rounded-xl border-0 bg-transparent px-0 font-display text-lg shadow-none focus-visible:border-0 focus-visible:ring-0 dark:bg-transparent"
        />
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            启用
            <Switch
              checked={draft.enabled}
              onCheckedChange={(checked) => set("enabled", checked)}
            />
          </label>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="rounded-xl text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                aria-label="删除条目"
              >
                <Trash2 />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>删除这个条目？</AlertDialogTitle>
                <AlertDialogDescription>
                  「{entry.name}」会被永久删除，无法恢复。
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>取消</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => void handleDelete()}
                  disabled={deleting}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {deleting ? "删除中…" : "确认删除"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <div className="mt-5 space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-xs">主关键词</Label>
            <TagInput
              value={draft.keys}
              onChange={(keys) => set("keys", keys)}
              placeholder="雾港、灯塔、旧钟楼…"
            />
            <p className="text-[10px] text-muted-foreground">
              对话中出现任一关键词时，条目会被激活。
            </p>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">次关键词</Label>
            <TagInput
              value={draft.secondaryKeys}
              onChange={(keys) => set("secondaryKeys", keys)}
              placeholder="选填，用于更精确的触发"
            />
            <p className="text-[10px] text-muted-foreground">
              与主关键词按下方逻辑组合判断。
            </p>
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label className="text-xs">条目内容</Label>
            <span className="text-[10px] text-muted-foreground">
              {draft.content.length} 字
            </span>
          </div>
          <Textarea
            value={draft.content}
            onChange={(event) => set("content", event.target.value)}
            placeholder="把这个世界的一条设定、一个地点或一个人物关系写在这里…"
            className="min-h-56 rounded-xl bg-background/50 leading-relaxed"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1.5">
            <Label className="text-xs">注入位置</Label>
            <Select
              value={draft.position}
              onValueChange={(value) => set("position", value)}
            >
              <SelectTrigger className="h-9 w-full rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {POSITIONS.map((position) => (
                  <SelectItem key={position.value} value={position.value}>
                    {position.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">关键词逻辑</Label>
            <Select
              value={draft.selectiveLogic}
              onValueChange={(value) => set("selectiveLogic", value)}
            >
              <SelectTrigger className="h-9 w-full rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LOGIC.map((logic) => (
                  <SelectItem key={logic.value} value={logic.value}>
                    {logic.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <NumberField
            label="注入深度"
            value={draft.depth}
            min={0}
            max={100}
            onChange={(value) => set("depth", value)}
          />
          <NumberField
            label="排序权重"
            value={draft.sortOrder}
            min={-100000}
            max={100000}
            onChange={(value) => set("sortOrder", value)}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <NumberField
            label="触发概率 %"
            value={draft.probability}
            min={0}
            max={100}
            onChange={(value) => set("probability", value)}
            hint="仅在启用概率时生效"
          />
          <div className="sm:col-span-1 lg:col-span-3">
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              <ToggleRow
                label="常驻注入"
                description="无需关键词，每轮都发送。"
                checked={draft.constant}
                onCheckedChange={(checked) => set("constant", checked)}
              />
              <ToggleRow
                label="启用概率"
                description="按概率决定是否注入。"
                checked={draft.useProbability}
                onCheckedChange={(checked) => set("useProbability", checked)}
              />
              <ToggleRow
                label="需要次关键词"
                description="同时检查次关键词逻辑。"
                checked={draft.selective}
                onCheckedChange={(checked) => set("selective", checked)}
              />
            </div>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              <InheritSelect
                label="区分大小写"
                description="留空继承世界书；显式开启或关闭会覆盖世界书设置。"
                value={draft.caseSensitive}
                inheritedValue={bookCaseSensitive}
                onChange={(value) => set("caseSensitive", value)}
              />
              <InheritSelect
                label="全词匹配"
                description="留空继承世界书；仅匹配完整单词。"
                value={draft.matchWholeWords}
                inheritedValue={bookMatchWholeWords}
                onChange={(value) => set("matchWholeWords", value)}
              />
            </div>
          </div>
        </div>

        <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
          <CollapsibleTrigger asChild>
            <button
              type="button"
              className="flex w-full items-center justify-between rounded-xl border border-border/50 bg-background/30 px-3 py-2.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              高级选项
              <ChevronDown
                className={`size-3.5 transition-transform ${
                  advancedOpen ? "rotate-180" : ""
                }`}
              />
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-3 space-y-4 rounded-xl border border-border/50 bg-background/20 p-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-1.5">
                <Label className="text-xs">分组名称</Label>
                <Input
                  value={draft.groupName}
                  onChange={(event) => set("groupName", event.target.value)}
                  placeholder="选填"
                  className="h-9 rounded-xl bg-background/50"
                />
                <p className="text-[10px] leading-relaxed text-muted-foreground">
                  同组条目最终只注入一个，权重越高越容易被选中。
                </p>
              </div>
              <NumberField
                label="分组权重"
                value={draft.groupWeight}
                min={0}
                onChange={(value) => set("groupWeight", value)}
              />
              <div className="space-y-1.5">
                <Label className="text-xs">独立扫描深度</Label>
                <Input
                  type="number"
                  value={draft.scanDepth ?? ""}
                  min={0}
                  max={50}
                  onChange={(event) =>
                    set(
                      "scanDepth",
                      event.target.value === ""
                        ? null
                        : Number(event.target.value),
                    )
                  }
                  placeholder="继承世界书"
                  className="h-9 rounded-xl bg-background/50"
                />
                <p className="text-[10px] leading-relaxed text-muted-foreground">
                  留空继承世界书；只影响关键词扫描范围，0 按 1 条处理。
                </p>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">独立 Token 预算</Label>
                <Input
                  type="number"
                  value={draft.tokenBudget ?? ""}
                  min={0}
                  onChange={(event) =>
                    set(
                      "tokenBudget",
                      event.target.value === ""
                        ? null
                        : Number(event.target.value),
                    )
                  }
                  placeholder="继承世界书"
                  className="h-9 rounded-xl bg-background/50"
                />
                <p className="text-[10px] leading-relaxed text-muted-foreground">
                  留空继承世界书；条目内容超过预算时不会注入。
                </p>
              </div>
            </div>

            <div className="grid gap-2 sm:grid-cols-3">
              <ToggleRow
                label="排除递归"
                description="不会被递归扫描激活。"
                checked={draft.excludeRecursion}
                onCheckedChange={(checked) =>
                  set("excludeRecursion", checked)
                }
              />
              <ToggleRow
                label="阻止递归"
                description="本条目不会触发其他条目。"
                checked={draft.preventRecursion}
                onCheckedChange={(checked) =>
                  set("preventRecursion", checked)
                }
              />
              <ToggleRow
                label="延迟到递归"
                description="首次扫描不激活，只在递归时参与。"
                checked={draft.delayUntilRecursion}
                onCheckedChange={(checked) =>
                  set("delayUntilRecursion", checked)
                }
              />
            </div>
          </CollapsibleContent>
        </Collapsible>

        <div className="flex items-center justify-between gap-3 border-t border-border/50 pt-4">
          <span className="text-[11px] text-muted-foreground">
            {dirty ? "有未保存的修改" : "所有修改已保存"}
          </span>
          <Button
            onClick={() => void handleSave()}
            disabled={saving || !dirty}
            className="rounded-xl"
          >
            {saving ? (
              <Loader2 className="animate-spin" />
            ) : (
              <Save data-icon="inline-start" />
            )}
            {saving ? "保存中…" : "保存条目"}
          </Button>
        </div>
      </div>
    </div>
  );
}
