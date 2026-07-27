"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import {
  Check,
  ChevronDown,
  Copy,
  Ellipsis,
  Menu,
  MessageSquare,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  RefreshCw,
  Send,
  Settings,
  SquarePen,
  Sun,
  ThumbsDown,
  ThumbsUp,
  Trash2,
  UserRound,
  Sparkles,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { initialConversations, titleFromMessage, type ChatMessage, type MockConversation } from "@/lib/mock-chat-data";
import type { RetailerResults, StockistMessage } from "@/lib/chat-types";
import type { ProductBrief, ProductBriefRevision, StoreLead } from "@/lib/types";
import { cn } from "@/lib/utils";

const suggestions = [
  "Analyze yourbrand.com and find independent skincare stores in London",
  "Analyze yourbrand.com and compare premium retailers across Romania",
  "Analyze yourbrand.com and build a stockist plan for my new launch",
];

type ChatDashboardProps = { initialConversationId?: string };

export function ChatDashboard({ initialConversationId }: ChatDashboardProps) {
  const [conversations, setConversations] = useState(initialConversations);
  const [activeId, setActiveId] = useState(initialConversationId ?? "");
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [composer, setComposer] = useState("");
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [messageSnapshots, setMessageSnapshots] = useState<Record<string, StockistMessage[]>>({});
  const [deleteTarget, setDeleteTarget] = useState<MockConversation | null>(null);
  const [renameTarget, setRenameTarget] = useState<MockConversation | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messageEndRef = useRef<HTMLDivElement>(null);

  const transport = useMemo(() => new DefaultChatTransport({ api: "/api/chat" }), []);
  const { messages, sendMessage, setMessages, status, stop } = useChat<StockistMessage>({ id: "stockist-chat", transport });
  const isStreaming = status === "submitted" || status === "streaming";
  const activeConversation = conversations.find((conversation) => conversation.id === activeId);
  const hasMessages = messages.length > 0;
  const latestBrief = useMemo(() => [...messages].reverse().flatMap((message) => message.parts).find((part) => part.type === "data-product-brief") as { data: ProductBriefRevision } | undefined, [messages])?.data;
  const latestResults = useMemo(() => [...messages].reverse().flatMap((message) => message.parts).find((part) => part.type === "data-retailer-results") as { data: RetailerResults } | undefined, [messages])?.data;
  const displayMessages = useMemo<ChatMessage[]>(() => messages.filter((message) => message.role === "user" || message.role === "assistant").map((message) => ({ id: message.id, role: message.role === "user" ? "user" : "assistant", content: message.parts.filter((part) => part.type === "text").map((part) => part.text).join(""), createdAt: new Date().toISOString() })), [messages]);

  useEffect(() => {
    const savedCollapsed = window.localStorage.getItem("stockist-sidebar-collapsed");
    const savedTheme = window.localStorage.getItem("stockist-theme") as "light" | "dark" | null;
    if (savedCollapsed) setCollapsed(savedCollapsed === "true");
    if (savedTheme === "dark") setTheme("dark");
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    window.localStorage.setItem("stockist-theme", theme);
  }, [theme]);

  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeId, messages.length]);

  useEffect(() => {
    if (!activeId || !messages.length) return;
    setMessageSnapshots((current) => ({ ...current, [activeId]: messages }));
  }, [activeId, messages]);

  function toggleCollapsed() {
    setCollapsed((current) => {
      window.localStorage.setItem("stockist-sidebar-collapsed", String(!current));
      return !current;
    });
  }

  function newChat() {
    setActiveId("");
    setMessages([]);
    setComposer("");
    setMobileOpen(false);
    window.setTimeout(() => textareaRef.current?.focus(), 50);
  }

  function submitMessage(value = composer) {
    const text = value.trim();
    if (!text || isStreaming) return;
    const conversationId = activeId || crypto.randomUUID();
    if (!activeId) { setActiveId(conversationId); setMessages([]); }
    const currentConversation = activeConversation ?? { id: conversationId, title: titleFromMessage(text), updatedAt: new Date().toISOString(), messages: [] };
    setConversations((current) => [{ ...currentConversation, title: currentConversation.messages.length ? currentConversation.title : titleFromMessage(text), updatedAt: new Date().toISOString() }, ...current.filter((conversation) => conversation.id !== conversationId)]);
    setActiveId(conversationId);
    setComposer("");
    const action = latestBrief?.status === "confirmed"
      ? { type: "follow_up" as const, conversationId, briefVersion: latestBrief.version, brief: latestBrief.brief, leads: latestResults?.leads ?? [], messages }
      : { type: "analyze_product" as const, conversationId, query: text, messages };
    void sendMessage({ text }, { body: { action, conversationId } });
  }

  function selectConversation(id: string) {
    setActiveId(id);
    setMessages(messageSnapshots[id] ?? []);
    setComposer("");
    setMobileOpen(false);
  }

  function confirmBrief(brief: ProductBrief) {
    if (!activeId || !latestBrief || isStreaming) return;
    const revision: ProductBriefRevision = { ...latestBrief, brief, status: "confirmed", needsReview: false, updatedAt: new Date().toISOString() };
    void sendMessage({ text: "Confirm and find retailers" }, { body: { action: { type: "confirm_brief", conversationId: activeId, revision, messages }, conversationId: activeId } });
  }

  function deleteConversation() {
    if (!deleteTarget) return;
    setConversations((current) => current.filter((conversation) => conversation.id !== deleteTarget.id));
    if (activeId === deleteTarget.id) newChat();
    setDeleteTarget(null);
  }

  function renameConversation() {
    if (!renameTarget || !renameValue.trim()) return;
    setConversations((current) => current.map((conversation) => conversation.id === renameTarget.id ? { ...conversation, title: renameValue.trim() } : conversation));
    setRenameTarget(null);
  }

  return <div className="flex h-dvh min-h-screen overflow-hidden bg-background text-foreground">
    <div className="hidden lg:block"><ChatSidebar collapsed={collapsed} conversations={conversations} activeId={activeId} onNew={newChat} onSelect={selectConversation} onCollapse={toggleCollapsed} onRename={(conversation) => { setRenameTarget(conversation); setRenameValue(conversation.title); }} onDelete={setDeleteTarget} onTheme={() => setTheme(theme === "light" ? "dark" : "light")} theme={theme} /></div>
    <Sheet open={mobileOpen} onOpenChange={setMobileOpen}><SheetContent side="left" className="w-[280px] p-0"><SheetHeader className="sr-only"><SheetTitle>Chat navigation</SheetTitle><SheetDescription>Recent chats and workspace controls</SheetDescription></SheetHeader><ChatSidebar collapsed={false} conversations={conversations} activeId={activeId} onNew={newChat} onSelect={selectConversation} onCollapse={() => setMobileOpen(false)} onRename={(conversation) => { setRenameTarget(conversation); setRenameValue(conversation.title); }} onDelete={setDeleteTarget} onTheme={() => setTheme(theme === "light" ? "dark" : "light")} theme={theme} /></SheetContent></Sheet>
    <main className="relative flex min-w-0 flex-1 flex-col">
      <Button variant="ghost" size="icon" className="absolute left-4 top-4 z-20 lg:hidden" onClick={() => setMobileOpen(true)} aria-label="Open sidebar"><Menu className="size-4" /></Button>
      <div className="grid min-h-12 shrink-0 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 px-4 py-2"><h1 className="truncate text-sm font-medium text-muted-foreground">{activeConversation?.title ?? "New chat"}</h1><div className="inline-flex items-center rounded-full border border-border bg-card p-0.5 text-xs"><button className="rounded-full bg-secondary px-3 py-1.5 font-medium">✣&nbsp; Use our Agent</button><button className="rounded-full px-3 py-1.5 text-muted-foreground">▣&nbsp; Use in your LLM</button></div><div className="flex justify-end"><span className="rounded-full bg-blue-600 px-3 py-1 text-xs font-medium text-white">Premium</span></div></div>
      <ScrollArea className="min-h-0 flex-1"><div className={cn("mx-auto flex min-h-full w-full max-w-3xl flex-col px-4 pt-8 sm:px-8", hasMessages ? "pb-44" : "pb-4")}>{!hasMessages ? <EmptyChatState onSubmit={submitMessage} composer={composer} setComposer={setComposer} textareaRef={textareaRef} /> : <><MessageList messages={displayMessages} copiedId={copiedId} onCopy={(message) => { void navigator.clipboard?.writeText(message.content); setCopiedId(message.id); window.setTimeout(() => setCopiedId(null), 1200); }} onRegenerate={() => submitMessage("Give me a sharper version of the last answer.")} />{latestBrief?.status === "draft" && <BriefReview revision={latestBrief} onConfirm={confirmBrief} disabled={isStreaming} />}{latestResults && <ResultsPreview results={latestResults} />}<div ref={messageEndRef} /></>}{isStreaming && <div className="mt-6 flex items-center gap-3 text-sm text-muted-foreground"><span className="flex gap-1"><i className="size-1.5 animate-bounce rounded-full bg-current [animation-delay:-0.2s]" /><i className="size-1.5 animate-bounce rounded-full bg-current [animation-delay:-0.1s]" /><i className="size-1.5 animate-bounce rounded-full bg-current" /></span>Thinking through the next step…</div>}</div></ScrollArea>
      {hasMessages && <div className={cn("pointer-events-none fixed inset-x-0 bottom-0 z-10 bg-gradient-to-t from-background via-background/95 to-transparent pb-4 pt-16", collapsed ? "lg:left-16" : "lg:left-60")}><div className="pointer-events-auto mx-auto max-w-3xl px-4 sm:px-8"><ChatComposer value={composer} onChange={setComposer} onSubmit={() => submitMessage()} disabled={isStreaming || latestBrief?.status === "draft"} textareaRef={textareaRef} /></div></div>}
    </main>
    <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete this chat?</AlertDialogTitle><AlertDialogDescription>This removes the conversation from the local demo history.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction variant="destructive" onClick={deleteConversation}>Delete</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    <AlertDialog open={Boolean(renameTarget)} onOpenChange={(open) => !open && setRenameTarget(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Rename chat</AlertDialogTitle><AlertDialogDescription>Choose a short name for this conversation.</AlertDialogDescription></AlertDialogHeader><Input value={renameValue} onChange={(event) => setRenameValue(event.target.value)} onKeyDown={(event) => event.key === "Enter" && renameConversation()} autoFocus /><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={renameConversation}>Save</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </div>;
}

type SidebarProps = { collapsed: boolean; conversations: MockConversation[]; activeId: string; onNew: () => void; onSelect: (id: string) => void; onCollapse: () => void; onRename: (conversation: MockConversation) => void; onDelete: (conversation: MockConversation) => void; onTheme: () => void; theme: "light" | "dark" };

function ChatSidebar({ collapsed, conversations, activeId, onNew, onSelect, onCollapse, onRename, onDelete, onTheme, theme }: SidebarProps) { return <aside className={cn("relative flex h-dvh shrink-0 flex-col border-r bg-card/60 transition-[width] duration-200", collapsed ? "w-14" : "w-64")}><div className="flex h-14 shrink-0 items-center justify-between px-3"><div className={cn("flex min-w-0 items-center gap-2", collapsed && "w-full justify-center")}><Sparkles className="size-6 text-primary" />{!collapsed && <span className="truncate text-sm font-semibold tracking-tight">UGC Agent</span>}</div><Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="size-8" onClick={onCollapse} aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"} aria-expanded={!collapsed}>{collapsed ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}</Button></TooltipTrigger><TooltipContent>{collapsed ? "Expand sidebar" : "Collapse sidebar"}</TooltipContent></Tooltip></div><div className="px-3"><Tooltip><TooltipTrigger asChild><Button onClick={onNew} variant="outline" className={cn("w-full justify-start gap-2 rounded-xl", collapsed && "justify-center px-0")} aria-label="New chat"><SquarePen className="size-4" />{!collapsed && "New chat"}</Button></TooltipTrigger>{collapsed && <TooltipContent side="right">New chat</TooltipContent>}</Tooltip></div>{!collapsed && <><div className="px-3 pt-2"><button className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary"><Settings className="size-4" />Agent Preferences</button></div><div className="px-3 pt-2"><button className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary"><MessageSquare className="size-4" />Saved Leads</button></div><div className="px-3 pt-2"><label className="flex items-center gap-2 rounded-xl px-2 py-1.5 text-sm text-muted-foreground focus-within:bg-secondary"><span className="text-base">⌕</span><input placeholder="Search chats" className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground/60" aria-label="Search chats" /></label></div></>}{collapsed ? <div className="flex-1" /> : <RecentChats conversations={conversations} activeId={activeId} onSelect={onSelect} onRename={onRename} onDelete={onDelete} />}<div className="mt-auto border-t px-2 py-2"><DropdownMenu><DropdownMenuTrigger asChild><button className={cn("flex w-full items-center gap-2 rounded-xl p-1.5 text-left transition-colors hover:bg-secondary", collapsed && "justify-center")} aria-label="Open profile menu"><Avatar className="size-8"><AvatarFallback className="text-xs">SD</AvatarFallback></Avatar>{!collapsed && <><span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">Sabau David</span><span className="block truncate text-[11px] text-muted-foreground">Plus</span></span><Ellipsis className="size-3.5 text-muted-foreground" /></>}</button></DropdownMenuTrigger><DropdownMenuContent side="top" align={collapsed ? "center" : "start"} className="w-56"><DropdownMenuItem><UserRound /> Profile</DropdownMenuItem><DropdownMenuItem><Settings /> Settings</DropdownMenuItem><DropdownMenuItem onClick={onTheme}>{theme === "light" ? <Moon /> : <Sun />} {theme === "light" ? "Dark theme" : "Light theme"}</DropdownMenuItem><DropdownMenuSeparator /><DropdownMenuItem><span className="text-destructive">Log out</span></DropdownMenuItem></DropdownMenuContent></DropdownMenu></div></aside>; }

function RecentChats({ conversations, activeId, onSelect, onRename, onDelete }: { conversations: MockConversation[]; activeId: string; onSelect: (id: string) => void; onRename: (conversation: MockConversation) => void; onDelete: (conversation: MockConversation) => void }) { const groups = useMemo(() => groupConversations(conversations), [conversations]); return <div className="min-h-0 flex-1 px-2 pt-6"><div className="px-2 pb-2 text-xs font-semibold text-muted-foreground">Recents</div><ScrollArea className="h-full"><div className="space-y-5 pb-4">{groups.map(({ label, items }) => <section key={label}><p className="px-2 pb-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{label}</p>{items.map((conversation) => <div key={conversation.id} className={cn("group flex items-center gap-1 rounded-lg px-2 py-2 text-sm transition-colors", conversation.id === activeId ? "bg-secondary" : "hover:bg-secondary/70")}><button className="min-w-0 flex-1 truncate text-left" onClick={() => onSelect(conversation.id)}>{conversation.title}</button><DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="size-7 shrink-0 opacity-0 group-hover:opacity-100" aria-label={`Options for ${conversation.title}`}><Ellipsis className="size-3.5" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onClick={() => onRename(conversation)}><SquarePen /> Rename</DropdownMenuItem><DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => onDelete(conversation)}><Trash2 /> Delete</DropdownMenuItem></DropdownMenuContent></DropdownMenu></div>)}</section>)}</div></ScrollArea></div>; }

function groupConversations(conversations: MockConversation[]) { const today = new Date(); const start = (days: number) => new Date(today.getFullYear(), today.getMonth(), today.getDate() - days).getTime(); const groups = [{ label: "Today", min: start(0) }, { label: "Yesterday", min: start(1) }, { label: "Previous 7 days", min: start(7) }, { label: "Previous 30 days", min: start(30) }]; return groups.map((group, index) => ({ label: group.label, items: conversations.filter((conversation) => { const time = Date.parse(conversation.updatedAt); return index === 0 ? time >= group.min : time >= group.min && time < groups[index - 1].min; }) })).filter((group) => group.items.length); }

function EmptyChatState({ onSubmit, composer, setComposer, textareaRef }: { onSubmit: (value: string) => void; composer: string; setComposer: (value: string) => void; textareaRef: React.RefObject<HTMLTextAreaElement | null> }) { return <div className="flex min-h-full flex-1 flex-col px-1 pb-6 pt-8 text-center sm:pt-12"><div className="flex flex-col items-center"><Sparkles className="mb-5 size-11 text-primary" /><h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">What creators are we finding today?</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">Describe your ideal UGC creator and the agent will discover, enrich, score and qualify them across Instagram and TikTok.</p></div><div className="mx-auto mt-7 grid w-full max-w-3xl gap-2 text-left md:grid-cols-3">{["Find me 50 UGC beauty creators in the UK with emails", "200 skincare content creators in the US with a portfolio link", "Find 100 fashion UGC creators similar to my best leads"].map((suggestion) => <button key={suggestion} className="min-h-24 rounded-2xl border bg-card px-4 py-4 text-sm text-muted-foreground transition-colors hover:border-primary/40 hover:bg-secondary hover:text-foreground" onClick={() => onSubmit(suggestion)}>{suggestion}</button>)}</div><div className="mt-auto w-full pt-12"><ChatComposer value={composer} onChange={setComposer} onSubmit={() => onSubmit(composer)} textareaRef={textareaRef} /></div></div>; }

function ChatComposer({ value, onChange, onSubmit, disabled = false, textareaRef }: { value: string; onChange: (value: string) => void; onSubmit: () => void; disabled?: boolean; textareaRef: React.RefObject<HTMLTextAreaElement | null> }) { return <div className="mx-auto w-full max-w-3xl rounded-3xl border bg-card p-2 shadow-sm transition-shadow focus-within:ring-2 focus-within:ring-ring/20"><div className="flex items-center gap-2"><Textarea ref={textareaRef} value={value} onChange={(event) => onChange(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); onSubmit(); } }} placeholder="Describe a product, market, or retailer goal…" aria-label="Message Stockist" disabled={disabled} className="max-h-48 min-h-10 flex-1 resize-none rounded-2xl border-0 bg-transparent px-3 py-2 text-sm shadow-none focus-visible:ring-0" /><Button type="button" size="icon" onClick={onSubmit} disabled={disabled || !value.trim()} className="size-9 shrink-0 rounded-full" aria-label="Send message"><Send className="size-4" /></Button></div></div>; }

function BriefReview({ revision, onConfirm, disabled }: { revision: ProductBriefRevision; onConfirm: (brief: ProductBrief) => void; disabled: boolean }) {
  const [brief, setBrief] = useState(revision.brief);
  const update = (key: keyof ProductBrief, value: string) => setBrief((current: ProductBrief) => ({ ...current, [key]: value }));
  const valid = brief.distributionGoal.trim() && brief.categories.length && brief.targetMarkets.length && brief.idealRetailerTypes.length;
  return <Card className="mt-8 overflow-hidden rounded-2xl"><div className="border-b bg-secondary/40 px-5 py-4"><div className="flex items-center justify-between gap-4"><div><p className="text-sm font-semibold">Review your product brief</p><p className="mt-1 text-xs text-muted-foreground">Stockist will search only after you confirm these details.</p></div><span className="rounded-full bg-background px-2.5 py-1 text-xs text-muted-foreground">Draft</span></div></div><div className="grid gap-4 p-5 sm:grid-cols-2"><label className="space-y-1.5 sm:col-span-2"><span className="text-xs font-medium">Distribution goal <span className="text-destructive">*</span></span><Textarea value={brief.distributionGoal} onChange={(event) => update("distributionGoal", event.target.value)} className="min-h-20 resize-none" /></label><BriefField label="Brand" value={brief.brandName} onChange={(value) => update("brandName", value)} /><BriefField label="Target customer" value={brief.targetCustomer} onChange={(value) => update("targetCustomer", value)} /><BriefField label="Categories" value={brief.categories.join(", ")} onChange={(value) => setBrief((current: ProductBrief) => ({ ...current, categories: splitTags(value) }))} /><BriefField label="Target markets" value={brief.targetMarkets.join(", ")} onChange={(value) => setBrief((current: ProductBrief) => ({ ...current, targetMarkets: splitTags(value) }))} /><BriefField label="Retailer types" value={brief.idealRetailerTypes.join(", ")} onChange={(value) => setBrief((current: ProductBrief) => ({ ...current, idealRetailerTypes: splitTags(value) }))} /><BriefField label="Price positioning" value={brief.pricePositioning} onChange={(value) => update("pricePositioning", value)} /></div><div className="flex flex-col items-start justify-between gap-3 border-t px-5 py-4 sm:flex-row sm:items-center"><p className="text-xs text-muted-foreground">You can edit this brief before every search.</p><Button disabled={disabled || !valid} onClick={() => onConfirm(brief)} className="rounded-xl">Confirm and find retailers <ChevronDown className="ml-2 size-4 -rotate-90" /></Button></div></Card>;
}

function BriefField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) { return <label className="space-y-1.5"><span className="text-xs font-medium">{label}</span><Input value={value} onChange={(event) => onChange(event.target.value)} /></label>; }

function splitTags(value: string) { return value.split(",").map((item) => item.trim()).filter(Boolean).slice(0, 8); }

function ResultsPreview({ results }: { results: RetailerResults }) { return <Card className="mt-8 overflow-hidden rounded-2xl"><div className="flex items-center justify-between border-b px-5 py-4"><div><p className="text-sm font-semibold">Retailer matches</p><p className="mt-1 text-xs text-muted-foreground">{results.leads.length} stores found · brief v{results.briefVersion}</p></div><span className="text-xs text-muted-foreground">{results.demo ? "Demo data" : "Google Maps"}</span></div><div className="divide-y">{results.leads.slice(0, 5).map((lead) => <div key={lead.id} className="flex items-center justify-between gap-4 px-5 py-3"><div className="min-w-0"><p className="truncate text-sm font-medium">{lead.name}</p><p className="truncate text-xs text-muted-foreground">{lead.address}</p></div><span className="shrink-0 rounded-full bg-secondary px-2 py-1 text-xs font-medium">{lead.score}</span></div>)}</div></Card>; }

function MessageList({ messages, copiedId, onCopy, onRegenerate }: { messages: ChatMessage[]; copiedId: string | null; onCopy: (message: ChatMessage) => void; onRegenerate: () => void }) { return <div className="space-y-8">{messages.map((message) => <article key={message.id} className={cn("flex gap-3", message.role === "user" ? "justify-end" : "justify-start")}><div className={cn("max-w-[88%]", message.role === "user" ? "rounded-2xl bg-secondary px-4 py-3 text-sm" : "text-sm leading-7 sm:max-w-2xl")}><div className="flex gap-3">{message.role === "assistant" && <span className="mt-1 flex size-7 shrink-0 items-center justify-center rounded-lg bg-foreground text-background"><MessageSquare className="size-3.5" /></span>}<p className="whitespace-pre-wrap">{message.content}</p></div>{message.role === "assistant" && <div className="mt-3 flex items-center gap-0.5 ps-10"><Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="size-7" onClick={() => onCopy(message)} aria-label="Copy response">{copiedId === message.id ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}</Button></TooltipTrigger><TooltipContent>Copy</TooltipContent></Tooltip><Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="size-7" onClick={onRegenerate} aria-label="Regenerate response"><RefreshCw className="size-3.5" /></Button></TooltipTrigger><TooltipContent>Regenerate</TooltipContent></Tooltip><Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="size-7" aria-label="Helpful response"><ThumbsUp className="size-3.5" /></Button></TooltipTrigger><TooltipContent>Helpful</TooltipContent></Tooltip><Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="size-7" aria-label="Unhelpful response"><ThumbsDown className="size-3.5" /></Button></TooltipTrigger><TooltipContent>Not helpful</TooltipContent></Tooltip></div>}</div></article>)}</div>; }
