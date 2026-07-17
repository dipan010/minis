import type { ImagePromptSpec } from "@/lib/types";

/** Text-to-image prompt spec card with palette swatches. These are meant to
 * be pasted into Midjourney/DALL-E — no images are generated here. */
export default function ImagePromptCard({ spec }: { spec: ImagePromptSpec }) {
  return (
    <div className="panel p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-[10px] uppercase tracking-wide text-ink-soft">
          {spec.platform}
        </span>
        <span className="font-mono text-[10px] text-ink-soft border border-line rounded px-1.5 py-0.5">
          {spec.aspect_ratio}
        </span>
      </div>

      <p className="text-[13px] leading-relaxed">{spec.scene_description}</p>

      <div className="grid grid-cols-2 gap-2 text-[12px]">
        <div>
          <span className="font-mono text-[9px] uppercase tracking-wide text-ink-soft block">Style</span>
          {spec.style}
        </div>
        <div>
          <span className="font-mono text-[9px] uppercase tracking-wide text-ink-soft block">Mood</span>
          {spec.mood}
        </div>
      </div>

      {spec.text_overlay && (
        <p className="text-[12px]">
          <span className="font-mono text-[9px] uppercase tracking-wide text-ink-soft block">
            Text overlay
          </span>
          “{spec.text_overlay}”
        </p>
      )}

      <div>
        <span className="font-mono text-[9px] uppercase tracking-wide text-ink-soft block mb-1">
          Palette
        </span>
        <div className="flex gap-1.5">
          {spec.color_palette.map((swatch, i) => (
            <span
              key={i}
              title={swatch}
              className="h-6 w-6 rounded border border-line"
              style={{ background: swatch }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
