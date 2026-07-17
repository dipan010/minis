import type { SocialPost } from "@/lib/types";
import { PLATFORM_META } from "@/lib/types";
import SentimentBadge from "./SentimentBadge";

function timeAgo(iso: string): string {
  const hours = (Date.now() - new Date(iso).getTime()) / 3600_000;
  if (hours < 1) return `${Math.max(1, Math.round(hours * 60))}m`;
  if (hours < 24) return `${Math.round(hours)}h`;
  return `${Math.round(hours / 24)}d`;
}

interface PostRowProps {
  post: SocialPost;
}

/** Table row: platform icon, author, content preview, sentiment badge,
 * engagement metrics. */
export default function PostRow({ post }: PostRowProps) {
  return (
    <tr className="border-b border-line/60 hover:bg-card-hover transition-colors">
      <td className="px-3 py-2.5 whitespace-nowrap">
        <span title={PLATFORM_META[post.platform].label} className="text-base">
          {PLATFORM_META[post.platform].icon}
        </span>
      </td>
      <td className="px-3 py-2.5 font-mono text-xs text-ink-soft whitespace-nowrap max-w-36 truncate">
        {post.author}
      </td>
      <td className="px-3 py-2.5 text-[13px] text-ink leading-snug min-w-64">
        {post.content}
      </td>
      <td className="px-3 py-2.5">
        <SentimentBadge sentiment={post.sentiment} />
      </td>
      <td className="px-3 py-2.5 font-mono text-[11px] text-ink-soft whitespace-nowrap">
        ♥ {post.engagement.likes.toLocaleString()} · ↻ {post.engagement.shares.toLocaleString()} · 💬{" "}
        {post.engagement.comments.toLocaleString()}
      </td>
      <td className="px-3 py-2.5 font-mono text-[11px] text-ink-soft whitespace-nowrap">
        {timeAgo(post.timestamp)}
      </td>
    </tr>
  );
}
