import { DiscoveryApp } from "@/components/discovery-app";

type ChatPageProps = {
  params: Promise<{ conversationId: string }>;
  searchParams: Promise<{ website?: string | string[]; prompt?: string | string[] }>;
};

function first(value: string | string[] | undefined) { return Array.isArray(value) ? value[0] ?? "" : value ?? ""; }

export default async function ChatPage({ params, searchParams }: ChatPageProps) {
  const [{ conversationId }, query] = await Promise.all([params, searchParams]);
  return <DiscoveryApp conversationId={conversationId} initialWebsite={first(query.website)} initialPrompt={first(query.prompt)} />;
}
