import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost";
type Size = "md" | "lg";

const VARIANT: Record<Variant, string> = {
  primary: "bg-primary text-white hover:brightness-110",
  secondary: "bg-surface-2 text-ink hover:brightness-95",
  ghost: "text-ink-2 hover:bg-surface-2",
};

const SIZE: Record<Size, string> = {
  md: "h-10 px-4 text-sm",
  lg: "h-14 px-5 text-base",
};

export function buttonClass(variant: Variant = "primary", size: Size = "md", full = false) {
  return `inline-flex items-center justify-center gap-1.5 rounded-2xl font-semibold transition disabled:cursor-not-allowed disabled:opacity-40 ${VARIANT[variant]} ${SIZE[size]} ${full ? "w-full" : ""}`;
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  full?: boolean;
}

export function Button({ variant, size, full, className = "", type = "button", ...rest }: ButtonProps) {
  return <button type={type} className={`${buttonClass(variant, size, full)} ${className}`} {...rest} />;
}

/** 버튼처럼 생긴 링크 */
export function LinkButton({
  href,
  children,
  variant,
  size,
  full,
  className = "",
}: {
  href: string;
  children: ReactNode;
  variant?: Variant;
  size?: Size;
  full?: boolean;
  className?: string;
}) {
  return (
    <Link href={href} className={`${buttonClass(variant, size, full)} ${className}`}>
      {children}
    </Link>
  );
}
