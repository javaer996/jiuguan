"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { PlazaCategoryIcon } from "@/components/plaza/category-icon";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
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
import {
  isPlazaCategoryIconName,
  PLAZA_CATEGORY_ICON_OPTIONS,
} from "@/lib/content/plaza";
import type { AdminPlazaCategoryDTO } from "@/lib/types/plaza";

const DEFAULT_ICON_VALUE = "none";
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function PlazaCategoryForm({
  category,
  onDone,
  onCancel,
}: {
  /** 传入表示编辑，省略表示新建。 */
  category?: AdminPlazaCategoryDTO;
  onDone: () => void;
  onCancel: () => void;
}) {
  const router = useRouter();
  const isEdit = Boolean(category);
  const [name, setName] = useState(category?.name ?? "");
  const [slug, setSlug] = useState(category?.slug ?? "");
  const [description, setDescription] = useState(category?.description ?? "");
  const initialIcon =
    category && isPlazaCategoryIconName(category.icon)
      ? category.icon
      : DEFAULT_ICON_VALUE;
  const [icon, setIcon] = useState(initialIcon);
  const [sortOrder, setSortOrder] = useState(
    category ? String(category.sortOrder) : "",
  );
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (busy) return;

    const trimmedName = name.trim();
    if (!trimmedName) {
      toast.error("请填写分类名称");
      return;
    }
    if (trimmedName.length > 64) {
      toast.error("分类名称最多 64 个字符");
      return;
    }

    const trimmedSlug = slug.trim().toLowerCase();
    if (!isEdit && trimmedSlug) {
      if (trimmedSlug.length < 2 || trimmedSlug.length > 64) {
        toast.error("标识长度需在 2-64 个字符之间");
        return;
      }
      if (!SLUG_PATTERN.test(trimmedSlug)) {
        toast.error("标识只能包含小写字母、数字和连字符");
        return;
      }
    }

    let sortOrderValue: number | undefined;
    if (sortOrder.trim() !== "") {
      sortOrderValue = Number(sortOrder);
      if (
        !Number.isInteger(sortOrderValue) ||
        sortOrderValue < 0 ||
        sortOrderValue > 9999
      ) {
        toast.error("排序值需为 0-9999 的整数");
        return;
      }
    }

    const payload = {
      name: trimmedName,
      description: description.trim() || null,
      icon: icon === DEFAULT_ICON_VALUE ? null : icon,
      sortOrder: sortOrderValue,
      ...(isEdit ? {} : { slug: trimmedSlug || undefined }),
    };

    setBusy(true);
    try {
      await apiFetch(
        category
          ? `/api/admin/plaza/categories/${category.id}`
          : "/api/admin/plaza/categories",
        {
          method: category ? "PATCH" : "POST",
          body: JSON.stringify(payload),
        },
      );
      toast.success(isEdit ? "分类已更新" : "分类已创建");
      onDone();
      router.refresh();
    } catch (error) {
      toast.error(error instanceof ApiClientError ? error.message : "保存失败");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="space-y-4 py-2">
        <div className="space-y-2">
          <Label htmlFor="plaza-category-name">名称</Label>
          <Input
            id="plaza-category-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="例如：末日废土"
            maxLength={64}
            className="rounded-xl"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="plaza-category-slug">标识</Label>
          {isEdit ? (
            <>
              <Input
                id="plaza-category-slug"
                value={slug}
                readOnly
                disabled
                className="rounded-xl font-mono"
              />
              <p className="text-[11px] text-muted-foreground">
                标识用于广场筛选链接，创建后不可修改。
              </p>
            </>
          ) : (
            <>
              <Input
                id="plaza-category-slug"
                value={slug}
                onChange={(event) => setSlug(event.target.value)}
                placeholder="留空则自动生成"
                maxLength={64}
                className="rounded-xl font-mono"
              />
              <p className="text-[11px] text-muted-foreground">
                只能包含小写字母、数字和连字符；留空时会根据名称自动生成。
              </p>
            </>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="plaza-category-description">描述</Label>
          <Textarea
            id="plaza-category-description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="一句话说明这个分类适合什么故事"
            maxLength={255}
            rows={2}
            className="rounded-xl"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="plaza-category-icon">图标</Label>
            <Select value={icon} onValueChange={setIcon}>
              <SelectTrigger
                id="plaza-category-icon"
                className="w-full rounded-xl"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={DEFAULT_ICON_VALUE}>
                  <PlazaCategoryIcon name={null} className="size-4" />
                  默认图标
                </SelectItem>
                {PLAZA_CATEGORY_ICON_OPTIONS.map((option) => (
                  <SelectItem key={option.key} value={option.key}>
                    <PlazaCategoryIcon name={option.key} className="size-4" />
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="plaza-category-sort">排序</Label>
            <Input
              id="plaza-category-sort"
              type="number"
              min={0}
              max={9999}
              value={sortOrder}
              onChange={(event) => setSortOrder(event.target.value)}
              placeholder={isEdit ? "留空则保持不变" : "留空排到最后"}
              className="rounded-xl"
            />
          </div>
        </div>
      </div>

      <DialogFooter>
        <Button
          variant="outline"
          onClick={onCancel}
          disabled={busy}
          className="rounded-xl"
        >
          取消
        </Button>
        <Button
          onClick={() => void submit()}
          disabled={busy}
          className="rounded-xl"
        >
          {busy && <Loader2 data-icon="inline-start" className="animate-spin" />}
          {isEdit ? "保存" : "创建"}
        </Button>
      </DialogFooter>
    </>
  );
}
