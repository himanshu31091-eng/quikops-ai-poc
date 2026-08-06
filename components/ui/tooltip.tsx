"use client";

import * as React from "react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { cn } from "@/src/lib/cn";

/**
 * Radix Tooltip, styled to the design system.
 *
 * Tooltips carry supporting detail only. Anything a user needs in order to act
 * is placed in the visible label instead — a tooltip is unreachable by touch
 * and easy to miss by keyboard.
 */
export const TooltipProvider = TooltipPrimitive.Provider;
export const Tooltip = TooltipPrimitive.Root;
export const TooltipTrigger = TooltipPrimitive.Trigger;

export const TooltipContent = React.forwardRef<
  React.ComponentRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = 6, ...props }, ref) => (
  <TooltipPrimitive.Portal>
    <TooltipPrimitive.Content
      ref={ref}
      sideOffset={sideOffset}
      className={cn(
        "z-50 max-w-72 rounded-md border border-line-inverse bg-surface-inverse px-2.5 py-1.5 text-xs text-content-inverse shadow-overlay",
        "data-[state=delayed-open]:anim-fade",
        className,
      )}
      {...props}
    />
  </TooltipPrimitive.Portal>
));
TooltipContent.displayName = "TooltipContent";
