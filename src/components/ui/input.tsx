import * as React from "react";
import { cn } from "@/lib/utils";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

/** Брендированное текстовое поле «Евразия». */
export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = "text", ...props }, ref) => {
    return (
      <input
        ref={ref}
        type={type}
        className={cn(
          "flex h-10 w-full rounded-sm border border-border bg-surface px-3 text-sm text-foreground shadow-xs transition-[border-color,box-shadow]",
          "placeholder:text-muted/80",
          "hover:border-border-strong",
          "focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25",
          "disabled:cursor-not-allowed disabled:bg-surface-muted disabled:opacity-60",
          "aria-[invalid=true]:border-danger aria-[invalid=true]:ring-2 aria-[invalid=true]:ring-danger/20",
          className,
        )}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";
