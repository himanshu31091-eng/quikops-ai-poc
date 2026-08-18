"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { cn } from "@/src/lib/cn";

/**
 * Radix Dialog, styled to the design system.
 *
 * Only `DialogContent` is wrapped — overlay, portal and focus handling come
 * from Radix, which already implements the focus trap and scroll lock the
 * modals need.
 */
export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogTitle = DialogPrimitive.Title;
export const DialogDescription = DialogPrimitive.Description;
export const DialogClose = DialogPrimitive.Close;

export const DialogContent = React.forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <DialogPrimitive.Portal>
    <DialogPrimitive.Overlay
      className={cn(
        "fixed inset-0 z-50 bg-surface-inverse/25 backdrop-blur-[1px]",
        "data-[state=open]:anim-fade",
      )}
    />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        /*
         * The gutter is applied to `width`, not to `max-width`.
         *
         * `w-full` made a dialog exactly as wide as the viewport on a phone —
         * edge to edge, corners cut off by the screen. Capping `max-width` here
         * instead would fight every caller that passes its own `max-w-*`, since
         * both are the same property and the winner is decided by stylesheet
         * order rather than by the class list. Constraining the width leaves the
         * caller's `max-w-*` working exactly as before, as a ceiling.
         *
         * The height cap replaces `overflow-hidden`: a tall dialog at 720px
         * clipped its own footer, which is where the confirm button lives.
         */
        "fixed left-1/2 top-[12%] z-50 w-[calc(100%-1.5rem)] max-w-2xl -translate-x-1/2 rounded-xl border border-line bg-surface shadow-overlay outline-none sm:w-[calc(100%-3rem)]",
        "max-h-[80dvh] overflow-y-auto overscroll-contain",
        "data-[state=open]:anim-settle",
        className,
      )}
      {...props}
    >
      {children}
    </DialogPrimitive.Content>
  </DialogPrimitive.Portal>
));
DialogContent.displayName = "DialogContent";
