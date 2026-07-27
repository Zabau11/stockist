"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useRouter } from "next/navigation";
import {
  ArrowUp,
  ChevronDown,
  Download,
  Globe2,
  Menu,
  MoreHorizontal,
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { chatRepository } from "@/lib/chat-repository";
import type { Conversation, DiscoveryProgress, RetailerResults, StockistMessage } from "@/lib/chat-types";
import type { StoreLead } from "@/lib/types";

const marketingUrl = (process.env.NEXT_PUBLIC_MARKETING_URL ?? "http://localhost:3000").replace(/\/$/, "");
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
  const [collapsed, setCollapsed] = useState(false);
  const [mobileSidebar, setMobileSidebar] = useState(false);
  const [selectedLead, setSelectedLead] = useState<StoreLead | undefined>();
  const [query, setQuery] = useState("");
  const [shortlist, setShortlist] = useState<string[]>([]);
  const [initialized, setInitialized] = useState(false);
  const started = useRef(false);

  const { messages, sendMessage, setMessages, status, stop } = useChat<StockistMessage>({
    id: conversationId,
    transport: new DefaultChatTransport({ api: "/api/chat" }),
  });
  const busy = status === "submitted" || status === "streaming";

  const loadHistory = useCallback(async () => setHistory((await chatRepository.listConversations()).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))), []);

  useEffect(() => { void loadHistory(); }, [loadHistory]);

  useEffect(() => {
    if (conversationId || !initialWebsite.trim() || started.current) return;
    started.current = true;
    const id = crypto.randomUUID();
    router.replace(`/chat/${id}?website=${encodeURIComponent(initialWebsite)}&prompt=${encodeURIComponent(initialPrompt)}`);
  }, [conversationId, initialPrompt, initialWebsite, router]);

  useEffect(() => {
    if (!conversationId) return;
    void (async () => {
      const saved = await chatRepository.getConversation(conversationId);
      if (saved) {
        setConversation(saved); setWebsite(saved.website); setShortlist(saved.shortlistIds);
        setMessages(await chatRepository.getMessages(conversationId)); setInitialized(true); return;
      }
      if (!initialWebsite.trim()) return;
      const now = new Date().toISOString();
      const next: Conversation = { id: conversationId, title: titleFor(initialWebsite, initialPrompt), website: initialWebsite, createdAt: now, updatedAt: now, shortlistIds: [], status: "running" };
      await chatRepository.saveConversation(next); setConversation(next); setInitialized(true); await loadHistory();
    })();
  }, [conversationId, initialPrompt, initialWebsite, loadHistory, setMessages]);

  useEffect(() => {
    if (!conversationId || !initialized || started.current || !initialPrompt.trim() || messages.length > 0) return;
    started.current = true;
    sendMessage({ text: initialPrompt }, { body: { conversationId, website } });
  }, [conversationId, initialPrompt, initialized, messages.length, sendMessage, website]);

  useEffect(() => {
    if (!conversationId || !initialized) return;
    const latestResult = [...messages].reverse().flatMap((message) => message.parts).find((part) => part.type === "data-retailer-results") as { data: RetailerResults } | undefined;
    const profile = [...messages].reverse().flatMap((message) => message.parts).find((part) => part.type === "data-product-profile") as { data: Conversation["productProfile"] } | undefined;
    const next = { ...(conversation ?? { id: conversationId, website, title: titleFor(website, initialPrompt), createdAt: new Date().toISOString(), shortlistIds: [] }), updatedAt: new Date().toISOString(), status: busy ? "running" : "ready", activeResultSetId: latestResult?.data.resultSetId, productProfile: profile?.data } as Conversation;
    setConversation(next); void chatRepository.saveConversation(next); void chatRepository.saveMessages(conversationId, messages); if (latestResult) void chatRepository.saveLeads(conversationId, latestResult.data.leads); void loadHistory();
  }, [busy, conversation, conversationId, initialPrompt, initialized, loadHistory, messages, website]);

  const results = useMemo(() => {
    for (const message of [...messages].reverse()) for (const part of [...message.parts].reverse()) if (part.type === "data-retailer-results") return (part as { data: RetailerResults }).data;
    return undefined;
  }, [messages]);
  const progress = useMemo(() => {
    for (const message of [...messages].reverse()) for (const part of [...message.parts].reverse()) if (part.type === "data-discovery-progress") return (part as { data: DiscoveryProgress }).data;
    return undefined;
  }, [messages]);
  const filteredLeads = results?.leads.filter((lead) => !query || `${lead.name} ${lead.address} ${lead.types.join(" ")}`.toLowerCase().includes(query.toLowerCase())) ?? [];

  function newChat() { router.push("/"); setMobileSidebar(false); }
  function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const text = draftPrompt.trim(); if (!text || !conversationId || busy) return; sendMessage({ text }, { body: { conversationId, website, leads: results?.leads } }); setDraftPrompt(""); }
  function beginConversation() { if (!website.trim()) return; const id = crypto.randomUUID(); router.replace(`/chat/${id}?website=${encodeURIComponent(website)}&prompt=${encodeURIComponent(draftPrompt)}`); }
  function toggleShortlist(id: string) { setShortlist((current) => current.includes(id) ? current.filter((value) => value !== id) : [...current, id]); }
  function exportCsv(scope: "all" | "shortlist") { if (!results) return; const leads = scope === "shortlist" ? results.leads.filter((lead) => shortlist.includes(lead.id)) : filteredLeads; const headers = ["store", "address", "score", "reason", "email", "phone", "website", "mapsUrl", "rating", "contactSource"]; const escape = (value: unknown) => `"${String(value ?? "").replaceAll('"', '""').replace(/^[=+\-@]/, "'$&")}"`; const csv = [headers, ...leads.map((lead) => headers.map((header) => escape(lead[header as keyof StoreLead])))] .map((row) => row.join(",")).join("\n"); const link = document.createElement("a"); link.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" })); link.download = `stockist-${scope}.csv`; link.click(); URL.revokeObjectURL(link.href); }

  return <div className="flex min-h-screen bg-background text-foreground">
    <aside className={`${collapsed ? "w-[68px]" : "w-[240px]"} hidden shrink-0 border-e bg-card/60 p-3 transition-[width] duration-200 lg:flex lg:flex-col`}>
      <div className="flex items-center justify-between">
        <SidebarBrand collapsed={collapsed} />
        <div className="flex items-center gap-0.5">
          {!collapsed && <Button variant="ghost" size="icon" className="size-8 shrink-0" aria-label="Search conversations"><Search /></Button>}
          <Button variant="ghost" size="icon" className="size-8 shrink-0" onClick={() => setCollapsed(!collapsed)} aria-label="Toggle sidebar">{collapsed ? <PanelLeftOpen /> : <PanelLeftClose />}</Button>
        </div>
      </div>
      <Button className="mt-5 justify-start gap-2 rounded-lg" onClick={newChat}><SquarePen className="size-4" />{!collapsed && "New chat"}</Button>
      {!collapsed && <ConversationList history={history} activeId={conversationId} onSelect={(id) => router.push(`/chat/${id}`)} onDelete={async (id) => { await chatRepository.deleteConversation(id); await loadHistory(); if (id === conversationId) newChat(); }} />}
    </aside>
    {mobileSidebar && <div className="fixed inset-0 z-40 bg-black/20 lg:hidden" onClick={() => setMobileSidebar(false)}><aside className="h-full w-[280px] bg-card p-3" onClick={(event) => event.stopPropagation()}><SidebarBrand /><Button className="mt-5 w-full justify-start gap-2" onClick={newChat}><Plus className="size-4" />New chat</Button><ConversationList history={history} activeId={conversationId} onSelect={(id) => { router.push(`/chat/${id}`); setMobileSidebar(false); }} onDelete={async (id) => { await chatRepository.deleteConversation(id); await loadHistory(); }} /></aside></div>}
    <main className="flex min-w-0 flex-1 flex-col">
      <header className="flex h-16 shrink-0 items-center justify-between border-b px-4 sm:px-6"><div className="flex min-w-0 items-center gap-3"><Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setMobileSidebar(true)} aria-label="Open sidebar"><Menu /></Button><div className="min-w-0"><p className="truncate text-sm font-medium">{conversation?.title ?? "New discovery"}</p>{website && <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><Globe2 className="size-3" />{hostname(website)}</div>}</div></div><div className="flex items-center gap-2">{results && <><Badge variant="secondary">{shortlist.length} shortlisted</Badge><Button variant="outline" size="sm" onClick={() => exportCsv("all")}><Download className="size-3.5" /> CSV</Button></>}</div></header>
      <div className="flex-1 overflow-y-auto"><div className="mx-auto flex min-h-full w-full max-w-4xl flex-col px-4 pb-36 pt-8 sm:px-8">
        {messages.length === 0 && <EmptyState website={website} setWebsite={setWebsite} prompt={draftPrompt} setPrompt={setDraftPrompt} onStart={conversationId ? () => sendMessage({ text: draftPrompt }, { body: { conversationId, website } }) : beginConversation} />}
        {messages.map((message) => <MessageView key={message.id} message={message} progress={progress} onSelectLead={setSelectedLead} results={results} shortlist={shortlist} onToggle={toggleShortlist} />)}
        {results && <ResultsTable results={results} leads={filteredLeads} query={query} setQuery={setQuery} shortlist={shortlist} onToggle={toggleShortlist} onSelect={setSelectedLead} onExport={exportCsv} />}
      </div></div>
      {selectedLead && <LeadDetail lead={selectedLead} shortlisted={shortlist.includes(selectedLead.id)} onToggle={() => toggleShortlist(selectedLead.id)} onClose={() => setSelectedLead(undefined)} />}
      {conversationId && <form onSubmit={submit} className={`fixed bottom-0 left-0 right-0 border-t bg-background/90 p-4 backdrop-blur lg:left-auto ${collapsed ? "lg:w-[calc(100%-68px)]" : "lg:w-[calc(100%-240px)]"}`}><div className="mx-auto flex max-w-3xl items-end gap-2 rounded-2xl border bg-card p-2 shadow-sm"><Textarea value={draftPrompt} onChange={(event) => setDraftPrompt(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); event.currentTarget.form?.requestSubmit(); } }} placeholder="Ask a follow-up about your retailers…" className="max-h-32 min-h-10 resize-none border-0 bg-transparent shadow-none focus-visible:ring-0" disabled={busy} /><Button type={busy ? "button" : "submit"} size="icon" className="shrink-0 rounded-xl" onClick={busy ? stop : undefined} aria-label={busy ? "Stop" : "Send"}>{busy ? <Square className="size-4 fill-current" /> : <ArrowUp className="size-4" />}</Button></div></form>}
    </main>
  </div>;
}

function SidebarBrand({ collapsed = false }: { collapsed?: boolean }) { return <a href={marketingUrl} className="flex items-center gap-2 px-2 py-2 text-sm font-semibold"><span className="flex size-8 items-center justify-center rounded-xl bg-foreground text-background"><Store className="size-4" /></span>{!collapsed && "Stockist"}</a>; }
function ConversationList({ history, activeId, onSelect, onDelete }: { history: Conversation[]; activeId?: string; onSelect: (id: string) => void; onDelete: (id: string) => void }) { return <div className="mt-7 flex-1 space-y-5 overflow-y-auto">{["Today", "Previous 7 days", "Older"].map((group) => { const items = history.filter((item) => group === "Today" ? Date.now() - Date.parse(item.updatedAt) < 86400000 : group === "Previous 7 days" ? Date.now() - Date.parse(item.updatedAt) < 604800000 : Date.now() - Date.parse(item.updatedAt) >= 604800000); return items.length ? <section key={group}><p className="mb-2 px-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{group}</p>{items.map((item) => <div key={item.id} className={`group flex items-center gap-1 rounded-lg px-2 py-2 text-sm ${item.id === activeId ? "bg-secondary" : "hover:bg-secondary/70"}`}><button className="min-w-0 flex-1 truncate text-start" onClick={() => onSelect(item.id)}>{item.title}</button><button className="hidden rounded p-1 text-muted-foreground hover:text-destructive group-hover:block" onClick={() => onDelete(item.id)} aria-label={`Delete ${item.title}`}><Trash2 className="size-3.5" /></button></div>)}</section> : null; })}</div>; }
function EmptyState({ website, setWebsite, prompt, setPrompt, onStart }: { website: string; setWebsite: (value: string) => void; prompt: string; setPrompt: (value: string) => void; onStart: () => void }) { return <div className="flex flex-1 flex-col items-center justify-center py-16 text-center"><div className="mb-5 flex size-12 items-center justify-center rounded-2xl bg-secondary"><Sparkles className="size-5" /></div><h1 className="text-3xl font-semibold tracking-tight">What should we find?</h1><p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">Attach a product website and describe the retailers you want to reach.</p><div className="mt-8 w-full max-w-xl space-y-3 text-start"><div className="flex items-center gap-2 rounded-xl border bg-card px-3 py-2"><Globe2 className="size-4 text-muted-foreground" /><Input value={website} onChange={(event) => setWebsite(event.target.value)} placeholder="Product website, e.g. yourbrand.com" className="border-0 shadow-none focus-visible:ring-0" /><Badge variant="secondary">Required</Badge></div><Textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} placeholder="Example: Independent skincare shops in London that carry premium natural brands." className="min-h-28 resize-none bg-card" /><Button className="w-full" onClick={onStart} disabled={!website.trim() || !prompt.trim()}>Start discovery <ArrowUp /></Button><div className="flex flex-wrap justify-center gap-2 pt-2">{suggestions.map((suggestion) => <button key={suggestion} onClick={() => setPrompt(suggestion)} className="rounded-full border px-3 py-1.5 text-xs text-muted-foreground transition hover:border-foreground hover:text-foreground">{suggestion}</button>)}</div></div></div>; }
function MessageView({ message, progress, onSelectLead, results, shortlist, onToggle }: { message: StockistMessage; progress?: DiscoveryProgress; onSelectLead: (lead: StoreLead) => void; results?: RetailerResults; shortlist: string[]; onToggle: (id: string) => void }) { const text = message.parts.filter((part) => part.type === "text").map((part) => part.text).join(""); if (!text && message.role !== "assistant") return null; return <article className={`mb-6 flex ${message.role === "user" ? "justify-end" : "justify-start"}`}><div className={message.role === "user" ? "max-w-[80%] rounded-2xl bg-secondary px-4 py-3 text-sm" : "max-w-3xl text-sm leading-7"}>{text && <p className="whitespace-pre-wrap">{text}</p>}{message.role === "assistant" && progress && <ProgressBlock progress={progress} />}{message.role === "assistant" && results && <div className="mt-3 flex flex-wrap gap-2">{results.leads.slice(0, 3).map((lead) => <button key={lead.id} className="rounded-lg border px-2.5 py-1.5 text-xs hover:bg-secondary" onClick={() => onSelectLead(lead)}>{lead.name} · {lead.score}</button>)}</div>}</div></article>; }
function ProgressBlock({ progress }: { progress: DiscoveryProgress }) { return <details className="mt-4 rounded-xl border bg-card px-3 py-2 text-xs" open={progress.stage !== "complete"}><summary className="cursor-pointer list-none font-medium"><span className="me-2 inline-block size-1.5 rounded-full bg-primary" />{progress.label}<ChevronDown className="ms-2 inline size-3.5" /></summary><p className="mt-2 text-muted-foreground">{progress.candidatesFound ? `${progress.candidatesFound} candidates · ` : ""}{progress.emailsFound ?? 0} public emails found</p></details>; }
function ResultsTable({ results, leads, query, setQuery, shortlist, onToggle, onSelect, onExport }: { results: RetailerResults; leads: StoreLead[]; query: string; setQuery: (value: string) => void; shortlist: string[]; onToggle: (id: string) => void; onSelect: (lead: StoreLead) => void; onExport: (scope: "all" | "shortlist") => void }) { return <section className="mt-8 overflow-hidden rounded-xl border bg-card"><div className="flex flex-wrap items-center justify-between gap-3 border-b p-4"><div><p className="text-xs text-muted-foreground">{results.demo ? "Preview data" : "Google Maps data"}</p><h2 className="text-lg font-semibold">{leads.length} retailer{leads.length === 1 ? "" : "s"}</h2></div><div className="flex gap-2"><div className="relative"><Search className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" /><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Filter stores" className="h-8 w-40 pl-8 text-xs" /></div><Button variant="outline" size="sm" onClick={() => onExport("shortlist")} disabled={!shortlist.length}><Download className="size-3.5" /> Shortlist</Button></div></div><div className="max-h-[460px] overflow-auto"><table className="w-full text-left text-sm"><thead className="sticky top-0 z-10 bg-card text-xs text-muted-foreground"><tr><th className="w-10 px-4 py-3" /><th className="px-3 py-3">Store</th><th className="px-3 py-3">Location</th><th className="px-3 py-3">Fit</th><th className="px-3 py-3">Contact</th><th className="px-4 py-3">Rating</th></tr></thead><tbody>{leads.map((lead) => <tr key={lead.id} className="cursor-pointer border-t hover:bg-secondary/50" onClick={() => onSelect(lead)}><td className="px-4 py-3" onClick={(event) => event.stopPropagation()}><input type="checkbox" checked={shortlist.includes(lead.id)} onChange={() => onToggle(lead.id)} aria-label={`Shortlist ${lead.name}`} /></td><td className="max-w-[180px] truncate px-3 py-3 font-medium">{lead.name}</td><td className="max-w-[220px] truncate px-3 py-3 text-muted-foreground">{lead.address}</td><td className="px-3 py-3"><Badge variant={lead.score >= 75 ? "default" : "secondary"}>{lead.score}</Badge></td><td className="px-3 py-3 text-xs text-muted-foreground">{lead.email ? "Email" : lead.phone ? "Phone" : "Unavailable"}</td><td className="px-4 py-3 text-xs">{lead.rating ? `★ ${lead.rating.toFixed(1)}` : "—"}</td></tr>)}</tbody></table></div>{!results.demo && <p className="border-t px-4 py-2 text-[11px] text-muted-foreground">Store details from Google Maps · Public contacts are labeled publicly found.</p>}</section>; }
function LeadDetail({ lead, shortlisted, onToggle, onClose }: { lead: StoreLead; shortlisted: boolean; onToggle: () => void; onClose: () => void }) { return <aside className="fixed inset-y-0 right-0 z-50 w-full max-w-md border-l bg-background p-6 shadow-xl"><div className="flex items-start justify-between"><div><p className="text-xs text-muted-foreground">Retailer detail</p><h2 className="mt-1 text-xl font-semibold">{lead.name}</h2></div><Button variant="ghost" size="icon" onClick={onClose} aria-label="Close detail"><X /></Button></div><Badge className="mt-4">Fit score {lead.score}</Badge><p className="mt-5 text-sm leading-6 text-muted-foreground">{lead.reason}</p><div className="mt-6 space-y-3 text-sm"><p>{lead.address}</p>{lead.email && <p><a className="underline" href={`mailto:${lead.email}`}>{lead.email}</a> <span className="text-xs text-muted-foreground">publicly found</span></p>}{lead.phone && <p><a className="underline" href={`tel:${lead.phone}`}>{lead.phone}</a></p>}{lead.website && <p><a className="underline" href={lead.website} target="_blank" rel="noreferrer">Website</a></p>}{lead.mapsUrl && <p><a className="underline" href={lead.mapsUrl} target="_blank" rel="noreferrer">Open in Google Maps</a></p>}</div><Button className="mt-8 w-full" variant={shortlisted ? "secondary" : "default"} onClick={onToggle}>{shortlisted ? "Remove from shortlist" : "Add to shortlist"}</Button></aside>; }
