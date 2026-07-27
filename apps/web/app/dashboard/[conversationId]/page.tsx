import { ChatDashboard } from "@/components/chat-dashboard";

export default async function ConversationPage({ params }: { params: Promise<{ conversationId: string }> }) {
  const { conversationId } = await params;
  return <ChatDashboard initialConversationId={conversationId} />;
}
