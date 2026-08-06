"use client";

import * as React from "react";
import * as AvatarPrimitive from "@radix-ui/react-avatar";
import { cn } from "@/src/lib/cn";

/**
 * Radix Avatar, styled to the design system.
 *
 * Kept as a thin wrapper rather than an owner-shaped component: the avatar is
 * also used for plants and connectors, so the domain meaning belongs to the
 * caller. `OwnerAvatar` in `components/patterns` is the domain-aware one.
 */
export const Avatar = React.forwardRef<
  React.ComponentRef<typeof AvatarPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Root>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Root
    ref={ref}
    className={cn(
      "relative flex size-6 shrink-0 overflow-hidden rounded-full",
      className,
    )}
    {...props}
  />
));
Avatar.displayName = "Avatar";

export const AvatarFallback = React.forwardRef<
  React.ComponentRef<typeof AvatarPrimitive.Fallback>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Fallback>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Fallback
    ref={ref}
    className={cn(
      "flex size-full items-center justify-center rounded-full bg-surface-active text-2xs font-semibold text-content-secondary",
      className,
    )}
    {...props}
  />
));
AvatarFallback.displayName = "AvatarFallback";
