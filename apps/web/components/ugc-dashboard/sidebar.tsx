"use client";

import { useState } from "react";
import {
  IconBookmark,
  IconEdit,
  IconMoon,
  IconSearch,
  IconSidebar,
  IconSliders,
  IconSparkle,
  IconSun,
  IconTrash,
} from "./icons";

export interface DashboardConversation {
  id: string;
  title: string;
  createdAt: number;
}

interface SidebarProps {
  conversations: DashboardConversation[];
  activeId: string | null;
  isDark: boolean;
  collapsed: boolean;
  onNewRun: () => void;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onToggleCollapse: () => void;
  onToggleTheme: () => void;
}

export function Sidebar({
  conversations,
  activeId,
  isDark,
  collapsed,
  onNewRun,
  onSelect,
  onDelete,
  onToggleCollapse,
  onToggleTheme,
}: SidebarProps) {
  const [query, setQuery] = useState("");
  const [profileOpen, setProfileOpen] = useState(false);
  const filtered = query.trim()
    ? conversations.filter((conversation) =>
        conversation.title.toLowerCase().includes(query.trim().toLowerCase()),
      )
    : conversations;

  if (collapsed) {
    return (
      <aside className="flex w-14 shrink-0 flex-col items-center gap-2 border-r border-base-200 bg-base-200/60 py-3">
        <button className="btn btn-ghost btn-sm btn-square" onClick={onToggleCollapse} aria-label="Open sidebar">
          <IconSidebar />
        </button>
        <button className="btn btn-ghost btn-sm btn-square" onClick={onNewRun} aria-label="New chat" title="New chat">
          <IconEdit />
        </button>
        <button className="btn btn-ghost btn-sm btn-square" aria-label="Agent Preferences" title="Agent Preferences">
          <IconSliders />
        </button>
        <button className="btn btn-ghost btn-sm btn-square" aria-label="Saved Leads" title="Saved Leads">
          <IconBookmark />
        </button>
      </aside>
    );
  }

  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-base-200 bg-base-200/60">
      <div className="flex items-center justify-between px-3 py-3">
        <div className="flex items-center gap-2">
          <IconSparkle className="size-6 text-primary" />
          <span className="text-sm font-semibold tracking-tight">UGC Agent</span>
        </div>
        <button className="btn btn-ghost btn-xs btn-square" onClick={onToggleCollapse} aria-label="Collapse sidebar">
          <IconSidebar />
        </button>
      </div>

      <div className="px-3">
        <button
          onClick={onNewRun}
          className="flex w-full items-center gap-2 rounded-field border border-base-300/70 bg-base-100 px-3 py-2 text-sm font-medium transition-colors hover:bg-base-100/60"
        >
          <IconEdit className="size-4" />
          New chat
        </button>
      </div>

      <div className="px-3 pt-2">
        <button className="flex w-full items-center gap-2 rounded-field px-3 py-2 text-sm font-medium text-base-content/70 transition-colors hover:bg-base-100/70">
          <IconSliders className="size-4" />
          Agent Preferences
        </button>
      </div>

      <div className="px-3 pt-2">
        <button className="flex w-full items-center gap-2 rounded-field px-3 py-2 text-left text-sm font-medium text-base-content/70 transition-colors hover:bg-base-100/70">
          <IconBookmark className="size-4" />
          Saved Leads
        </button>
      </div>

      <div className="px-3 pt-2">
        <label className="flex items-center gap-2 rounded-field px-2 py-1.5 text-sm text-base-content/60 focus-within:bg-base-100">
          <IconSearch className="size-4" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search chats"
            className="w-full bg-transparent text-sm outline-none placeholder:text-base-content/40"
            aria-label="Search chats"
          />
        </label>
      </div>

      <nav className="mt-2 min-h-0 flex-1 overflow-y-auto px-3 pb-2">
        <p className="px-2 py-1 text-[11px] font-medium uppercase tracking-wide text-base-content/40">
          Your chats
        </p>
        {filtered.length === 0 ? (
          <p className="px-2 py-2 text-xs text-base-content/40">
            {conversations.length === 0 ? "No chats yet." : "No matches."}
          </p>
        ) : (
          <ul className="space-y-0.5">
            {filtered.map((conversation) => (
              <li key={conversation.id} className="group relative">
                <button
                  onClick={() => onSelect(conversation.id)}
                  className={`w-full truncate rounded-field py-1.5 pl-2 pr-8 text-left text-sm transition-colors ${
                    conversation.id === activeId
                      ? "bg-base-100 font-medium text-base-content"
                      : "text-base-content/70 hover:bg-base-100/70"
                  }`}
                  title={conversation.title}
                >
                  {conversation.title}
                </button>
                <button
                  onClick={() => onDelete(conversation.id)}
                  className="absolute right-1 top-1/2 hidden -translate-y-1/2 rounded p-1 text-base-content/40 transition-colors hover:bg-base-300/60 hover:text-error focus-visible:block group-hover:block"
                  aria-label={`Delete chat: ${conversation.title}`}
                  title="Delete chat"
                >
                  <IconTrash className="size-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </nav>

      <div className="relative border-t border-base-200 p-3">
        {profileOpen && (
          <div className="absolute bottom-full left-3 right-3 z-30 mb-2 rounded-lg border border-base-300 bg-base-100 p-2 shadow-lg">
            <div className="px-2 py-2">
              <p className="truncate text-sm font-medium">Sabau David</p>
              <p className="truncate text-xs text-base-content/50">david@ugcagent.app</p>
              <p className="mt-1 text-xs text-base-content/50">Premium plan</p>
            </div>
            <button type="button" className="btn btn-ghost btn-sm w-full justify-start">
              Agent Preferences
            </button>
            <button type="button" className="btn btn-ghost btn-sm w-full justify-start text-error hover:bg-error/10">
              Sign out
            </button>
          </div>
        )}
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="flex min-w-0 flex-1 items-center gap-2 rounded-field text-left transition-colors hover:bg-base-100/70"
            onClick={() => setProfileOpen((open) => !open)}
            aria-haspopup="menu"
            aria-expanded={profileOpen}
          >
            <div className="grid size-8 shrink-0 place-items-center rounded-full bg-neutral text-neutral-content">
              <span className="text-xs font-semibold">SD</span>
            </div>
            <div className="min-w-0 flex-1 leading-tight">
              <p className="truncate text-sm font-medium">Sabau David</p>
              <p className="truncate text-[11px] text-base-content/50">Premium</p>
            </div>
          </button>
          <button className="btn btn-ghost btn-sm btn-square" onClick={onToggleTheme} aria-label="Toggle light/dark theme">
            {isDark ? <IconSun /> : <IconMoon />}
          </button>
        </div>
      </div>
    </aside>
  );
}
