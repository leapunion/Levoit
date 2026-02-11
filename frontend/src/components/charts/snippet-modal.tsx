"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import type { RankingResponse } from "@/lib/types";

const PLATFORM_LABELS: Record<string, string> = {
  chatgpt: "ChatGPT",
  perplexity: "Perplexity",
  google_ai: "Google AI Overview",
};

interface SnippetModalProps {
  ranking: RankingResponse;
  onClose: () => void;
}

/** Highlight brand name in snippet text using <mark>. */
function highlightBrand(text: string, brand: string): string {
  const escaped = brand.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`(${escaped})`, "gi");
  return text.replace(re, "<mark class='bg-yellow-200 rounded px-0.5'>$1</mark>");
}

export function SnippetModal({ ranking, onClose }: SnippetModalProps) {
  const backdropRef = useRef<HTMLDivElement>(null);

  // Close on Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  // Close on backdrop click
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === backdropRef.current) onClose();
  };

  const snippet = ranking.snippet ?? "No snippet available for this ranking.";

  return (
    <div
      ref={backdropRef}
      onClick={handleBackdropClick}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
    >
      <div className="w-full max-w-lg rounded-xl bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-gray-100 px-5 py-4">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">
              {ranking.brand} — {PLATFORM_LABELS[ranking.platform] ?? ranking.platform}
            </h3>
            <p className="mt-0.5 text-xs text-gray-400">
              Rank #{ranking.rank_position} &middot;{" "}
              {new Date(ranking.scraped_at).toLocaleString()}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
          >
            <X size={18} />
          </button>
        </div>

        {/* Snippet body */}
        <div className="max-h-80 overflow-y-auto px-5 py-4">
          <p
            className="whitespace-pre-wrap text-sm leading-relaxed text-gray-700"
            dangerouslySetInnerHTML={{
              __html: highlightBrand(snippet, ranking.brand),
            }}
          />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-gray-100 px-5 py-3">
          {ranking.snapshot_id ? (
            <span className="rounded bg-gray-100 px-2 py-0.5 text-[10px] font-mono text-gray-400">
              snapshot: {ranking.snapshot_id}
            </span>
          ) : (
            <span />
          )}
          <button
            onClick={onClose}
            className="rounded-lg bg-gray-100 px-4 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-200"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
