"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Trash2 } from "lucide-react";
import { updateTemplate, deleteTemplate } from "./actions";
import { toast } from "sonner";

interface Template {
  id: string;
  name: string;
  is_builtin: boolean;
  conditions: string[];
}

export function TemplateRow({ template }: { template: Template }) {
  const [editing, setEditing] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function handleSave(formData: FormData) {
    setPending(true);
    setError("");
    try {
      await updateTemplate(template.id, formData);
      setEditing(false);
      toast.success("Saved");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setPending(false);
    }
  }

  async function handleDelete() {
    if (!confirm(`Delete template "${template.name}"?`)) return;
    setPending(true);
    try {
      await deleteTemplate(template.id);
      toast.success("Deleted");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setPending(false);
    }
  }

  if (editing) {
    return (
      <form action={handleSave} className="space-y-3">
        <div className="space-y-2">
          <Label htmlFor={`name-${template.id}`}>Name</Label>
          <Input
            id={`name-${template.id}`}
            name="name"
            defaultValue={template.name}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`conditions-${template.id}`}>
            Conditions (one per line)
          </Label>
          <Textarea
            id={`conditions-${template.id}`}
            name="conditions"
            rows={template.conditions.length + 2}
            defaultValue={template.conditions.join("\n")}
            required
          />
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <div className="flex items-center gap-2">
          <Button type="submit" size="sm" disabled={pending}>
            {pending ? "Saving..." : "Save"}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => setEditing(false)}
            disabled={pending}
          >
            Cancel
          </Button>
        </div>
      </form>
    );
  }

  return (
    <div className="space-y-3">
      <ul className="text-sm space-y-1">
        {template.conditions.map((c, idx) => (
          <li key={idx} className="text-muted-foreground">
            · {c}
          </li>
        ))}
      </ul>
      <div className="flex items-center gap-2">
        <Button
          size="xs"
          variant="outline"
          onClick={() => setEditing(true)}
        >
          Edit
        </Button>
        {!template.is_builtin && (
          <Button
            size="xs"
            variant="ghost"
            onClick={handleDelete}
            disabled={pending}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        )}
      </div>
    </div>
  );
}
