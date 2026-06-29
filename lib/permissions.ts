// 선별적 권한 시스템
// owner(대표)는 항상 전체 권한. staff는 부여된 권한만.

export const PERMISSIONS = [
  { key: "dashboard", label: "경영 대시보드", desc: "전체 통계·흐름 열람" },
  { key: "revenue", label: "매출 통계", desc: "매출(일·주·월·기간)" },
  { key: "receivables", label: "미수금 통계", desc: "미수금·연체 현황" },
  { key: "contracts", label: "계약 통계", desc: "신규 계약(수임) 통계" },
  { key: "payments", label: "분납관리", desc: "수임료 분납·납입 관리" },
  { key: "members", label: "멤버·권한 관리", desc: "관리자 지정/해제, 권한 부여" },
  { key: "print", label: "인쇄·PDF 내보내기", desc: "매뉴얼·보고서 인쇄/PDF 저장" },
] as const;

export type PermKey = (typeof PERMISSIONS)[number]["key"];

export const ALL_PERM_KEYS: PermKey[] = PERMISSIONS.map((p) => p.key);
export const permLabel = (k: string) => PERMISSIONS.find((p) => p.key === k)?.label ?? k;
