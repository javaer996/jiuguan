/**
 * 广场分类可选图标。
 * 只列出一组稳定的 Lucide 图标名，前后端共用，避免写入任意字符串。
 */
export const PLAZA_CATEGORY_ICON_NAMES = [
  "Heart",
  "Sword",
  "Swords",
  "Coffee",
  "Search",
  "Flame",
  "Rocket",
  "Compass",
  "Sparkles",
  "Tag",
  "BookOpen",
  "Gamepad2",
  "Music",
  "Clapperboard",
  "Globe",
  "Mountain",
  "Ghost",
  "Brain",
  "GraduationCap",
  "Briefcase",
  "Palette",
  "Cpu",
  "Moon",
  "Star",
  "Utensils",
  "Plane",
] as const;

export type PlazaCategoryIconName =
  (typeof PLAZA_CATEGORY_ICON_NAMES)[number];

export const DEFAULT_PLAZA_CATEGORY_ICON: PlazaCategoryIconName = "Sparkles";

export const PLAZA_CATEGORY_ICON_LABELS: Record<
  PlazaCategoryIconName,
  string
> = {
  Heart: "心形",
  Sword: "剑",
  Swords: "双剑",
  Coffee: "咖啡",
  Search: "放大镜",
  Flame: "火焰",
  Rocket: "火箭",
  Compass: "罗盘",
  Sparkles: "星光",
  Tag: "标签",
  BookOpen: "书",
  Gamepad2: "游戏",
  Music: "音乐",
  Clapperboard: "电影",
  Globe: "世界",
  Mountain: "山川",
  Ghost: "幽灵",
  Brain: "头脑",
  GraduationCap: "学院",
  Briefcase: "职场",
  Palette: "绘画",
  Cpu: "科技",
  Moon: "月亮",
  Star: "星星",
  Utensils: "美食",
  Plane: "旅行",
};

export const PLAZA_CATEGORY_ICON_OPTIONS = PLAZA_CATEGORY_ICON_NAMES.map(
  (key) => ({
    key,
    label: PLAZA_CATEGORY_ICON_LABELS[key],
  }),
);

export function isPlazaCategoryIconName(
  value: string | null | undefined,
): value is PlazaCategoryIconName {
  return (
    Boolean(value) &&
    (PLAZA_CATEGORY_ICON_NAMES as readonly string[]).includes(value!)
  );
}
