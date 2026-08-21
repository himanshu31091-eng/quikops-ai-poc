"use client";

import * as React from "react";
import { useLabels } from "@/src/i18n/provider";
import { roleLabel } from "@/src/domain/labels";
import { useFormat, useTranslation } from "@/src/i18n/provider";
import { Icon } from "@/components/patterns/icon";
import { OwnerAvatar } from "@/components/patterns/owner-avatar";
import { SectionCard } from "@/components/patterns/section-card";
import { Button } from "@/components/ui/button";
import type { CaseComment, CaseCommentAttachment, User } from "@/src/domain/types";
import { DEMO_NOW } from "@/src/lib/constants";
import { formatTimestamp, formatWhen } from "@/src/lib/format";
import { cn } from "@/src/lib/cn";
import { EVIDENCE_META } from "../utils/evidence";
import { FIELD_CLASS, recentClass, SectionEmpty } from "./primitives";

interface CommentsCardProps {
  comments: CaseComment[];
  users: User[];
  sessionUser: User;
  recentIds: Set<string>;
  onAdd: (body: string, parentId: string | null, attachments: CaseCommentAttachment[]) => void;
}

/** Renders @Name as a highlighted mention without dangerously setting HTML. */
function CommentBody({ body, users }: { body: string; users: User[] }) {
  const names = React.useMemo(
    () => users.map((user) => user.name).sort((a, b) => b.length - a.length),
    [users],
  );

  const nodes = React.useMemo(() => {
    if (names.length === 0) return [body];
    const escaped = names.map((name) => name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
    const pattern = new RegExp(`@(${escaped.join("|")})`, "g");
    const parts: React.ReactNode[] = [];
    let cursor = 0;
    let match: RegExpExecArray | null;

    while ((match = pattern.exec(body)) !== null) {
      if (match.index > cursor) parts.push(body.slice(cursor, match.index));
      parts.push(
        <span
          key={`${match.index}-${match[1]}`}
          className="rounded-sm bg-accent-subtle px-1 font-medium text-accent-content"
        >
          @{match[1]}
        </span>,
      );
      cursor = match.index + match[0].length;
    }
    if (cursor < body.length) parts.push(body.slice(cursor));
    return parts;
  }, [body, names]);

  return <p className="text-xs leading-relaxed text-content-secondary">{nodes}</p>;
}

const CommentNode = React.memo(function CommentNode({
  comment,
  replies,
  users,
  depth,
  recentIds,
  onReply,
}: {
  comment: CaseComment;
  replies: CaseComment[];
  users: User[];
  depth: number;
  recentIds: Set<string>;
  onReply: (comment: CaseComment) => void;
}) {
  const labels = useLabels();
  const fmt = useFormat();
  const { t } = useTranslation();
  const author = users.find((user) => user.id === comment.authorId) ?? null;

  return (
    <li className={cn(depth > 0 ? "border-l border-line pl-4" : "")}>
      <div
        className={cn(
          "flex items-start gap-2.5 rounded-md py-3",
          recentIds.has(comment.id) ? "anim-settle -mx-2 px-2" : "",
          recentClass(recentIds.has(comment.id)),
        )}
      >
        <OwnerAvatar user={author} size="md" showName={false} />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <span className="text-xs font-semibold text-content">{comment.authorName}</span>
            <span className="text-2xs text-content-tertiary">
              {roleLabel(comment.authorRole, labels)}
            </span>
            <span
              title={formatTimestamp(comment.at)}
              className="text-2xs tabular-nums text-content-tertiary"
            >
              {formatWhen(comment.at, DEMO_NOW, fmt)}
            </span>
          </div>

          <div className="mt-1">
            <CommentBody body={comment.body} users={users} />
          </div>

          {comment.attachments.length > 0 ? (
            <ul className="mt-2 flex flex-wrap gap-1.5">
              {comment.attachments.map((attachment) => (
                <li key={attachment.id}>
                  <span className="flex items-center gap-1.5 rounded-sm border border-line bg-surface-subtle px-2 py-1 text-2xs text-content-secondary">
                    <Icon name={EVIDENCE_META[attachment.kind].icon} size="xs" />
                    {attachment.name}
                  </span>
                </li>
              ))}
            </ul>
          ) : null}

          <button
            type="button"
            onClick={() => onReply(comment)}
            className="mt-1.5 flex items-center gap-1 rounded-sm text-2xs font-medium text-content-tertiary transition-colors duration-150 hover:text-accent"
          >
            <Icon name="Reply" size="xs" />
            {t("cd.reply")}
          </button>
        </div>
      </div>

      {replies.length > 0 ? (
        <ul className="ml-4">
          {replies.map((reply) => (
            <CommentNode
              key={reply.id}
              comment={reply}
              replies={[]}
              users={users}
              depth={depth + 1}
              recentIds={recentIds}
              onReply={onReply}
            />
          ))}
        </ul>
      ) : null}
    </li>
  );
});

/**
 * Threaded discussion. One level of replies on purpose: deep nesting in an
 * operational thread hides the decision, and every real conversation here is
 * "someone raised a point, someone answered it".
 */
export const CommentsCard = React.memo(function CommentsCard({
  comments,
  users,
  sessionUser,
  recentIds,
  onAdd,
}: CommentsCardProps) {
  const { t } = useTranslation();
  const [body, setBody] = React.useState("");
  const [replyTo, setReplyTo] = React.useState<CaseComment | null>(null);
  const [mentionOpen, setMentionOpen] = React.useState(false);
  const inputRef = React.useRef<HTMLTextAreaElement | null>(null);

  const { roots, repliesByParent } = React.useMemo(() => {
    const sorted = [...comments].sort(
      (a, b) => new Date(a.at).getTime() - new Date(b.at).getTime(),
    );
    const byParent = new Map<string, CaseComment[]>();
    for (const comment of sorted) {
      if (comment.parentId === null) continue;
      const list = byParent.get(comment.parentId) ?? [];
      list.push(comment);
      byParent.set(comment.parentId, list);
    }
    return {
      roots: sorted.filter((comment) => comment.parentId === null),
      repliesByParent: byParent,
    };
  }, [comments]);

  const startReply = React.useCallback((comment: CaseComment) => {
    setReplyTo(comment);
    setBody((prev) => (prev.includes(`@${comment.authorName}`) ? prev : `@${comment.authorName} ${prev}`));
    inputRef.current?.focus();
  }, []);

  const insertMention = (user: User) => {
    setBody((prev) => `${prev}${prev.endsWith(" ") || prev === "" ? "" : " "}@${user.name} `);
    setMentionOpen(false);
    inputRef.current?.focus();
  };

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = body.trim();
    if (trimmed === "") return;
    onAdd(trimmed, replyTo?.id ?? null, []);
    setBody("");
    setReplyTo(null);
  };

  return (
    <SectionCard
      title={t("cd.discussion")}
      subtitle={`${comments.length} comment${comments.length === 1 ? "" : "s"}`}
      icon="MessageSquare"
      flush
    >
      {roots.length === 0 ? (
        <SectionEmpty
          icon="MessageSquare"
          title={t("cd.noDiscussion")}
          description={t("cd.noDiscussionBody")}
        />
      ) : (
        <ul className="divide-y divide-line px-4">
          {roots.map((comment) => (
            <CommentNode
              key={comment.id}
              comment={comment}
              replies={repliesByParent.get(comment.id) ?? []}
              users={users}
              depth={0}
              recentIds={recentIds}
              onReply={startReply}
            />
          ))}
        </ul>
      )}

      <form onSubmit={submit} className="border-t border-line bg-surface-subtle px-4 py-3.5">
        {replyTo ? (
          <div className="mb-2 flex items-center gap-2 rounded-md border border-line bg-surface px-2.5 py-1.5">
            <Icon name="Reply" size="xs" className="text-content-tertiary" />
            <span className="min-w-0 flex-1 truncate text-2xs text-content-secondary">
              {t("cd.replyingTo")} <span className="font-medium text-content">{replyTo.authorName}</span> —{" "}
              {replyTo.body.slice(0, 80)}
              {replyTo.body.length > 80 ? "…" : ""}
            </span>
            <button
              type="button"
              onClick={() => setReplyTo(null)}
              aria-label={t("cd.cancelReply")}
              className="shrink-0 rounded-sm text-content-tertiary transition-colors duration-150 hover:text-content"
            >
              <Icon name="X" size="xs" />
            </button>
          </div>
        ) : null}

        <div className="flex items-start gap-2.5">
          <OwnerAvatar user={sessionUser} size="md" showName={false} />
          <div className="min-w-0 flex-1">
            <textarea
              ref={inputRef}
              value={body}
              onChange={(event) => setBody(event.target.value)}
              onKeyDown={(event) => {
                if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
                  submit(event);
                }
              }}
              rows={2}
              aria-label={t("cd.addComment")}
              placeholder={t("cd.commentHint")}
              className={cn(FIELD_CLASS, "h-auto resize-y py-2 leading-relaxed")}
            />

            {mentionOpen ? (
              <ul className="mt-1.5 flex flex-wrap gap-1.5">
                {users.map((user) => (
                  <li key={user.id}>
                    <button
                      type="button"
                      onClick={() => insertMention(user)}
                      className="flex items-center gap-1.5 rounded-sm border border-line-control bg-surface px-2 py-1 text-2xs text-content-secondary transition-colors duration-150 hover:border-accent-line hover:text-accent-content"
                    >
                      <OwnerAvatar user={user} size="sm" showName={false} />
                      {user.name}
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}

            <div className="mt-2 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setMentionOpen((prev) => !prev)}
                className="flex items-center gap-1 rounded-sm text-2xs font-medium text-content-tertiary transition-colors duration-150 hover:text-accent"
              >
                <Icon name="AtSign" size="xs" />
                {mentionOpen ? "Hide people" : "Mention someone"}
              </button>
              <div className="flex items-center gap-2">
                <span className="hidden text-2xs text-content-tertiary sm:inline">
                  ⌘ + Enter to post
                </span>
                <Button variant="primary" size="sm" type="submit" disabled={body.trim() === ""}>
                  <Icon name="Send" size="sm" />
                  {replyTo ? "Post reply" : "Post comment"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </form>
    </SectionCard>
  );
});
