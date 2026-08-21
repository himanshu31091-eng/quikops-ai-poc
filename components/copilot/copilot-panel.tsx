"use client";

import * as React from "react";
import { useTranslation } from "@/src/i18n/provider";
import { Icon } from "@/components/patterns/icon";
import { FIELD_CLASS } from "@/components/patterns/form-field";
import { OwnerAvatar } from "@/components/patterns/owner-avatar";
import { Button } from "@/components/ui/button";
import type { SessionOverlay } from "@/src/ai/types";
import type { User } from "@/src/domain/types";
import { useFocusTrap } from "@/src/a11y/use-focus-trap";
import { cn } from "@/src/lib/cn";
import { useCopilot } from "./use-copilot";
import type { CopilotSubject } from "./types";

interface CopilotPanelProps {
  /** What the Copilot is pointed at — one case, or the whole portfolio. */
  subject: CopilotSubject;
  sessionUser: User;
  open: boolean;
  onClose: () => void;
  /** Unsaved case state, so answers reflect what is on screen. Case scope only. */
  overlayRef?: React.RefObject<SessionOverlay | null>;
  /**
   * Asked automatically the first time the panel opens with this set — so a
   * control that promises a specific answer ("Regenerate") delivers it rather
   * than opening an empty panel. Cleared by the caller after it fires.
   */
  autoAsk?: string | null;
}

/**
 * Minimal markdown for model output: paragraphs, bullet lists and **bold**.
 * A full renderer is a dependency and an injection surface; the system prompt
 * constrains the model to exactly these three constructs, so this is enough.
 */
function renderInline(text: string, keyPrefix: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const pattern = /\*\*([^*]+)\*\*/g;
  let cursor = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > cursor) parts.push(text.slice(cursor, match.index));
    parts.push(
      <strong key={`${keyPrefix}-b-${match.index}`} className="font-semibold text-content">
        {match[1]}
      </strong>,
    );
    cursor = match.index + match[0].length;
  }
  if (cursor < text.length) parts.push(text.slice(cursor));
  return parts;
}

const AnswerBody = React.memo(function AnswerBody({ content }: { content: string }) {
  const blocks = React.useMemo(() => {
    const lines = content.split("\n");
    const output: React.ReactNode[] = [];
    let bullets: string[] = [];
    let paragraph: string[] = [];

    const flushBullets = (key: string) => {
      if (bullets.length === 0) return;
      output.push(
        <ul key={`ul-${key}`} className="my-2 space-y-1.5 pl-1">
          {bullets.map((item, index) => (
            <li key={`${key}-${index}`} className="flex gap-2">
              <span className="mt-1.5 size-1 shrink-0 rounded-full bg-content-tertiary" />
              <span className="min-w-0 flex-1">{renderInline(item, `${key}-${index}`)}</span>
            </li>
          ))}
        </ul>,
      );
      bullets = [];
    };

    const flushParagraph = (key: string) => {
      if (paragraph.length === 0) return;
      output.push(
        <p key={`p-${key}`} className="my-2 leading-relaxed first:mt-0 last:mb-0">
          {renderInline(paragraph.join(" "), `p-${key}`)}
        </p>,
      );
      paragraph = [];
    };

    lines.forEach((raw, index) => {
      const line = raw.trim();
      if (line === "") {
        flushParagraph(String(index));
        flushBullets(String(index));
        return;
      }
      if (line.startsWith("- ")) {
        flushParagraph(String(index));
        bullets.push(line.slice(2));
        return;
      }
      flushBullets(String(index));
      paragraph.push(line);
    });

    flushParagraph("end");
    flushBullets("end");
    return output;
  }, [content]);

  return <div className="text-xs text-content-secondary">{blocks}</div>;
});

/**
 * The Copilot surface: a right-side panel over whatever the user is already
 * looking at, rather than a separate screen. The panel never sends record
 * content — it sends a scope and, for a case, a case number; the server
 * assembles the context from the data layer.
 */
export function CopilotPanel({
  subject,
  sessionUser,
  open,
  onClose,
  overlayRef,
  autoAsk = null,
}: CopilotPanelProps) {
  const { t } = useTranslation();
  const copilot = useCopilot({
    scope: subject.scope,
    ...(subject.caseNo !== undefined ? { caseNo: subject.caseNo } : {}),
    ...(overlayRef !== undefined ? { overlayRef } : {}),
  });
  const trapRef = useFocusTrap(open);
  const [draft, setDraft] = React.useState("");
  const scrollRef = React.useRef<HTMLDivElement | null>(null);
  const inputRef = React.useRef<HTMLTextAreaElement | null>(null);

  const quickPrompts = React.useMemo(
    () => subject.suggestions.filter((prompt) => prompt.quick),
    [subject.suggestions],
  );

  React.useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  // Fires once per distinct request. `send` is a no-op while a request is in
  // flight, so a re-render mid-stream cannot double-ask.
  const askedRef = React.useRef<string | null>(null);
  const { send: sendQuestion } = copilot;

  React.useEffect(() => {
    if (!open || !autoAsk || askedRef.current === autoAsk) return;
    askedRef.current = autoAsk;
    sendQuestion(autoAsk);
  }, [open, autoAsk, sendQuestion]);

  React.useEffect(() => {
    const node = scrollRef.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [copilot.messages]);

  React.useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (draft.trim() === "" || copilot.isStreaming) return;
    copilot.send(draft);
    setDraft("");
  };

  const ask = (prompt: string) => {
    if (copilot.isStreaming) return;
    copilot.send(prompt);
  };

  return (
    <>
      {open ? (
        <button
          type="button"
          aria-label={t("copilot.closeCopilot")}
          onClick={onClose}
          className="anim-fade fixed inset-0 z-40 bg-surface-inverse/25 backdrop-blur-[1px] xl:hidden"
        />
      ) : null}

      {/*
        `inert` rather than `aria-hidden`: the panel stays mounted so the
        conversation survives a close, but while it is off-screen its inputs and
        buttons must not be reachable by Tab or announced by a screen reader.
        aria-hidden alone hides it from assistive tech while leaving a dozen
        focusable controls in the tab order.
      */}
      <aside
        ref={trapRef as React.RefObject<HTMLElement>}
        aria-label={t("copilot.quikopsAiCopilot")}
        inert={!open}
        className={cn(
          "fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-line bg-surface shadow-overlay",
          "transition-transform duration-200 ease-out",
          open ? "translate-x-0" : "pointer-events-none translate-x-full",
        )}
      >
        <header className="flex shrink-0 items-start gap-2.5 border-b border-line px-4 py-3">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-accent-subtle text-accent">
            <Icon name="Sparkles" size="md" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-semibold leading-5 text-content">AI Copilot</h2>
            <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-2xs text-content-tertiary">
              <span className={subject.scope === "case" ? "font-mono" : undefined}>
                {subject.ref}
              </span>
              <span>·</span>
              <span className="truncate">{subject.scopeNote}</span>
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {copilot.messages.length > 0 ? (
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={copilot.reset}
                aria-label={t("copilot.clearConversation")}
                title={t("copilot.clearConversation")}
              >
                <Icon name="RefreshCw" size="sm" />
              </Button>
            ) : null}
            <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label={t("copilot.closeCopilot")}>
              <Icon name="X" size="sm" />
            </Button>
          </div>
        </header>

        {copilot.mode !== "unknown" ? (
          <div
            className={cn(
              "flex shrink-0 items-center gap-1.5 border-b px-4 py-1.5 text-2xs",
              copilot.mode === "live"
                ? "border-success-line bg-success-subtle text-success-content"
                : "border-line bg-surface-subtle text-content-tertiary",
            )}
          >
            <Icon name={copilot.mode === "live" ? "Zap" : "Bot"} size="xs" />
            {copilot.mode === "live" ? (
              <span>
                {t("copilot.live")} <span className="font-mono">{copilot.model}</span>
              </span>
            ) : (
              <span className="flex flex-wrap items-center gap-1.5">
                <span className="rounded-sm border border-line bg-surface px-1.5 py-px font-semibold text-content-secondary">
                  {t("copilot.demoAi")}
                </span>
                <span>
                  Answers composed from {subject.offlineSource} — set{" "}
                  <span className="font-mono">ANTHROPIC_API_KEY</span> for live Claude
                </span>
              </span>
            )}
          </div>
        ) : null}

        <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto px-4 py-3.5">
          {copilot.messages.length === 0 ? (
            <div>
              <div className="rounded-lg border border-line bg-surface-subtle px-3.5 py-3">
                <p className="text-xs leading-relaxed text-content-secondary">
                  {subject.intro}
                </p>
              </div>

              <p className="mt-3.5 text-2xs font-semibold uppercase tracking-wide text-content-tertiary">
                {t("actionCenter.suggested")}
              </p>
              <ul className="mt-2 space-y-1.5">
                {subject.suggestions.map((suggestion) => (
                  <li key={suggestion.id}>
                    <button
                      type="button"
                      onClick={() => ask(suggestion.prompt)}
                      className="flex w-full items-center gap-2.5 rounded-md border border-line-control bg-surface px-3 py-2 text-left transition-colors duration-150 hover:border-accent-line hover:bg-accent-subtle"
                    >
                      <Icon
                        name={suggestion.icon}
                        size="sm"
                        className="shrink-0 text-content-tertiary"
                      />
                      <span className="min-w-0 flex-1 text-xs font-medium text-content">
                        {suggestion.label}
                      </span>
                      <Icon
                        name="ArrowRight"
                        size="xs"
                        className="shrink-0 text-content-tertiary"
                      />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <ol className="space-y-3.5">
              {copilot.messages.map((message) =>
                message.role === "user" ? (
                  <li key={message.id} className="flex justify-end gap-2.5">
                    <div className="max-w-[85%] break-words rounded-lg rounded-br-sm border border-accent-line bg-accent-subtle px-3 py-2">
                      <p className="text-xs leading-relaxed text-accent-content">
                        {message.content}
                      </p>
                    </div>
                    <OwnerAvatar user={sessionUser} size="sm" showName={false} />
                  </li>
                ) : (
                  <li key={message.id} className="flex gap-2.5">
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full border border-line bg-surface-subtle text-accent">
                      <Icon name="Sparkles" size="xs" />
                    </span>
                    {/*
                      `min-w-0` lets the bubble shrink; `break-words` is what
                      handles the thing a model can emit that a case title
                      cannot — an unbroken token longer than the panel, which
                      wraps at no space and would otherwise overflow it.
                    */}
                    <div className="min-w-0 flex-1 break-words rounded-lg rounded-bl-sm border border-line bg-surface px-3 py-2">
                      {message.content === "" && message.streaming ? (
                        <p className="flex items-center gap-1.5 text-xs text-content-tertiary">
                          <span className="flex gap-0.5">
                            <span className="size-1 animate-pulse rounded-full bg-content-tertiary" />
                            <span className="size-1 animate-pulse rounded-full bg-content-tertiary [animation-delay:150ms]" />
                            <span className="size-1 animate-pulse rounded-full bg-content-tertiary [animation-delay:300ms]" />
                          </span>
                          {subject.scope === "case"
                            ? "Reading the case record"
                            : "Reading the operational position"}
                        </p>
                      ) : (
                        <AnswerBody content={message.content} />
                      )}
                      {message.streaming && message.content !== "" ? (
                        <span className="ml-0.5 inline-block h-3 w-1 animate-pulse bg-accent align-middle" />
                      ) : null}
                    </div>
                  </li>
                ),
              )}
            </ol>
          )}

          {copilot.error ? (
            <div className="mt-3 flex items-start gap-2 rounded-md border border-critical-line bg-critical-subtle px-3 py-2">
              <Icon name="TriangleAlert" size="sm" className="mt-0.5 shrink-0 text-critical" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-critical-content">
                  {t("copilot.theCopilotCouldNotAnswer")}
                </p>
                <p className="mt-0.5 text-2xs leading-relaxed text-content-secondary">
                  {copilot.error.message}
                </p>
                {copilot.error.retryable ? (
                  <Button
                    variant="secondary"
                    size="xs"
                    className="mt-2"
                    onClick={copilot.retry}
                    disabled={copilot.isStreaming}
                  >
                    <Icon name="RefreshCw" size="xs" />
                    {t("common.retry")}
                  </Button>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>

        <form onSubmit={submit} className="shrink-0 border-t border-line px-4 py-3">
          {copilot.messages.length > 0 ? (
            <div className="mb-2 flex flex-wrap gap-1.5">
              {quickPrompts.map((suggestion) => (
                <button
                  key={suggestion.id}
                  type="button"
                  disabled={copilot.isStreaming}
                  onClick={() => ask(suggestion.prompt)}
                  className="rounded-sm border border-line-control bg-surface-subtle px-2 py-1 text-2xs text-content-secondary transition-colors duration-150 hover:border-accent-line hover:text-accent-content disabled:opacity-50"
                >
                  {suggestion.label}
                </button>
              ))}
            </div>
          ) : null}

          <textarea
            ref={inputRef}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                submit(event);
              }
            }}
            rows={2}
            aria-label={subject.inputLabel}
            placeholder={subject.placeholder}
            className={cn(FIELD_CLASS, "h-auto resize-y py-2 leading-relaxed")}
          />

          <div className="mt-2 flex items-center justify-between gap-2">
            <span className="text-2xs text-content-tertiary">
              {t("copilot.enterToSendShiftEnter")}
            </span>
            {copilot.isStreaming ? (
              <Button variant="secondary" size="sm" type="button" onClick={copilot.stop}>
                <Icon name="CircleStop" size="sm" />
                {t("copilot.stop")}
              </Button>
            ) : (
              <Button variant="primary" size="sm" type="submit" disabled={draft.trim() === ""}>
                <Icon name="Send" size="sm" />
                {t("copilot.ask")}
              </Button>
            )}
          </div>
        </form>
      </aside>
    </>
  );
}

export default CopilotPanel;
