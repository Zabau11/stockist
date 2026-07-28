"use client";

import { IconSparkle, IconTerminal } from "./icons";

export type WorkspaceMode = "agent" | "llm";

interface ModeSwitchProps {
  mode: WorkspaceMode;
  onChange: (mode: WorkspaceMode) => void;
}

const options = [
  {
    id: "agent" as const,
    label: "Use our Agent",
    shortLabel: "Agent",
    icon: IconSparkle,
  },
  {
    id: "llm" as const,
    label: "Use in your LLM",
    shortLabel: "LLM",
    icon: IconTerminal,
  },
];

export function ModeSwitch({ mode, onChange }: ModeSwitchProps) {
  return (
    <div
      className="inline-flex items-center rounded-full border border-base-300 bg-base-200/70 p-1 shadow-sm"
      role="tablist"
      aria-label="UGC Agent mode"
    >
      {options.map((option) => {
        const active = option.id === mode;
        const Icon = option.icon;
        return (
          <button
            key={option.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(option.id)}
            className={`flex h-8 min-w-[74px] items-center justify-center gap-1.5 rounded-full px-3 text-xs font-semibold transition-colors md:min-w-[132px] ${
              active
                ? "bg-base-100 text-base-content shadow-sm ring-1 ring-base-300/70"
                : "text-base-content/55 hover:bg-base-100/60 hover:text-base-content"
            }`}
          >
            <Icon className="size-3.5" />
            <span className="hidden md:inline">{option.label}</span>
            <span className="md:hidden">{option.shortLabel}</span>
          </button>
        );
      })}
    </div>
  );
}
