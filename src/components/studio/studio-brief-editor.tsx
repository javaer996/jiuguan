"use client";

import { useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import type { CreativeBrief } from "@/lib/ai/studio-schema";

function ListField({
  id,
  label,
  hint,
  value,
  onChange,
  placeholder,
  rows = 3,
}: {
  id: string;
  label: string;
  hint?: string;
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  rows?: number;
}) {
  // 保留原始文本，避免每次输入都被过滤掉行尾换行，导致无法新增下一项。
  const [text, setText] = useState(() => value.join("\n"));

  return (
    <Field label={label} hint={hint ?? "一行一项"} htmlFor={id}>
      <Textarea
        id={id}
        value={text}
        onChange={(event) => {
          const next = event.target.value;
          setText(next);
          onChange(
            next
              .split("\n")
              .map((line) => line.trim())
              .filter(Boolean),
          );
        }}
        placeholder={placeholder}
        rows={rows}
        className="rounded-xl bg-background/50 text-xs leading-relaxed"
      />
    </Field>
  );
}

export function StudioBriefEditor({
  open,
  onOpenChange,
  brief,
  onChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  brief: CreativeBrief;
  onChange: (brief: CreativeBrief) => void;
}) {
  function update<K extends keyof CreativeBrief>(
    key: K,
    value: CreativeBrief[K],
  ) {
    onChange({ ...brief, [key]: value });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>编辑创作纲要</DialogTitle>
          <DialogDescription>
            这份纲要会随灵感一起发给 AI，并作为整套资产的统一设定。修改后重新生成即可生效。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="模板名称" htmlFor="brief-template-name">
              <Input
                id="brief-template-name"
                value={brief.templateName}
                onChange={(event) =>
                  update("templateName", event.target.value)
                }
                maxLength={80}
                className="rounded-xl bg-background/50"
              />
            </Field>
            <Field label="一句话简介" htmlFor="brief-template-description">
              <Input
                id="brief-template-description"
                value={brief.templateDescription}
                onChange={(event) =>
                  update("templateDescription", event.target.value)
                }
                maxLength={400}
                className="rounded-xl bg-background/50"
              />
            </Field>
          </div>

          <Field
            label="核心设定"
            hint={`${brief.premise.length}/2000`}
            htmlFor="brief-premise"
          >
            <Textarea
              id="brief-premise"
              value={brief.premise}
              onChange={(event) => update("premise", event.target.value)}
              maxLength={2000}
              rows={4}
              className="rounded-xl bg-background/50 text-xs leading-relaxed"
            />
          </Field>

          <Field
            label="世界背景"
            hint={`${brief.setting.length}/2000`}
            htmlFor="brief-setting"
          >
            <Textarea
              id="brief-setting"
              value={brief.setting}
              onChange={(event) => update("setting", event.target.value)}
              maxLength={2000}
              rows={4}
              className="rounded-xl bg-background/50 text-xs leading-relaxed"
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="叙事语气"
              hint={`${brief.tone.length}/1000`}
              htmlFor="brief-tone"
            >
              <Textarea
                id="brief-tone"
                value={brief.tone}
                onChange={(event) => update("tone", event.target.value)}
                maxLength={1000}
                rows={3}
                className="rounded-xl bg-background/50 text-xs leading-relaxed"
              />
            </Field>
            <ListField
              id="brief-themes"
              label="主题词"
              value={brief.themes}
              onChange={(value) => update("themes", value)}
              placeholder={"雨夜\n记忆\n交易"}
              rows={3}
            />
          </div>

          <Field
            label="身份名称"
            hint={`${brief.userName.length}/48`}
            htmlFor="brief-user-name"
          >
            <Input
              id="brief-user-name"
              value={brief.userName}
              onChange={(event) => update("userName", event.target.value)}
              maxLength={48}
              placeholder="例如：旅人"
              className="rounded-xl bg-background/50"
            />
          </Field>

          <Field
            label="身份与处境"
            hint={`${brief.userRole.length}/1000`}
            htmlFor="brief-user-role"
          >
            <Textarea
              id="brief-user-role"
              value={brief.userRole}
              onChange={(event) => update("userRole", event.target.value)}
              maxLength={1000}
              rows={3}
              className="rounded-xl bg-background/50 text-xs leading-relaxed"
            />
          </Field>

          <Field
            label="主要角色"
            hint={`${brief.mainCharacter.length}/2000`}
            htmlFor="brief-main-character"
          >
            <Textarea
              id="brief-main-character"
              value={brief.mainCharacter}
              onChange={(event) =>
                update("mainCharacter", event.target.value)
              }
              maxLength={2000}
              rows={4}
              className="rounded-xl bg-background/50 text-xs leading-relaxed"
            />
          </Field>

          <ListField
            id="brief-supporting"
            label="配角与势力"
            value={brief.supportingCharacters}
            onChange={(value) => update("supportingCharacters", value)}
            placeholder="守夜人议会：掌控港口宵禁的古老组织"
            rows={3}
          />

          <ListField
            id="brief-worldbook-topics"
            label="世界书条目主题"
            value={brief.worldbookTopics}
            onChange={(value) => update("worldbookTopics", value)}
            placeholder="雾港：被浓雾封锁的港口，渡轮只在午夜靠岸"
            rows={6}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="提示词方向"
              hint={`${brief.promptDirection.length}/1000`}
              htmlFor="brief-prompt"
            >
              <Textarea
                id="brief-prompt"
                value={brief.promptDirection}
                onChange={(event) =>
                  update("promptDirection", event.target.value)
                }
                maxLength={1000}
                rows={3}
                className="rounded-xl bg-background/50 text-xs leading-relaxed"
              />
            </Field>
            <Field
              label="对话样式方向"
              hint={`${brief.styleDirection.length}/1000`}
              htmlFor="brief-style"
            >
              <Textarea
                id="brief-style"
                value={brief.styleDirection}
                onChange={(event) =>
                  update("styleDirection", event.target.value)
                }
                maxLength={1000}
                rows={3}
                className="rounded-xl bg-background/50 text-xs leading-relaxed"
              />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="聊天主题方向"
              hint={`${brief.themeDirection.length}/1000`}
              htmlFor="brief-theme"
            >
              <Textarea
                id="brief-theme"
                value={brief.themeDirection}
                onChange={(event) =>
                  update("themeDirection", event.target.value)
                }
                maxLength={1000}
                rows={3}
                className="rounded-xl bg-background/50 text-xs leading-relaxed"
              />
            </Field>
            <ListField
              id="brief-warnings"
              label="内容提示"
              value={brief.contentWarnings}
              onChange={(value) => update("contentWarnings", value)}
              placeholder="如有需要，一行一项；没有可留空"
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            onClick={() => onOpenChange(false)}
            className="rounded-xl"
          >
            完成
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
