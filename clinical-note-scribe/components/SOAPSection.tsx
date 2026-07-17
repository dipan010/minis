interface SOAPSectionProps {
  letter: string;
  title: string;
  color: string; // tailwind color value (CSS)
  children: React.ReactNode;
}

/** Colored-left-border section container for S / O / A / P. */
export default function SOAPSection({ letter, title, color, children }: SOAPSectionProps) {
  return (
    <section
      className="panel p-5"
      style={{ borderLeftWidth: 4, borderLeftColor: color }}
    >
      <div className="flex items-center gap-3 mb-4">
        <span
          className="flex h-8 w-8 items-center justify-center rounded-md font-mono text-lg font-bold text-white"
          style={{ background: color }}
        >
          {letter}
        </span>
        <h2 className="text-base font-semibold">{title}</h2>
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  );
}
