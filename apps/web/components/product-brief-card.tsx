"use client";

import { useEffect, useState, type ReactNode } from "react";
import {
  ArrowUp,
  Check,
  ChevronDown,
  CircleAlert,
  ImageIcon,
  MapPin,
  Palette,
  Pencil,
  Plus,
  RotateCcw,
  Sparkles,
  Store,
  Target,
  Trash2,
  Type,
  X,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { BrandColor, BrandIdentity, ProductBrief, ProductBriefRevision } from "@/lib/types";

type BriefProps = {
  revision: ProductBriefRevision;
  editing: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onConfirm: (brief: ProductBrief) => void;
};

const listFields = ["categories", "targetMarkets", "idealRetailerTypes", "differentiators", "requirements", "exclusions"] as const;
type ListField = (typeof listFields)[number];

const emptyIdentity: BrandIdentity = { source: "unavailable", colors: [] };

function normalizeBrief(brief: ProductBrief): ProductBrief {
  return {
    ...brief,
    brandIdentity: {
      ...emptyIdentity,
      ...brief.brandIdentity,
      colors: brief.brandIdentity?.colors ?? [],
    },
  };
}

function isInvalidAssetUrl(value?: string) {
  if (!value) return false;
  try {
    const protocol = new URL(value).protocol;
    return protocol !== "https:" && protocol !== "http:";
  } catch {
    return true;
  }
}

export function ProductBriefCard({ revision, editing, onEdit, onCancel, onConfirm }: BriefProps) {
  const [draft, setDraft] = useState(() => normalizeBrief(revision.brief));
  const [errors, setErrors] = useState<string[]>([]);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  useEffect(() => {
    setDraft(normalizeBrief(revision.brief));
    setErrors([]);
  }, [revision.brief]);

  function setField<K extends keyof ProductBrief>(key: K, value: ProductBrief[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function updateList(key: ListField, value: string[]) {
    setField(key, value as ProductBrief[ListField]);
  }

  function reset() {
    setDraft(normalizeBrief(revision.brief));
    setErrors([]);
  }

  function confirm() {
    const nextErrors = [
      !draft.brandName.trim() && "Add a brand name.",
      !draft.summary.trim() && "Add a short product summary.",
      !draft.categories.length && "Add at least one category.",
      !draft.targetMarkets.length && "Add at least one target market.",
      !draft.idealRetailerTypes.length && "Add at least one retailer type.",
      !draft.distributionGoal.trim() && "Add a distribution goal.",
      draft.brandIdentity.colors.some((color) => !/^#[\dA-F]{6}$/i.test(color.hex)) && "Use six-digit hex values for brand colors.",
      [draft.brandIdentity.logoUrl, draft.brandIdentity.iconUrl, draft.brandIdentity.backdropUrl].some(isInvalidAssetUrl) && "Use valid HTTP or HTTPS links for brand images.",
    ].filter(Boolean) as string[];
    setErrors(nextErrors);
    if (!nextErrors.length) onConfirm(draft);
  }

  if (!editing) {
    return (
      <Card className="my-8 overflow-hidden border-0 bg-card shadow-sm ring-1 ring-border/70">
        <div className="h-1 bg-primary" />
        <CardContent className="p-5 sm:p-6">
          <div className="flex items-start justify-between gap-5">
            <div className="flex min-w-0 items-start gap-4">
              <BrandMark identity={draft.brandIdentity} brandName={draft.brandName} />
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className="gap-1 bg-primary/10 text-primary hover:bg-primary/10">
                    <Check className="size-3" /> Confirmed brief
                  </Badge>
                  <span className="text-xs text-muted-foreground">Version {revision.version}</span>
                </div>
                <h2 className="mt-3 truncate text-xl font-semibold tracking-tight">{draft.brandName}</h2>
                {draft.brandIdentity.slogan && <p className="mt-0.5 text-sm font-medium">{draft.brandIdentity.slogan}</p>}
                <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">{draft.summary}</p>
              </div>
            </div>
            <Button variant="outline" size="sm" className="shrink-0 gap-1.5" onClick={onEdit}>
              <Pencil className="size-3.5" /> Edit
            </Button>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <BriefStat icon={<Target className="size-3.5" />} label="Goal" value={draft.distributionGoal || "Not specified"} />
            <BriefStat icon={<MapPin className="size-3.5" />} label="Markets" value={draft.targetMarkets.join(", ") || "Not specified"} />
            <BriefStat icon={<Store className="size-3.5" />} label="Retailers" value={draft.idealRetailerTypes.join(", ") || "Not specified"} />
          </div>
          <BrandIdentitySummary identity={draft.brandIdentity} />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="my-8 overflow-hidden border-0 bg-card shadow-sm ring-1 ring-primary/25">
      <div className="h-1 bg-primary" />
      <CardHeader className="p-5 pb-3 sm:p-6 sm:pb-4">
        <div className="flex items-start justify-between gap-5">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="gap-1.5 bg-primary text-primary-foreground">
                <Sparkles className="size-3" /> Review before search
              </Badge>
              <span className="text-xs text-muted-foreground">Draft v{revision.version}</span>
            </div>
            <h2 className="mt-3 text-xl font-semibold tracking-tight">Is this product brief right?</h2>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              We’ll use this exact version to find retailers. Nothing is searched until you confirm.
            </p>
          </div>
          {revision.source === "fallback" && (
            <Badge variant="outline" className="hidden shrink-0 gap-1 sm:flex">
              <CircleAlert className="size-3" /> Needs review
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-5 p-5 pt-0 sm:p-6 sm:pt-1">
        {errors.length > 0 && (
          <Alert variant="destructive">
            <CircleAlert className="size-4" />
            <AlertTitle>A few details still need your input</AlertTitle>
            <AlertDescription>{errors.join(" ")}</AlertDescription>
          </Alert>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Brand name" value={draft.brandName} onChange={(value) => setField("brandName", value)} />
          <Field label="Price positioning" value={draft.pricePositioning} onChange={(value) => setField("pricePositioning", value)} />
          <div className="sm:col-span-2">
            <Field label="Product summary" value={draft.summary} multiline onChange={(value) => setField("summary", value)} />
          </div>
          <div className="sm:col-span-2">
            <Field
              label="Distribution goal"
              hint="Required"
              value={draft.distributionGoal}
              multiline
              placeholder="Where should this product be sold, and what kind of partners are you looking for?"
              onChange={(value) => setField("distributionGoal", value)}
            />
          </div>
          <div className="sm:col-span-2">
            <Field label="Target customer" value={draft.targetCustomer} onChange={(value) => setField("targetCustomer", value)} />
          </div>
        </div>

        <Separator />
        <BrandIdentityEditor
          brandName={draft.brandName}
          identity={draft.brandIdentity}
          onChange={(identity) => setField("brandIdentity", identity)}
        />

        <Separator />
        <div className="grid gap-4 sm:grid-cols-2">
          <TagEditor label="Categories" required values={draft.categories} onChange={(value) => updateList("categories", value)} />
          <TagEditor label="Target markets" required values={draft.targetMarkets} onChange={(value) => updateList("targetMarkets", value)} />
          <TagEditor label="Ideal retailer types" required values={draft.idealRetailerTypes} onChange={(value) => updateList("idealRetailerTypes", value)} />
          <div className="space-y-1.5">
            <Label>Retailer preference</Label>
            <Select value={draft.retailerPreference} onValueChange={(value) => setField("retailerPreference", value as ProductBrief["retailerPreference"])}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="either">Independent or chain</SelectItem>
                <SelectItem value="independent">Independent only</SelectItem>
                <SelectItem value="chain">Chains preferred</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen} className="rounded-xl border bg-background/50">
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="h-auto w-full justify-between rounded-xl px-4 py-3 text-sm font-medium hover:bg-transparent">
              <span>Advanced retail signals <span className="ms-1 text-xs font-normal text-muted-foreground">optional</span></span>
              <ChevronDown className={`size-4 text-muted-foreground transition-transform ${advancedOpen ? "rotate-180" : ""}`} />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <Separator />
            <div className="grid gap-4 p-4 sm:grid-cols-3">
              <TagEditor label="Differentiators" values={draft.differentiators} onChange={(value) => updateList("differentiators", value)} />
              <TagEditor label="Requirements" values={draft.requirements} onChange={(value) => updateList("requirements", value)} />
              <TagEditor label="Exclusions" values={draft.exclusions} onChange={(value) => updateList("exclusions", value)} />
            </div>
          </CollapsibleContent>
        </Collapsible>

        <div className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
          <Button variant="ghost" size="sm" className="w-fit gap-1.5 text-muted-foreground" onClick={reset}>
            <RotateCcw className="size-3.5" /> Reset edits
          </Button>
          <div className="flex gap-2 sm:justify-end">
            {revision.status === "confirmed" && <Button variant="outline" onClick={onCancel}>Cancel</Button>}
            <Button className="gap-2" onClick={confirm}>Confirm and find retailers <ArrowUp className="size-4" /></Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function BrandMark({ identity, brandName }: { identity: BrandIdentity; brandName: string }) {
  const source = identity.logoUrl ?? identity.iconUrl;
  const [failed, setFailed] = useState(false);

  useEffect(() => setFailed(false), [source]);

  return (
    <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border bg-white p-2 shadow-sm">
      {source && !failed ? (
        // Context.dev returns CDN-hosted logo URLs with dynamic domains.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={source}
          alt={`${brandName} logo`}
          className="max-h-full max-w-full object-contain"
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
        />
      ) : (
        <span className="text-xl font-semibold text-neutral-700">{brandName.trim().charAt(0).toUpperCase() || "B"}</span>
      )}
    </div>
  );
}

function BrandIdentitySummary({ identity }: { identity: BrandIdentity }) {
  const hasIdentity = identity.colors.length || identity.headingFont || identity.bodyFont;
  if (!hasIdentity) {
    return (
      <div className="mt-4 flex items-center gap-2 rounded-lg border border-dashed px-3 py-2 text-xs text-muted-foreground">
        <CircleAlert className="size-3.5" /> Visual identity was not available from Context.dev.
      </div>
    );
  }

  return (
    <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-3 rounded-lg border bg-background/60 px-3 py-3">
      {identity.colors.length > 0 && (
        <div className="flex items-center gap-2">
          <Palette className="size-3.5 text-muted-foreground" />
          <div className="flex -space-x-1">
            {identity.colors.slice(0, 6).map((color) => (
              <span
                key={`${color.hex}-${color.role}`}
                className="size-6 rounded-full border-2 border-card shadow-sm"
                style={{ backgroundColor: color.hex }}
                title={`${color.name ?? color.role ?? "Brand color"} · ${color.hex}`}
              />
            ))}
          </div>
        </div>
      )}
      {(identity.headingFont || identity.bodyFont) && (
        <div className="flex min-w-0 items-center gap-2 text-xs">
          <Type className="size-3.5 shrink-0 text-muted-foreground" />
          <span className="truncate">
            {[identity.headingFont, identity.bodyFont].filter(Boolean).filter((font, index, fonts) => fonts.indexOf(font) === index).join(" · ")}
          </span>
        </div>
      )}
      <Badge variant="outline" className="ms-auto text-[10px] font-normal">
        Context.dev{identity.mode ? ` · ${identity.mode}` : ""}
      </Badge>
    </div>
  );
}

function BrandIdentityEditor({
  brandName,
  identity,
  onChange,
}: {
  brandName: string;
  identity: BrandIdentity;
  onChange: (identity: BrandIdentity) => void;
}) {
  const setValue = <K extends keyof BrandIdentity>(key: K, value: BrandIdentity[K]) => onChange({ ...identity, [key]: value });
  const setOptionalText = (key: "logoUrl" | "iconUrl" | "backdropUrl" | "slogan" | "headingFont" | "bodyFont", value: string) => {
    const next = { ...identity, [key]: value.trim() ? value : undefined };
    onChange(next);
  };
  const updateColor = (index: number, patch: Partial<BrandColor>) => {
    setValue("colors", identity.colors.map((color, colorIndex) => colorIndex === index ? { ...color, ...patch } : color));
  };

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 text-sm font-semibold"><Palette className="size-4" /> Visual identity</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">Logo, palette, and typography extracted from the website by Context.dev.</p>
        </div>
        <Badge variant={identity.source === "context" ? "secondary" : "outline"}>
          {identity.source === "context" ? "Extracted" : "Not found"}
        </Badge>
      </div>

      <div className="grid gap-4 rounded-xl border bg-background/50 p-4 md:grid-cols-[auto_1fr]">
        <div className="space-y-2">
          <BrandMark identity={identity} brandName={brandName} />
          <p className="text-center text-[10px] text-muted-foreground">Logo preview</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Logo URL" value={identity.logoUrl ?? ""} placeholder="https://…" onChange={(value) => setOptionalText("logoUrl", value)} />
          <Field label="Icon URL" value={identity.iconUrl ?? ""} placeholder="https://…" onChange={(value) => setOptionalText("iconUrl", value)} />
          <Field label="Heading font" value={identity.headingFont ?? ""} placeholder="Not detected" onChange={(value) => setOptionalText("headingFont", value)} />
          <Field label="Body font" value={identity.bodyFont ?? ""} placeholder="Not detected" onChange={(value) => setOptionalText("bodyFont", value)} />
          <div className="sm:col-span-2">
            <Field label="Slogan" value={identity.slogan ?? ""} placeholder="Not detected" onChange={(value) => setOptionalText("slogan", value)} />
          </div>
          <div className="sm:col-span-2">
            <Field label="Backdrop URL" value={identity.backdropUrl ?? ""} placeholder="https://…" onChange={(value) => setOptionalText("backdropUrl", value)} />
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Brand colors</Label>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 gap-1 px-2 text-xs"
            disabled={identity.colors.length >= 10}
            onClick={() => setValue("colors", [...identity.colors, { hex: "#000000", role: "other" }])}
          >
            <Plus className="size-3" /> Add color
          </Button>
        </div>
        {identity.colors.length ? (
          <div className="grid gap-2 sm:grid-cols-2">
            {identity.colors.map((color, index) => (
              <div key={`${index}-${color.role}`} className="flex items-center gap-2 rounded-lg border bg-background p-2">
                <label className="relative size-8 shrink-0 overflow-hidden rounded-md border shadow-sm" title="Choose color">
                  <span className="absolute inset-0" style={{ backgroundColor: /^#[\dA-F]{6}$/i.test(color.hex) ? color.hex : "#FFFFFF" }} />
                  <input
                    type="color"
                    value={/^#[\dA-F]{6}$/i.test(color.hex) ? color.hex : "#000000"}
                    onChange={(event) => updateColor(index, { hex: event.target.value.toUpperCase() })}
                    className="absolute inset-0 cursor-pointer opacity-0"
                  />
                </label>
                <Input
                  value={color.hex}
                  aria-label={`Brand color ${index + 1}`}
                  onChange={(event) => updateColor(index, { hex: event.target.value.toUpperCase() })}
                  className="h-8 min-w-0 font-mono text-xs uppercase"
                />
                <Badge variant="secondary" className="hidden max-w-24 truncate text-[10px] font-normal sm:inline-flex">
                  {color.role ?? "other"}
                </Badge>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-8 shrink-0 text-muted-foreground"
                  aria-label={`Remove ${color.hex}`}
                  onClick={() => setValue("colors", identity.colors.filter((_, colorIndex) => colorIndex !== index))}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex items-center gap-2 rounded-lg border border-dashed px-3 py-3 text-xs text-muted-foreground">
            <ImageIcon className="size-3.5" /> No palette was detected. You can add colors manually.
          </div>
        )}
      </div>
    </section>
  );
}

function BriefStat({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-lg bg-secondary/60 p-3">
      <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">{icon}{label}</div>
      <p className="mt-1 truncate text-sm font-medium">{value}</p>
    </div>
  );
}

function Field({
  label,
  hint,
  value,
  placeholder,
  multiline,
  onChange,
}: {
  label: string;
  hint?: string;
  value: string;
  placeholder?: string;
  multiline?: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}{hint && <span className="ms-2 text-[11px] font-normal uppercase tracking-wide text-muted-foreground">{hint}</span>}</Label>
      {multiline ? (
        <Textarea value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} className="min-h-20 resize-y" />
      ) : (
        <Input value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} />
      )}
    </div>
  );
}

function TagEditor({
  label,
  required,
  values,
  onChange,
}: {
  label: string;
  required?: boolean;
  values: string[];
  onChange: (values: string[]) => void;
}) {
  const [input, setInput] = useState("");

  function add() {
    const value = input.trim();
    if (value && !values.includes(value)) onChange([...values, value]);
    setInput("");
  }

  return (
    <div className="space-y-1.5 text-sm">
      <span className="flex items-center gap-2 font-medium">
        {label}
        {required && <span className="text-[11px] font-normal uppercase tracking-wide text-muted-foreground">Required</span>}
      </span>
      <div className="min-h-10 rounded-md border bg-background p-1.5">
        <div className="flex flex-wrap gap-1.5">
          {values.map((value) => (
            <Badge key={value} variant="secondary" className="gap-1 pe-1">
              {value}
              <button type="button" onClick={() => onChange(values.filter((item) => item !== value))} className="rounded-full p-0.5 hover:bg-background/70" aria-label={`Remove ${value}`}>
                <X className="size-3" />
              </button>
            </Badge>
          ))}
          <input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === ",") {
                event.preventDefault();
                add();
              }
            }}
            onBlur={add}
            placeholder={values.length ? "Add another…" : "Type and press Enter"}
            className="min-w-24 flex-1 bg-transparent px-1 py-1 text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>
      </div>
    </div>
  );
}
