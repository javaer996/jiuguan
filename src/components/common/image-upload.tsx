"use client";

import { useRef, useState } from "react";
import { ImagePlus, Loader2, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ApiClientError, apiFetch } from "@/lib/client/api";
import { cn } from "@/lib/utils";

type ImageUploadProps = {
  value: string;
  onChange: (url: string) => void;
  kind?: "avatar" | "background" | "image";
  shape?: "avatar" | "cover";
  className?: string;
  disabled?: boolean;
};

type UploadResponse = {
  asset: { id: string; url: string; width: number; height: number };
};

export function ImageUpload({
  value,
  onChange,
  kind = "image",
  shape = "avatar",
  className,
  disabled,
}: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleFile(file: File | undefined) {
    if (!file || uploading) return;
    if (!file.type.startsWith("image/")) {
      toast.error("请选择图片文件");
      return;
    }

    setUploading(true);
    try {
      const body = new FormData();
      body.append("file", file);
      body.append("kind", kind);
      const data = await apiFetch<UploadResponse>("/api/uploads", {
        method: "POST",
        body,
      });
      onChange(data.asset.url);
      toast.success("图片已上传");
    } catch (error) {
      toast.error(error instanceof ApiClientError ? error.message : "上传失败");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={disabled || uploading}
        className={cn(
          "group relative flex shrink-0 items-center justify-center overflow-hidden border border-dashed border-border/70 bg-secondary/30 text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary",
          shape === "avatar"
            ? "size-16 rounded-2xl"
            : "aspect-[16/9] w-full max-w-xs rounded-xl",
        )}
        aria-label="上传图片"
      >
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={value}
            alt=""
            className="size-full object-cover"
          />
        ) : (
          <span className="flex flex-col items-center gap-1 text-[10px]">
            <ImagePlus className="size-5" />
            上传
          </span>
        )}
        {uploading && (
          <span className="absolute inset-0 flex items-center justify-center bg-background/70">
            <Loader2 className="size-5 animate-spin text-primary" />
          </span>
        )}
      </button>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => inputRef.current?.click()}
          disabled={disabled || uploading}
          className="rounded-lg"
        >
          <Upload data-icon="inline-start" />
          {value ? "更换" : "上传图片"}
        </Button>
        {value && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onChange("")}
            disabled={disabled || uploading}
            className="rounded-lg text-muted-foreground hover:text-destructive"
          >
            <Trash2 data-icon="inline-start" />
            移除
          </Button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/avif"
        className="hidden"
        onChange={(event) => void handleFile(event.target.files?.[0])}
      />
    </div>
  );
}
