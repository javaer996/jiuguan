"use client";

import { useMemo, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from "react";
import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

type Rgba = { r: number; g: number; b: number; a: number };
type Hsv = { h: number; s: number; v: number };

const PRESET_COLORS = [
  "#e0a45e",
  "#c9a45c",
  "#a8644a",
  "#d16a7c",
  "#9b6bb5",
  "#7aa7c7",
  "#5fa89a",
  "#7bbf7a",
  "#ece7df",
  "#9a93a8",
  "#241f2e",
  "#0d0b12",
];

const CHECKERBOARD: CSSProperties = {
  backgroundImage:
    "linear-gradient(45deg, rgba(127,127,127,0.22) 25%, transparent 25%, transparent 75%, rgba(127,127,127,0.22) 75%), linear-gradient(45deg, rgba(127,127,127,0.22) 25%, transparent 25%, transparent 75%, rgba(127,127,127,0.22) 75%)",
  backgroundSize: "8px 8px",
  backgroundPosition: "0 0, 4px 4px",
};

function clamp(value: number, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

function parseCssColor(input: string | null | undefined): Rgba | null {
  const value = (input ?? "").trim().toLowerCase();
  if (!value) return null;

  const hex = value.match(/^#([0-9a-f]{3,8})$/);
  if (hex) {
    const raw = hex[1]!;
    if (raw.length === 3 || raw.length === 4) {
      const channels = raw.split("").map((char) => parseInt(char + char, 16));
      return {
        r: channels[0]!,
        g: channels[1]!,
        b: channels[2]!,
        a: raw.length === 4 ? channels[3]! / 255 : 1,
      };
    }
    if (raw.length === 6 || raw.length === 8) {
      return {
        r: parseInt(raw.slice(0, 2), 16),
        g: parseInt(raw.slice(2, 4), 16),
        b: parseInt(raw.slice(4, 6), 16),
        a: raw.length === 8 ? parseInt(raw.slice(6, 8), 16) / 255 : 1,
      };
    }
    return null;
  }

  const rgb = value.match(/^rgba?\(\s*([^)]+)\)$/);
  if (!rgb) return null;

  const parts = rgb[1]!.split(/[\s,/]+/).filter(Boolean);
  if (parts.length < 3) return null;

  const channel = (part: string, max: number) => {
    const numeric = parseFloat(part);
    if (!Number.isFinite(numeric)) return null;
    return part.endsWith("%")
      ? Math.round(clamp(numeric / 100) * max)
      : Math.round(clamp(numeric / max) * max);
  };

  const r = channel(parts[0]!, 255);
  const g = channel(parts[1]!, 255);
  const b = channel(parts[2]!, 255);
  if (r === null || g === null || b === null) return null;

  let alpha = 1;
  if (parts[3]) {
    const numeric = parseFloat(parts[3]);
    if (!Number.isFinite(numeric)) return null;
    alpha = parts[3].endsWith("%") ? clamp(numeric / 100) : clamp(numeric);
  }

  return { r, g, b, a: alpha };
}

function rgbToHsv({ r, g, b }: Rgba): Hsv {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const delta = max - min;

  let h = 0;
  if (delta !== 0) {
    if (max === rn) h = ((gn - bn) / delta) % 6;
    else if (max === gn) h = (bn - rn) / delta + 2;
    else h = (rn - gn) / delta + 4;
    h *= 60;
    if (h < 0) h += 360;
  }

  return { h, s: max === 0 ? 0 : delta / max, v: max };
}

function hsvToRgb({ h, s, v }: Hsv): { r: number; g: number; b: number } {
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;

  let channels: [number, number, number];
  if (h < 60) channels = [c, x, 0];
  else if (h < 120) channels = [x, c, 0];
  else if (h < 180) channels = [0, c, x];
  else if (h < 240) channels = [0, x, c];
  else if (h < 300) channels = [x, 0, c];
  else channels = [c, 0, x];

  return {
    r: Math.round((channels[0] + m) * 255),
    g: Math.round((channels[1] + m) * 255),
    b: Math.round((channels[2] + m) * 255),
  };
}

function toHex({ r, g, b, a }: Rgba) {
  const hex = (part: number) => part.toString(16).padStart(2, "0");
  const base = `#${hex(r)}${hex(g)}${hex(b)}`;
  return a >= 0.999 ? base : `${base}${hex(Math.round(a * 255))}`;
}

/** 任意可解析的颜色转成色块可用的展示值；无法解析时原样交给浏览器。 */
function swatchBackground(value: string | undefined) {
  if (!value) return CHECKERBOARD;
  const parsed = parseCssColor(value);
  return parsed ? { background: toHex(parsed) } : { background: value };
}

function ColorPickerPanel({
  value,
  onChange,
  fallback,
  allowClear,
  clearLabel,
}: {
  value?: string;
  onChange: (value: string) => void;
  fallback: string;
  allowClear: boolean;
  clearLabel: string;
}) {
  const fallbackColor = useMemo(
    () => parseCssColor(fallback) ?? { r: 201, g: 164, b: 92, a: 1 },
    [fallback],
  );
  // 面板只在弹出时挂载，直接用打开时的颜色初始化即可。
  const initial = parseCssColor(value) ?? fallbackColor;
  const [hsv, setHsv] = useState<Hsv>(() => rgbToHsv(initial));
  const [alpha, setAlpha] = useState(initial.a);
  const [hexText, setHexText] = useState(() =>
    value ? (parseCssColor(value) ? toHex(initial) : value) : "",
  );

  function commit(nextHsv: Hsv, nextAlpha = alpha) {
    const hex = toHex({ ...hsvToRgb(nextHsv), a: nextAlpha });
    setHsv(nextHsv);
    setAlpha(nextAlpha);
    setHexText(hex);
    onChange(hex);
  }

  function commitHexText() {
    const parsed = parseCssColor(hexText);
    if (!parsed) {
      setHexText(value || toHex(fallbackColor));
      return;
    }
    const hex = toHex(parsed);
    setHsv(rgbToHsv(parsed));
    setAlpha(parsed.a);
    setHexText(hex);
    onChange(hex);
  }

  function clear() {
    setHexText("");
    onChange("");
  }

  const ratioFromEvent = (event: ReactPointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    return {
      x: clamp((event.clientX - rect.left) / rect.width),
      y: clamp((event.clientY - rect.top) / rect.height),
    };
  };

  const rgb = hsvToRgb(hsv);
  const opaque = `rgb(${rgb.r} ${rgb.g} ${rgb.b})`;

  return (
    <>
      <div
        className="relative h-36 w-full cursor-crosshair touch-none overflow-hidden rounded-lg border border-border/60"
        style={{
          backgroundImage: `linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, hsl(${hsv.h} 100% 50%))`,
        }}
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture(event.pointerId);
          const { x, y } = ratioFromEvent(event);
          commit({ ...hsv, s: x, v: 1 - y });
        }}
        onPointerMove={(event) => {
          if (event.buttons === 0) return;
          const { x, y } = ratioFromEvent(event);
          commit({ ...hsv, s: x, v: 1 - y });
        }}
      >
        <span
          className="pointer-events-none absolute size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,0.45)]"
          style={{
            left: `${hsv.s * 100}%`,
            top: `${(1 - hsv.v) * 100}%`,
          }}
        />
      </div>

      <div className="space-y-2">
        <div
          className="relative h-3 w-full cursor-pointer touch-none overflow-hidden rounded-full border border-border/60"
          style={{
            backgroundImage:
              "linear-gradient(to right, #f00, #ff0 17%, #0f0 33%, #0ff 50%, #00f 67%, #f0f 83%, #f00)",
          }}
          onPointerDown={(event) => {
            event.currentTarget.setPointerCapture(event.pointerId);
            const { x } = ratioFromEvent(event);
            commit({ ...hsv, h: x * 360 });
          }}
          onPointerMove={(event) => {
            if (event.buttons === 0) return;
            const { x } = ratioFromEvent(event);
            commit({ ...hsv, h: x * 360 });
          }}
        >
          <span
            className="pointer-events-none absolute top-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,0.45)]"
            style={{ left: `${(hsv.h / 360) * 100}%` }}
          />
        </div>

        <div
          className="relative h-3 w-full cursor-pointer touch-none overflow-hidden rounded-full border border-border/60"
          style={{
            ...CHECKERBOARD,
            backgroundImage: `linear-gradient(to right, transparent, ${opaque}), ${CHECKERBOARD.backgroundImage}`,
            backgroundSize: `auto, ${CHECKERBOARD.backgroundSize}`,
            backgroundPosition: `0 0, ${CHECKERBOARD.backgroundPosition}`,
          }}
          onPointerDown={(event) => {
            event.currentTarget.setPointerCapture(event.pointerId);
            const { x } = ratioFromEvent(event);
            commit(hsv, x);
          }}
          onPointerMove={(event) => {
            if (event.buttons === 0) return;
            const { x } = ratioFromEvent(event);
            commit(hsv, x);
          }}
        >
          <span
            className="pointer-events-none absolute top-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,0.45)]"
            style={{ left: `${alpha * 100}%` }}
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <span
          className="size-7 shrink-0 rounded-md border border-border/60"
          style={{ ...CHECKERBOARD }}
        >
          <span
            className="block size-full rounded-[5px]"
            style={{ background: toHex({ ...rgb, a: alpha }) }}
          />
        </span>
        <Input
          value={hexText}
          spellCheck={false}
          className="h-8 font-mono text-xs"
          aria-label="颜色值"
          onChange={(event) => setHexText(event.target.value)}
          onBlur={commitHexText}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              commitHexText();
            }
          }}
        />
        {allowClear && (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="shrink-0 text-muted-foreground"
            title={clearLabel}
            aria-label={clearLabel}
            onClick={clear}
          >
            <RotateCcw />
          </Button>
        )}
      </div>

      <div className="grid grid-cols-6 gap-1.5">
        {PRESET_COLORS.map((color) => (
          <button
            key={color}
            type="button"
            title={color}
            aria-label={color}
            className={cn(
              "size-6 rounded-md border transition-transform hover:scale-110",
              value?.toLowerCase() === color
                ? "border-ring ring-2 ring-ring/40"
                : "border-border/60",
            )}
            style={{ background: color }}
            onClick={() => {
              const parsed = parseCssColor(color);
              if (!parsed) return;
              commit(rgbToHsv(parsed), 1);
            }}
          />
        ))}
      </div>

      {allowClear && (
        <button
          type="button"
          className="text-[11px] text-muted-foreground transition-colors hover:text-foreground"
          onClick={clear}
        >
          {clearLabel}
        </button>
      )}
    </>
  );
}

export function ColorPicker({
  value,
  onChange,
  placeholder = "选择颜色",
  fallback = "#c9a45c",
  allowClear = true,
  clearLabel = "留空跟随主题",
  className,
  disabled,
}: {
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  fallback?: string;
  allowClear?: boolean;
  clearLabel?: string;
  className?: string;
  disabled?: boolean;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={cn(
            "flex h-8 w-full min-w-0 items-center gap-2 rounded-lg border border-input bg-transparent px-1.5 text-left text-sm transition-colors outline-none hover:bg-muted/40 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30",
            className,
          )}
        >
          <span
            className="size-5 shrink-0 rounded-md border border-border/60"
            style={swatchBackground(value)}
          />
          <span
            className={cn(
              "truncate",
              value ? "font-mono text-xs" : "text-xs text-muted-foreground",
            )}
          >
            {value || placeholder}
          </span>
        </button>
      </PopoverTrigger>

      <PopoverContent className="w-64 gap-3 p-3" align="start">
        <ColorPickerPanel
          value={value}
          onChange={onChange}
          fallback={fallback}
          allowClear={allowClear}
          clearLabel={clearLabel}
        />
      </PopoverContent>
    </Popover>
  );
}
