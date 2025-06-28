import useSWR from "swr";

const useOrganisations = (orgId: string) => {
  /* 1) inline fix */
  const { data, error, isLoading } = useSWR(
    `/api/orgs/${orgId}`,
    (url: string) => fetch(url).then((r) => r.json())
  );

  /* 2) shared helper – avoids repeating the annotation everywhere */
  const fetcher = (url: string) => fetch(url).then((r) => r.json());

  const { data: orgData, error: orgError, isLoading: orgIsLoading } = useSWR(`/api/orgs/${orgId}`, fetcher);
  
  return { data: orgData, error: orgError, isLoading: orgIsLoading };
};

export default useOrganisations;
