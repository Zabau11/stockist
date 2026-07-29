"use client";

import { useEffect, useState } from "react";
import { ChatThread, type DashboardMessage } from "./chat-thread";
import { Composer } from "./composer";
import { IconClose, IconMessageCircle } from "./icons";
import { LlmSetupView } from "./llm-setup-view";
import { ModeSwitch, type WorkspaceMode } from "./mode-switch";
import { Sidebar, type DashboardConversation } from "./sidebar";

type ConversationState = DashboardConversation & { messages: DashboardMessage[] };

export function UgcAgentDashboard({ initialConversationId }: { initialConversationId?: string }) {
  const [initialId] = useState(() => initialConversationId ?? crypto.randomUUID());
  const [conversations, setConversations] = useState<ConversationState[]>([]);
  const [activeId, setActiveId] = useState(initialId);
  const [workspaceMode, setWorkspaceMode] = useState<WorkspaceMode>("agent");
  const [collapsed, setCollapsed] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);
  const [isDark, setIsDark] = useState(true);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [seedFileName, setSeedFileName] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const activeConversation = conversations.find((conversation) => conversation.id === activeId);
  const messages = activeConversation?.messages ?? [];
  const activeTitle = activeConversation?.title ?? "New chat";

  useEffect(() => {
    const savedTheme = window.localStorage.getItem("ugcagent-theme");
    if (savedTheme === "light") setIsDark(false);
  }, []);

  function newChat() {
    setActiveId(crypto.randomUUID());
    setDraft("");
    setBusy(false);
    setSeedFileName(null);
    setWorkspaceMode("agent");
  }

  function selectConversation(id: string) {
    setActiveId(id);
    setWorkspaceMode("agent");
    setDraft("");
  }

  function deleteConversation(id: string) {
    setConversations((current) => current.filter((conversation) => conversation.id !== id));
    if (id === activeId) newChat();
  }

  function sendMessage() {
    const text = draft.trim() || (seedFileName ? "Review the uploaded file." : "");
    if (text.length < 3 || busy) return;

    const userMessage: DashboardMessage = { id: crypto.randomUUID(), role: "user", text };
    setConversations((current) => {
      const existing = current.find((conversation) => conversation.id === activeId);
      if (existing) {
        return current.map((conversation) =>
          conversation.id === activeId
            ? { ...conversation, messages: [...conversation.messages, userMessage] }
            : conversation,
        );
      }
      return [
        {
          id: activeId,
          title: text.slice(0, 80),
          createdAt: Date.now(),
          messages: [userMessage],
        },
        ...current,
      ];
    });
    setDraft("");
    setSeedFileName(null);
    setBusy(true);

    window.setTimeout(() => {
      setConversations((current) =>
        current.map((conversation) =>
          conversation.id === activeId
            ? {
                ...conversation,
                messages: [
                  ...conversation.messages,
                  {
                    id: crypto.randomUUID(),
                    role: "assistant",
                    text: "The dashboard is currently running in frontend-only mode. Creator discovery will be connected later.",
                  },
                ],
              }
            : conversation,
        ),
      );
      setBusy(false);
    }, 1100);
  }

  function uploadFile(file: File) {
    setUploading(true);
    window.setTimeout(() => {
      setSeedFileName(file.name);
      setUploading(false);
    }, 500);
  }

  function toggleTheme() {
    setIsDark((current) => {
      const next = !current;
      window.localStorage.setItem("ugcagent-theme", next ? "dark" : "light");
      return next;
    });
  }

  return (
    <div data-theme={isDark ? "ugcagentdark" : "ugcagentlight"} className="flex h-dvh overflow-hidden bg-base-100 text-base-content">
      <Sidebar
        conversations={conversations}
        activeId={activeId}
        isDark={isDark}
        collapsed={collapsed}
        onNewRun={newChat}
        onSelect={selectConversation}
        onDelete={deleteConversation}
        onToggleCollapse={() => setCollapsed((current) => !current)}
        onToggleTheme={toggleTheme}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="grid min-h-12 shrink-0 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 px-4 py-2">
          <div className="flex min-w-0 items-center gap-2">
            <h1 className="truncate text-sm font-medium text-base-content/80">{workspaceMode === "llm" ? "Use in your LLM" : activeTitle}</h1>
          </div>
          <ModeSwitch mode={workspaceMode} onChange={setWorkspaceMode} />
          <div className="flex min-w-0 items-center justify-end gap-3">
            <span className="badge badge-primary badge-sm">Premium</span>
          </div>
        </div>

        {workspaceMode === "llm" ? (
          <LlmSetupView />
        ) : (
          <div className="flex min-h-0 flex-1">
            <div className="flex min-w-0 flex-1 flex-col">
              <ChatThread messages={messages} busy={busy} onPickPreset={setDraft} />
              <Composer
                draft={draft}
                setDraft={setDraft}
                busy={busy}
                onSend={sendMessage}
                onStop={() => setBusy(false)}
                seedFileName={seedFileName}
                uploading={uploading}
                onUpload={uploadFile}
                onClearSeeds={() => setSeedFileName(null)}
              />
            </div>
          </div>
        )}
      </div>

      {supportOpen && <SupportBubble onClose={() => setSupportOpen(false)} />}
      <SupportLauncher open={supportOpen} onClick={() => setSupportOpen((open) => !open)} />
    </div>
  );
}

function SupportLauncher({ open, onClick }: { open: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`fixed bottom-[calc(6rem+env(safe-area-inset-bottom))] right-3 z-30 grid size-14 place-items-center rounded-full border shadow-[0_12px_30px_rgba(111,127,82,0.28)] transition hover:-translate-y-0.5 hover:shadow-[0_16px_34px_rgba(111,127,82,0.34)] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-base-100 sm:bottom-5 sm:right-5 ${
        open
          ? "border-base-content/10 bg-neutral text-neutral-content"
          : "border-base-300 bg-primary text-primary-content"
      }`}
      aria-label={open ? "Hide support options" : "Open support chat"}
      aria-expanded={open}
    >
      {open ? <IconClose className="size-5" /> : <IconMessageCircle className="size-6" />}
    </button>
  );
}

function SupportBubble({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed bottom-24 right-5 z-30 w-72 rounded-box border border-base-300 bg-base-100 p-4 shadow-xl">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">How can we help?</p>
        <button className="btn btn-ghost btn-xs btn-circle" onClick={onClose} aria-label="Close support">
          <IconClose className="size-4" />
        </button>
      </div>
      <p className="mt-2 text-xs leading-relaxed text-base-content/55">Chat with the UGC Agent team or send us your feedback.</p>
      <button className="btn btn-primary btn-sm mt-4 w-full">Start a conversation</button>
    </div>
  );
}
