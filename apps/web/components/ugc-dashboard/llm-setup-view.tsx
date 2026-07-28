"use client";

import { useState } from "react";
import { IconFile, IconSparkle } from "./icons";

const clients = [
  "Claude Code",
  "Codex",
  "ChatGPT",
  "Claude",
  "Cursor",
  "Windsurf",
  "Cline",
  "Roo Code",
  "Continue",
  "Hermes",
  "OpenClaw",
  "Other MCP client",
];

export function LlmSetupView() {
  const [selected, setSelected] = useState("Claude Code");

  return (
    <div className="min-h-0 flex-1 overflow-y-auto bg-base-100">
      <main className="mx-auto flex w-full max-w-4xl flex-col gap-5 px-4 py-6 sm:px-6 sm:py-8">
        <div className="flex flex-col gap-2">
          <h2 className="text-xl font-semibold tracking-tight">Use UGC Agent in your LLM</h2>
          <p className="max-w-2xl text-sm leading-relaxed text-base-content/55">
            Connect the same creator-sourcing tools to your preferred MCP-ready interface.
          </p>
        </div>

        <div className="flex flex-wrap gap-2" aria-label="LLM interface">
          {clients.map((client) => (
            <button
              key={client}
              type="button"
              className={`btn btn-sm gap-2 ${selected === client ? "btn-primary" : "btn-outline"}`}
              aria-pressed={selected === client}
              onClick={() => setSelected(client)}
            >
              <span className="grid size-4 place-items-center rounded bg-base-300 text-[9px] font-bold">
                {client.slice(0, 1)}
              </span>
              {client}
            </button>
          ))}
        </div>

        <section className="rounded-box border border-base-200 bg-base-100">
          <div className="flex flex-col gap-3 border-b border-base-200 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="grid size-7 place-items-center rounded-md border border-base-300 bg-base-200/60">
                  <IconSparkle className="size-4 text-primary" />
                </span>
                <h3 className="text-sm font-semibold">{selected}</h3>
              </div>
              <p className="mt-2 text-xs text-base-content/50">Premium access is required to connect the UGC Agent MCP server.</p>
            </div>
            <span className="badge badge-primary badge-sm">Premium</span>
          </div>
          <div className="space-y-4 p-4">
            <ol className="space-y-2 text-sm text-base-content/70">
              <li>1. Open your MCP client settings.</li>
              <li>2. Add a remote Streamable HTTP server named ugcagent.</li>
              <li>3. Use your Premium MCP URL.</li>
            </ol>
            <div className="rounded-field border border-base-300 bg-base-200/60 p-3 font-mono text-xs text-base-content/60">
              https://mcp.ugcagent.app/mcp
            </div>
            <button className="btn btn-primary btn-sm gap-2">
              <IconFile className="size-4" />
              Copy setup
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}
