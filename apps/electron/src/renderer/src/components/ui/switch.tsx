import * as React from "react";
import { Switch as SwitchPrimitive } from "radix-ui";

import { cn } from "@/lib/utils";

function Switch({
  className,
  size = "default",
  ...props
}: React.ComponentProps<typeof SwitchPrimitive.Root> & {
  size?: "sm" | "default";
}) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      data-size={size}
      className={cn(
        "peer group/switch relative inline-flex shrink-0 cursor-pointer items-center rounded-full border border-border/70 bg-input/60 outline-none transition-[background-color,border-color,box-shadow,transform] duration-200 ease-out motion-reduce:transition-none after:absolute after:-inset-x-3 after:-inset-y-2 focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/20 active:scale-[0.98] data-[size=default]:h-[18.4px] data-[size=default]:w-[32px] data-[size=sm]:h-[14px] data-[size=sm]:w-[24px] dark:bg-input/80 data-[state=checked]:border-primary/30 data-disabled:cursor-not-allowed data-disabled:opacity-50",
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className={cn(
          "pointer-events-none block rounded-full transition-[transform,background-color,box-shadow] duration-200 ease-out motion-reduce:transition-none",
          "group-data-[size=default]/switch:size-4 group-data-[size=sm]/switch:size-3",
          "data-[state=unchecked]:translate-x-0 data-[state=unchecked]:bg-muted-foreground/40 data-[state=unchecked]:shadow-none",
          "data-[state=checked]:translate-x-[calc(100%-2px)] data-[state=checked]:bg-primary data-[state=checked]:shadow-[0_1px_3px_oklch(0_0_0/35%)]"
        )}
      />
    </SwitchPrimitive.Root>
  );
}

export { Switch };
