"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { HelpCircle, Search, ChevronDown, Printer, Rocket, Lock } from "lucide-react";
import { PageHeader } from "@/components/AppShell";
import { Card, Button, Badge } from "@/components/ui";
import { HelpBlocks } from "@/components/HelpBlocks";
import { HELP, HELP_FLAT } from "@/lib/help";
import { useAuth } from "@/lib/auth";

export default function HelpPage() {
  const { can } = useAuth();
  const [cat, setCat] = useState(HELP[0].id);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<string | null>("quickstart");

  const needle = q.trim().replace(/\s/g, "");
  const searching = needle.length > 0;

  const results = useMemo(() => {
    if (!searching) return [];
    return HELP_FLAT.filter((a) => {
      const hay = (a.title + " " + a.blocks.map((b) => Object.values(b).join(" ")).join(" ")).replace(/\s/g, "");
      return hay.includes(needle);
    });
  }, [needle, searching]);

  const current = HELP.find((c) => c.id === cat)!;

  return (
    <div>
      <PageHeader
        title="도움말 · 사용설명서"
        desc="카테고리에서 항목을 클릭하면 단계별 사용법이 펼쳐집니다."
        action={
          can("print") ? (
            <Link href="/manual-print" target="_blank">
              <Button variant="secondary"><Printer size={15} /> 인쇄 / PDF</Button>
            </Link>
          ) : (
            <Badge tone="muted"><Lock size={11} /> 인쇄·PDF 권한 필요</Badge>
          )
        }
      />

      {/* 검색 */}
      <div className="relative mb-4 max-w-md">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="도움말 검색 (예: 보정명령, 미수금, 비밀번호)"
          className="h-9.5 w-full rounded-lg border border-line bg-surface pl-9 pr-3 text-sm outline-none focus:border-brand-300 focus:ring-2 focus:ring-brand-100"
        />
      </div>

      {searching ? (
        <Card>
          <div className="border-b border-line-soft px-5 py-3 text-[13px] text-muted">검색 결과 {results.length}건</div>
          <div className="divide-y divide-line-soft">
            {results.length === 0 ? (
              <div className="p-8 text-center text-[13px] text-muted">검색 결과가 없습니다.</div>
            ) : results.map((a) => (
              <Article key={a.id} a={a} catLabel={a.cat} open={open === a.id} onToggle={() => setOpen(open === a.id ? null : a.id)} />
            ))}
          </div>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[200px_1fr]">
          {/* 카테고리 */}
          <div className="flex gap-2 overflow-x-auto lg:flex-col lg:overflow-visible">
            {HELP.map((c) => (
              <button
                key={c.id}
                onClick={() => { setCat(c.id); setOpen(c.articles[0].id); }}
                className={`flex shrink-0 items-center gap-2 rounded-lg border px-3 py-2 text-left text-[13.5px] font-medium transition-colors ${cat === c.id ? "border-brand bg-brand-50 text-brand-700" : "border-line text-ink-soft hover:bg-surface-2"}`}
              >
                <span>{c.icon}</span> {c.title}
              </button>
            ))}
          </div>

          {/* 항목 */}
          <Card>
            <div className="divide-y divide-line-soft">
              {current.articles.map((a) => (
                <Article key={a.id} a={a} open={open === a.id} onToggle={() => setOpen(open === a.id ? null : a.id)} />
              ))}
            </div>
          </Card>
        </div>
      )}

      <div className="mt-4 flex items-center gap-2 rounded-xl border border-line bg-surface-2 p-4 text-[12.5px] text-muted">
        <Rocket size={15} className="shrink-0 text-brand" />
        <span>처음이시면 <b>시작하기 → 빠른 시작(5분 가이드)</b>부터 보세요. 인쇄·배포용 전체본은 우측 상단 <b>인쇄 / PDF</b> 버튼으로 받을 수 있습니다(인쇄·PDF 권한 필요 · 관리자 모드에서 권한 부여).</span>
      </div>
    </div>
  );
}

function Article({ a, catLabel, open, onToggle }: { a: { id: string; title: string; sub?: string; blocks: import("@/lib/help").Block[] }; catLabel?: string; open: boolean; onToggle: () => void }) {
  return (
    <div>
      <button onClick={onToggle} className="flex w-full items-center gap-3 px-5 py-3.5 text-left">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-2 text-muted"><HelpCircle size={16} /></div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[14px] font-semibold text-ink">{a.title}</span>
            {a.sub && <Badge tone="muted">{a.sub}</Badge>}
            {catLabel && <span className="text-[11px] text-faint">{catLabel}</span>}
          </div>
        </div>
        <ChevronDown size={18} className={`shrink-0 text-faint transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && <div className="px-5 pb-5 pl-16">{<HelpBlocks blocks={a.blocks} />}</div>}
    </div>
  );
}
