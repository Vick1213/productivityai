"use client";

import { useState } from "react";
import { updateProjectDetails } from "@/lib/actions/projects";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";

type ProjectEditFormProps = {
  project: {
    id: string;
    name: string;
    description: string | null;
    dueAt: Date | null;
  };
  onCancel: () => void;
};

export function ProjectEditForm({ project, onCancel }: ProjectEditFormProps) {
  const [name, setName] = useState(project.name);
  const [description, setDescription] = useState(project.description || "");
  const [dueAt, setDueAt] = useState<Date | null>(project.dueAt);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Format date for input field
  const formattedDate = dueAt ? format(dueAt, "yyyy-MM-dd") : "";

  // Handle date change from input field
  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setDueAt(value ? new Date(value) : null);
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    
    await updateProjectDetails(project.id, {
      name,
      description: description || undefined,
      dueAt
    });
    
    setIsSubmitting(false);
    onCancel();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="name" className="block text-sm font-medium mb-1">
          Project Name
        </label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </div>
      
      <div>
        <label htmlFor="description" className="block text-sm font-medium mb-1">
          Description
        </label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
        />
      </div>
      
      <div>
        <label htmlFor="dueDate" className="block text-sm font-medium mb-1">
          Due Date
        </label>
        <Input
          id="dueDate"
          type="date"
          value={formattedDate}
          onChange={handleDateChange}
        />
      </div>
      
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </form>
  );
}