"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  Braces,
  CheckCircle2,
  Loader2,
  Save,
  Sparkles,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Field } from "@/components/common/field";
import { EditorSection } from "@/components/common/editor-section";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { DEFAULT_OUTPUT_SCHEMA } from "@/lib/content/defaults";
import type { OutputSchemaDTO } from "@/lib/types/content";
import { cn } from "@/lib/utils";

const MODE_OPTIONS = [
  {
    value: "json_object",
    label: "JSON 对象",
    hint: "请求 response_format=json_object",
  },
  {
    value: "json_schema",
    label: "严格 JSON Schema",
    hint: "请求 response_format=json_schema",
  },
  { value: "text", label: "纯文本", hint: "不限制返回格式" },
] as const;

function pretty(value: unknown) {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return "";
  }
}

function buildSample(schema: unknown): unknown {
  if (!schema || typeof schema !== "object") return "示例";
  const node = schema as Record<string, unknown>;

  if (Array.isArray(node.enum) && node.enum.length > 0) return node.enum[0];
  if (node.default !== undefined) return node.default;

  const type = Array.isArray(node.type) ? node.type[0] : node.type;
  switch (type) {
    case "object": {
      const properties =
        node.properties && typeof node.properties === "object"
          ? (node.properties as Record<string, unknown>)
          : {};
      return Object.fromEntries(
        Object.entries(properties).map(([key, value]) => [key, buildSample(value)]),
      );
    }
    case "array":
      return [buildSample(node.items ?? { type: "string" })];
    case "number":
    case "integer":
      return 0;
    case "boolean":
      return true;
    case "null":
      return null;
    default:
      return "示例文本";
  }
}

function ValuePreview({ value }: { value: unknown }) {
  if (value == null) {
    return <span className="text-muted-foreground/60">—</span>;
  }
  if (typeof value === "boolean") {
    return <span>{value ? "是" : "否"}</span>;
  }
  if (typeof value === "number") {
    return <span className="font-mono">{value}</span>;
  }
  if (typeof value === "string") {
    return <p className="whitespace-pre-wrap leading-relaxed">{value}</p>;
  }
  if (Array.isArray(value)) {
    return (
      <div className="flex flex-wrap gap-1.5">
        {value.map((item, index) => (
          <Badge key={index} variant="secondary" className="font-normal">
            {typeof item === "string" ? item : pretty(item)}
          </Badge>
        ))}
      </div>
    );
  }
  return (
    <pre className="overflow-x-auto rounded-lg bg-secondary/40 p-3 font-mono text-[11px] leading-relaxed">
      {pretty(value)}
    </pre>
  );
}

function SamplePreview({
  schema,
  sample,
}: {
  schema: Record<string, unknown> | null;
  sample: unknown;
}) {
  const properties =
    schema && typeof schema === "object" && schema.properties
      ? (schema.properties as Record<string, Record<string, unknown>>)
      : null;

  if (sample && typeof sample === "object" && !Array.isArray(sample)) {
    const entries = Object.entries(sample as Record<string, unknown>);
    if (entries.length === 0) {
      return (
        <p className="text-xs text-muted-foreground">示例对象是空的。</p>
      );
    }
    return (
      <div className="space-y-3">
        {entries.map(([key, value]) => {
          const meta = properties?.[key];
          const title =
            (typeof meta?.title === "string" && meta.title) || key;
          const component = meta?.["x-ui"] as
            | { component?: string }
            | undefined;
          return (
            <div
              key={key}
              className="rounded-xl border border-border/60 bg-background/30 p-3"
            >
              <div className="mb-1.5 flex items-center gap-2">
                <span className="text-[11px] font-medium text-muted-foreground">
                  {title}
                </span>
                {component?.component && (
                  <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[9px] text-primary">
                    {component.component}
                  </span>
                )}
              </div>
              <div className="text-sm">
                <ValuePreview value={value} />
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border/60 bg-background/30 p-3 text-sm">
      <ValuePreview value={sample} />
    </div>
  );
}

type SchemaForm = {
  name: string;
  description: string;
  mode: "json_object" | "json_schema" | "text";
  strict: boolean;
  isDefault: boolean;
  schemaText: string;
  sampleText: string;
};

function toForm(schema?: OutputSchemaDTO): SchemaForm {
  return {
    name: schema?.name ?? "",
    description: schema?.description ?? "",
    mode: schema?.mode ?? "json_object",
    strict: schema?.strict ?? false,
    isDefault: schema?.isDefault ?? false,
    schemaText: pretty(schema?.schema ?? DEFAULT_OUTPUT_SCHEMA),
    sampleText: schema?.sample != null ? pretty(schema.sample) : "",
  };
}

export function SchemaEditor({ initial }: { initial?: OutputSchemaDTO }) {
  const router = useRouter();
  const isEdit = Boolean(initial);
  const [form, setForm] = useState<SchemaForm>(() => toForm(initial));
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const saveRef = useRef<() => void>(() => {});

  const parsedSchema = useMemo(() => {
    try {
      const value = JSON.parse(form.schemaText);
      if (value && typeof value === "object" && !Array.isArray(value)) {
        return { value: value as Record<string, unknown>, error: null };
      }
      return { value: null, error: "顶层必须是一个 JSON 对象" };
    } catch (error) {
      return {
        value: null,
        error: error instanceof Error ? error.message : "JSON 解析失败",
      };
    }
  }, [form.schemaText]);

  const parsedSample = useMemo(() => {
    if (!form.sampleText.trim()) return { value: undefined, error: null };
    try {
      return { value: JSON.parse(form.sampleText) as unknown, error: null };
    } catch (error) {
      return {
        value: undefined,
        error: error instanceof Error ? error.message : "JSON 解析失败",
      };
    }
  }, [form.sampleText]);

  function set<K extends keyof SchemaForm>(key: K, value: SchemaForm[K]) {
    setForm((previous) => ({ ...previous, [key]: value }));
  }

  function formatSchema() {
    if (!parsedSchema.value) {
      toast.error(parsedSchema.error ?? "JSON 格式不正确");
      return;
    }
    set("schemaText", pretty(parsedSchema.value));
  }

  function fillSample() {
    if (!parsedSchema.value) {
      toast.error("先修正 JSON Schema");
      return;
    }
    set("sampleText", pretty(buildSample(parsedSchema.value)));
    toast.success("已根据 Schema 生成示例");
  }

  async function handleSave() {
    if (saving) return;
    if (!form.name.trim()) {
      toast.error("先给输出格式起一个名字");
      return;
    }
    if (!parsedSchema.value) {
      toast.error(parsedSchema.error ?? "JSON Schema 不合法");
      return;
    }
    if (parsedSample.error) {
      toast.error("示例 JSON 格式不正确");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim() || null,
        schema: parsedSchema.value,
        sample: parsedSample.value,
        mode: form.mode,
        strict: form.strict,
        isDefault: form.isDefault,
      };

      const result = await apiFetch<{ schema: OutputSchemaDTO }>(
        isEdit ? `/api/schemas/${initial!.id}` : "/api/schemas",
        {
          method: isEdit ? "PATCH" : "POST",
          body: JSON.stringify(payload),
        },
      );

      toast.success(isEdit ? "输出格式已保存" : "输出格式已创建");
      if (!isEdit) {
        router.replace(`/schemas/${result.schema.id}`);
      }
      router.refresh();
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
    if (!initial || deleting) return;
    setDeleting(true);
    try {
      await apiFetch(`/api/schemas/${initial.id}`, { method: "DELETE" });
      toast.success("输出格式已删除");
      router.push("/schemas");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof ApiClientError ? error.message : "删除失败");
      setDeleting(false);
    }
  }

  useEffect(() => {
    saveRef.current = () => {
      void handleSave();
    };
  });

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        saveRef.current();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <div className="min-h-dvh">
      <div className="sticky top-16 z-20 border-b border-border/60 bg-background/80 backdrop-blur-xl lg:top-0">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-10">
          <div className="flex min-w-0 items-center gap-3">
            <Button asChild variant="ghost" size="icon" className="rounded-xl">
              <Link href="/schemas" aria-label="返回输出格式列表">
                <ArrowLeft />
              </Link>
            </Button>
            <div className="min-w-0">
              <p className="text-[10px] tracking-[0.22em] text-muted-foreground uppercase">
                Output schema
              </p>
              <h1 className="truncate font-display text-lg font-medium">
                {isEdit ? form.name || "未命名格式" : "新建输出格式"}
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isEdit && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="rounded-xl text-muted-foreground hover:text-destructive"
                    disabled={deleting}
                    aria-label="删除格式"
                  >
                    {deleting ? <Loader2 className="animate-spin" /> : <Trash2 />}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>删除这个输出格式？</AlertDialogTitle>
                    <AlertDialogDescription>
                      使用它的对话模板会失去引用，历史消息仍会保留已渲染的内容。
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>再想想</AlertDialogCancel>
                    <AlertDialogAction onClick={() => void handleDelete()}>
                      删除
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
            <Button
              onClick={() => void handleSave()}
              disabled={saving}
              className="rounded-xl shadow-glow"
            >
              {saving ? (
                <Loader2 data-icon="inline-start" className="animate-spin" />
              ) : (
                <Save data-icon="inline-start" />
              )}
              保存
            </Button>
          </div>
        </div>
      </div>

      <div className="mx-auto grid w-full max-w-6xl gap-5 px-4 py-7 sm:px-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:px-10 lg:py-10">
        <div className="space-y-5">
          <EditorSection title="基本信息" description="说明这份格式会用在怎样的场景。">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="名称">
                <Input
                  value={form.name}
                  maxLength={80}
                  placeholder="例如：叙事回复"
                  onChange={(event) => set("name", event.target.value)}
                />
              </Field>
              <Field label="返回模式">
                <Select
                  value={form.mode}
                  onValueChange={(value) =>
                    set("mode", value as SchemaForm["mode"])
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MODE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>
            <Field label="说明" hint="可选">
              <Textarea
                value={form.description}
                rows={2}
                placeholder="这份格式会把回复拆成旁白、对白与情绪……"
                onChange={(event) => set("description", event.target.value)}
              />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-border/60 bg-background/25 px-3 py-2.5">
                <div>
                  <p className="text-xs">严格模式</p>
                  <p className="mt-0.5 text-[10px] text-muted-foreground">
                    供应商支持时要求模型严格遵守 Schema
                  </p>
                </div>
                <Switch
                  checked={form.strict}
                  onCheckedChange={(checked) => set("strict", checked)}
                />
              </label>
              <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-border/60 bg-background/25 px-3 py-2.5">
                <div>
                  <p className="text-xs">设为默认</p>
                  <p className="mt-0.5 text-[10px] text-muted-foreground">
                    新对话默认使用这份格式
                  </p>
                </div>
                <Switch
                  checked={form.isDefault}
                  onCheckedChange={(checked) => set("isDefault", checked)}
                />
              </label>
            </div>
          </EditorSection>

          <EditorSection
            title="JSON Schema"
            description="支持 JSON Schema 2020-12。可用 x-ui 扩展指定渲染组件。"
            action={
              <Button
                variant="outline"
                size="sm"
                className="rounded-lg"
                onClick={formatSchema}
              >
                格式化
              </Button>
            }
          >
            <Textarea
              value={form.schemaText}
              rows={18}
              spellCheck={false}
              className="min-h-80 font-mono text-[12px] leading-relaxed"
              onChange={(event) => set("schemaText", event.target.value)}
            />
            <div
              className={cn(
                "flex items-start gap-2 rounded-lg px-3 py-2 text-[11px] leading-relaxed",
                parsedSchema.value
                  ? "bg-primary/[0.06] text-muted-foreground"
                  : "bg-destructive/10 text-destructive",
              )}
            >
              {parsedSchema.value ? (
                <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-primary" />
              ) : (
                <AlertCircle className="mt-0.5 size-3.5 shrink-0" />
              )}
              {parsedSchema.value
                ? "JSON 语法正确。保存时还会用 ajv 校验 Schema 是否可编译。"
                : parsedSchema.error}
            </div>
          </EditorSection>

          <EditorSection
            title="示例数据"
            description="用于在编辑器里预览渲染效果，也会作为 AI 的 few-shot 参考。"
            action={
              <Button
                variant="outline"
                size="sm"
                className="rounded-lg"
                onClick={fillSample}
              >
                <Sparkles data-icon="inline-start" />
                按 Schema 生成
              </Button>
            }
          >
            <Textarea
              value={form.sampleText}
              rows={10}
              spellCheck={false}
              className="font-mono text-[12px] leading-relaxed"
              placeholder='{ "narration": "…", "speech": "…" }'
              onChange={(event) => set("sampleText", event.target.value)}
            />
            {parsedSample.error && (
              <p className="flex items-center gap-1.5 text-[11px] text-destructive">
                <AlertCircle className="size-3.5" />
                {parsedSample.error}
              </p>
            )}
          </EditorSection>
        </div>

        <div className="lg:sticky lg:top-24 lg:self-start">
          <EditorSection
            title="渲染预览"
            description="聊天中会以类似的卡片呈现结构化内容。"
            action={
              <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <Braces className="size-3 text-primary" />
                x-ui
              </span>
            }
          >
            <SamplePreview
              schema={parsedSchema.value}
              sample={parsedSample.value}
            />
            <div className="rounded-lg bg-secondary/40 px-3 py-2 text-[11px] text-muted-foreground">
              返回模式
              <span className="float-right text-foreground">
                {
                  MODE_OPTIONS.find((option) => option.value === form.mode)
                    ?.label
                }
              </span>
            </div>
          </EditorSection>
        </div>
      </div>
    </div>
  );
}
