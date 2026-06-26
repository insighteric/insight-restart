"use client";

import { useState } from "react";
import { FileText, Wand2, Copy, Check, Sparkles, Save } from "lucide-react";
import { useStore } from "@/lib/store";
import { PageHeader } from "@/components/AppShell";
import { Card, CardHeader, Button, Badge, Field, Spinner } from "@/components/ui";
import { docTypeLabel } from "@/lib/format";
import { generateDocDraft } from "@/lib/docgen";
import type { CaseType, DocType } from "@/lib/types";

const DOC_BY_TYPE: Record<CaseType, DocType[]> = {
  rehab: [
    "rehab_application",
    "creditor_list",
    "asset_list",
    "income_expense",
    "repayment_plan",
    "statement",
    "correction_reply",
  ],
  bankruptcy: ["bankruptcy_application", "creditor_list", "asset_list", "statement", "discharge_application"],
};

export default function DocumentsPage() {
  const store = useStore();
  const { cases, clientById } = store;

  const [caseId, setCaseId] = useState(cases[0]?.id ?? "");
  const [docType, setDocType] = useState<DocType>("rehab_application");
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [source, setSource] = useState<"ai" | "rule" | null>(null);
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);

  const selectedCase = cases.find((c) => c.id === caseId);
  const client = selectedCase ? clientById(selectedCase.clientId) : undefined;
  const docTypes = selectedCase ? DOC_BY_TYPE[selectedCase.type] : [];

  const generate = async (useAI: boolean) => {
    if (!selectedCase || !client) return;
    if (!useAI) {
      setDraft(generateDocDraft(docType, selectedCase, client));
      setSource("rule");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/ai/document", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ type: docType, caseData: selectedCase, client }),
      });
      const data = await res.json();
      setDraft(data.draft);
      setSource(data.source);
    } finally {
      setLoading(false);
    }
  };

  const copy = async () => {
    await navigator.clipboard.writeText(draft);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  const saveDoc = () => {
    if (!selectedCase || !draft) return;
    store.addDocument({
      id: `doc_${Date.now().toString(36)}`,
      caseId: selectedCase.id,
      type: docType,
      title: docTypeLabel[docType],
      status: "draft",
      content: draft,
      updatedAt: new Date().toISOString().slice(0, 10),
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div>
      <PageHeader
        title="AI 서류작성"
        desc="사건 데이터로 신청서·채권자목록·변제계획안 등을 자동 작성합니다."
        action={<Badge tone="brand"><Sparkles size={12} /> AI 기능</Badge>}
      />

      <div className="grid gap-4 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader title="문서 선택" />
            <div className="space-y-3 p-5">
              <Field label="사건">
                <select
                  value={caseId}
                  onChange={(e) => {
                    setCaseId(e.target.value);
                    const c = cases.find((x) => x.id === e.target.value);
                    if (c) setDocType(DOC_BY_TYPE[c.type][0]);
                  }}
                  className="h-9.5 w-full rounded-lg border border-line bg-surface px-3 text-sm outline-none focus:border-brand-300 focus:ring-2 focus:ring-brand-100"
                >
                  {cases.map((c) => (
                    <option key={c.id} value={c.id}>
                      {clientById(c.clientId)?.name} · {c.court}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="작성할 서류">
                <div className="grid gap-1.5">
                  {docTypes.map((t) => (
                    <button
                      key={t}
                      onClick={() => setDocType(t)}
                      className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-left text-[13px] font-medium transition-colors ${
                        docType === t
                          ? "border-brand bg-brand-50 text-brand-700"
                          : "border-line text-ink-soft hover:bg-surface-2"
                      }`}
                    >
                      <FileText size={15} className={docType === t ? "text-brand" : "text-faint"} />
                      {docTypeLabel[t]}
                    </button>
                  ))}
                </div>
              </Field>

              <div className="flex gap-2 pt-1">
                <Button variant="secondary" className="flex-1" onClick={() => generate(false)}>
                  <FileText size={15} /> 초안
                </Button>
                <Button className="flex-1" onClick={() => generate(true)} disabled={loading}>
                  {loading ? <Spinner /> : <Wand2 size={15} />} AI 작성
                </Button>
              </div>
            </div>
          </Card>
        </div>

        <div className="lg:col-span-3">
          <Card>
            <CardHeader
              title={docTypeLabel[docType]}
              desc={client ? `${client.name} · ${selectedCase?.court}` : undefined}
              action={
                source && <Badge tone={source === "ai" ? "brand" : "muted"}>{source === "ai" ? "AI 작성" : "초안"}</Badge>
              }
            />
            <div className="p-5">
              {draft ? (
                <>
                  <textarea
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    rows={22}
                    className="w-full rounded-lg border border-line bg-surface-2 px-4 py-3 font-mono text-[12.5px] leading-relaxed outline-none focus:border-brand-300 focus:bg-surface focus:ring-2 focus:ring-brand-100"
                  />
                  <div className="mt-3 flex justify-end gap-2">
                    <Button variant="secondary" onClick={copy}>
                      {copied ? <Check size={15} /> : <Copy size={15} />} {copied ? "복사됨" : "복사"}
                    </Button>
                    <Button onClick={saveDoc}>
                      {saved ? <Check size={15} /> : <Save size={15} />} {saved ? "저장됨" : "사건에 저장"}
                    </Button>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center gap-2 py-20 text-center">
                  <FileText size={30} className="text-faint" />
                  <p className="text-[13px] text-muted">서류를 선택하고 작성 버튼을 누르세요.</p>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
