"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useRouter } from "next/navigation";
import {
  ArrowUp,
  ChevronDown,
  CircleUserRound,
  Download,
  Globe2,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Search,
  Sparkles,
  SquarePen,
  Square,
  Store,
  Trash2,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { chatRepository } from "@/lib/chat-repository";
import { ProductBriefCard } from "./product-brief-card";
import type { Conversation, DiscoveryProgress, RetailerResults, StockistMessage } from "@/lib/chat-types";
import type { ProductBrief, ProductBriefRevision, StoreLead } from "@/lib/types";

const suggestions = ["Find independent stores in London", "Only show stores with email", "Find 25 more in Manchester"];

type DiscoveryAppProps = { initialWebsite?: string; initialPrompt?: string; conversationId?: string };

function hostname(value: string) {
  try { return new URL(value).hostname.replace(/^www\./, ""); } catch { return value; }
}

function titleFor(website: string, prompt: string) {
  return prompt.trim().split(/\s+/).slice(0, 6).join(" ") || `${hostname(website)} discovery`;
}

export function DiscoveryApp({ initialWebsite = "", initialPrompt = "", conversationId }: DiscoveryAppProps) {
  const router = useRouter();
  const [website, setWebsite] = useState(initialWebsite);
  const [draftPrompt, setDraftPrompt] = useState(initialPrompt);
  const [conversation, setConversation] = useState<Conversation | undefined>();
  const [history, setHistory] = useState<Conversation[]>([]);
  const [historySearchOpen, setHistorySearchOpen] = useState(false);
  const [historyQuery, setHistoryQuery] = useState("");
  const [collapsed, setCollapsed] = useState(false);
  const [mobileSidebar, setMobileSidebar] = useState(false);
  const [selectedLead, setSelectedLead] = useState<StoreLead | undefined>();
  const [query, setQuery] = useState("");
  const [shortlist, setShortlist] = useState<string[]>([]);
  const [briefRevision, setBriefRevision] = useState<ProductBriefRevision | undefined>();
  const [briefRevisions, setBriefRevisions] = useState<ProductBriefRevision[]>([]);
  const [editingBrief, setEditingBrief] = useState(false);
  const [editingVersion, setEditingVersion] = useState<number | undefined>();
  const [selectedResultSetId, setSelectedResultSetId] = useState<string | undefined>();
  const [initialized, setInitialized] = useState(false);
  const started = useRef(false);

  const { messages, sendMessage, setMessages, status, stop, error: chatError } = useChat<StockistMessage>({
    id: conversationId,
    transport: new DefaultChatTransport({ api: "/api/chat" }),
  });
  const busy = status === "submitted" || status === "streaming";
  const handoffLoading = Boolean(conversationId && initialWebsite.trim() && !initialized);
  const messageSignature = useMemo(
    () => messages.map((message) => `${message.id}:${message.parts.map((part) => part.type === "text" ? `text-${part.text.length}` : part.type).join(",")}`).join("|"),
    [messages],
  );

  const loadHistory = useCallback(async () => setHistory((await chatRepository.listConversations()).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))), []);

  useEffect(() => { void loadHistory(); }, [loadHistory]);

  useEffect(() => {
    if (conversationId || !initialWebsite.trim() || started.current) return;
    started.current = true;
    const id = crypto.randomUUID();
    router.replace(`/dashboard/${id}?website=${encodeURIComponent(initialWebsite)}&prompt=${encodeURIComponent(initialPrompt)}`);
  }, [conversationId, initialPrompt, initialWebsite, router]);

  useEffect(() => {
    if (!conversationId) return;
    void (async () => {
      const saved = await chatRepository.getConversation(conversationId);
      if (saved) {
        setConversation(saved); setWebsite(saved.website); setShortlist(saved.shortlistIds); setBriefRevisions(await chatRepository.getBriefRevisions(conversationId));
        setMessages(await chatRepository.getMessages(conversationId)); setInitialized(true); return;
      }
      if (!initialWebsite.trim()) return;
      const now = new Date().toISOString();
      const next: Conversation = { id: conversationId, title: titleFor(initialWebsite, initialPrompt), website: initialWebsite, createdAt: now, updatedAt: now, shortlistIds: [], status: "running" };
      await chatRepository.saveConversation(next); setConversation(next); setInitialized(true); await loadHistory();
    })();
  }, [conversationId, initialPrompt, initialWebsite, loadHistory, setMessages]);

  useEffect(() => {
    if (!conversationId || !initialized || started.current) return;
    const hasBrief = messages.some((message) => message.parts.some((part) => part.type === "data-product-brief"));
    const hasAssistantResponse = messages.some((message) => message.role === "assistant");
    if (messages.length > 0 && (hasBrief || hasAssistantResponse)) return;
    started.current = true;
    const savedPrompt = messages.find((message) => message.role === "user")?.parts.filter((part) => part.type === "text").map((part) => part.text).join(" ").trim();
    if (messages.length > 0) setMessages([]);
    sendMessage({ text: savedPrompt || initialPrompt || "Analyze this product website." }, { body: { action: { type: "analyze_product", conversationId, website, distributionGoal: savedPrompt || initialPrompt }, conversationId, website } });
  }, [conversationId, initialPrompt, initialized, messages.length, sendMessage, website]);

  useEffect(() => {
    if (!conversationId || !initialized) return;
    const latestResult = [...messages].reverse().flatMap((message) => message.parts).find((part) => part.type === "data-retailer-results") as { data: RetailerResults } | undefined;
    const briefPart = [...messages].reverse().flatMap((message) => message.parts).find((part) => part.type === "data-product-brief") as { data: ProductBriefRevision } | undefined;
    if (briefPart) { setBriefRevision(briefPart.data); void chatRepository.saveBriefRevision(briefPart.data); }
    const next = { ...(conversation ?? { id: conversationId, website, title: titleFor(website, initialPrompt), createdAt: new Date().toISOString(), shortlistIds: [] }), updatedAt: new Date().toISOString(), status: briefPart?.data.status === "draft" ? "awaiting_brief_confirmation" : busy ? "running" : "ready", activeBriefVersion: briefPart?.data.version, activeResultSetId: latestResult?.data.resultSetId } as Conversation;
    setConversation(next); void chatRepository.saveConversation(next); void chatRepository.saveMessages(conversationId, messages); if (latestResult) { void chatRepository.saveLeads(conversationId, latestResult.data.leads); void chatRepository.saveResultSet(conversationId, latestResult.data); } void loadHistory();
  }, [busy, conversationId, initialPrompt, initialized, loadHistory, messageSignature, website]);

  const resultSets = useMemo(() => {
    const items: RetailerResults[] = [];
    for (const message of messages) for (const part of message.parts) if (part.type === "data-retailer-results") {
      const result = (part as { data: RetailerResults }).data;
      if (!items.some((item) => item.resultSetId === result.resultSetId)) items.push(result);
    }
    return items;
  }, [messages]);
  const briefHistory = useMemo(() => {
    const items: ProductBriefRevision[] = [];
    for (const message of messages) for (const part of message.parts) if (part.type === "data-product-brief") {
      const brief = (part as { data: ProductBriefRevision }).data;
      const existing = items.findIndex((item) => item.version === brief.version);
      if (existing >= 0) items[existing] = brief; else items.push(brief);
    }
    return items;
  }, [messages]);
  const results = useMemo(() => {
    if (!resultSets.length) return undefined;
    return resultSets.find((result) => result.resultSetId === selectedResultSetId) ?? resultSets[resultSets.length - 1];
  }, [resultSets, selectedResultSetId]);
  const progress = useMemo(() => {
    for (const message of [...messages].reverse()) for (const part of [...message.parts].reverse()) if (part.type === "data-discovery-progress") return (part as { data: DiscoveryProgress }).data;
    return undefined;
  }, [messages]);
  const runError = useMemo(() => {
    for (const message of [...messages].reverse()) for (const part of [...message.parts].reverse()) if (part.type === "data-run-error") return (part as { data: { message: string; retryable: boolean } }).data;
    return undefined;
  }, [messages]);
  const filteredLeads = results?.leads.filter((lead) => !query || `${lead.name} ${lead.address} ${lead.types.join(" ")}`.toLowerCase().includes(query.toLowerCase())) ?? [];
  function selectResultSet(id: string) { setSelectedResultSetId(id || undefined); const selected = resultSets.find((result) => result.resultSetId === id); const matchingBrief = selected && (briefHistory.find((brief) => brief.version === selected.briefVersion) ?? briefRevisions.find((brief) => brief.version === selected.briefVersion)); if (matchingBrief) setBriefRevision(matchingBrief); }

  function newChat() { router.push("/"); setMobileSidebar(false); }
  function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const text = draftPrompt.trim(); if (!text || !conversationId || busy || briefRevision?.status !== "confirmed") return; sendMessage({ text }, { body: { action: { type: "follow_up", conversationId, website, briefVersion: briefRevision.version, brief: briefRevision.brief, leads: results?.leads ?? [], messages }, conversationId, website, leads: results?.leads } }); setDraftPrompt(""); }
  function beginConversation() { if (!website.trim()) return; const id = crypto.randomUUID(); router.replace(`/dashboard/${id}?website=${encodeURIComponent(website)}&prompt=${encodeURIComponent(draftPrompt)}`); }
  function startBriefEdit() { if (!briefRevision) return; setEditingVersion(briefRevision.status === "confirmed" ? Math.max(0, ...briefRevisions.map((revision) => revision.version), briefRevision.version) + 1 : briefRevision.version); setEditingBrief(true); }
  function cancelBriefEdit() { setEditingBrief(false); setEditingVersion(undefined); }
  function confirmBrief(brief: ProductBrief) { if (!briefRevision || !conversationId) return; const confirmed = { ...briefRevision, version: editingVersion ?? briefRevision.version, brief, status: "confirmed" as const, needsReview: false, updatedAt: new Date().toISOString() }; setBriefRevision(confirmed); setEditingBrief(false); setEditingVersion(undefined); sendMessage({ text: "Confirm and find retailers" }, { body: { action: { type: "confirm_brief", conversationId, revision: confirmed, messages }, conversationId, website } }); }
  function toggleShortlist(id: string) { setShortlist((current) => current.includes(id) ? current.filter((value) => value !== id) : [...current, id]); }
  function exportCsv(scope: "all" | "shortlist") { if (!results) return; const leads = scope === "shortlist" ? results.leads.filter((lead) => shortlist.includes(lead.id)) : filteredLeads; const headers = ["store", "address", "score", "reason", "email", "phone", "website", "mapsUrl", "rating", "contactSource"]; const escape = (value: unknown) => `"${String(value ?? "").replaceAll('"', '""').replace(/^[=+\-@]/, "'$&")}"`; const csv = [headers, ...leads.map((lead) => headers.map((header) => escape(lead[header as keyof StoreLead])))] .map((row) => row.join(",")).join("\n"); const link = document.createElement("a"); link.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" })); link.download = `stockist-${scope}.csv`; link.click(); URL.revokeObjectURL(link.href); }

  return <div className="flex h-dvh min-h-screen overflow-hidden bg-background text-foreground">
    <aside className={`${collapsed ? "w-[68px]" : "w-[240px]"} relative hidden h-dvh shrink-0 overflow-hidden border-e bg-card/60 p-3 pb-20 transition-[width] duration-200 lg:flex lg:flex-col`}>
      <div className="flex items-center justify-between">
        <SidebarBrand collapsed={collapsed} />
        <div className="flex items-center gap-0.5">
          {!collapsed && <Button variant="ghost" size="icon" className="size-8 shrink-0" onClick={() => setHistorySearchOpen((open) => !open)} aria-label="Search conversations"><Search /></Button>}
          <Button variant="ghost" size="icon" className="size-8 shrink-0" onClick={() => setCollapsed(!collapsed)} aria-label="Toggle sidebar">{collapsed ? <PanelLeftOpen /> : <PanelLeftClose />}</Button>
        </div>
      </div>
      <Button className="mt-5 justify-start gap-2 rounded-lg" onClick={newChat}><SquarePen className="size-4" />{!collapsed && "New chat"}</Button>
      {!collapsed && <><div className="mt-4">{historySearchOpen && <Input autoFocus value={historyQuery} onChange={(event) => setHistoryQuery(event.target.value)} placeholder="Search conversations" className="h-9 bg-background" />}</div><ConversationList history={history} search={historyQuery} activeId={conversationId} onSelect={(id) => router.push(`/dashboard/${id}`)} onDelete={async (id) => { await chatRepository.deleteConversation(id); await loadHistory(); if (id === conversationId) newChat(); }} /></>}
      <SidebarAccount collapsed={collapsed} />
    </aside>
    {mobileSidebar && <div className="fixed inset-0 z-40 bg-black/20 lg:hidden" onClick={() => setMobileSidebar(false)}><aside className="relative flex h-dvh w-[280px] flex-col overflow-hidden bg-card p-3 pb-20" onClick={(event) => event.stopPropagation()}><SidebarBrand /><Button className="mt-5 w-full justify-start gap-2" onClick={newChat}><Plus className="size-4" />New chat</Button><div className="mt-4">{historySearchOpen && <Input autoFocus value={historyQuery} onChange={(event) => setHistoryQuery(event.target.value)} placeholder="Search conversations" className="h-9 bg-background" />}</div><ConversationList history={history} search={historyQuery} activeId={conversationId} onSelect={(id) => { router.push(`/dashboard/${id}`); setMobileSidebar(false); }} onDelete={async (id) => { await chatRepository.deleteConversation(id); await loadHistory(); }} /><SidebarAccount /></aside></div>}
    <main className="flex h-dvh min-h-0 min-w-0 flex-1 flex-col">
      <header className="flex h-16 shrink-0 items-center justify-between border-b px-4 sm:px-6"><div className="flex min-w-0 items-center gap-3"><Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setMobileSidebar(true)} aria-label="Open sidebar"><Menu /></Button><div className="min-w-0"><p className="truncate text-sm font-medium">{conversation?.title ?? "New discovery"}</p>{website && <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><Globe2 className="size-3" />{hostname(website)}</div>}</div></div><div className="flex items-center gap-2">{resultSets.length > 1 && <select aria-label="Result set" value={results?.resultSetId} onChange={(event) => selectResultSet(event.target.value)} className="h-8 max-w-44 rounded-md border bg-background px-2 text-xs"><option value="">Newest result set</option>{resultSets.map((result) => <option key={result.resultSetId} value={result.resultSetId}>Brief v{result.briefVersion} · {result.leads.length} stores</option>)}</select>}{briefRevision?.status === "confirmed" && <Button variant="outline" size="sm" onClick={startBriefEdit}>Product brief</Button>}{results && <><Badge variant="secondary">{shortlist.length} shortlisted</Badge><Button variant="outline" size="sm" onClick={() => exportCsv("all")}><Download className="size-3.5" /> CSV</Button></>}</div></header>
      <div className="min-h-0 flex-1 overflow-y-auto"><div className="mx-auto flex min-h-full w-full max-w-4xl flex-col px-4 pb-36 pt-8 sm:px-8">
        {messages.length === 0 && !busy && !handoffLoading && <EmptyState website={website} setWebsite={setWebsite} prompt={draftPrompt} setPrompt={setDraftPrompt} onStart={conversationId ? () => sendMessage({ text: draftPrompt || "Analyze this product website." }, { body: { action: { type: "analyze_product", conversationId, website, distributionGoal: draftPrompt }, conversationId, website } }) : beginConversation} />}
        {(handoffLoading || busy) && !briefRevision && <AnalysisLoading progress={progress} website={website} />}
        {messages.map((message) => <MessageView key={message.id} message={message} progress={progress} onSelectLead={setSelectedLead} results={results} shortlist={shortlist} onToggle={toggleShortlist} />)}
        {briefRevision && <ProductBriefCard revision={briefRevision} editing={briefRevision.status === "draft" || editingBrief} onEdit={startBriefEdit} onCancel={cancelBriefEdit} onConfirm={confirmBrief} />}
        {runError && (!briefRevision || briefRevision.status === "draft") && <div className="my-4 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm"><p className="font-medium text-destructive">Product analysis couldn’t finish</p><p className="mt-1 text-muted-foreground">{runError.message}</p><Button className="mt-3" size="sm" variant="outline" onClick={() => window.location.reload()}>Try again</Button></div>}
        {chatError && !runError && <div className="my-4 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm"><p className="font-medium text-destructive">The analysis request failed</p><p className="mt-1 text-muted-foreground">{chatError.message || "The server did not return a response."}</p><Button className="mt-3" size="sm" variant="outline" onClick={() => window.location.reload()}>Try again</Button></div>}
        {runError?.retryable && briefRevision?.status === "confirmed" && <div className="my-4 flex items-center justify-between gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm"><span>{runError.message}</span><Button size="sm" variant="outline" onClick={() => confirmBrief(briefRevision.brief)}>Retry discovery</Button></div>}
        {results && <ResultsTable results={results} leads={filteredLeads} query={query} setQuery={setQuery} shortlist={shortlist} onToggle={toggleShortlist} onSelect={setSelectedLead} onExport={exportCsv} />}
      </div></div>
      {selectedLead && <LeadDetail lead={selectedLead} shortlisted={shortlist.includes(selectedLead.id)} onToggle={() => toggleShortlist(selectedLead.id)} onClose={() => setSelectedLead(undefined)} />}
      {conversationId && briefRevision?.status === "confirmed" && !editingBrief && <form onSubmit={submit} className={`fixed bottom-0 left-0 right-0 border-t bg-background/90 p-4 backdrop-blur lg:left-auto ${collapsed ? "lg:w-[calc(100%-68px)]" : "lg:w-[calc(100%-240px)]"}`}><div className="mx-auto flex max-w-3xl items-end gap-2 rounded-2xl border bg-card p-2 shadow-sm"><Textarea value={draftPrompt} onChange={(event) => setDraftPrompt(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); event.currentTarget.form?.requestSubmit(); } }} placeholder="Ask a follow-up about your retailers…" className="max-h-32 min-h-10 resize-none border-0 bg-transparent shadow-none focus-visible:ring-0" disabled={busy} /><Button type={busy ? "button" : "submit"} size="icon" className="shrink-0 rounded-xl" onClick={busy ? stop : undefined} aria-label={busy ? "Stop" : "Send"}>{busy ? <Square className="size-4 fill-current" /> : <ArrowUp className="size-4" />}</Button></div></form>}
    </main>
  </div>;
}

function SidebarBrand({ collapsed = false }: { collapsed?: boolean }) { return <a href="/" className="flex items-center gap-2 px-2 py-2 text-sm font-semibold"><span className="flex size-8 items-center justify-center rounded-xl bg-foreground text-background"><Store className="size-4" /></span>{!collapsed && "Stockist"}</a>; }
function SidebarAccount({ collapsed = false }: { collapsed?: boolean }) { return <div className="absolute inset-x-0 bottom-0 border-t bg-card/95 px-3 py-3 backdrop-blur"><div className={`flex items-center ${collapsed ? "justify-center" : "gap-2"}`}><span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-medium">SD</span>{!collapsed && <><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">Stockist workspace</p><p className="truncate text-xs text-muted-foreground">Local account</p></div><Button variant="ghost" size="icon" className="size-8" aria-label="Open account menu"><CircleUserRound className="size-4" /></Button></>}</div></div>; }
function ConversationList({ history, search, activeId, onSelect, onDelete }: { history: Conversation[]; search: string; activeId?: string; onSelect: (id: string) => void; onDelete: (id: string) => void }) { const visible = history.filter((item) => !search.trim() || item.title.toLowerCase().includes(search.toLowerCase())); return <div className="mt-5 min-h-0 flex-1 space-y-5 overflow-y-auto pe-1"><div className="flex items-center justify-between px-2"><p className="text-xs font-semibold">Recents</p><span className="text-[11px] text-muted-foreground">{visible.length}</span></div>{["Today", "Previous 7 days", "Older"].map((group) => { const items = visible.filter((item) => group === "Today" ? Date.now() - Date.parse(item.updatedAt) < 86400000 : group === "Previous 7 days" ? Date.now() - Date.parse(item.updatedAt) < 604800000 : Date.now() - Date.parse(item.updatedAt) >= 604800000); return items.length ? <section key={group}><p className="mb-2 px-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{group}</p>{items.map((item) => <div key={item.id} className={`group flex items-center gap-1 rounded-lg px-2 py-2 text-sm ${item.id === activeId ? "bg-secondary" : "hover:bg-secondary/70"}`}><button className="min-w-0 flex-1 truncate text-start" onClick={() => onSelect(item.id)}>{item.title}</button><button className="hidden rounded p-1 text-muted-foreground hover:text-destructive group-hover:block" onClick={() => onDelete(item.id)} aria-label={`Delete ${item.title}`}><Trash2 className="size-3.5" /></button></div>)}</section> : null; })}{!visible.length && <p className="px-2 text-xs text-muted-foreground">No conversations found.</p>}</div>; }
function EmptyState({ website, setWebsite, prompt, setPrompt, onStart }: { website: string; setWebsite: (value: string) => void; prompt: string; setPrompt: (value: string) => void; onStart: () => void }) { return <div className="flex flex-1 flex-col items-center justify-center py-12 text-center sm:py-16"><div className="mb-5 flex size-11 items-center justify-center rounded-2xl bg-secondary"><Sparkles className="size-5" /></div><h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">What should we find?</h1><p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">Start with a product website. We’ll turn it into an editable brief before searching for retailers.</p><Card className="mt-8 w-full max-w-2xl text-start shadow-sm"><div className="flex items-center gap-2 border-b px-4 py-3"><Globe2 className="size-4 shrink-0 text-muted-foreground" /><Input value={website} onChange={(event) => setWebsite(event.target.value)} placeholder="Attach product website, e.g. yourbrand.com" className="h-8 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0" /><Badge variant="secondary" className="shrink-0 text-[11px]">Required</Badge></div><Textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} placeholder="Add context for your product brief (optional)" className="min-h-24 resize-none border-0 bg-transparent px-4 py-3 shadow-none focus-visible:ring-0" /><div className="flex flex-col gap-3 border-t px-4 py-3 sm:flex-row sm:items-center sm:justify-between"><p className="text-xs text-muted-foreground">Places search starts after you confirm the brief.</p><Button className="gap-2 sm:shrink-0" onClick={onStart} disabled={!website.trim()}>Analyze website <ArrowUp className="size-4" /></Button></div></Card><div className="mt-6 flex max-w-2xl flex-wrap justify-center gap-2">{suggestions.map((suggestion) => <button key={suggestion} onClick={() => setPrompt(suggestion)} className="rounded-full border bg-background px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-foreground hover:text-foreground">{suggestion}</button>)}</div></div>; }
function AnalysisLoading({ progress, website }: { progress?: DiscoveryProgress; website: string }) { return <div className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center py-16"><div className="rounded-2xl border bg-card p-6 shadow-sm"><div className="flex items-start gap-4"><div className="mt-1 flex size-10 shrink-0 items-center justify-center rounded-xl bg-secondary"><Sparkles className="size-4 animate-pulse" /></div><div className="min-w-0"><p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Product analysis in progress</p><h1 className="mt-1 text-xl font-semibold">Understanding {hostname(website)}</h1><p className="mt-2 text-sm leading-6 text-muted-foreground">We’re reading the product website and preparing an editable brief. Retailer search starts only after you confirm it.</p></div></div><div className="mt-6 rounded-xl bg-secondary/60 p-3 text-sm"><div className="flex items-center gap-2"><span className="size-2 animate-pulse rounded-full bg-primary" />{progress?.label ?? "Connecting to the product analysis service…"}</div><div className="mt-3 h-1.5 overflow-hidden rounded-full bg-background"><div className="h-full w-2/5 animate-pulse rounded-full bg-primary" /></div></div><p className="mt-4 text-xs text-muted-foreground">This can take up to a minute for a live website.</p></div></div>; }
function MessageView({ message, progress, onSelectLead, results, shortlist, onToggle }: { message: StockistMessage; progress?: DiscoveryProgress; onSelectLead: (lead: StoreLead) => void; results?: RetailerResults; shortlist: string[]; onToggle: (id: string) => void }) { const text = message.parts.filter((part) => part.type === "text").map((part) => part.text).join(""); if (!text && message.role !== "assistant") return null; return <article className={`mb-6 flex ${message.role === "user" ? "justify-end" : "justify-start"}`}><div className={message.role === "user" ? "max-w-[80%] rounded-2xl bg-secondary px-4 py-3 text-sm" : "max-w-3xl text-sm leading-7"}>{text && <p className="whitespace-pre-wrap">{text}</p>}{message.role === "assistant" && progress && <ProgressBlock progress={progress} />}{message.role === "assistant" && results && <div className="mt-3 flex flex-wrap gap-2">{results.leads.slice(0, 3).map((lead) => <button key={lead.id} className="rounded-lg border px-2.5 py-1.5 text-xs hover:bg-secondary" onClick={() => onSelectLead(lead)}>{lead.name} · {lead.score}</button>)}</div>}</div></article>; }
function ProgressBlock({ progress }: { progress: DiscoveryProgress }) { return <details className="mt-4 rounded-xl border bg-card px-3 py-2 text-xs" open={progress.stage !== "complete"}><summary className="cursor-pointer list-none font-medium"><span className="me-2 inline-block size-1.5 rounded-full bg-primary" />{progress.label}<ChevronDown className="ms-2 inline size-3.5" /></summary><p className="mt-2 text-muted-foreground">{progress.candidatesFound ? `${progress.candidatesFound} candidates · ` : ""}{progress.emailsFound ?? 0} public emails found</p></details>; }
function LegacyProductBriefCard({ revision, editing, onEdit, onCancel, onConfirm }: { revision: ProductBriefRevision; editing: boolean; onEdit: () => void; onCancel: () => void; onConfirm: (brief: ProductBrief) => void }) {
  const [draft, setDraft] = useState<ProductBrief>(revision.brief);
  const [errors, setErrors] = useState<string[]>([]);
  useEffect(() => setDraft(revision.brief), [revision.brief]);
  const update = <K extends keyof ProductBrief>(key: K, value: ProductBrief[K]) => setDraft((current) => ({ ...current, [key]: value }));
  const tags = (key: "categories" | "targetMarkets" | "idealRetailerTypes" | "differentiators" | "requirements" | "exclusions") => draft[key].join(", ");
  const updateTags = (key: "categories" | "targetMarkets" | "idealRetailerTypes" | "differentiators" | "requirements" | "exclusions", value: string) => update(key, value.split(",").map((item) => item.trim()).filter(Boolean));
  function confirm() {
    const nextErrors = [
      !draft.distributionGoal.trim() && "Distribution goal is required.",
      !draft.categories.length && "Add at least one category.",
      !draft.targetMarkets.length && "Add at least one target market.",
      !draft.idealRetailerTypes.length && "Add at least one retailer type.",
    ].filter(Boolean) as string[];
    setErrors(nextErrors);
    if (!nextErrors.length) onConfirm(draft);
  }
  if (!editing) return <section className="my-6 rounded-xl border bg-card p-4"><div className="flex items-start justify-between gap-4"><div><div className="flex items-center gap-2"><Badge variant="secondary">Product brief · v{revision.version}</Badge><span className="text-xs text-muted-foreground">Confirmed</span></div><h2 className="mt-2 text-lg font-semibold">{draft.brandName}</h2><p className="mt-1 text-sm text-muted-foreground">{draft.distributionGoal || "No distribution goal added"}</p></div><Button variant="outline" size="sm" onClick={onEdit}>Edit</Button></div><div className="mt-4 flex flex-wrap gap-2">{[...draft.categories, ...draft.targetMarkets, ...draft.idealRetailerTypes].map((tag) => <Badge key={tag} variant="outline">{tag}</Badge>)}</div></section>;
  return <section className="my-6 rounded-xl border bg-card p-4 shadow-sm"><div className="flex items-start justify-between gap-4"><div><Badge variant="secondary">Review product brief · v{revision.version}</Badge><h2 className="mt-2 text-lg font-semibold">Check the details before we search</h2><p className="mt-1 text-sm text-muted-foreground">Places won’t be called until you confirm this brief.</p></div>{revision.source === "fallback" && <Badge variant="outline">Manual review</Badge>}</div>{errors.length > 0 && <div className="mt-4 rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive"><p className="font-medium">Complete these fields before continuing:</p><ul className="mt-1 list-disc ps-5">{errors.map((error) => <li key={error}>{error}</li>)}</ul></div>}<div className="mt-5 grid gap-4 sm:grid-cols-2"><BriefField label="Brand name" value={draft.brandName} onChange={(value) => update("brandName", value)} /><BriefField label="Categories · comma separated" value={tags("categories")} onChange={(value) => updateTags("categories", value)} /><BriefField label="Target markets · comma separated" value={tags("targetMarkets")} onChange={(value) => updateTags("targetMarkets", value)} /><BriefField label="Ideal retailer types · comma separated" value={tags("idealRetailerTypes")} onChange={(value) => updateTags("idealRetailerTypes", value)} /><BriefField label="Price positioning" value={draft.pricePositioning} onChange={(value) => update("pricePositioning", value)} /><label className="space-y-1 text-sm"><span className="font-medium">Retailer preference</span><select value={draft.retailerPreference} onChange={(event) => update("retailerPreference", event.target.value as ProductBrief["retailerPreference"])} className="h-10 w-full rounded-md border bg-background px-3 text-sm"><option value="either">Independent or chain</option><option value="independent">Independent only</option><option value="chain">Chains preferred</option></select></label></div><label className="mt-4 block space-y-1 text-sm"><span className="font-medium">Product summary</span><Textarea value={draft.summary} onChange={(event) => update("summary", event.target.value)} className="min-h-20 resize-y" /></label><label className="mt-4 block space-y-1 text-sm"><span className="font-medium">Target customer</span><Input value={draft.targetCustomer} onChange={(event) => update("targetCustomer", event.target.value)} /></label><label className="mt-4 block space-y-1 text-sm"><span className="font-medium">Distribution goal <span className="text-destructive">*</span></span><Textarea value={draft.distributionGoal} onChange={(event) => update("distributionGoal", event.target.value)} placeholder="Where and how should this product be distributed?" className="min-h-20 resize-y" /></label><details className="mt-4 rounded-lg border px-3 py-2"><summary className="cursor-pointer text-sm font-medium">Advanced brief fields</summary><div className="mt-4 space-y-3"><BriefField label="Differentiators · comma separated" value={tags("differentiators")} onChange={(value) => updateTags("differentiators", value)} /><BriefField label="Requirements · comma separated" value={tags("requirements")} onChange={(value) => updateTags("requirements", value)} /><BriefField label="Exclusions · comma separated" value={tags("exclusions")} onChange={(value) => updateTags("exclusions", value)} /></div></details><div className="mt-5 flex flex-wrap justify-end gap-2"><Button variant="ghost" onClick={() => { setDraft({ ...draft, brandName: "", summary: "", categories: [], targetCustomer: "", pricePositioning: "", distributionGoal: "", targetMarkets: [], idealRetailerTypes: [], differentiators: [], requirements: [], exclusions: [] }); setErrors([]); }}>Reset extracted values</Button>{revision.status === "confirmed" && <Button variant="outline" onClick={onCancel}>Cancel</Button>}<Button onClick={confirm}>Confirm and find retailers <ArrowUp /></Button></div></section>;
}
function BriefField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) { return <label className="space-y-1 text-sm"><span className="font-medium">{label}</span><Input value={value} onChange={(event) => onChange(event.target.value)} /></label>; }
function ResultsTable({ results, leads, query, setQuery, shortlist, onToggle, onSelect, onExport }: { results: RetailerResults; leads: StoreLead[]; query: string; setQuery: (value: string) => void; shortlist: string[]; onToggle: (id: string) => void; onSelect: (lead: StoreLead) => void; onExport: (scope: "all" | "shortlist") => void }) { return <section className="mt-8 overflow-hidden rounded-xl border bg-card"><div className="flex flex-wrap items-center justify-between gap-3 border-b p-4"><div><p className="text-xs text-muted-foreground">{results.demo ? "Preview data" : "Google Maps data"}</p><h2 className="text-lg font-semibold">{leads.length} retailer{leads.length === 1 ? "" : "s"}</h2></div><div className="flex gap-2"><div className="relative"><Search className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" /><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Filter stores" className="h-8 w-40 pl-8 text-xs" /></div><Button variant="outline" size="sm" onClick={() => onExport("shortlist")} disabled={!shortlist.length}><Download className="size-3.5" /> Shortlist</Button></div></div><div className="max-h-[460px] overflow-auto"><table className="w-full text-left text-sm"><thead className="sticky top-0 z-10 bg-card text-xs text-muted-foreground"><tr><th className="w-10 px-4 py-3" /><th className="px-3 py-3">Store</th><th className="px-3 py-3">Location</th><th className="px-3 py-3">Fit</th><th className="px-3 py-3">Contact</th><th className="px-4 py-3">Rating</th></tr></thead><tbody>{leads.map((lead) => <tr key={lead.id} className="cursor-pointer border-t hover:bg-secondary/50" onClick={() => onSelect(lead)}><td className="px-4 py-3" onClick={(event) => event.stopPropagation()}><input type="checkbox" checked={shortlist.includes(lead.id)} onChange={() => onToggle(lead.id)} aria-label={`Shortlist ${lead.name}`} /></td><td className="max-w-[180px] truncate px-3 py-3 font-medium">{lead.name}</td><td className="max-w-[220px] truncate px-3 py-3 text-muted-foreground">{lead.address}</td><td className="px-3 py-3"><Badge variant={lead.score >= 75 ? "default" : "secondary"}>{lead.score}</Badge></td><td className="px-3 py-3 text-xs text-muted-foreground">{lead.email ? "Email" : lead.phone ? "Phone" : "Unavailable"}</td><td className="px-4 py-3 text-xs">{lead.rating ? `★ ${lead.rating.toFixed(1)}` : "—"}</td></tr>)}</tbody></table></div>{!results.demo && <p className="border-t px-4 py-2 text-[11px] text-muted-foreground">Store details from Google Maps · Public contacts are labeled publicly found.</p>}</section>; }
function LeadDetail({ lead, shortlisted, onToggle, onClose }: { lead: StoreLead; shortlisted: boolean; onToggle: () => void; onClose: () => void }) { return <aside className="fixed inset-y-0 right-0 z-50 w-full max-w-md border-l bg-background p-6 shadow-xl"><div className="flex items-start justify-between"><div><p className="text-xs text-muted-foreground">Retailer detail</p><h2 className="mt-1 text-xl font-semibold">{lead.name}</h2></div><Button variant="ghost" size="icon" onClick={onClose} aria-label="Close detail"><X /></Button></div><Badge className="mt-4">Fit score {lead.score}</Badge><p className="mt-5 text-sm leading-6 text-muted-foreground">{lead.reason}</p><div className="mt-6 space-y-3 text-sm"><p>{lead.address}</p>{lead.email && <p><a className="underline" href={`mailto:${lead.email}`}>{lead.email}</a> <span className="text-xs text-muted-foreground">publicly found</span></p>}{lead.phone && <p><a className="underline" href={`tel:${lead.phone}`}>{lead.phone}</a></p>}{lead.website && <p><a className="underline" href={lead.website} target="_blank" rel="noreferrer">Website</a></p>}{lead.mapsUrl && <p><a className="underline" href={lead.mapsUrl} target="_blank" rel="noreferrer">Open in Google Maps</a></p>}</div><Button className="mt-8 w-full" variant={shortlisted ? "secondary" : "default"} onClick={onToggle}>{shortlisted ? "Remove from shortlist" : "Add to shortlist"}</Button></aside>; }
