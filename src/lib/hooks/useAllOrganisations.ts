/* lib/hooks/useAllOrganisations.ts */
import useSWR from "swr";

export interface OrgSummary {
  id: string;
  name: string;
  membersCount: number;
  projectsCount: number;
}

/* typed fetcher ------------------------------------------------------- */
const fetcher = async (url: string): Promise<OrgSummary[]> => {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to load organisations");
  return res.json();
};

/* hook ---------------------------------------------------------------- */
export default function useAllOrganisations() {
  const {
    data,
    error,
    mutate,            // keep SWR's mutate in case the caller needs it
  } = useSWR<OrgSummary[]>("/api/orgs", fetcher);

  return {
    orgs: data ?? [],
    mutate,
    error,
    isError: !!error,
    isLoading: !data && !error,   // works in SWR v1 & v2
  };
}
