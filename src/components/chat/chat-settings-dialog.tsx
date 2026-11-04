"use client";

import { useState } from "react";
import { Bug, Loader2, PencilLine, Plus, SlidersHorizontal } from "lucide-react";
import { toast } from "sonner";
import {
  PersonaEditorDialog,
  type PersonaEditorValue,
} from "@/components/personas/persona-editor-dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import type { ChatDetailDTO } from "@/lib/types/chat";
import { cn } from "@/lib/utils";

const NONE = "none";
type AuthorNoteDepthMode = "preset" | "custom";

function idOrNull(value: string) {
  return value === NONE ? null : value;
}

export function ChatSettingsDialog({
  open,
  onOpenChange,
  detail,
  isAdmin,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  detail: ChatDetailDTO;
  isAdmin: boolean;
  onSaved: () => Promise<void> | void;
}) {
  const settings = detail.session.settings ?? {};
  const [providerId, setProviderId] = useState(
    detail.session.providerId ?? NONE,
  );
  const [model, setModel] = useState(detail.session.model ?? "");
  const [promptPresetId, setPromptPresetId] = useState(
    detail.session.promptPresetId ?? NONE,
  );
  const [chatStyleId, setChatStyleId] = useState(
    detail.session.chatStyleId ?? NONE,
  );
  const [themeId, setThemeId] = useState(detail.session.themeId ?? NONE);
  const [outputSchemaId, setOutputSchemaId] = useState(
    detail.session.outputSchemaId ?? NONE,
  );
  const [personaId, setPersonaId] = useState(
    detail.session.personaId ?? NONE,
  );
  const [personaOptions, setPersonaOptions] = useState(
    detail.options.personas,
  );
  const [personaEditor, setPersonaEditor] = useState<{
    persona: PersonaEditorValue | null;
  } | null>(null);
  const [worldbookIds, setWorldbookIds] = useState<string[]>(
    detail.session.worldbookIds ?? [],
  );
  const [temperature, setTemperature] = useState(settings.temperature ?? 0.85);
  const [topP, setTopP] = useState(settings.topP ?? 1);
  const [maxTokens, setMaxTokens] = useState(settings.maxTokens ?? 2048);
  const [maxContextMessages, setMaxContextMessages] = useState(
    settings.maxContextMessages ?? 40,
  );
  const [authorNote, setAuthorNote] = useState(settings.authorNote ?? "");
  const [authorNoteDepth, setAuthorNoteDepth] = useState(
    settings.authorNoteDepth ?? 4,
  );
  const [authorNoteDepthMode, setAuthorNoteDepthMode] =
    useState<AuthorNoteDepthMode>(settings.authorNoteMode ?? "preset");
  const [debugMode, setDebugMode] = useState(settings.debugMode === true);
  const [saving, setSaving] = useState(false);

  const selectedProvider = detail.options.providers.find(
    (option) => option.id === providerId,
  );
  const selectedPersona = personaOptions.find(
    (option) => option.id === personaId,
  );

  function handlePersonaSaved(persona: PersonaEditorValue) {
    setPersonaOptions((previous) => {
      const exists = previous.some((option) => option.id === persona.id);
      return exists
        ? previous.map((option) =>
            option.id === persona.id ? { ...option, ...persona } : option,
          )
        : [...previous, persona];
    });
    // 新建身份后直接选中它；编辑已有身份时保持当前选择。
    if (!personaEditor?.persona) setPersonaId(persona.id);
  }
  const providerModelInfo =
    providerId === NONE ? detail.provider : selectedProvider;
  const availableModels = providerModelInfo
    ? [...new Set([providerModelInfo.model, ...(providerModelInfo.models ?? [])])]
    : [];

  function handleProviderChange(value: string) {
    setProviderId(value);
    const next =
      value === NONE
        ? detail.provider
        : detail.options.providers.find((option) => option.id === value);
    const nextModels = new Set([
      ...(next?.model ? [next.model] : []),
      ...(next?.models ?? []),
    ]);
    if (model.trim() && nextModels.size > 0 && !nextModels.has(model.trim())) {
      setModel("");
    }
  }

  function toggleWorldbook(id: string, checked: boolean) {
    setWorldbookIds((previous) =>
      checked
        ? [...previous, id]
        : previous.filter((item) => item !== id),
    );
  }

  async function handleSave() {
    if (saving) return;
    setSaving(true);
    try {
      await apiFetch(`/api/chats/${detail.session.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          providerId: idOrNull(providerId),
          model: model.trim() || null,
          promptPresetId: idOrNull(promptPresetId),
          chatStyleId: idOrNull(chatStyleId),
          themeId: idOrNull(themeId),
          outputSchemaId: idOrNull(outputSchemaId),
          personaId: idOrNull(personaId),
          worldbookIds,
          settings: {
            ...settings,
            temperature,
            topP,
            maxTokens,
            maxContextMessages,
            authorNote: authorNote.trim() || undefined,
            authorNoteMode: authorNoteDepthMode,
            authorNoteDepth:
              authorNoteDepthMode === "custom"
                ? authorNoteDepth
                : undefined,
            debugMode: isAdmin ? debugMode : false,
          },
        }),
      });
      toast.success("对话设置已保存");
      await onSaved();
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

  const selects = [
    {
      label: "API 供应商",
      value: providerId,
      set: handleProviderChange,
      options: detail.options.providers,
      empty: "跟随默认供应商",
    },
    {
      label: "提示词预设",
      value: promptPresetId,
      set: setPromptPresetId,
      options: detail.options.prompts,
      empty: "使用默认提示词",
    },
    {
      label: "对话样式",
      value: chatStyleId,
      set: setChatStyleId,
      options: detail.options.styles,
      empty: "使用默认样式",
    },
    {
      label: "主题",
      value: themeId,
      set: setThemeId,
      options: detail.options.themes,
      empty: "使用默认主题",
    },
    {
      label: "输出格式",
      value: outputSchemaId,
      set: setOutputSchemaId,
      options: detail.options.schemas,
      empty: "纯文本回复",
    },
  ];

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display">
            <SlidersHorizontal className="size-4 text-primary" />
            对话设置
          </DialogTitle>
          <DialogDescription>
            这些设置只影响当前对话。修改样式或输出格式后，历史消息也会按新配置渲染。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            {selects.map((item) => (
              <div key={item.label} className="space-y-2">
                <Label>{item.label}</Label>
                <Select value={item.value} onValueChange={item.set}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>{item.empty}</SelectItem>
                    {item.options.map((option) => (
                      <SelectItem key={option.id} value={option.id}>
                        {option.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}

            <div className="space-y-2 sm:col-span-2">
              <div className="flex items-center justify-between gap-2">
                <Label>用户身份</Label>
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setPersonaEditor({ persona: null })}
                    className="h-7 rounded-lg px-2 text-[11px]"
                  >
                    <Plus data-icon="inline-start" />
                    新建
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      if (selectedPersona) {
                        setPersonaEditor({ persona: selectedPersona });
                      }
                    }}
                    disabled={!selectedPersona}
                    className="h-7 rounded-lg px-2 text-[11px]"
                  >
                    <PencilLine data-icon="inline-start" />
                    编辑
                  </Button>
                </div>
              </div>
              <Select value={personaId} onValueChange={setPersonaId}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>默认身份</SelectItem>
                  {personaOptions.map((option) => (
                    <SelectItem key={option.id} value={option.id}>
                      {option.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="line-clamp-2 text-[10px] leading-relaxed text-muted-foreground">
                {selectedPersona?.description ||
                  "身份名称会替换对话中的 {{user}}，点「编辑」可以补充身份特点。"}
              </p>
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="chat-model">模型</Label>
              <Input
                id="chat-model"
                value={model}
                placeholder={
                  providerModelInfo
                    ? `留空则使用供应商默认模型 ${providerModelInfo.model}`
                    : "留空则使用供应商默认模型"
                }
                onChange={(event) => setModel(event.target.value)}
              />
              {availableModels.length > 0 && (
                <div className="space-y-1.5 rounded-lg border border-border/50 bg-background/30 p-2">
                  <div className="flex flex-wrap gap-1">
                    <button
                      type="button"
                      onClick={() => setModel("")}
                      className={cn(
                        "rounded-md px-2 py-1 text-[10px] transition-colors",
                        model.trim() === ""
                          ? "bg-primary/15 text-primary"
                          : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                      )}
                    >
                      跟随默认 · {providerModelInfo?.model}
                    </button>
                    {availableModels.map((item) => (
                      <button
                        key={item}
                        type="button"
                        title={item}
                        onClick={() => setModel(item)}
                        className={cn(
                          "max-w-full truncate rounded-md px-2 py-1 text-[10px] transition-colors",
                          model.trim() === item
                            ? "bg-primary/15 text-primary"
                            : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                        )}
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    这些模型来自供应商设置。也可以直接输入列表外的自定义模型名。
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label>世界书</Label>
            {detail.options.worldbooks.length === 0 ? (
              <p className="text-xs text-muted-foreground">还没有世界书。</p>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">
                {detail.options.worldbooks.map((book) => {
                  const checked = worldbookIds.includes(book.id);
                  return (
                    <label
                      key={book.id}
                      className={cn(
                        "flex cursor-pointer items-center gap-2.5 rounded-xl border px-3 py-2",
                        checked
                          ? "border-primary/40 bg-primary/[0.06]"
                          : "border-border/60 bg-background/25",
                      )}
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(value) =>
                          toggleWorldbook(book.id, value === true)
                        }
                      />
                      <span className="truncate text-xs">{book.name}</span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="chat-temperature">
                温度
                <span className="ml-2 text-[11px] font-normal text-muted-foreground">
                  {temperature.toFixed(2)}
                </span>
              </Label>
              <Input
                id="chat-temperature"
                type="range"
                min={0}
                max={2}
                step={0.05}
                value={temperature}
                onChange={(event) =>
                  setTemperature(Number(event.target.value))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="chat-top-p">Top P</Label>
              <Input
                id="chat-top-p"
                type="number"
                min={0}
                max={1}
                step={0.05}
                value={topP}
                onChange={(event) => setTopP(Number(event.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="chat-max-tokens">最大回复 Token</Label>
              <Input
                id="chat-max-tokens"
                type="number"
                min={1}
                value={maxTokens}
                onChange={(event) => setMaxTokens(Number(event.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="chat-context-messages">上下文消息数</Label>
              <Input
                id="chat-context-messages"
                type="number"
                min={2}
                max={200}
                value={maxContextMessages}
                onChange={(event) =>
                  setMaxContextMessages(Number(event.target.value))
                }
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="chat-author-note">作者注</Label>
            <Textarea
              id="chat-author-note"
              value={authorNote}
              rows={3}
              placeholder="每次生成时注入的额外指令，例如：保持短句，不要替用户行动。"
              onChange={(event) => setAuthorNote(event.target.value)}
            />
            <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_7rem] sm:items-end">
              <div className="space-y-1.5">
                <Label className="text-[11px] text-muted-foreground">
                  注入方式
                </Label>
                <Select
                  value={authorNoteDepthMode}
                  onValueChange={(value) =>
                    setAuthorNoteDepthMode(value as AuthorNoteDepthMode)
                  }
                >
                  <SelectTrigger className="h-8 rounded-lg bg-background/50 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="preset">跟随提示词预设</SelectItem>
                    <SelectItem value="custom">指定深度</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {authorNoteDepthMode === "custom" && (
                <div className="space-y-1.5">
                  <Label
                    htmlFor="chat-author-note-depth"
                    className="text-[11px] text-muted-foreground"
                  >
                    深度
                  </Label>
                  <Input
                    id="chat-author-note-depth"
                    type="number"
                    min={0}
                    max={100}
                    value={authorNoteDepth}
                    className="h-8"
                    onChange={(event) =>
                      setAuthorNoteDepth(Number(event.target.value) || 0)
                    }
                  />
                </div>
              )}
            </div>
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              {authorNoteDepthMode === "preset"
                ? "由提示词预设里的「作者注」块决定位置；没有该块时放在历史之后。"
                : "0 表示紧跟在最后一条消息之后；数字越大越靠前。"}
            </p>
          </div>

          {isAdmin && (
            <div className="rounded-xl border border-amber-500/25 bg-amber-500/[0.04] p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <Label className="flex items-center gap-1.5 text-xs">
                    <Bug className="size-3.5 text-amber-500" />
                    调试模式
                    <span className="rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-normal text-amber-600 dark:text-amber-400">
                      仅管理员
                    </span>
                  </Label>
                  <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                    开启后，对话页顶部会出现调试按钮，可查看最近一次请求发送给
                    AI 的原始内容和 AI 的原始响应。只保留最新一次，不写入数据库。
                  </p>
                </div>
                <Switch
                  checked={debugMode}
                  onCheckedChange={setDebugMode}
                  aria-label="开启调试模式"
                />
              </div>
              {debugMode && (
                <p className="mt-2 rounded-lg bg-amber-500/[0.06] px-2 py-1.5 text-[10px] leading-relaxed text-amber-700 dark:text-amber-300">
                  调试内容包含完整提示词和模型输出，请勿在共享环境中长期开启。
                </p>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            className="rounded-xl"
            onClick={() => onOpenChange(false)}
          >
            取消
          </Button>
          <Button
            className="rounded-xl"
            onClick={() => void handleSave()}
            disabled={saving}
          >
            {saving && <Loader2 className="animate-spin" />}
            保存设置
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {personaEditor && (
      <PersonaEditorDialog
        persona={personaEditor.persona}
        onClose={() => setPersonaEditor(null)}
        onSaved={handlePersonaSaved}
      />
    )}
    </>
  );
}
