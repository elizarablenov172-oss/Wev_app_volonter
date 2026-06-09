import * as React from "react";
import { cn } from "@/lib/utils";

/** Плейсхолдер-скелетон загрузки (пульсирующий блок). */
export function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-surface-muted", className)}
      aria-hidden
      {...props}
    />
  );
}
