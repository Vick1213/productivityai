interface UserLite {
  id: string;
  firstName: string;
  lastName: string;
}

interface ChatMessageWithAuthor {
  id: string;
  body: string | null;
  type: "TEXT" | "PING";
  createdAt: string;
  author: UserLite;
  authorId: string;
  threadId: string;
}
