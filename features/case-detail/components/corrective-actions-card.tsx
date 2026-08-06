"use client";

import * as React from "react";
import { Icon } from "@/components/patterns/icon";
import { OwnerAvatar } from "@/components/patterns/owner-avatar";
import { SectionCard } from "@/components/patterns/section-card";
import { StatusBadge } from "@/components/patterns/status-badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ACTION_STATUS_META, ROLE_META } from "@/src/config/app-config";
import type { ActionStatus, CorrectiveAction, User } from "@/src/domain/types";
import { DEMO_NOW } from "@/src/lib/constants";
import { formatDue, formatTimestamp } from "@/src/lib/format";
import { cn } from "@/src/lib/cn";
import type { NewActionDraft } from "../types";
import { fromDateTimeInputValue, toDateTimeInputValue } from "../utils/datetime";
import { FIELD_CLASS, ProgressBar, recentClass, SectionEmpty } from "./primitives";

interface CorrectiveActionsCardProps {
  actions: CorrectiveAction[];
  users: User[];
  defaultOwnerId: string;
  defaultDueAt: string;
  readOnly: boolean;
  recentIds: Set<string>;
  onAdd: (draft: NewActionDraft) => void;
  onSetProgress: (id: string, pct: number) => void;
  onSetStatus: (id: string, status: ActionStatus) => void;
  onSetNotes: (id: string, notes: string) => void;
  onEdit: (
    id: string,
    patch: { title?: string; description?: string; ownerId?: string; dueAt?: string },
  ) => void;
  onReorder: (id: string, direction: -1 | 1) => void;
  onRemove: (id: string) => void;
}

const PROGRESS_STEPS = [0, 25, 50, 75, 100] as const;

const ActionRow = React.memo(function ActionRow({
  action,
  index,
  owner,
  readOnly,
  isRecent,
  isFirst,
  isLast,
  users,
  onSetProgress,
  onSetStatus,
  onSetNotes,
  onEdit,
  onReorder,
  onRemove,
}: {
  action: CorrectiveAction;
  index: number;
  owner: User | undefined;
  readOnly: boolean;
  isRecent: boolean;
  isFirst: boolean;
  isLast: boolean;
  users: User[];
  onSetProgress: (id: string, pct: number) => void;
  onSetStatus: (id: string, status: ActionStatus) => void;
  onSetNotes: (id: string, notes: string) => void;
  onEdit: (
    id: string,
    patch: { title?: string; description?: string; ownerId?: string; dueAt?: string },
  ) => void;
  onReorder: (id: string, direction: -1 | 1) => void;
  onRemove: (id: string) => void;
}) {
  const [editingNotes, setEditingNotes] = React.useState(false);
  const [draftNotes, setDraftNotes] = React.useState(action.notes);
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState({
    title: action.title,
    description: action.description,
    ownerId: action.ownerId,
    dueAt: action.dueAt,
  });

  React.useEffect(() => {
    setDraft({
      title: action.title,
      description: action.description,
      ownerId: action.ownerId,
      dueAt: action.dueAt,
    });
  }, [action.title, action.description, action.ownerId, action.dueAt]);

  React.useEffect(() => {
    setDraftNotes(action.notes);
  }, [action.notes]);

  const done = action.status === "DONE";
  const overdue = !done && new Date(action.dueAt).getTime() < DEMO_NOW.getTime();

  const commitEdit = (event: React.FormEvent) => {
    event.preventDefault();
    if (draft.title.trim().length < 6) return;
    onEdit(action.id, {
      title: draft.title.trim(),
      description: draft.description.trim(),
      ownerId: draft.ownerId,
      dueAt: draft.dueAt,
    });
    setEditing(false);
  };

  if (editing) {
    return (
      <li className="anim-settle bg-surface-subtle px-4 py-3">
        <form onSubmit={commitEdit} className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label
              htmlFor={`edit-title-${action.id}`}
              className="mb-1 block text-2xs font-medium uppercase tracking-wide text-content-tertiary"
            >
              Title
            </label>
            <input
              id={`edit-title-${action.id}`}
              value={draft.title}
              onChange={(event) => setDraft((prev) => ({ ...prev, title: event.target.value }))}
              className={FIELD_CLASS}
              autoFocus
            />
          </div>

          <div className="sm:col-span-2">
            <label
              htmlFor={`edit-desc-${action.id}`}
              className="mb-1 block text-2xs font-medium uppercase tracking-wide text-content-tertiary"
            >
              What good looks like
            </label>
            <textarea
              id={`edit-desc-${action.id}`}
              value={draft.description}
              onChange={(event) =>
                setDraft((prev) => ({ ...prev, description: event.target.value }))
              }
              rows={2}
              className={cn(FIELD_CLASS, "h-auto resize-y py-2 leading-relaxed")}
            />
          </div>

          <div>
            <label
              htmlFor={`edit-owner-${action.id}`}
              className="mb-1 block text-2xs font-medium uppercase tracking-wide text-content-tertiary"
            >
              Owner
            </label>
            <select
              id={`edit-owner-${action.id}`}
              value={draft.ownerId}
              onChange={(event) => setDraft((prev) => ({ ...prev, ownerId: event.target.value }))}
              className={FIELD_CLASS}
            >
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name} — {ROLE_META[user.role].label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor={`edit-due-${action.id}`}
              className="mb-1 block text-2xs font-medium uppercase tracking-wide text-content-tertiary"
            >
              Due (UTC)
            </label>
            <input
              id={`edit-due-${action.id}`}
              type="datetime-local"
              value={toDateTimeInputValue(draft.dueAt)}
              onChange={(event) => {
                const iso = fromDateTimeInputValue(event.target.value);
                if (iso) setDraft((prev) => ({ ...prev, dueAt: iso }));
              }}
              className={cn(FIELD_CLASS, "tabular-nums")}
            />
          </div>

          <div className="flex justify-end gap-2 sm:col-span-2">
            <Button
              variant="secondary"
              size="sm"
              type="button"
              onClick={() => setEditing(false)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              type="submit"
              disabled={draft.title.trim().length < 6}
            >
              <Icon name="Check" size="sm" />
              Save action
            </Button>
          </div>
        </form>
      </li>
    );
  }

  const commitNotes = () => {
    setEditingNotes(false);
    if (draftNotes.trim() !== action.notes) onSetNotes(action.id, draftNotes.trim());
  };

  return (
    <li
      className={cn(
        "group px-4 py-3 hover:bg-surface-subtle",
        isRecent ? "anim-settle" : "",
        recentClass(isRecent),
      )}
    >
      <div className="flex items-start gap-3">
        <button
          type="button"
          role="checkbox"
          aria-checked={done}
          aria-label={done ? `Reopen ${action.title}` : `Mark ${action.title} complete`}
          disabled={readOnly}
          onClick={() => onSetStatus(action.id, done ? "IN_PROGRESS" : "DONE")}
          className={cn(
            "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border transition-colors duration-150",
            done
              ? "border-success bg-success text-white"
              : "border-line-strong bg-surface hover:border-accent",
            readOnly ? "cursor-not-allowed opacity-60" : "",
          )}
        >
          {done ? <Icon name="Check" size="xs" strokeWidth={3} /> : null}
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <span className="flex items-center gap-0.5">
              <span className="text-2xs font-medium tabular-nums text-content-tertiary">
                {String(index + 1).padStart(2, "0")}
              </span>
              {!readOnly ? (
                <span className="flex flex-col opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100">
                  <button
                    type="button"
                    disabled={isFirst}
                    onClick={() => onReorder(action.id, -1)}
                    aria-label={`Move "${action.title}" earlier in the plan`}
                    className="flex size-3.5 items-center justify-center rounded-sm text-content-tertiary transition-colors duration-150 hover:bg-surface-active hover:text-content disabled:opacity-30 disabled:hover:bg-transparent"
                  >
                    <Icon name="ChevronUp" size="xs" />
                  </button>
                  <button
                    type="button"
                    disabled={isLast}
                    onClick={() => onReorder(action.id, 1)}
                    aria-label={`Move "${action.title}" later in the plan`}
                    className="flex size-3.5 items-center justify-center rounded-sm text-content-tertiary transition-colors duration-150 hover:bg-surface-active hover:text-content disabled:opacity-30 disabled:hover:bg-transparent"
                  >
                    <Icon name="ChevronDown" size="xs" />
                  </button>
                </span>
              ) : null}
            </span>
            <p
              className={cn(
                "text-sm font-medium leading-snug",
                done ? "text-content-tertiary line-through" : "text-content",
              )}
            >
              {action.title}
            </p>
            <StatusBadge status={action.status} kind="action" size="sm" />
            {action.origin !== "MANUAL" ? (
              <span className="rounded-sm border border-line bg-surface-subtle px-1 py-px text-2xs text-content-tertiary">
                {action.origin === "PLAYBOOK" ? "Playbook" : "AI suggested"}
              </span>
            ) : null}
          </div>

          <p className="mt-1 text-xs leading-relaxed text-content-secondary">
            {action.description}
          </p>

          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-2xs text-content-tertiary">
            <span className="flex items-center gap-1.5">
              <OwnerAvatar user={owner ?? null} size="sm" showName={false} />
              {owner?.name ?? "Unassigned"}
              {owner ? ` · ${ROLE_META[owner.role].label}` : ""}
            </span>
            <span
              title={formatTimestamp(action.dueAt)}
              className={cn(
                "flex items-center gap-1",
                overdue ? "font-medium text-critical" : "",
              )}
            >
              <Icon name="CalendarClock" size="xs" />
              {formatDue(action.dueAt, DEMO_NOW)}
            </span>
            {action.evidenceCount > 0 ? (
              <span className="flex items-center gap-1">
                <Icon name="Paperclip" size="xs" />
                {action.evidenceCount} file{action.evidenceCount === 1 ? "" : "s"}
              </span>
            ) : null}
            {action.completedAt ? (
              <span className="flex items-center gap-1 text-success-content">
                <Icon name="CircleCheck" size="xs" />
                Completed {formatTimestamp(action.completedAt)}
              </span>
            ) : null}
          </div>

          <div className="mt-2.5 flex items-center gap-3">
            <ProgressBar
              value={action.completionPct}
              tone={done ? "success" : overdue ? "critical" : "accent"}
              className="max-w-xs"
            />
            <span className="shrink-0 text-2xs font-medium tabular-nums text-content-secondary">
              {action.completionPct}%
            </span>
            {!readOnly ? (
              <span className="flex items-center gap-1">
                {PROGRESS_STEPS.map((step) => (
                  <button
                    key={step}
                    type="button"
                    onClick={() => onSetProgress(action.id, step)}
                    aria-label={`Set ${action.title} to ${step}% complete`}
                    className={cn(
                      "rounded-sm px-1 py-0.5 text-2xs tabular-nums transition-colors duration-150",
                      action.completionPct === step
                        ? "bg-surface-active font-semibold text-content"
                        : "text-content-tertiary hover:bg-surface-hover hover:text-content",
                    )}
                  >
                    {step}
                  </button>
                ))}
              </span>
            ) : null}
          </div>

          {editingNotes ? (
            <div className="mt-2.5">
              <textarea
                value={draftNotes}
                onChange={(event) => setDraftNotes(event.target.value)}
                onBlur={commitNotes}
                rows={2}
                autoFocus
                aria-label={`Notes for ${action.title}`}
                className={cn(FIELD_CLASS, "h-auto resize-y py-2 leading-relaxed")}
              />
              <div className="mt-1.5 flex justify-end gap-2">
                <Button
                  variant="ghost"
                  size="xs"
                  onClick={() => {
                    setDraftNotes(action.notes);
                    setEditingNotes(false);
                  }}
                >
                  Cancel
                </Button>
                <Button variant="secondary" size="xs" onClick={commitNotes}>
                  Save note
                </Button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              disabled={readOnly}
              onClick={() => setEditingNotes(true)}
              className={cn(
                "mt-2 flex w-full items-start gap-1.5 rounded-md border border-transparent px-2 py-1.5 text-left text-2xs leading-relaxed text-content-tertiary transition-colors duration-150",
                readOnly ? "cursor-default" : "hover:border-line hover:bg-surface",
              )}
            >
              <Icon name="SquarePen" size="xs" className="mt-0.5 shrink-0" />
              <span className="min-w-0 flex-1">{action.notes || "Add a progress note"}</span>
            </button>
          )}
        </div>

        {!readOnly ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label={`Actions for ${action.title}`}
                className="flex size-7 shrink-0 items-center justify-center rounded-md text-content-tertiary opacity-0 transition-colors duration-150 hover:bg-surface-active hover:text-content group-hover:opacity-100 has-data-[state=open]:opacity-100"
              >
                <Icon name="Ellipsis" size="sm" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Set status</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {(["TODO", "IN_PROGRESS", "BLOCKED", "DONE", "CANCELLED"] as ActionStatus[]).map(
                (status) => (
                  <DropdownMenuItem
                    key={status}
                    onSelect={() => onSetStatus(action.id, status)}
                    disabled={status === action.status}
                  >
                    <span
                      className={cn(
                        "size-1.5 rounded-full",
                        ACTION_STATUS_META[status].dotClassName,
                      )}
                    />
                    <span className="flex-1">{ACTION_STATUS_META[status].label}</span>
                    {status === action.status ? (
                      <Icon name="Check" size="sm" className="text-accent" />
                    ) : null}
                  </DropdownMenuItem>
                ),
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => setEditing(true)}>
                <Icon name="SquarePen" size="sm" />
                Edit action
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => onRemove(action.id)}>
                <Icon name="Trash2" size="sm" />
                Remove from plan
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </div>
    </li>
  );
});

/**
 * The corrective plan. Progress is reported by the owner in explicit steps
 * rather than inferred, and the completion state of the plan is what gates the
 * verification request — a case cannot be sent for sign-off with open work.
 */
export const CorrectiveActionsCard = React.memo(function CorrectiveActionsCard({
  actions,
  users,
  defaultOwnerId,
  defaultDueAt,
  readOnly,
  recentIds,
  onAdd,
  onSetProgress,
  onSetStatus,
  onSetNotes,
  onEdit,
  onReorder,
  onRemove,
}: CorrectiveActionsCardProps) {
  const [adding, setAdding] = React.useState(false);
  const [draft, setDraft] = React.useState<NewActionDraft>(() => ({
    title: "",
    description: "",
    ownerId: defaultOwnerId,
    dueAt: defaultDueAt,
  }));
  const [error, setError] = React.useState<string | null>(null);

  const userById = React.useMemo(
    () => Object.fromEntries(users.map((user) => [user.id, user])),
    [users],
  );

  const done = actions.filter((action) => action.status === "DONE").length;
  const completion =
    actions.length === 0 ? 0 : Math.round((done / actions.length) * 100);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (draft.title.trim().length < 6) {
      setError("Give the action a title an owner would recognise.");
      return;
    }
    setError(null);
    onAdd({ ...draft, title: draft.title.trim(), description: draft.description.trim() });
    setDraft({ title: "", description: "", ownerId: defaultOwnerId, dueAt: defaultDueAt });
    setAdding(false);
  };

  return (
    <SectionCard
      title="Corrective actions"
      subtitle={
        actions.length === 0
          ? "No plan yet"
          : `${done} of ${actions.length} complete · ${completion}% of the plan · worked in sequence`
      }
      icon="ListChecks"
      flush
      action={
        !readOnly ? (
          <Button variant="secondary" size="sm" onClick={() => setAdding((prev) => !prev)}>
            <Icon name={adding ? "X" : "Plus"} size="sm" />
            {adding ? "Cancel" : "Add action"}
          </Button>
        ) : null
      }
      footer={
        actions.length > 0 ? (
          completion === 100 ? (
            <div className="anim-settle flex items-center gap-2">
              <Icon name="CircleCheck" size="sm" className="shrink-0 text-success" />
              <p className="min-w-0 flex-1 text-2xs font-medium text-success-content">
                Plan complete — every corrective action is closed and evidenced. The case is ready
                to send for verification.
              </p>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <ProgressBar value={completion} tone="accent" className="flex-1" />
              <span className="shrink-0 text-2xs font-medium tabular-nums text-content-secondary">
                {completion}% complete
              </span>
            </div>
          )
        ) : null
      }
    >
      {adding ? (
        <form onSubmit={submit} className="border-b border-line bg-surface-subtle px-4 py-3.5">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label
                htmlFor="action-title"
                className="mb-1 block text-2xs font-medium uppercase tracking-wide text-content-tertiary"
              >
                Title
              </label>
              <input
                id="action-title"
                value={draft.title}
                onChange={(event) => setDraft((prev) => ({ ...prev, title: event.target.value }))}
                placeholder="Confirm the revised date in writing with the supplier"
                className={FIELD_CLASS}
                autoFocus
              />
              {error ? (
                <p className="mt-1 flex items-center gap-1 text-2xs font-medium text-critical-content">
                  <Icon name="CircleAlert" size="xs" />
                  {error}
                </p>
              ) : null}
            </div>

            <div className="sm:col-span-2">
              <label
                htmlFor="action-description"
                className="mb-1 block text-2xs font-medium uppercase tracking-wide text-content-tertiary"
              >
                What good looks like
              </label>
              <textarea
                id="action-description"
                value={draft.description}
                onChange={(event) =>
                  setDraft((prev) => ({ ...prev, description: event.target.value }))
                }
                rows={2}
                placeholder="The acceptance criteria the reviewer will check this against."
                className={cn(FIELD_CLASS, "h-auto resize-y py-2 leading-relaxed")}
              />
            </div>

            <div>
              <label
                htmlFor="action-owner"
                className="mb-1 block text-2xs font-medium uppercase tracking-wide text-content-tertiary"
              >
                Owner
              </label>
              <select
                id="action-owner"
                value={draft.ownerId}
                onChange={(event) =>
                  setDraft((prev) => ({ ...prev, ownerId: event.target.value }))
                }
                className={FIELD_CLASS}
              >
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name} — {ROLE_META[user.role].label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="action-due"
                className="mb-1 block text-2xs font-medium uppercase tracking-wide text-content-tertiary"
              >
                Due (UTC)
              </label>
              <input
                id="action-due"
                type="datetime-local"
                value={toDateTimeInputValue(draft.dueAt)}
                onChange={(event) => {
                  const iso = fromDateTimeInputValue(event.target.value);
                  if (iso) setDraft((prev) => ({ ...prev, dueAt: iso }));
                }}
                className={cn(FIELD_CLASS, "tabular-nums")}
              />
            </div>
          </div>

          <div className="mt-3 flex justify-end gap-2">
            <Button variant="secondary" size="sm" type="button" onClick={() => setAdding(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit">
              <Icon name="Plus" size="sm" />
              Add to plan
            </Button>
          </div>
        </form>
      ) : null}

      {actions.length === 0 ? (
        <SectionEmpty
          icon="ListChecks"
          title="No corrective actions yet"
          description="A case without a plan is a case nobody is working. Add the first action, or apply the playbook for this exception type."
          action={
            !readOnly ? (
              <Button variant="primary" size="md" onClick={() => setAdding(true)}>
                <Icon name="Plus" size="sm" />
                Add the first action
              </Button>
            ) : null
          }
        />
      ) : (
        <ul className="divide-y divide-line">
          {actions.map((action, index) => (
            <ActionRow
              key={action.id}
              action={action}
              index={index}
              owner={userById[action.ownerId]}
              readOnly={readOnly}
              isRecent={recentIds.has(action.id)}
              isFirst={index === 0}
              isLast={index === actions.length - 1}
              users={users}
              onSetProgress={onSetProgress}
              onSetStatus={onSetStatus}
              onSetNotes={onSetNotes}
              onEdit={onEdit}
              onReorder={onReorder}
              onRemove={onRemove}
            />
          ))}
        </ul>
      )}
    </SectionCard>
  );
});
