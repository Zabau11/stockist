import { ArrowRight, Globe2, Sparkles, Store } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const dashboardUrl = (
  process.env.NEXT_PUBLIC_DASHBOARD_URL ?? "http://localhost:3001"
).replace(/\/$/, "");

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      <header className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 sm:px-8">
        <a href="/" className="flex items-center gap-2 text-sm font-semibold">
          <span className="flex size-7 items-center justify-center rounded-lg bg-foreground text-background">
            <Store className="size-3.5" aria-hidden="true" />
          </span>
          Stockist
        </a>
        <Button asChild variant="outline">
          <a href={dashboardUrl}>Open app</a>
        </Button>
      </header>

      <main className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-6xl items-center justify-center px-5 py-16 sm:px-8">
        <section className="w-full">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mx-auto mb-5 flex w-fit items-center gap-1.5 rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
              <Sparkles className="size-3" aria-hidden="true" />
              Retail partner discovery
            </div>
            <h1 className="text-balance text-4xl font-semibold tracking-[-0.035em] sm:text-6xl">
              Find the stores your product belongs in.
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-balance text-base leading-7 text-muted-foreground sm:text-lg">
              Share your product website and distribution goal. Stockist finds
              high-fit retailers and the best public way to contact them.
            </p>
          </div>

          <Card className="mx-auto mt-9 max-w-2xl shadow-sm">
            <CardContent>
              <form
                action={dashboardUrl}
                method="get"
                className="space-y-4"
              >
                <div className="space-y-2">
                  <label htmlFor="website" className="text-sm font-medium">
                    Product website
                  </label>
                  <div className="relative">
                    <Globe2
                      className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                      aria-hidden="true"
                    />
                    <Input
                      id="website"
                      name="website"
                      type="text"
                      inputMode="url"
                      autoComplete="url"
                      placeholder="yourbrand.com"
                      className="h-11 ps-9"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label htmlFor="prompt" className="text-sm font-medium">
                    What kind of distribution are you looking for?
                  </label>
                  <Textarea
                    id="prompt"
                    name="prompt"
                    placeholder="Example: Independent skincare shops in London that carry premium natural brands."
                    className="min-h-24 resize-none"
                  />
                </div>

                <Button type="submit" size="lg" className="w-full">
                  Find retail partners
                  <ArrowRight aria-hidden="true" />
                </Button>
              </form>
            </CardContent>
          </Card>
        </section>
      </main>
    </div>
  );
}
