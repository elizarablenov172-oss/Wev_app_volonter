import * as React from "react";
import { cn } from "@/lib/utils";

export type LabelProps = React.LabelHTMLAttributes<HTMLLabelElement>;

/** Подпись к полю формы. */
export const Label = React.forwardRef<HTMLLabelElement, LabelProps>(
  ({ className, ...props }, ref) => {
    return (
      <label
        ref={ref}
        className={cn(
          "mb-1.5 block text-[0.8125rem] font-semibold tracking-[-0.01em] text-foreground",
          className,
        )}
        {...props}
      />
    );
  },
);
Label.displayName = "Label";
