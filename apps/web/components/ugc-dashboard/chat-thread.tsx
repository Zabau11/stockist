"use client";

import { useEffect, useRef } from "react";
import { IconSparkle } from "./icons";

export type DashboardMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
};

interface ChatThreadProps {
  messages: DashboardMessage[];
  busy: boolean;
  onPickPreset: (goal: string) => void;
}

const presets = [
  "Find me 50 UGC beauty creators in the UK with emails",
  "200 skincare content creators in the US with a portfolio link",
  "Find 100 fashion UGC creators similar to my best leads",
];

export function ChatThread({ messages, busy, onPickPreset }: ChatThreadProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, busy]);

  return (
    <div
      ref={scrollRef}
      className="min-h-0 flex-1 overflow-y-auto [mask-image:linear-gradient(to_bottom,transparent_0,black_32px,black_100%)] [-webkit-mask-image:linear-gradient(to_bottom,transparent_0,black_32px,black_100%)]"
    >
      {messages.length === 0 ? (
        <EmptyHero onPick={onPickPreset} />
      ) : (
        <div className="mx-auto w-full max-w-3xl space-y-8 px-4 py-8">
          {messages.map((message, index) =>
            message.role === "user" ? (
              <div key={message.id} className="flex justify-end">
                <div className="max-w-[85%] rounded-box bg-base-200 px-4 py-2.5 text-sm leading-relaxed">
                  {message.text}
                </div>
              </div>
            ) : (
              <div key={message.id} className="flex gap-3">
                <div className="grid size-7 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
                  <IconSparkle className="size-4" />
                </div>
                <div className="min-w-0 flex-1 space-y-4 pt-0.5">
                  <p className="text-sm leading-relaxed text-base-content/70">{message.text}</p>
                  {busy && index === messages.length - 1 && (
                    <div className="flex items-center gap-2 text-xs text-base-content/50">
                      <span className="loading loading-dots loading-xs" />
                      Working…
                    </div>
                  )}
                </div>
              </div>
            ),
          )}
        </div>
      )}
    </div>
  );
}

function EmptyHero({ onPick }: { onPick: (goal: string) => void }) {
  return (
    <div className="mx-auto flex h-full w-full max-w-3xl flex-col items-center justify-center px-4 text-center">
      <IconSparkle className="mb-5 size-11 text-primary" />
      <h2 className="text-2xl font-semibold tracking-tight">What creators are we finding today?</h2>
      <p className="mt-2 text-sm text-base-content/55">
        Describe your ideal UGC creator and the agent will discover, enrich, score and qualify them across Instagram and TikTok.
      </p>
      <div className="mt-7 grid w-full gap-2 sm:grid-cols-3">
        {presets.map((preset) => (
          <button
            key={preset}
            onClick={() => onPick(preset)}
            className="rounded-box border border-base-200 bg-base-100 p-3 text-left text-xs leading-relaxed text-base-content/70 transition-colors hover:border-primary/40 hover:bg-base-200/50"
          >
            {preset}
          </button>
        ))}
      </div>
    </div>
  );
}
