"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  addCondition,
  toggleCondition,
  deleteCondition,
  applyConditionTemplate,
} from "./conditions-actions";
import { Check, Plus, X, CheckCircle2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CONDITION_TEMPLATES } from "@/lib/condition-templates";

interface Condition {
  id: string;
  description: string;
  is_satisfied: boolean;
  satisfied_at: string | null;
  due_date: string | null;
  satisfied_by_user?: { full_name: string } | null;
}

export function ConditionsChecklist({
  loanId,
  conditions,
}: {
  loanId: string;
  conditions: Condition[];
}) {
  const [newCondition, setNewCondition] = useState("");
  const [newDueDate, setNewDueDate] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [applyingTemplate, setApplyingTemplate] = useState(false);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!newCondition.trim()) return;
    setSubmitting(true);
    try {
      await addCondition(loanId, newCondition, newDueDate || null);
      setNewCondition("");
      setNewDueDate("");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleTemplate(templateId: string | null) {
    if (!templateId) return;
    setApplyingTemplate(true);
    try {
      await applyConditionTemplate(loanId, templateId);
    } finally {
      setApplyingTemplate(false);
    }
  }

  const satisfied = conditions.filter((c) => c.is_satisfied).length;
  const allDone = conditions.length > 0 && satisfied === conditions.length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm flex items-center justify-between">
          <span>Conditions to Close</span>
          {conditions.length > 0 && (
            <span
              className={`text-xs font-normal flex items-center gap-1 ${allDone ? "text-green-600" : "text-muted-foreground"}`}
            >
              {allDone && <CheckCircle2 className="h-3 w-3" />}
              {satisfied} / {conditions.length}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {conditions.length === 0 && (
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">
              Apply a template to get started:
            </p>
            <Select
              onValueChange={handleTemplate}
              disabled={applyingTemplate}
            >
              <SelectTrigger className="h-8">
                <SelectValue placeholder="Choose a template..." />
              </SelectTrigger>
              <SelectContent>
                {CONDITION_TEMPLATES.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        <form onSubmit={handleAdd} className="flex gap-2">
          <Input
            value={newCondition}
            onChange={(e) => setNewCondition(e.target.value)}
            placeholder="e.g. Clear title commitment received"
            disabled={submitting}
          />
          <Input
            type="date"
            value={newDueDate}
            onChange={(e) => setNewDueDate(e.target.value)}
            className="w-[150px]"
            title="Due date (optional)"
            disabled={submitting}
          />
          <Button type="submit" size="sm" disabled={submitting}>
            <Plus className="h-3 w-3" />
          </Button>
        </form>

        {conditions.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-2">
            No conditions yet.
          </p>
        ) : (
          <ul className="space-y-2">
            {conditions.map((c) => (
              <ConditionRow key={c.id} condition={c} loanId={loanId} />
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function ConditionRow({
  condition,
  loanId,
}: {
  condition: Condition;
  loanId: string;
}) {
  const [pending, setPending] = useState(false);

  async function handleToggle() {
    setPending(true);
    try {
      await toggleCondition(condition.id, loanId, !condition.is_satisfied);
    } finally {
      setPending(false);
    }
  }

  async function handleDelete() {
    setPending(true);
    try {
      await deleteCondition(condition.id, loanId);
    } finally {
      setPending(false);
    }
  }

  return (
    <li className="flex items-start gap-3 py-1 text-sm">
      <button
        onClick={handleToggle}
        disabled={pending}
        className={`mt-0.5 h-4 w-4 rounded border flex items-center justify-center transition-colors ${
          condition.is_satisfied
            ? "bg-primary border-primary text-primary-foreground"
            : "border-input hover:bg-muted"
        }`}
      >
        {condition.is_satisfied && <Check className="h-3 w-3" />}
      </button>
      <span
        className={`flex-1 ${condition.is_satisfied ? "text-muted-foreground line-through" : ""}`}
      >
        {condition.description}
        {condition.due_date && (() => {
          const days = Math.ceil(
            (new Date(condition.due_date + "T00:00:00Z").getTime() - Date.now()) /
              (1000 * 60 * 60 * 24)
          );
          const overdue = !condition.is_satisfied && days < 0;
          const dueSoon = !condition.is_satisfied && days >= 0 && days <= 7;
          return (
            <span
              className={`ml-2 text-xs ${
                overdue
                  ? "text-destructive font-medium"
                  : dueSoon
                    ? "text-yellow-600"
                    : "text-muted-foreground"
              }`}
            >
              · due{" "}
              {new Date(condition.due_date + "T00:00:00Z").toLocaleDateString(
                "en-US",
                { month: "short", day: "numeric" }
              )}
              {overdue && ` (${Math.abs(days)}d overdue)`}
            </span>
          );
        })()}
      </span>
      <button
        onClick={handleDelete}
        disabled={pending}
        className="text-muted-foreground hover:text-destructive"
      >
        <X className="h-3 w-3" />
      </button>
    </li>
  );
}
