"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Download, Monitor, Apple, ArrowLeft, Check, Globe, Info, Loader2 } from "lucide-react";
import { Button, Card, Badge } from "@/components/ui";
import { DOWNLOADS } from "@/lib/downloads";

type OS = "windows" | "mac" | "other";

// beforeinstallprompt 이벤트 타입(브라우저 PWA 설치)
interface BIPEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function DownloadPage() {
  const [os, setOs] = useState<OS>("other");
  const [installEvt, setInstallEvt] = useState<BIPEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    const ua = navigator.userAgent;
    if (/Windows/i.test(ua)) setOs("windows");
    else if (/Mac/i.test(ua)) setOs("mac");
    const onPrompt = (e: Event) => { e.preventDefault(); setInstallEvt(e as BIPEvent); };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", () => setInstalled(true));
    if (window.matchMedia("(display-mode: standalone)").matches) setInstalled(true);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  const doInstall = async () => {
    if (!installEvt) return;
    setInstalling(true);
    await installEvt.prompt();
    await installEvt.userChoice;
    setInstallEvt(null);
    setInstalling(false);
  };

  return (
    <div className="min-h-screen bg-canvas">
      <header className="flex h-16 items-center justify-between border-b border-line bg-surface px-5">
        <Link href="/dashboard" className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="Insight Restart" className="h-8 w-8 rounded-lg" />
          <span className="font-extrabold tracking-tight text-ink">Insight Restart</span>
        </Link>
        <Link href="/login" className="inline-flex items-center gap-1.5 text-[13px] font-medium text-muted hover:text-ink">
          <ArrowLeft size={15} /> 로그인으로
        </Link>
      </header>

      <main className="mx-auto w-full max-w-3xl px-5 py-10">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">데스크톱 앱 다운로드</h1>
          <p className="mt-2 text-[14px] text-muted">
            Windows·macOS에서 더 빠르게. {DOWNLOADS.version && <span className="text-faint">현재 버전 {DOWNLOADS.version}</span>}
          </p>
        </div>

        {/* OS별 다운로드 카드 */}
        <div className="grid gap-4 sm:grid-cols-2">
          <PlatformCard
            icon={<Monitor size={26} />}
            title="Windows"
            sub="Windows 10 / 11"
            url={DOWNLOADS.windows}
            highlighted={os === "windows"}
          />
          <PlatformCard
            icon={<Apple size={26} />}
            title="macOS"
            sub="Apple Silicon · Intel"
            url={DOWNLOADS.mac}
            altUrl={DOWNLOADS.macIntel}
            altLabel="Intel 칩"
            highlighted={os === "mac"}
          />
        </div>

        {/* 지금 바로 설치 (PWA) */}
        <Card className="mt-6">
          <div className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
              <Globe size={24} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h3 className="text-[15px] font-bold text-ink">지금 바로 앱으로 설치</h3>
                <Badge tone="success">설치파일 없이 즉시</Badge>
              </div>
              <p className="mt-1 text-[13px] text-muted">
                설치파일 다운로드 없이, 지금 쓰는 브라우저에서 <b>앱처럼 설치</b>할 수 있습니다. 바탕화면 아이콘이 생기고 별도 창으로 열립니다. (Globe·Edge 권장)
              </p>
            </div>
            <div className="shrink-0">
              {installed ? (
                <Badge tone="success"><Check size={12} /> 설치됨</Badge>
              ) : installEvt ? (
                <Button onClick={doInstall} disabled={installing}>
                  {installing ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />} 앱 설치
                </Button>
              ) : (
                <span className="text-[12px] text-faint">주소창의 <b>설치</b> 아이콘(⊕) 클릭</span>
              )}
            </div>
          </div>
          <div className="border-t border-line-soft px-6 py-3 text-[12px] text-muted">
            <b>수동 설치:</b> Globe/Edge — 주소창 오른쪽 <b>설치 아이콘</b> 또는 메뉴 → <b>앱 설치</b>. · Mac Safari — 공유 → <b>Dock에 추가</b>.
          </div>
        </Card>

        <div className="mt-6 flex items-start gap-2 rounded-xl border border-line bg-surface-2 p-4 text-[12.5px] text-muted">
          <Info size={15} className="mt-0.5 shrink-0 text-brand" />
          <p>
            네이티브 설치파일(.exe/.dmg)은 준비되는 대로 위 버튼에서 받을 수 있습니다. 그동안에는 <b>‘앱으로 설치(PWA)’</b>로 데스크톱에서 동일하게 사용하실 수 있어요.
          </p>
        </div>
      </main>
    </div>
  );
}

function PlatformCard({
  icon, title, sub, url, altUrl, altLabel, highlighted,
}: {
  icon: React.ReactNode; title: string; sub: string; url?: string; altUrl?: string; altLabel?: string; highlighted?: boolean;
}) {
  const ready = !!url;
  return (
    <Card className={highlighted ? "ring-2 ring-brand" : ""}>
      <div className="flex flex-col items-center gap-3 p-6 text-center">
        {highlighted && <Badge tone="brand">내 기기</Badge>}
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-2 text-ink">{icon}</div>
        <div>
          <div className="text-[16px] font-bold text-ink">{title}</div>
          <div className="text-[12px] text-muted">{sub}</div>
        </div>
        {ready ? (
          <>
            <a href={url} className="w-full">
              <Button className="w-full" size="lg"><Download size={16} /> 다운로드</Button>
            </a>
            {altUrl && (
              <a href={altUrl} className="text-[12.5px] font-medium text-brand hover:underline">{altLabel ?? "다른 버전"} 다운로드</a>
            )}
          </>
        ) : (
          <Button className="w-full" size="lg" variant="secondary" disabled>준비 중</Button>
        )}
      </div>
    </Card>
  );
}
