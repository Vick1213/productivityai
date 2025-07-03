"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { addGoal, updateGoal, deleteGoal } from "@/lib/actions/projects";
import { Pencil, Trash, Plus, X, Check } from "lucide-react";

type Goal = {
  id: string;
  name: string;
  description: string | null;
  currentProgress: number;
  totalTarget: number;
};

type GoalsSectionProps = {
  projectId: string;
  goals: Goal[];
};

export function GoalsSection({ projectId, goals }: GoalsSectionProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Goals</h2>
        <Button 
          size="sm" 
          onClick={() => setIsAdding(true)} 
          disabled={isAdding}
        >
          <Plus className="h-4 w-4 mr-1" /> Add Goal
        </Button>
      </div>

      {isAdding && (
        <GoalForm 
          projectId={projectId}
          onCancel={() => setIsAdding(false)}
          onSuccess={() => setIsAdding(false)}
        />
      )}

      <div className="space-y-4">
        {goals.length === 0 && !isAdding ? (
          <p className="text-sm text-muted-foreground">No goals set for this project yet.</p>
        ) : (
          goals.map((goal) => (
            editingGoalId === goal.id ? (
              <GoalForm
                key={goal.id}
                projectId={projectId}
                goal={goal}
                onCancel={() => setEditingGoalId(null)}
                onSuccess={() => setEditingGoalId(null)}
              />
            ) : (
              <GoalCard
                key={goal.id}
                goal={goal}
                projectId={projectId}
                onEdit={() => setEditingGoalId(goal.id)}
              />
            )
          ))
        )}
      </div>
    </section>
  );
}

function GoalCard({ goal, projectId, onEdit }: { goal: Goal; projectId: string; onEdit: () => void }) {
  const [isDeleting, setIsDeleting] = useState(false);
  const progressPercentage = Math.min(100, (goal.currentProgress / goal.totalTarget) * 100);

  async function handleDelete() {
    setIsDeleting(true);
    await deleteGoal(goal.id, projectId);
  }

  async function handleProgressUpdate(increment: boolean) {
    const newProgress = increment 
      ? Math.min(goal.currentProgress + 1, goal.totalTarget)
      : Math.max(goal.currentProgress - 1, 0);
      
    await updateGoal(goal.id, projectId, { currentProgress: newProgress });
  }

  return (
    <div className="border rounded-md p-4 space-y-3">
      <div className="flex justify-between">
        <h3 className="font-semibold">{goal.name}</h3>
        <div className="flex space-x-2">
          <Button size="icon" variant="ghost" onClick={onEdit}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button size="icon" variant="ghost" onClick={handleDelete} disabled={isDeleting}>
            <Trash className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </div>
      
      {goal.description && (
        <p className="text-sm text-muted-foreground">{goal.description}</p>
      )}
      
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span>Progress: {goal.currentProgress} / {goal.totalTarget}</span>
          <div className="flex items-center space-x-2">
            <Button 
              size="sm" 
              variant="outline" 
              className="h-6 w-6 p-0" 
              onClick={() => handleProgressUpdate(false)}
              disabled={goal.currentProgress <= 0}
            >
              <span>-</span>
            </Button>
            <Button 
              size="sm" 
              variant="outline" 
              className="h-6 w-6 p-0" 
              onClick={() => handleProgressUpdate(true)}
              disabled={goal.currentProgress >= goal.totalTarget}
            >
              <span>+</span>
            </Button>
          </div>
        </div>
        <Progress value={progressPercentage} className="h-2" />
      </div>
    </div>
  );
}

function GoalForm({ 
  projectId, 
  goal, 
  onCancel, 
  onSuccess 
}: { 
  projectId: string; 
  goal?: Goal; 
  onCancel: () => void;
  onSuccess: () => void;
}) {
  const [name, setName] = useState(goal?.name || "");
  const [description, setDescription] = useState(goal?.description || "");
  const [totalTarget, setTotalTarget] = useState(goal?.totalTarget || 1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const isEditing = !!goal;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      if (isEditing) {
        await updateGoal(goal.id, projectId, {
          name,
          description: description || undefined,
          totalTarget
        });
      } else {
        await addGoal(projectId, {
          name,
          description: description || undefined,
          totalTarget
        });
      }
      onSuccess();
    } catch (error) {
      console.error("Error saving goal:", error);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="border rounded-md p-4 space-y-4">
      <div>
        <label htmlFor="goalName" className="block text-sm font-medium mb-1">
          Goal Name
        </label>
        <Input
          id="goalName"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </div>
      
      <div>
        <label htmlFor="goalDescription" className="block text-sm font-medium mb-1">
          Description (Optional)
        </label>
        <Textarea
          id="goalDescription"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
        />
      </div>
      
      <div>
        <label htmlFor="goalTarget" className="block text-sm font-medium mb-1">
          Target Value
        </label>
        <Input
          id="goalTarget"
          type="number"
          min="1"
          value={totalTarget}
          onChange={(e) => setTotalTarget(parseInt(e.target.value) || 1)}
          required
        />
      </div>
      
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onCancel}>
          <X className="h-4 w-4 mr-1" /> Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          <Check className="h-4 w-4 mr-1" /> {isEditing ? "Update" : "Create"} Goal
        </Button>
      </div>
    </form>
  );
}