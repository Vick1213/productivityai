// lib/hooks/useProjectTasks.ts
import useSWR from "swr";
const fetcher = (url: string) => fetch(url).then(r => r.json());

export function useProjectTasks(projectId: string) {
  const { data, mutate, isLoading, error } = useSWR(
    projectId ? `/api/projects/${projectId}/tasks` : null,
    fetcher
  );
  return { tasks: data ?? [], mutate, isLoading, error };
}
