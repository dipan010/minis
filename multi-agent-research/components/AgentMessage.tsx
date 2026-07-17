import type { AgentMessage as AgentMessageData } from "@/lib/types";
import { AGENT_META } from "@/lib/types";
import AgentAvatar from "./AgentAvatar";

const TYPE_STYLES: Record<AgentMessageData["type"], string> = {
  thinking: "text-slate-400 border-slate-500/40",
  action: "text-sky-300 border-sky-400/40",
  result: "text-emerald-300 border-emerald-400/40",
  error: "text-red-300 border-red-400/40",
};

interface AgentMessageProps {
  message: AgentMessageData;
}

/** One line in the terminal-style agent activity feed. */
export default function AgentMessage({ message }: AgentMessageProps) {
  const meta = AGENT_META[message.agent];
  const time = new Date(message.timestamp).toLocaleTimeString(undefined, {
    hour12: false,
  });

  return (
    <div className="flex items-start gap-2.5 px-3 py-2 border-b border-terminal-line/60">
      <AgentAvatar role={message.agent} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-mono text-xs font-semibold" style={{ color: meta.color }}>
            {meta.label}
          </span>
          <span
            className={`font-mono text-[9px] uppercase tracking-wider border rounded px-1 py-px ${TYPE_STYLES[message.type]}`}
          >
            {message.type}
          </span>
          <span className="font-mono text-[10px] text-slate-500 ml-auto">{time}</span>
        </div>
        <pre className="font-mono text-[12px] text-slate-300 whitespace-pre-wrap leading-snug mt-1">
          {message.content}
        </pre>
      </div>
    </div>
  );
}
