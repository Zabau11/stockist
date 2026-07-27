"use client";

import { useEffect, useState } from "react";
import { CornerRightUp } from "lucide-react";

import { useAutoResizeTextarea } from "@/components/hooks/use-auto-resize-textarea";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface AIInputWithLoadingProps {
  id?: string;
  placeholder?: string;
  minHeight?: number;
  maxHeight?: number;
  loadingDuration?: number;
  thinkingDuration?: number;
  onSubmit?: (value: string) => void | Promise<void>;
  value?: string;
  onChange?: (value: string) => void;
  className?: string;
  autoAnimate?: boolean;
}

export function AIInputWithLoading({
  id = "ai-input-with-loading",
  placeholder = "Ask Stockist anything…",
  minHeight = 56,
  maxHeight = 200,
  loadingDuration = 700,
  thinkingDuration = 1000,
  onSubmit,
  value,
  onChange,
  className,
  autoAnimate = false,
}: AIInputWithLoadingProps) {
  const [internalValue, setInternalValue] = useState("");
  const [submitted, setSubmitted] = useState(autoAnimate);
  const [isAnimating, setIsAnimating] = useState(autoAnimate);
  const { textareaRef, adjustHeight } = useAutoResizeTextarea({ minHeight, maxHeight });
  const inputValue = value ?? internalValue;
  const updateValue = (nextValue: string) => {
    if (value === undefined) setInternalValue(nextValue);
    onChange?.(nextValue);
  };

  useEffect(() => {
    if (!isAnimating) return;

    let timeoutId: ReturnType<typeof setTimeout>;
    const runAnimation = () => {
      setSubmitted(true);
      timeoutId = setTimeout(() => {
        setSubmitted(false);
        timeoutId = setTimeout(runAnimation, thinkingDuration);
      }, loadingDuration);
    };

    runAnimation();
    return () => clearTimeout(timeoutId);
  }, [isAnimating, loadingDuration, thinkingDuration]);

  async function handleSubmit() {
    const value = inputValue.trim();
    if (!value || submitted) return;

    setSubmitted(true);
    try {
      await onSubmit?.(value);
      updateValue("");
      adjustHeight(true);
    } finally {
      setIsAnimating(false);
      setTimeout(() => setSubmitted(false), loadingDuration);
    }
  }

  return <div className={cn("w-full", className)}>
    <div className="relative mx-auto flex w-full max-w-3xl flex-col gap-2">
      <div className="flex w-full items-center gap-2 rounded-2xl border bg-card p-1.5 shadow-sm transition-shadow focus-within:ring-2 focus-within:ring-ring/20">
        <Textarea
          id={id}
          ref={textareaRef}
          value={inputValue}
          placeholder={placeholder}
          disabled={submitted}
          onChange={(event) => {
            updateValue(event.target.value);
            adjustHeight();
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              void handleSubmit();
            }
          }}
          className="min-h-14 flex-1 resize-none rounded-xl border-0 bg-transparent px-3 py-3 text-sm shadow-none focus-visible:ring-0"
        />
        <button
          type="button"
          onClick={() => void handleSubmit()}
          disabled={submitted || !inputValue.trim()}
          aria-label={submitted ? "Sending" : "Send message"}
          className={cn("flex size-9 shrink-0 items-center justify-center rounded-full transition-colors", submitted ? "bg-transparent" : "bg-secondary hover:bg-secondary/80", !inputValue.trim() && !submitted && "opacity-50")}
        >
          {submitted ? <span className="size-4 animate-spin rounded-sm bg-primary" style={{ animationDuration: "900ms" }} /> : <CornerRightUp className="size-4" />}
        </button>
      </div>
      <p className="px-2 text-center text-xs text-muted-foreground">{submitted ? "Stockist is thinking…" : "Press Enter to send · Shift+Enter for a new line"}</p>
    </div>
  </div>;
}
