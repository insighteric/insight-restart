import { Info } from "lucide-react";
import type { Block } from "@/lib/help";

export function HelpBlocks({ blocks }: { blocks: Block[] }) {
  return (
    <div className="space-y-3">
      {blocks.map((b, i) => {
        if ("h" in b) return <div key={i} className="pt-1 text-[13.5px] font-bold text-ink">{b.h}</div>;
        if ("p" in b) return <p key={i} className="text-[13.5px] leading-relaxed text-ink-soft">{b.p}</p>;
        if ("tip" in b)
          return (
            <div key={i} className="flex items-start gap-2 rounded-lg border border-brand-200 bg-brand-50/60 px-3 py-2.5 text-[13px] text-ink-soft">
              <Info size={15} className="mt-0.5 shrink-0 text-brand-700" />
              <span>{b.tip}</span>
            </div>
          );
        return (
          <ol key={i} className="space-y-1.5">
            {b.steps.map((s, j) => (
              <li key={j} className="flex gap-2.5 text-[13.5px] leading-relaxed text-ink-soft">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-ink text-[11px] font-bold text-white">{j + 1}</span>
                <span>{s}</span>
              </li>
            ))}
          </ol>
        );
      })}
    </div>
  );
}
