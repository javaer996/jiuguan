"use client";

import { useState } from "react";
import {
  Activity,
  Loader2,
  Pencil,
  Plus,
  Power,
  RefreshCw,
  Star,
  Trash2,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ApiClientError, apiFetch } from "@/lib/client/api";
import type {
  ProviderDTO,
  ProviderTestResult,
} from "@/lib/types/provider";
import { cn, formatRelativeTime } from "@/lib/utils";

type ProviderForm = {
  name: string;
  baseUrl: string;
  apiKey: string;
  model: string;
  models: string[];
  temperature: string;
  topP: string;
  maxTokens: string;
  contextWindow: string;
  stream: boolean;
  jsonMode: boolean;
  jsonSchema: boolean;
  isDefault: boolean;
  isShared: boolean;
  status: "active" | "disabled";
};

function toForm(provider?: ProviderDTO): ProviderForm {
  return {
    name: provider?.name ?? "",
    baseUrl: provider?.baseUrl ?? "",
    apiKey: "",
    model: provider?.model ?? "",
    models: provider?.models ?? [],
    temperature: String(provider?.temperature ?? 0.85),
    topP: String(provider?.topP ?? 1),
    maxTokens: String(provider?.maxTokens ?? 2048),
    contextWindow: String(provider?.contextWindow ?? 8192),
    stream: provider?.capabilities?.stream ?? true,
    jsonMode: provider?.capabilities?.jsonMode ?? true,
    jsonSchema: provider?.capabilities?.jsonSchema ?? false,
    isDefault: provider?.isDefault ?? false,
    isShared: provider?.isShared ?? false,
    status: provider?.status ?? "active",
  };
}

function payloadFrom(provider: ProviderDTO) {
  return {
    name: provider.name,
    baseUrl: provider.baseUrl,
    model: provider.model,
    models: provider.models ?? undefined,
    temperature: provider.temperature,
    topP: provider.topP,
    maxTokens: provider.maxTokens,
    presencePenalty: provider.presencePenalty,
    frequencyPenalty: provider.frequencyPenalty,
    contextWindow: provider.contextWindow,
    capabilities: provider.capabilities ?? undefined,
    isDefault: provider.isDefault,
    isShared: provider.isShared,
    status: provider.status,
  };
}

function ProviderDialog({
  open,
  onOpenChange,
  provider,
  isAdmin,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  provider: ProviderDTO | null;
  isAdmin: boolean;
  onSaved: (provider: ProviderDTO) => void;
}) {
  const isEdit = Boolean(provider);
  const [form, setForm] = useState<ProviderForm>(() => toForm(provider ?? undefined));
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [fetchingModels, setFetchingModels] = useState(false);

  function set<K extends keyof ProviderForm>(
    key: K,
    value: ProviderForm[K],
  ) {
    setForm((previous) => ({ ...previous, [key]: value }));
  }

  async function handleSave() {
    if (saving) return;
    if (!form.name.trim() || !form.baseUrl.trim() || !form.model.trim()) {
      toast.error("名称、API 地址与模型名都不能为空");
      return;
    }
    if (!isEdit && !form.apiKey.trim()) {
      toast.error("请填写 API Key");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        baseUrl: form.baseUrl.trim(),
        apiKey: form.apiKey.trim() || undefined,
        model: form.model.trim(),
        models: form.models.length > 0 ? form.models : undefined,
        temperature: Number(form.temperature) || 0,
        topP: Number(form.topP) || 1,
        maxTokens: Number(form.maxTokens) || 2048,
        contextWindow: Number(form.contextWindow) || 8192,
        capabilities: {
          stream: form.stream,
          jsonMode: form.jsonMode,
          jsonSchema: form.jsonSchema,
        },
        isDefault: form.isDefault,
        isShared: isAdmin ? form.isShared : undefined,
        status: form.status,
      };

      const result = await apiFetch<{ provider: ProviderDTO }>(
        isEdit ? `/api/providers/${provider!.id}` : "/api/providers",
        {
          method: isEdit ? "PATCH" : "POST",
          body: JSON.stringify(payload),
        },
      );

      toast.success(isEdit ? "供应商已更新" : "供应商已添加");
      onSaved(result.provider);
      onOpenChange(false);
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

  async function handleFetchModels() {
    if (fetchingModels) return;
    if (!form.baseUrl.trim()) {
      toast.error("先填写 API 地址");
      return;
    }
    if (!isEdit && !form.apiKey.trim()) {
      toast.error("先填写 API Key");
      return;
    }

    setFetchingModels(true);
    try {
      const data = await apiFetch<{ models: string[] }>(
        "/api/providers/models",
        {
          method: "POST",
          body: JSON.stringify({
            baseUrl: form.baseUrl.trim(),
            apiKey: form.apiKey.trim() || undefined,
            providerId: isEdit ? provider!.id : undefined,
          }),
        },
      );
      set("models", data.models);
      if (!data.models.includes(form.model)) {
        set("model", data.models[0]!);
      }
      toast.success(`已拉取 ${data.models.length} 个模型`);
    } catch (error) {
      toast.error(
        error instanceof ApiClientError ? error.message : "拉取模型失败",
      );
    } finally {
      setFetchingModels(false);
    }
  }

  async function handleTest() {
    if (!provider || testing) return;
    setTesting(true);
    try {
      const result = await apiFetch<{ result: ProviderTestResult }>(
        `/api/providers/${provider.id}/test`,
        { method: "POST" },
      );
      if (result.result.ok) {
        toast.success(
          `${result.result.message} · ${result.result.latencyMs}ms`,
        );
        if (result.result.models?.length) {
          set("models", result.result.models);
          if (!result.result.models.includes(form.model)) {
            set("model", result.result.models[0]!);
          }
        }
      } else {
        toast.error(result.result.message);
      }
    } catch (error) {
      toast.error(
        error instanceof ApiClientError ? error.message : "测试失败",
      );
    } finally {
      setTesting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="font-display">
            {isEdit ? "编辑供应商" : "添加 API 供应商"}
          </DialogTitle>
          <DialogDescription>
            支持 OpenAI 兼容接口。API Key 会加密保存，不会回显到浏览器。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="provider-name">名称</Label>
              <Input
                id="provider-name"
                value={form.name}
                maxLength={64}
                placeholder="例如：OpenAI / DeepSeek / 本地 Ollama"
                onChange={(event) => set("name", event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="provider-model">模型</Label>
              <div className="flex gap-2">
                <Input
                  id="provider-model"
                  value={form.model}
                  list="provider-models"
                  placeholder="gpt-4o-mini"
                  className="min-w-0 flex-1"
                  onChange={(event) => set("model", event.target.value)}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="shrink-0 rounded-xl"
                  onClick={() => void handleFetchModels()}
                  disabled={fetchingModels}
                >
                  {fetchingModels ? (
                    <Loader2 className="animate-spin" />
                  ) : (
                    <RefreshCw />
                  )}
                  拉取
                </Button>
              </div>
              <datalist id="provider-models">
                {form.models.map((model) => (
                  <option key={model} value={model} />
                ))}
              </datalist>
              {form.models.length > 0 && (
                <div className="flex max-h-24 flex-wrap gap-1 overflow-y-auto rounded-lg border border-border/50 bg-background/30 p-1.5">
                  {form.models.map((model) => (
                    <button
                      key={model}
                      type="button"
                      title={model}
                      onClick={() => set("model", model)}
                      className={cn(
                        "max-w-full truncate rounded-md px-1.5 py-0.5 text-[10px] transition-colors",
                        form.model === model
                          ? "bg-primary/15 text-primary"
                          : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                      )}
                    >
                      {model}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="provider-base-url">API 地址</Label>
            <Input
              id="provider-base-url"
              value={form.baseUrl}
              placeholder="https://api.openai.com/v1"
              onChange={(event) => set("baseUrl", event.target.value)}
            />
            <p className="text-[11px] text-muted-foreground">
              填写到 <code>/v1</code> 即可，系统会自动拼接{" "}
              <code>/chat/completions</code>。
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="provider-key">
              API Key
              {isEdit && provider?.apiKeyHint && (
                <span className="ml-2 text-[11px] font-normal text-muted-foreground">
                  已保存 {provider.apiKeyHint}
                </span>
              )}
            </Label>
            <Input
              id="provider-key"
              type="password"
              value={form.apiKey}
              autoComplete="off"
              placeholder={isEdit ? "留空表示不修改" : "sk-…"}
              onChange={(event) => set("apiKey", event.target.value)}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="provider-temperature">
                温度
                <span className="ml-2 text-[11px] font-normal text-muted-foreground">
                  {form.temperature}
                </span>
              </Label>
              <Input
                id="provider-temperature"
                type="range"
                min={0}
                max={2}
                step={0.05}
                value={Number(form.temperature)}
                onChange={(event) =>
                  set("temperature", event.target.value)
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="provider-top-p">Top P</Label>
              <Input
                id="provider-top-p"
                type="number"
                min={0}
                max={1}
                step={0.05}
                value={form.topP}
                onChange={(event) => set("topP", event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="provider-max-tokens">最大回复 Token</Label>
              <Input
                id="provider-max-tokens"
                type="number"
                min={1}
                value={form.maxTokens}
                onChange={(event) => set("maxTokens", event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="provider-context">上下文窗口</Label>
              <Input
                id="provider-context"
                type="number"
                min={512}
                value={form.contextWindow}
                onChange={(event) => set("contextWindow", event.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-3">
            {(
              [
                ["stream", "流式输出"],
                ["jsonMode", "JSON 模式"],
                ["jsonSchema", "严格 Schema"],
              ] as const
            ).map(([key, label]) => (
              <label
                key={key}
                className="flex cursor-pointer items-center justify-between gap-2 rounded-xl border border-border/60 bg-background/25 px-3 py-2"
              >
                <span className="text-xs">{label}</span>
                <Switch
                  checked={form[key]}
                  onCheckedChange={(checked) => set(key, checked)}
                />
              </label>
            ))}
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <label className="flex cursor-pointer items-center justify-between gap-2 rounded-xl border border-border/60 bg-background/25 px-3 py-2">
              <span className="text-xs">设为默认</span>
              <Switch
                checked={form.isDefault}
                onCheckedChange={(checked) => set("isDefault", checked)}
              />
            </label>
            <label className="flex cursor-pointer items-center justify-between gap-2 rounded-xl border border-border/60 bg-background/25 px-3 py-2">
              <span className="text-xs">启用</span>
              <Switch
                checked={form.status === "active"}
                onCheckedChange={(checked) =>
                  set("status", checked ? "active" : "disabled")
                }
              />
            </label>
          </div>

          {isAdmin && (
            <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-primary/20 bg-primary/[0.04] px-3 py-2.5">
              <span>
                <span className="block text-xs font-medium">共享给用户</span>
                <span className="mt-0.5 block text-[10px] text-muted-foreground">
                  管理员可在后台把此供应商授权给指定用户使用。
                </span>
              </span>
              <Switch
                checked={form.isShared}
                onCheckedChange={(checked) => set("isShared", checked)}
              />
            </label>
          )}
        </div>

        <DialogFooter className="gap-2 sm:justify-between">
          <div>
            {isEdit && (
              <Button
                type="button"
                variant="outline"
                className="rounded-xl"
                onClick={() => void handleTest()}
                disabled={testing}
              >
                {testing ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <Activity />
                )}
                测试连接
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="ghost"
              className="rounded-xl"
              onClick={() => onOpenChange(false)}
            >
              取消
            </Button>
            <Button
              type="button"
              className="rounded-xl"
              onClick={() => void handleSave()}
              disabled={saving}
            >
              {saving && <Loader2 className="animate-spin" />}
              保存
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function ProviderSettings({
  initial,
  isAdmin,
}: {
  initial: ProviderDTO[];
  isAdmin: boolean;
}) {
  const [providers, setProviders] = useState(initial);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ProviderDTO | null>(null);
  const [testingId, setTestingId] = useState<string | null>(null);

  function upsert(provider: ProviderDTO) {
    setProviders((previous) => {
      const next = previous.some((item) => item.id === provider.id)
        ? previous.map((item) => (item.id === provider.id ? provider : item))
        : [provider, ...previous];
      if (provider.isDefault) {
        return next.map((item) =>
          item.id === provider.id ? item : { ...item, isDefault: false },
        );
      }
      return next;
    });
  }

  async function handleTest(provider: ProviderDTO) {
    setTestingId(provider.id);
    try {
      const result = await apiFetch<{ result: ProviderTestResult }>(
        `/api/providers/${provider.id}/test`,
        { method: "POST" },
      );
      if (result.result.ok) {
        toast.success(
          `${result.result.message} · ${result.result.latencyMs}ms`,
        );
      } else {
        toast.error(result.result.message);
      }
      setProviders((previous) =>
        previous.map((item) =>
          item.id === provider.id
            ? {
                ...item,
                lastCheckedAt: new Date().toISOString(),
                lastCheckStatus: result.result.ok ? "ok" : "error",
                lastCheckMessage: result.result.message,
              }
            : item,
        ),
      );
    } catch (error) {
      toast.error(
        error instanceof ApiClientError ? error.message : "测试失败",
      );
    } finally {
      setTestingId(null);
    }
  }

  async function handleSetDefault(provider: ProviderDTO) {
    try {
      const result = await apiFetch<{ provider: ProviderDTO }>(
        `/api/providers/${provider.id}`,
        {
          method: "PATCH",
          body: JSON.stringify({ ...payloadFrom(provider), isDefault: true }),
        },
      );
      upsert(result.provider);
      toast.success("已设为默认供应商");
    } catch (error) {
      toast.error(
        error instanceof ApiClientError ? error.message : "操作失败",
      );
    }
  }

  async function handleToggleStatus(provider: ProviderDTO) {
    const nextStatus = provider.status === "active" ? "disabled" : "active";
    try {
      const result = await apiFetch<{ provider: ProviderDTO }>(
        `/api/providers/${provider.id}`,
        {
          method: "PATCH",
          body: JSON.stringify({
            ...payloadFrom(provider),
            status: nextStatus,
          }),
        },
      );
      upsert(result.provider);
      toast.success(nextStatus === "active" ? "供应商已启用" : "供应商已停用");
    } catch (error) {
      toast.error(
        error instanceof ApiClientError ? error.message : "操作失败",
      );
    }
  }

  async function handleDelete(provider: ProviderDTO) {
    try {
      await apiFetch(`/api/providers/${provider.id}`, { method: "DELETE" });
      setProviders((previous) =>
        previous.filter((item) => item.id !== provider.id),
      );
      toast.success("供应商已删除");
    } catch (error) {
      toast.error(
        error instanceof ApiClientError ? error.message : "删除失败",
      );
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-base font-medium">API 供应商</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            连接你自己的 OpenAI 兼容 API，密钥会加密保存。
          </p>
        </div>
        <Button
          className="rounded-xl shadow-glow"
          onClick={() => {
            setEditing(null);
            setOpen(true);
          }}
        >
          <Plus data-icon="inline-start" />
          添加
        </Button>
      </div>

      {providers.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border/70 bg-card/25 px-5 py-10 text-center">
          <p className="text-sm text-muted-foreground">
            还没有配置 API。添加一个供应商后，就可以开始对话了。
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {providers.map((provider) => (
            <div
              key={provider.id}
              className={cn(
                "rounded-2xl border border-border/60 bg-card/35 p-4 transition-colors",
                provider.status === "disabled" && "opacity-60",
              )}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="truncate font-display text-base font-medium">
                      {provider.name}
                    </h3>
                    {provider.isDefault && (
                      <Badge
                        variant="outline"
                        className="gap-1 border-primary/30 px-1.5 py-0 text-[10px] text-primary"
                      >
                        <Star className="size-2.5 fill-current" />
                        默认
                      </Badge>
                    )}
                    {provider.isShared && (
                      <Badge
                        variant="outline"
                        className="px-1.5 py-0 text-[10px] font-normal text-muted-foreground"
                      >
                        共享
                      </Badge>
                    )}
                    <Badge
                      variant="outline"
                      className={cn(
                        "px-1.5 py-0 text-[10px] font-normal",
                        provider.status === "active"
                          ? "text-emerald-500"
                          : "text-muted-foreground",
                      )}
                    >
                      {provider.status === "active" ? "启用中" : "已停用"}
                    </Badge>
                  </div>
                  <p className="mt-1 truncate text-[11px] text-muted-foreground">
                    {provider.model} · {provider.baseUrl}
                  </p>
                  <p className="mt-1 text-[10px] text-muted-foreground/80">
                    密钥 {provider.apiKeyHint ?? "已保存"}
                    {provider.lastCheckedAt
                      ? ` · ${provider.lastCheckStatus === "ok" ? "连接正常" : "连接异常"} · ${formatRelativeTime(provider.lastCheckedAt)}`
                      : " · 尚未测试"}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-1">
                  {!provider.isDefault && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="rounded-lg text-xs"
                      onClick={() => void handleSetDefault(provider)}
                    >
                      <Star data-icon="inline-start" />
                      设为默认
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn(
                      "rounded-lg text-xs",
                      provider.status !== "active" && "text-emerald-500",
                    )}
                    onClick={() => void handleToggleStatus(provider)}
                  >
                    <Power data-icon="inline-start" />
                    {provider.status === "active" ? "停用" : "启用"}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="rounded-lg text-xs"
                    disabled={testingId === provider.id}
                    onClick={() => void handleTest(provider)}
                  >
                    {testingId === provider.id ? (
                      <Loader2 data-icon="inline-start" className="animate-spin" />
                    ) : (
                      <Zap data-icon="inline-start" />
                    )}
                    测试
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8 rounded-lg text-muted-foreground"
                    onClick={() => {
                      setEditing(provider);
                      setOpen(true);
                    }}
                    aria-label="编辑供应商"
                  >
                    <Pencil className="size-3.5" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 rounded-lg text-muted-foreground hover:text-destructive"
                        aria-label="删除供应商"
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>
                          删除「{provider.name}」？
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                          使用它的对话会回落到默认供应商或提示配置。已保存的密钥将一并删除。
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>再想想</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => void handleDelete(provider)}
                        >
                          删除
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>

              {provider.lastCheckStatus === "error" &&
                provider.lastCheckMessage && (
                  <p className="mt-2 rounded-lg bg-destructive/10 px-2.5 py-1.5 text-[11px] text-destructive">
                    {provider.lastCheckMessage}
                  </p>
                )}
            </div>
          ))}
        </div>
      )}

      {open && (
        <ProviderDialog
          key={editing?.id ?? "new"}
          open={open}
          onOpenChange={setOpen}
          provider={editing}
          isAdmin={isAdmin}
          onSaved={upsert}
        />
      )}
    </div>
  );
}
