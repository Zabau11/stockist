import { DiscoveryApp } from "@/components/discovery-app";

type ConversationPageProps = {
  params: Promise<{ conversationId: string }>;
  searchParams: Promise<{
    query?: string | string[];
  }>;
};

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

export default async function ConversationPage({
  params,
  searchParams,
}: ConversationPageProps) {
  const [{ conversationId }, query] = await Promise.all([params, searchParams]);

  return (
    <DiscoveryApp
      conversationId={conversationId}
      initialQuery={firstValue(query.query)}
    />
  );
}
