"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { CheckCircle2, Eraser, Loader2, PenLine } from "lucide-react";
import { getSupabase } from "@/lib/supabase";
import { Card, Button } from "@/components/ui";

interface AgreementData { kind: string; title: string; body: string; status: string; signerName: string | null; signedAt: string | null }

const KIND_LABEL: Record<string, string> = { mandate: "위임장", contract: "수임계약서", consent: "개인정보 수집·이용 동의서" };

export default function SignPage() {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<AgreementData | null | "invalid">(null);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [justSigned, setJustSigned] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const hasInk = useRef(false);

  const load = useCallback(async () => {
    const sb = getSupabase();
    if (!sb) { setData("invalid"); return; }
    const { data: d, error } = await sb.rpc("agreement_view", { p_token: token });
    if (error || !d) setData("invalid"); else setData(d as AgreementData);
  }, [token]);
  useEffect(() => { load(); }, [load]);

  const pos = (e: React.PointerEvent) => {
    const c = canvasRef.current!;
    const r = c.getBoundingClientRect();
    return { x: (e.clientX - r.left) * (c.width / r.width), y: (e.clientY - r.top) * (c.height / r.height) };
  };
  const down = (e: React.PointerEvent) => {
    canvasRef.current!.setPointerCapture(e.pointerId);
    drawing.current = true;
    const ctx = canvasRef.current!.getContext("2d")!;
    const p = pos(e); ctx.beginPath(); ctx.moveTo(p.x, p.y);
  };
  const moveDraw = (e: React.PointerEvent) => {
    if (!drawing.current) return;
    const ctx = canvasRef.current!.getContext("2d")!;
    const p = pos(e); ctx.lineTo(p.x, p.y);
    ctx.lineWidth = 2.4; ctx.lineCap = "round"; ctx.strokeStyle = "#111827"; ctx.stroke();
    hasInk.current = true;
  };
  const up = () => { drawing.current = false; };
  const clearSig = () => { const c = canvasRef.current!; c.getContext("2d")!.clearRect(0, 0, c.width, c.height); hasInk.current = false; };

  const submit = async () => {
    if (!name.trim()) { setErr("이름을 입력해 주세요."); return; }
    if (!hasInk.current) { setErr("서명란에 서명해 주세요."); return; }
    setBusy(true); setErr(null);
    const sig = canvasRef.current!.toDataURL("image/png");
    const sb = getSupabase();
    const { data: res } = await sb!.rpc("agreement_sign", { p_token: token, p_name: name.trim(), p_signature: sig });
    if (res?.ok) setJustSigned(true); else setErr(res?.message ?? "제출에 실패했습니다.");
    setBusy(false);
  };

  if (data === null) return <div className="flex min-h-screen items-center justify-center bg-canvas text-muted"><Loader2 className="mr-2 animate-spin" size={18} /> 불러오는 중…</div>;
  if (data === "invalid") return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-4 text-center">
      <div><div className="text-lg font-bold text-ink">유효하지 않은 링크입니다</div><p className="mt-1 text-[13px] text-muted">담당 사무소에 다시 문의해 주세요.</p></div>
    </div>
  );

  const signed = justSigned || data.status === "signed";

  return (
    <div className="min-h-screen bg-canvas px-4 py-10">
      <div className="mx-auto w-full max-w-lg space-y-4">
        <div className="flex flex-col items-center gap-2 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="Insight Restart" className="h-11 w-11 rounded-2xl" />
          <div>
            <div className="text-lg font-extrabold tracking-tight text-ink">{data.title}</div>
            <div className="text-[12px] text-muted">{KIND_LABEL[data.kind] ?? data.kind}</div>
          </div>
        </div>

        {signed ? (
          <Card>
            <div className="flex flex-col items-center gap-2 px-5 py-12 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-success-bg text-success"><CheckCircle2 size={30} /></div>
              <div className="text-[15px] font-bold text-ink">서명이 완료되었습니다</div>
              <p className="text-[13px] text-muted">{(justSigned ? name : data.signerName) || ""}님, 제출해 주셔서 감사합니다. 담당 사무소에서 확인합니다.</p>
            </div>
          </Card>
        ) : (
          <>
            <Card>
              <div className="border-b border-line-soft px-5 py-3 text-[13px] font-bold text-ink">내용 확인</div>
              <div className="max-h-72 overflow-y-auto whitespace-pre-wrap px-5 py-4 text-[13px] leading-relaxed text-ink-soft">{data.body}</div>
            </Card>

            <Card>
              <div className="space-y-3 p-5">
                <div>
                  <label className="mb-1 block text-[12.5px] font-medium text-ink-soft">성명</label>
                  <input value={name} onChange={(e) => setName(e.target.value)} placeholder="본인 이름"
                    className="h-10 w-full rounded-lg border border-line bg-surface px-3 text-sm outline-none focus:border-brand-300 focus:ring-2 focus:ring-brand-100" />
                </div>
                <div>
                  <div className="mb-1 flex items-center justify-between">
                    <label className="text-[12.5px] font-medium text-ink-soft">서명</label>
                    <button onClick={clearSig} className="inline-flex items-center gap-1 text-[12px] text-muted hover:text-ink"><Eraser size={12} /> 지우기</button>
                  </div>
                  <canvas
                    ref={canvasRef} width={500} height={180}
                    onPointerDown={down} onPointerMove={moveDraw} onPointerUp={up} onPointerLeave={up}
                    style={{ touchAction: "none" }}
                    className="h-44 w-full rounded-lg border-2 border-dashed border-line bg-white"
                  />
                  <p className="mt-1 text-[11px] text-faint">위 칸에 손가락 또는 마우스로 서명해 주세요.</p>
                </div>
                {err && <p className="text-[12px] text-danger">{err}</p>}
                <Button className="w-full" size="lg" onClick={submit} disabled={busy}>
                  {busy ? <Loader2 size={16} className="animate-spin" /> : <PenLine size={16} />} 동의하고 서명 제출
                </Button>
                <p className="text-[11px] leading-relaxed text-faint">제출 시 위 내용에 동의하며 전자적으로 서명하는 것에 동의합니다.</p>
              </div>
            </Card>
          </>
        )}
        <p className="text-center text-[11.5px] text-faint">Insight Restart · 개인회생·파산 AI 실무 플랫폼</p>
      </div>
    </div>
  );
}
