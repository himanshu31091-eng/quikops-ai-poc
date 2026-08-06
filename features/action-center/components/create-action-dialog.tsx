"use client";

import * as React from "react";
import { Icon } from "@/components/patterns/icon";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import type { ActionCaseContext } from "@/src/data/queries/actions";
import type { User } from "@/src/domain/types";
import { FIELD_CLASS, FormField } from "@/components/patterns/form-field";
import type { NewActionDraft } from "../types";

/**
 * Raise a corrective action against an existing case.
 *
 * The case must already exist — an action with no case has nothing to be
 * measured against and no owner of record. Priority and plant are inherited
 * from the case rather than entered, for the same reason priority is never
 * typed anywhere else in the product.
 */

const EMPTY: NewActionDraft = {
  caseNo: "",
  title: "",
  description: "",
  ownerId: "",
  dueInDays: "3",
};

interface CreateActionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cases: ActionCaseContext[];
  users: User[];
  sessionUser: User;
  onCreate: (draft: NewActionDraft) => void;
}

export function CreateActionDialog({
  open,
  onOpenChange,
  cases,
  users,
  sessionUser,
  onCreate,
}: CreateActionDialogProps) {
  const [draft, setDraft] = React.useState<NewActionDraft>(EMPTY);

  // Reset on open so a dismissed draft never reappears half-filled.
  React.useEffect(() => {
    if (open) setDraft({ ...EMPTY, ownerId: sessionUser.id });
  }, [open, sessionUser.id]);

  const openCases = React.useMemo(
    () =>
      cases
        .filter((entry) => entry.isOpen)
        .sort((a, b) => b.priorityScore - a.priorityScore),
    [cases],
  );

  const selected = openCases.find((entry) => entry.caseNo === draft.caseNo) ?? null;
  const canSubmit = draft.caseNo !== "" && draft.title.trim().length > 3;

  const set = <K extends keyof NewActionDraft>(key: K, value: NewActionDraft[K]) =>
    setDraft((previous) => ({ ...previous, [key]: value }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogTitle>Create action</DialogTitle>
        <DialogDescription>
          Raise a corrective action against an open case. Priority and plant are
          inherited from the case.
        </DialogDescription>

        <form
          className="mt-4 space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            if (!canSubmit) return;
            onCreate(draft);
            onOpenChange(false);
          }}
        >
          <FormField label="Case" htmlFor="action-case" required>
            <select
              id="action-case"
              value={draft.caseNo}
              onChange={(event) => set("caseNo", event.target.value)}
              className={FIELD_CLASS}
            >
              <option value="">Select an open case…</option>
              {openCases.map((entry) => (
                <option key={entry.caseNo} value={entry.caseNo}>
                  {entry.caseNo} — {entry.caseTitle}
                </option>
              ))}
            </select>
          </FormField>

          {selected ? (
            <p className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-md border border-line bg-surface-subtle px-2.5 py-2 text-2xs text-content-secondary">
              <Icon name="Info" size="xs" className="text-content-tertiary" />
              Inherits <span className="font-medium text-content">{selected.priorityBand}</span>{" "}
              priority at <span className="font-medium text-content">{selected.plantName}</span>
            </p>
          ) : null}

          <FormField label="Action" htmlFor="action-title" required>
            <input
              id="action-title"
              value={draft.title}
              onChange={(event) => set("title", event.target.value)}
              placeholder="Escalate to supplier account management"
              className={FIELD_CLASS}
            />
          </FormField>

          <FormField label="Description" htmlFor="action-description">
            <textarea
              id="action-description"
              value={draft.description}
              onChange={(event) => set("description", event.target.value)}
              rows={3}
              placeholder="What specifically needs to happen, and what does done look like?"
              className={`${FIELD_CLASS} h-auto resize-y py-2 leading-relaxed`}
            />
          </FormField>

          <div className="grid gap-3 sm:grid-cols-2">
            <FormField label="Owner" htmlFor="action-owner" required>
              <select
                id="action-owner"
                value={draft.ownerId}
                onChange={(event) => set("ownerId", event.target.value)}
                className={FIELD_CLASS}
              >
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name}
                  </option>
                ))}
              </select>
            </FormField>

            <FormField label="Due in (days)" htmlFor="action-due">
              <input
                id="action-due"
                type="number"
                min={1}
                max={90}
                value={draft.dueInDays}
                onChange={(event) => set("dueInDays", event.target.value)}
                className={FIELD_CLASS}
              />
            </FormField>
          </div>

          <div className="flex items-center justify-end gap-2 pt-1">
            <Button
              type="button"
              variant="secondary"
              size="md"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="md" disabled={!canSubmit}>
              <Icon name="Plus" size="sm" />
              Create action
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
