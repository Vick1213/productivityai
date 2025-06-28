/* lib/hooks/useAllOrganisations.ts */
import useSWR from "swr";

export interface OrgSummary {
  id: string;
  name: string;
  membersCount: number;
  projectsCount: number;
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function useAllOrganisations() {
  const { data, error, isLoading } = useSWR<OrgSummary[]>(
    "/api/orgs",
    fetcher
  );
  return {
    orgs: data ?? [],
    error,
    isLoading,
  };
}