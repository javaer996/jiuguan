"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { PlazaCategoryForm } from "@/components/admin/plaza-category-form";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function PlazaCategoryCreateDialog() {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="rounded-xl shadow-glow">
          <Plus data-icon="inline-start" />
          新建分类
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>新建广场分类</DialogTitle>
          <DialogDescription>
            分类会立刻出现在广场筛选条和投稿表单里。
          </DialogDescription>
        </DialogHeader>
        <PlazaCategoryForm
          onDone={() => setOpen(false)}
          onCancel={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
