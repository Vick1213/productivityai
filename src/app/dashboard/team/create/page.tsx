// app/team/create/page.tsx (server component)
import { redirect } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';
import CreateTeamForm from '@/components/dashboard/createteamform';

export default async function CreateTeamPage() {
  // Redirect unauthenticated users
  const { userId } =  await auth();
  if (!userId) redirect('/sign-in');

  // TODO: if user already belongs to an organisation, you might redirect them
  // somewhere else – left as-is so they can create multiple orgs if desired.

  return (
    <section className="mx-auto max-w-xl p-6">
      <CreateTeamForm />
    </section>
  );
}