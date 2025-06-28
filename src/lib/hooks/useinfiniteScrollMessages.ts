// lib/hooks/useInfiniteMessages.ts
import { useMemo } from "react";
import useSWRInfinite from "swr/infinite";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

type Page = { messages: ChatMessageWithAuthor[]; nextCursor: string | null };

export function useInfiniteMessages(
  threadId: string | null,
  pageSize = 30
) {
  const getKey = (index: number, prev: Page | null) => {
    if (!threadId) return null;                        // drawer closed
    if (prev && prev.nextCursor === null) return null; // reached oldest
    const cursor = prev?.nextCursor;
    return `/api/chat/threads/${threadId}/messages?limit=${pageSize}${
      cursor ? `&cursor=${cursor}` : ""
    }`;
  };

  const {
    data,
    mutate,
    size,
    setSize,
    isValidating,
  } = useSWRInfinite<Page>(getKey, fetcher, {
    refreshInterval: 4000,      // 4-sec polling for remote msgs
    revalidateOnFocus: false,
    keepPreviousData: true,     // ← critical: don’t wipe between polls
  });

  /* flatten & chronologically sort every render */
  const messages = useMemo(
    () =>
      data
        ? data
            .flatMap((p) => p.messages)   // combine pages
            .sort(
              (a, b) =>
                new Date(a.createdAt).getTime() -
                new Date(b.createdAt).getTime()
            )                             // oldest → newest
        : [],
    [data]
  );

  return { messages, mutate, size, setSize, isValidating };
}
