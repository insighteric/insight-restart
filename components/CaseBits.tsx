"use client";

import { Check } from "lucide-react";
import type { Case, CaseStatus, CaseType } from "@/lib/types";
import { caseTypeLabel, stageLabel, stagesFor } from "@/lib/format";
import { Badge } from "./ui";

export function CaseTypeBadge({ type }: { type: CaseType }) {
  return (
    <Badge tone={type === "rehab" ? "brand" : "info"}>{caseTypeLabel[type]}</Badge>
  );
}

const statusMap: Record<CaseStatus, { label: string; tone: "success" | "warning" | "danger" | "muted" | "brand" }> = {
  active: { label: "진행중", tone: "brand" },
  onhold: { label: "보류", tone: "warning" },
  won: { label: "인가·면책", tone: "success" },
  lost: { label: "기각·폐지", tone: "danger" },
  closed: { label: "종결", tone: "muted" },
};

export function CaseStatusBadge({ status }: { status: CaseStatus }) {
  const s = statusMap[status];
  return <Badge tone={s.tone}>{s.label}</Badge>;
}

export function StageTimeline({ c }: { c: Case }) {
  const stages = stagesFor(c.type);
  const currentIdx = stages.indexOf(c.stage);

  return (
    <ol className="flex flex-wrap items-center gap-y-3">
      {stages.map((st, i) => {
        const done = i < currentIdx;
        const current = i === currentIdx;
        return (
          <li key={st} className="flex items-center">
            <div className="flex flex-col items-center">
              <div
                className={`flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-bold ${
                  done
                    ? "bg-brand text-white"
                    : current
                      ? "bg-brand-100 text-brand-700 ring-2 ring-brand"
                      : "bg-surface-2 text-faint ring-1 ring-line"
                }`}
              >
                {done ? <Check size={14} /> : i + 1}
              </div>
              <span
                className={`mt-1.5 whitespace-nowrap text-[11px] ${
                  current ? "font-semibold text-brand-700" : done ? "text-ink-soft" : "text-faint"
                }`}
              >
                {stageLabel[st]}
              </span>
            </div>
            {i < stages.length - 1 && (
              <div
                className={`mx-1 h-0.5 w-6 sm:w-9 ${i < currentIdx ? "bg-brand" : "bg-line"}`}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}

export function ProgressBar({ value, tone = "brand" }: { value: number; tone?: "brand" | "success" | "danger" }) {
  const color = tone === "success" ? "bg-success" : tone === "danger" ? "bg-danger" : "bg-brand";
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-line">
      <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
    </div>
  );
}
