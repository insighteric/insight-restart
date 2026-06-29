"use client";

import { Printer } from "lucide-react";
import { HelpBlocks } from "@/components/HelpBlocks";
import { HELP } from "@/lib/help";

export default function ManualPrintPage() {
  return (
    <div className="min-h-screen bg-white text-ink">
      <style>{`
        @media print {
          .no-print { display: none !important; }
          @page { margin: 16mm; }
        }
      `}</style>

      {/* 상단 바 (인쇄 시 숨김) */}
      <div className="no-print sticky top-0 z-10 flex items-center justify-between border-b border-line bg-surface px-5 py-3">
        <div className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="Insight Restart" className="h-7 w-7 rounded-md" />
          <span className="font-bold text-ink">Insight Restart 사용설명서</span>
        </div>
        <button
          onClick={() => window.print()}
          className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-ink px-4 text-sm font-semibold text-white hover:bg-ink-soft"
        >
          <Printer size={15} /> 인쇄 / PDF 저장
        </button>
      </div>

      <div className="mx-auto w-full max-w-3xl px-6 py-10">
        {/* 표지 */}
        <header className="mb-10 border-b border-line pb-6">
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="Insight Restart" className="h-12 w-12 rounded-xl" />
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight">Insight Restart 사용설명서</h1>
              <p className="text-[13px] text-muted">개인회생·파산 AI 실무 플랫폼 · insight-restart.vercel.app</p>
            </div>
          </div>
          <p className="no-print mt-4 text-[12.5px] text-muted">
            아래 ‘인쇄 / PDF 저장’ 또는 <b>Ctrl+P</b>를 눌러 PDF로 저장·인쇄하세요. (Word가 필요하면 저장소의 <b>docs/사용설명서.md</b> 파일을 Word로 열면 됩니다.)
          </p>
        </header>

        {/* 본문 */}
        {HELP.map((cat, ci) => (
          <section key={cat.id} className="mb-9" style={{ breakInside: "avoid" }}>
            <h2 className="mb-4 text-[18px] font-extrabold text-ink">
              {ci + 1}. {cat.icon} {cat.title}
            </h2>
            <div className="space-y-6">
              {cat.articles.map((a, ai) => (
                <article key={a.id}>
                  <h3 className="mb-2 text-[15px] font-bold text-ink">
                    {ci + 1}-{ai + 1}. {a.title}
                    {a.sub && <span className="ml-2 text-[12px] font-medium text-muted">({a.sub})</span>}
                  </h3>
                  <HelpBlocks blocks={a.blocks} />
                </article>
              ))}
            </div>
          </section>
        ))}

        <footer className="mt-10 border-t border-line pt-5 text-[11.5px] text-faint">
          ※ 본 프로그램의 계산·문서·분석은 실무 참고용이며, 최종 판단은 담당자의 검토가 필요합니다. · 문의: 고객센터 — Insight Restart
        </footer>
      </div>
    </div>
  );
}
