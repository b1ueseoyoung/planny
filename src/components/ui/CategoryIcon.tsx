import {
  BedDouble,
  Bike,
  Coffee,
  Drama,
  Ellipsis,
  Gift,
  Repeat,
  ShoppingBag,
  ShoppingBasket,
  TrainFront,
  Utensils,
  type LucideIcon,
} from "lucide-react";
import type { Category } from "@/lib/types";
import { CATEGORY_LABEL } from "@/lib/categories";

const ICONS: Record<Category, LucideIcon> = {
  meal: Utensils,
  cafe: Coffee,
  delivery: Bike,
  grocery: ShoppingBasket,
  transport: TrainFront,
  lodging: BedDouble,
  shopping: ShoppingBag,
  culture: Drama,
  gift: Gift,
  subscription: Repeat,
  etc: Ellipsis,
};

/** 카테고리 아이콘 (이름은 항상 옆에 글자로 함께 보여줄 것). className으로 바탕색·글자색을 바꿀 수 있다 */
export function CategoryIcon({
  category,
  size = 36,
  className = "bg-surface-2 text-ink-2",
}: {
  category: Category;
  size?: number;
  className?: string;
}) {
  const Icon = ICONS[category];
  return (
    <span
      className={`grid shrink-0 place-items-center rounded-xl ${className}`}
      style={{ width: size, height: size }}
      title={CATEGORY_LABEL[category]}
    >
      <Icon size={Math.round(size * 0.5)} aria-hidden />
    </span>
  );
}
