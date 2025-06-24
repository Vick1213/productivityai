'use client';

import { useActionState, useTransition } from 'react';
import { useFormState } from 'react-dom';
import { createTeam as createTeamAction } from '@/lib/createteam';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';

type FormState = {
  error?: string;
  success?: boolean;
} | null;

export default function CreateTeamForm() {
  const [isPending, startTransition] = useTransition();
  const createTeam = (prevState: FormState, formData: FormData) => createTeamAction(formData);
  const [state, formAction] = useActionState<FormState, FormData>(createTeam, null);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create a new team</CardTitle>
      </CardHeader>
      <CardContent>
        <form
          action={(formData) => startTransition(() => formAction(formData))}
          className="grid gap-4"
        >
          <div>
            <label className="mb-1 block text-sm font-medium">Team name</label>
            <Input name="name" placeholder="Acme Corp" required />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">
              Invite teammates (comma‑ or space‑separated emails)
            </label>
            <Textarea
              name="invites"
              placeholder="alice@example.com, bob@example.com"
              rows={3}
            />
          </div>

          {state?.error && <p className="text-sm text-red-600">{state.error}</p>}

          <Button type="submit" disabled={isPending} className="w-full">
            {isPending ? 'Creating…' : 'Create team'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
