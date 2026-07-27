import Link from "next/link";
import { ArrowRight, CalendarDays, Sparkles, Store } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      <header className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 sm:px-8">
        <Link href="/" className="flex items-center gap-2 text-sm font-semibold">
          <span className="flex size-7 items-center justify-center rounded-lg bg-foreground text-background">
            <Store className="size-3.5" aria-hidden="true" />
          </span>
          Stockist
        </Link>
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
              Describe your product and what you want to achieve. Stockist
              understands the request, builds the brief, and finds the right retailers.
            </p>
          </div>

          <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
            <Button asChild size="default" className="h-10 gap-2 px-5">
              <Link href="/dashboard">
                Get started
                <ArrowRight aria-hidden="true" />
              </Link>
            </Button>
            <Button asChild size="default" variant="outline" className="h-10 gap-2 px-5">
              <a href="mailto:hello@stockist.app?subject=Book%20a%20Stockist%20demo">
                Book a demo
                <CalendarDays aria-hidden="true" />
              </a>
            </Button>
          </div>
        </section>
      </main>
    </div>
  );
}
