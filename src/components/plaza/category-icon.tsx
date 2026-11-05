import {
  BookOpen,
  Brain,
  Briefcase,
  Clapperboard,
  Coffee,
  Compass,
  Cpu,
  Flame,
  Gamepad2,
  Ghost,
  Globe,
  GraduationCap,
  Heart,
  Moon,
  Mountain,
  Music,
  Palette,
  Plane,
  Rocket,
  Search,
  Sparkles,
  Star,
  Swords,
  Tag,
  Utensils,
  type LucideIcon,
} from "lucide-react";
import {
  DEFAULT_PLAZA_CATEGORY_ICON,
  isPlazaCategoryIconName,
  type PlazaCategoryIconName,
} from "@/lib/content/plaza";

const ICONS: Record<PlazaCategoryIconName, LucideIcon> = {
  Heart,
  Sword: Swords,
  Swords,
  Coffee,
  Search,
  Flame,
  Rocket,
  Compass,
  Sparkles,
  Tag,
  BookOpen,
  Gamepad2,
  Music,
  Clapperboard,
  Globe,
  Mountain,
  Ghost,
  Brain,
  GraduationCap,
  Briefcase,
  Palette,
  Cpu,
  Moon,
  Star,
  Utensils,
  Plane,
};

export function PlazaCategoryIcon({
  name,
  className,
}: {
  name?: string | null;
  className?: string;
}) {
  const Icon = isPlazaCategoryIconName(name)
    ? ICONS[name]
    : ICONS[DEFAULT_PLAZA_CATEGORY_ICON];
  return <Icon className={className} />;
}
