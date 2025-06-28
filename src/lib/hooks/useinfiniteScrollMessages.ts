import useSWRInfinite from "swr/infinite";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function useInfiniteMessages(threadId: string | null, pageSize = 30) {
  const getKey = (
    pageIndex: number,
    previous: { nextCursor: string | null } | null
  ) => {
    if (!threadId) return null;                 // not mounted
    if (previous && previous.nextCursor === null) return null; // reached oldest
    const cursor = previous?.nextCursor;
    return `/api/chat/threads/${threadId}/messages?limit=${pageSize}${
      cursor ? `&cursor=${cursor}` : ""
    }`;
  };

  const swr = useSWRInfinite<
    { messages: ChatMessageWithAuthor[]; nextCursor: string | null }
  >(getKey, fetcher, {
    revalidateOnFocus: false,
  });

  // Flatten pages → single array (newest→oldest)
  const messages = swr.data?.flatMap((p) => p.messages) ?? [];

  return { ...swr, messages };
}
