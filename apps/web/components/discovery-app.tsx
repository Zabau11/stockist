"use client";

import { useState, type FormEvent } from "react";
import {
  ArrowRight,
  Check,
  CircleAlert,
  Globe2,
  LoaderCircle,
  Search,
  Sparkles,
  Store,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import type { DiscoveryResponse } from "@/lib/types";
import { LeadCard } from "./lead-card";

const apiUrl = (
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"
).replace(/\/$/, "");

const loadingSteps = [
  "Reading your product website",
  "Building a retail strategy",
  "Finding relevant stores",
  "Sourcing public contact details",
];

export function DiscoveryApp() {
  const [website, setWebsite] = useState("");
  const [prompt, setPrompt] = useState("");
  const [result, setResult] = useState<DiscoveryResponse | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setResult(null);
    setLoading(true);

    try {
      const response = await fetch(`${apiUrl}/api/discover`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ website, prompt }),
      });
      const payload = (await response.json()) as DiscoveryResponse & {
        error?: string;
      };

      if (!response.ok || payload.error) {
        throw new Error(
          payload.error ?? "Could not finish the search.",
        );
      }

      setResult(payload);
    } catch (requestError) {
      setError(
        requestError instanceof TypeError
          ? "The discovery service is not reachable. Make sure the backend is running."
          : requestError instanceof Error
            ? requestError.message
            : "Could not finish the search.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex h-16 max-w-6xl items-center px-5 sm:px-8">
        <a
          href="#top"
          className="flex items-center gap-2 text-sm font-semibold tracking-tight"
        >
          <span className="flex size-7 items-center justify-center rounded-lg bg-foreground text-background">
            <Store className="size-3.5" aria-hidden="true" />
          </span>
          Stockist
        </a>
      </header>

      <main id="top" className="mx-auto max-w-6xl px-5 pb-20 sm:px-8">
        <section
          className={
            result
              ? "py-12 sm:py-16"
              : "flex min-h-[calc(100vh-8rem)] items-center justify-center py-16"
          }
        >
          <div className="w-full">
            <div className="mx-auto max-w-3xl text-center">
              <Badge variant="secondary" className="mb-5 gap-1.5">
                <Sparkles className="size-3" aria-hidden="true" />
                Retail partner discovery
              </Badge>
              <h1 className="text-balance text-4xl font-semibold tracking-[-0.035em] sm:text-6xl">
                Find the stores your product belongs in.
              </h1>
              <p className="mx-auto mt-5 max-w-xl text-balance text-base leading-7 text-muted-foreground sm:text-lg">
                Share your website and distribution goal. We&apos;ll understand
                the product, find high-fit retailers, and surface the best way
                to contact them.
              </p>
            </div>

            <Card className="mx-auto mt-9 max-w-2xl shadow-sm">
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <label
                      htmlFor="website"
                      className="text-sm font-medium"
                    >
                      Product website
                    </label>
                    <div className="relative">
                      <Globe2
                        className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                        aria-hidden="true"
                      />
                      <Input
                        id="website"
                        type="text"
                        inputMode="url"
                        autoComplete="url"
                        placeholder="yourbrand.com"
                        value={website}
                        onChange={(event) => setWebsite(event.target.value)}
                        className="h-11 ps-9"
                        required
                        disabled={loading}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="prompt" className="text-sm font-medium">
                      What kind of distribution are you looking for?
                    </label>
                    <Textarea
                      id="prompt"
                      placeholder="Example: Independent skincare shops in London and Manchester that carry premium natural brands."
                      value={prompt}
                      onChange={(event) => setPrompt(event.target.value)}
                      className="min-h-24 resize-none"
                      disabled={loading}
                    />
                  </div>

                  <Button
                    type="submit"
                    size="lg"
                    className="h-11 w-full"
                    disabled={loading || !website.trim()}
                  >
                    {loading ? (
                      <>
                        <LoaderCircle
                          className="animate-spin"
                          aria-hidden="true"
                        />
                        Finding your stockists
                      </>
                    ) : (
                      <>
                        Find retail partners
                        <ArrowRight aria-hidden="true" />
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {error ? (
              <Alert variant="destructive" className="mx-auto mt-4 max-w-2xl">
                <CircleAlert aria-hidden="true" />
                <AlertTitle>We couldn&apos;t run that search</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}

            {loading ? <LoadingState /> : null}
          </div>
        </section>

        {result ? <Results result={result} /> : null}
      </main>
    </div>
  );
}

function LoadingState() {
  return (
    <Card
      className="mx-auto mt-6 max-w-2xl"
      aria-label="Retailer search in progress"
    >
      <CardContent className="space-y-4">
        {loadingSteps.map((step, index) => (
          <div key={step} className="flex items-center gap-3">
            {index === 0 ? (
              <LoaderCircle
                className="size-4 animate-spin text-foreground"
                aria-hidden="true"
              />
            ) : (
              <span className="size-4 rounded-full border" aria-hidden="true" />
            )}
            <span className="text-sm text-muted-foreground">{step}</span>
            <Skeleton className="ms-auto h-2 w-16" />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function Results({ result }: { result: DiscoveryResponse }) {
  return (
    <section className="space-y-8" aria-labelledby="results-title">
      {result.demo ? (
        <Alert>
          <CircleAlert aria-hidden="true" />
          <AlertTitle>Preview results</AlertTitle>
          <AlertDescription>
            These contacts are sample data. Add a Google Places key to the
            backend to discover live stores and enrich their public contacts.
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div>
                <CardDescription>Product analyzed</CardDescription>
                <CardTitle className="mt-1 text-2xl">
                  {result.product.name}
                </CardTitle>
              </div>
              <Badge variant="outline" className="gap-1">
                <Check className="size-3" aria-hidden="true" />
                Ready
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <p className="text-sm leading-6 text-muted-foreground">
              {result.product.summary}
            </p>
            <div className="flex flex-wrap gap-2">
              {result.product.categories.map((category) => (
                <Badge key={category} variant="secondary">
                  {category}
                </Badge>
              ))}
              {result.product.targetMarkets.map((market) => (
                <Badge key={market} variant="outline">
                  {market}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardDescription>Search strategy</CardDescription>
            <CardTitle>Where we looked</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm leading-6 text-muted-foreground">
              {result.strategy.summary}
            </p>
            <Separator />
            <ul className="space-y-2">
              {result.strategy.queries.map((query) => (
                <li key={query} className="flex gap-2 text-sm">
                  <Search
                    className="mt-0.5 size-3.5 shrink-0 text-muted-foreground"
                    aria-hidden="true"
                  />
                  {query}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      <div>
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-muted-foreground">
              Ranked by retail fit
            </p>
            <h2 id="results-title" className="mt-1 text-2xl font-semibold">
              {result.leads.length} stores to contact
            </h2>
          </div>
          <Badge variant="secondary">
            {result.demo ? "Sample" : "Live"} results
          </Badge>
        </div>
        {!result.demo ? (
          <p
            className="mb-3 text-xs font-normal text-[#5e5e5e]"
            translate="no"
          >
            Store details from Google Maps
          </p>
        ) : null}
        <div className="grid gap-4 md:grid-cols-2">
          {result.leads.map((lead, index) => (
            <LeadCard
              key={lead.id}
              lead={lead}
              rank={index + 1}
              demo={result.demo}
            />
          ))}
        </div>
      </div>

      <p className="text-center text-xs text-muted-foreground">
        Sources: {result.sources.join(" · ")}
      </p>
    </section>
  );
}
