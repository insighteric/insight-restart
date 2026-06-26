"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { Modal } from "./Modal";
import { Button, Field, Input } from "./ui";
import type { CaseType } from "@/lib/types";

const COURTS = [
  "서울회생법원",
  "수원회생법원",
  "부산회생법원",
  "인천지방법원",
  "의정부지방법원",
  "대전지방법원",
  "대구지방법원",
  "광주지방법원",
];

export function NewCaseDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { addClient, addCase } = useStore();
  const router = useRouter();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [type, setType] = useState<CaseType>("rehab");
  const [court, setCourt] = useState(COURTS[0]);
  const [income, setIncome] = useState("");
  const [dependents, setDependents] = useState("1");

  const reset = () => {
    setName("");
    setPhone("");
    setType("rehab");
    setCourt(COURTS[0]);
    setIncome("");
    setDependents("1");
  };

  const submit = () => {
    if (!name.trim()) return;
    const clientId = `cl_${Date.now().toString(36)}`;
    const caseId = `ca_${Date.now().toString(36)}`;
    const now = new Date().toISOString().slice(0, 10);
    addClient({ id: clientId, name: name.trim(), phone: phone.trim(), createdAt: now });
    addCase({
      id: caseId,
      type,
      clientId,
      court,
      stage: "consult",
      status: "active",
      assignee: "담당 사무장",
      createdAt: now,
      income: {
        monthlyIncome: Number(income.replace(/[^0-9]/g, "")) || 0,
        incomeType: "salary",
        dependents: Number(dependents) || 1,
      },
      creditors: [],
      assets: [],
    });
    reset();
    onClose();
    router.push(`/cases/${caseId}`);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="새 사건 등록"
      desc="의뢰인과 사건 기본정보를 입력합니다. 채무·재산은 사건 상세에서 추가합니다."
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            취소
          </Button>
          <Button onClick={submit} disabled={!name.trim()}>
            등록하고 사건 열기
          </Button>
        </>
      }
    >
      <div className="grid gap-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="의뢰인 성명">
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="홍길동" />
          </Field>
          <Field label="연락처">
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="010-0000-0000" />
          </Field>
        </div>

        <Field label="사건 유형">
          <div className="grid grid-cols-2 gap-2">
            {(["rehab", "bankruptcy"] as CaseType[]).map((t) => (
              <button
                key={t}
                onClick={() => setType(t)}
                className={`rounded-lg border px-4 py-2.5 text-sm font-semibold transition-colors ${
                  type === t
                    ? "border-brand bg-brand-50 text-brand-700"
                    : "border-line text-ink-soft hover:bg-surface-2"
                }`}
              >
                {t === "rehab" ? "개인회생" : "개인파산"}
              </button>
            ))}
          </div>
        </Field>

        <Field label="관할 법원">
          <select
            value={court}
            onChange={(e) => setCourt(e.target.value)}
            className="h-9.5 w-full rounded-lg border border-line bg-surface px-3 text-sm outline-none focus:border-brand-300 focus:ring-2 focus:ring-brand-100"
          >
            {COURTS.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="월 소득(세후)" hint="원 단위">
            <Input
              value={income}
              onChange={(e) => setIncome(e.target.value)}
              placeholder="2,900,000"
              inputMode="numeric"
            />
          </Field>
          <Field label="가구원수" hint="본인 포함">
            <Input
              value={dependents}
              onChange={(e) => setDependents(e.target.value)}
              inputMode="numeric"
            />
          </Field>
        </div>
      </div>
    </Modal>
  );
}
