"use client";

import { useRef } from "react";
import { IconClose, IconFile, IconSend, IconStop } from "./icons";

interface ComposerProps {
  draft: string;
  setDraft: (value: string) => void;
  busy: boolean;
  onSend: () => void;
  onStop: () => void;
  seedFileName: string | null;
  uploading: boolean;
  onUpload: (file: File) => void;
  onClearSeeds: () => void;
}

const accept = ".csv,.txt,.pdf,.mp4,text/csv,text/plain,application/pdf,video/mp4";

export function Composer({
  draft,
  setDraft,
  busy,
  onSend,
  onStop,
  seedFileName,
  uploading,
  onUpload,
  onClearSeeds,
}: ComposerProps) {
  const fileInput = useRef<HTMLInputElement>(null);
  const hasUpload = Boolean(seedFileName);
  const canSend = (draft.trim().length > 2 || hasUpload) && !busy && !uploading;

  return (
    <div className="mx-auto w-full max-w-3xl px-4 pb-4">
      <div className="rounded-box border border-base-300/70 bg-base-100 p-2 shadow-[0_1px_2px_rgba(0,0,0,0.03)] focus-within:border-base-content/20">
        {(seedFileName || uploading) && (
          <div className="mb-1 flex items-center gap-2 px-1">
            <span className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-base-200 px-2.5 py-1 text-xs text-base-content/70">
              <IconFile className="size-3.5 shrink-0" />
              <span className="truncate">{uploading ? "Reading file…" : seedFileName}</span>
              {seedFileName && !uploading && (
                <button
                  className="btn btn-ghost btn-xs btn-circle -mr-1.5"
                  onClick={onClearSeeds}
                  aria-label="Remove uploaded file"
                  title="Remove"
                >
                  <IconClose className="size-3" />
                </button>
              )}
            </span>
          </div>
        )}

        <textarea
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              if (canSend) onSend();
            }
          }}
          rows={1}
          placeholder={
            hasUpload
              ? "Ask what to do with the upload, or send as-is…"
              : "Describe who to find, paste IG/TikTok links, upload files, or ask a follow-up"
          }
          className="max-h-40 min-h-[2.5rem] w-full resize-none bg-transparent px-2 py-2 text-sm outline-none placeholder:text-base-content/40"
          aria-label="Describe who to find"
        />

        <div className="flex items-center gap-2 px-1 pt-1">
          <input
            ref={fileInput}
            type="file"
            accept={accept}
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) onUpload(file);
              event.target.value = "";
            }}
          />
          <button
            className="btn btn-ghost btn-sm btn-circle"
            onClick={() => fileInput.current?.click()}
            disabled={busy || uploading}
            aria-label="Upload a file"
            title="Upload CSV/PDF/TXT applications or an MP4 sample"
          >
            <IconFile className="size-4" />
          </button>

          <div className="ml-auto">
            {busy ? (
              <button className="btn btn-circle btn-sm btn-neutral" onClick={onStop} aria-label="Stop generating" title="Stop">
                <IconStop className="size-4" />
              </button>
            ) : (
              <button
                className="btn btn-circle btn-sm btn-primary disabled:bg-base-300 disabled:text-base-content/40"
                onClick={onSend}
                disabled={!canSend}
                aria-label="Send message"
              >
                <IconSend className="size-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
