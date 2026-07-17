"use client";

import { useState } from "react";
import type { EmailInSequence } from "@/lib/types";

interface EmailPreviewProps {
  email: EmailInSequence;
  index: number;
}

/** Timeline entry that expands into a mock phone-width inbox rendering of
 * the email's HTML body. */
export default function EmailPreview({ email, index }: EmailPreviewProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative pl-10">
      {/* timeline dot */}
      <span className="absolute left-2.5 top-4 h-3 w-3 rounded-full bg-accent border-2 border-base" />

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full text-left panel p-4 hover:bg-card-hover transition-colors"
      >
        <div className="flex items-center justify-between gap-2 mb-0.5">
          <span className="font-mono text-[10px] uppercase tracking-wide text-accent">
            Email {index + 1} · Day {email.send_day}
          </span>
          <span className="font-mono text-xs text-ink-soft">{open ? "▲" : "▼"}</span>
        </div>
        <p className="text-sm font-semibold leading-snug">{email.subject}</p>
        <p className="text-[12px] text-ink-soft leading-snug">{email.preview_text}</p>
        <p className="text-[11px] text-ink-soft mt-1 italic">{email.purpose}</p>
      </button>

      {open && (
        <div className="mt-2 mb-3">
          {/* mock inbox: phone-width container */}
          <div className="mx-auto max-w-sm rounded-2xl border border-line overflow-hidden bg-white text-slate-900">
            <div className="bg-slate-100 px-4 py-2.5 border-b border-slate-200">
              <p className="text-[13px] font-semibold truncate">{email.subject}</p>
              <p className="text-[11px] text-slate-500 truncate">{email.preview_text}</p>
            </div>
            <div
              className="px-4 py-3 text-[13px] leading-relaxed [&_h2]:text-base [&_h2]:font-semibold [&_h2]:my-2 [&_p]:my-2 [&_a]:text-blue-600"
              // Rendering model-generated HTML in a demo sandbox; tags are
              // constrained to p/h2/a/strong by the generation prompt.
              dangerouslySetInnerHTML={{ __html: email.body_html }}
            />
          </div>
          {email.personalization_tokens.length > 0 && (
            <p className="text-center font-mono text-[10px] text-ink-soft mt-2">
              tokens: {email.personalization_tokens.join(", ")}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
