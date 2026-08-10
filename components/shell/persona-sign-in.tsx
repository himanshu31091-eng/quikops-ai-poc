"use client";

import { useRef, useState, useTransition } from "react";
import { Icon } from "@/components/patterns/icon";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { signInAsPersona } from "@/src/auth/session-actions";
import { ROLE_META } from "@/src/config/app-config";
import type { User } from "@/src/domain/types";
import { cn } from "@/src/lib/cn";
import { initials } from "@/src/lib/format";

/**
 * The demonstration persona chooser, and the sign-in counterpart of the role
 * switcher in `user-menu.tsx`. Both call the same server action.
 *
 * Each card is one native `<button>`, so the whole card is the hit area, Enter
 * and Space activate it without a key handler, and the arrow is decoration
 * inside that area rather than a second control someone has to aim at.
 *
 * A sign-in writes a cookie and then redirects, and the redirect lands a beat
 * after the click. Every card is disabled for that beat: a second click in the
 * gap would write a second cookie and race its own navigation, which is how a
 * presenter ends up in the wrong role.
 */
export function PersonaSignIn({ personas }: { personas: User[] }) {
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  // A ref, not the state, is the guard: two clicks can be dispatched before a
  // re-render disables anything.
  const submitting = useRef(false);

  function signIn(personaId: string) {
    if (submitting.current) return;
    submitting.current = true;
    setPendingId(personaId);
    startTransition(async () => {
      await signInAsPersona(personaId);
    });
  }

  const pendingName = personas.find((p) => p.id === pendingId)?.name;

  return (
    <div className="space-y-2">
      {personas.map((persona) => {
        const isPending = persona.id === pendingId;
        return (
          <button
            key={persona.id}
            type="button"
            onClick={() => signIn(persona.id)}
            disabled={pendingId !== null}
            aria-busy={isPending}
            aria-label={`Sign in as ${persona.name}, ${persona.jobTitle}`}
            className={cn(
              "group flex w-full items-center gap-3 rounded-md border border-line bg-surface px-3 py-2.5 text-left transition-colors duration-150",
              "hover:border-accent-line hover:bg-accent-subtle",
              "focus-visible:border-accent-line focus-visible:bg-accent-subtle",
              // The chosen card holds the hover treatment while it redirects;
              // the others recede so the screen reads as committed.
              isPending && "border-accent-line bg-accent-subtle",
              pendingId !== null && !isPending && "opacity-50",
              pendingId !== null && "cursor-default",
            )}
          >
            <Avatar className="size-8">
              <AvatarFallback>{initials(persona.name)}</AvatarFallback>
            </Avatar>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium text-content">
                {persona.name}
              </span>
              <span className="block truncate text-2xs text-content-tertiary">
                {isPending ? (
                  <span className="anim-fade text-accent">Signing in…</span>
                ) : (
                  persona.jobTitle
                )}
              </span>
            </span>
            <span className="shrink-0 rounded-sm border border-line bg-surface-subtle px-1.5 py-0.5 text-2xs font-medium text-content-secondary">
              {ROLE_META[persona.role].short}
            </span>
            <Icon
              name="ArrowRight"
              size="sm"
              className={cn(
                "shrink-0 transition-colors duration-150",
                isPending ? "text-accent" : "text-content-tertiary group-hover:text-accent",
              )}
            />
          </button>
        );
      })}

      <p className="sr-only" role="status" aria-live="polite">
        {pendingName ? `Signing in as ${pendingName}` : ""}
      </p>
    </div>
  );
}

/**
 * "Skip to dashboard" — sign in as the default persona without picking a card.
 * A button rather than a link, because reaching the dashboard means holding a
 * session; a bare `<a href="/dashboard">` would be bounced straight back here
 * by the layout guard.
 */
export function SkipToDefaultPersona({
  userId,
  children,
}: {
  userId: string;
  children: React.ReactNode;
}) {
  const [isPending, startTransition] = useTransition();
  const submitting = useRef(false);

  return (
    <button
      type="button"
      disabled={isPending}
      aria-busy={isPending}
      onClick={() => {
        if (submitting.current) return;
        submitting.current = true;
        startTransition(async () => {
          await signInAsPersona(userId);
        });
      }}
      className="text-accent hover:underline disabled:opacity-60"
    >
      {children}
    </button>
  );
}
