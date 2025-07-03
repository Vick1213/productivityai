"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Edit } from "lucide-react";
import { ProjectEditForm } from "./edit-project-form";

type ProjectDetailsSectionProps = {
  project: {
    id: string;
    name: string;
    description: string | null;
    dueAt: Date | null;
    completed: boolean;
  };
  dueLabel: string | null;
};

export function ProjectDetailsSection({ project, dueLabel }: ProjectDetailsSectionProps) {
  const [isEditing, setIsEditing] = useState(false);

  return (
    <header className="space-y-2">
      {isEditing ? (
        <ProjectEditForm 
          project={project} 
          onCancel={() => setIsEditing(false)} 
        />
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-4xl font-bold">{project.name}</h1>

              {dueLabel && (
                <Badge
                  variant={dueLabel === "Overdue" ? "destructive" : "secondary"}
                  className="text-xs"
                >
                  {dueLabel}
                </Badge>
              )}

              {project.completed && (
                <Badge variant="outline" className="text-xs text-green-700">
                  ✓ Done
                </Badge>
              )}
            </div>
            
            <Button 
              size="sm" 
              variant="outline" 
              onClick={() => setIsEditing(true)}
            >
              <Edit className="h-4 w-4 mr-1" /> Edit Project
            </Button>
          </div>

          <p className="text-muted-foreground">{project.description || "No description"}</p>
        </>
      )}
    </header>
  );
}