export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
  streaming?: boolean;
};

export type MockConversation = {
  id: string;
  title: string;
  updatedAt: string;
  messages: ChatMessage[];
};

export const initialConversations: MockConversation[] = [];

export function titleFromMessage(value: string) {
  const clean = value.replace(/\s+/g, " ").trim();
  return clean.length > 48 ? `${clean.slice(0, 48).trimEnd()}…` : clean || "New chat";
}
