"use client";

import * as React from "react";
import * as ScrollAreaPrimitive from "@radix-ui/react-scroll-area";
import { cn } from "@/lib/utils";

const BrikiScrollArea = React.forwardRef<
  React.ElementRef<typeof ScrollAreaPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ScrollAreaPrimitive.Root> & {
    maxHeight?: string;
    withFade?: boolean;
  }
>(({ className, children, maxHeight = "80vh", withFade = true, ...props }, ref) => (
  <ScrollAreaPrimitive.Root
    ref={ref}
    className={cn(
      "relative overflow-hidden",
      withFade && "mask-fade-out",
      className
    )}
    {...props}
  >
    <ScrollAreaPrimitive.Viewport 
      className={cn(
        "h-full w-full rounded-[inherit]",
        maxHeight && `max-h-[${maxHeight}]`
      )}
    >
      {children}
    </ScrollAreaPrimitive.Viewport>
    <BrikiScrollBar />
    <ScrollAreaPrimitive.Corner />
  </ScrollAreaPrimitive.Root>
));

BrikiScrollArea.displayName = "BrikiScrollArea";

const BrikiScrollBar = React.forwardRef<
  React.ElementRef<typeof ScrollAreaPrimitive.ScrollAreaScrollbar>,
  React.ComponentPropsWithoutRef<typeof ScrollAreaPrimitive.ScrollAreaScrollbar>
>(({ className, orientation = "vertical", ...props }, ref) => (
  <ScrollAreaPrimitive.ScrollAreaScrollbar
    ref={ref}
    orientation={orientation}
    className={cn(
      "flex touch-none select-none transition-colors",
      orientation === "vertical" && [
        "h-full w-2 border-l border-l-transparent p-[1px]",
        "hover:w-3 active:w-3",
      ],
      orientation === "horizontal" && [
        "h-2 flex-col border-t border-t-transparent p-[1px]",
        "hover:h-3 active:h-3",
      ],
      className
    )}
    {...props}
  >
    <ScrollAreaPrimitive.ScrollAreaThumb 
      className={cn(
        "relative flex-1 rounded-full",
        "bg-neutral-200 dark:bg-neutral-800",
        "hover:bg-neutral-300 dark:hover:bg-neutral-700",
        "transition-colors duration-150 ease-out"
      )} 
    />
  </ScrollAreaPrimitive.ScrollAreaScrollbar>
));

BrikiScrollBar.displayName = "BrikiScrollBar";

// Add fade mask styles to globals.css
const styles = `
@layer utilities {
  .mask-fade-out {
    mask-image: linear-gradient(
      to bottom,
      black calc(100% - 32px),
      transparent 100%
    );
  }
}
`;

export { BrikiScrollArea, BrikiScrollBar, styles as scrollAreaStyles }; 