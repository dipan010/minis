"use client";

import { useState } from "react";
import type { SocialPost } from "@/lib/types";
import { PLATFORM_COLORS } from "@/lib/types";

const PLATFORM_LABELS = {
  twitter: "X / Twitter",
  instagram: "Instagram",
  linkedin: "LinkedIn",
  tiktok: "TikTok",
} as const;

interface SocialPostCardProps {
  post: SocialPost;
}

/** Card loosely styled after the target platform: copy, hashtags, best
 * posting time, content-type badge, collapsible image prompt. */
export default function SocialPostCard({ post }: SocialPostCardProps) {
  const [showPrompt, setShowPrompt] = useState(false);
  const color = PLATFORM_COLORS[post.platform];

  return (
    <div className="panel p-4 flex flex-col gap-3" style={{ borderTopWidth: 3, borderTopColor: color }}>
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-[11px] uppercase tracking-wide" style={{ color }}>
          {PLATFORM_LABELS[post.platform]}
        </span>
        <span className="font-mono text-[10px] uppercase text-ink-soft border border-line rounded-full px-2 py-0.5">
          {post.content_type}
        </span>
      </div>

      <p className="text-[13px] leading-relaxed whitespace-pre-line flex-1">{post.copy}</p>

      {post.hashtags.length > 0 && (
        <p className="text-[12px]" style={{ color }}>
          {post.hashtags.map((h) => `#${h}`).join(" ")}
        </p>
      )}

      <p className="font-mono text-[10px] text-ink-soft">⏰ {post.best_time}</p>

      {post.image_prompt && (
        <div>
          <button
            type="button"
            onClick={() => setShowPrompt((v) => !v)}
            className="font-mono text-[10px] uppercase tracking-wide text-accent hover:underline"
          >
            {showPrompt ? "▲ hide image prompt" : "▼ image prompt"}
          </button>
          {showPrompt && (
            <p className="mt-1.5 text-[12px] text-ink-soft leading-snug border-l-2 border-line pl-2">
              {post.image_prompt}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
