"use client";

import { useEffect, useState } from "react";

export interface TocEntry {
  id: string;
  label: string;
  indent?: boolean;
}

interface TableOfContentsProps {
  entries: TocEntry[];
}

/** Sticky TOC with IntersectionObserver scroll tracking. */
export default function TableOfContents({ entries }: TableOfContentsProps) {
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (observed) => {
        const visible = observed
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActiveId(visible[0].target.id);
      },
      { rootMargin: "-10% 0px -75% 0px" }
    );
    for (const entry of entries) {
      const el = document.getElementById(entry.id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [entries]);

  return (
    <nav className="sticky top-6">
      <p className="font-mono text-[11px] uppercase tracking-wide text-ink-soft mb-2">
        Contents
      </p>
      <ul className="space-y-1 border-l border-line">
        {entries.map((entry) => (
          <li key={entry.id}>
            <a
              href={`#${entry.id}`}
              className={`block text-[13px] leading-snug py-0.5 border-l-2 -ml-px transition-colors ${
                entry.indent ? "pl-6" : "pl-3"
              } ${
                activeId === entry.id
                  ? "border-ink text-ink font-medium"
                  : "border-transparent text-ink-soft hover:text-ink"
              }`}
            >
              {entry.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
