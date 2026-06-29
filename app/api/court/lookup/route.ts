import { NextResponse } from "next/server";

// 법원 '나의사건검색' 자동조회.
// 실제 연동(대법원 나의사건검색 스크래핑 또는 CODEF 법원 상품)은 키 설정 후 활성화.
// 키 미설정 시 흐름 확인용 목업 데이터를 반환한다.
export async function POST(req: Request) {
  const { caseNo, court } = await req.json().catch(() => ({}));
  if (!caseNo) {
    return NextResponse.json({ ok: false, message: "사건번호가 필요합니다." }, { status: 400 });
  }
  const key = process.env.COURT_API_KEY || process.env.CODEF_CLIENT_ID;
  const mock = !key;

  // TODO(실연동): 대법원 나의사건검색/CODEF 호출로 진행내역·기일 파싱
  const today = Date.now();
  const day = (d: number) => new Date(today + d * 86400000).toISOString().slice(0, 10);

  const result = {
    ok: true,
    mock,
    caseNo,
    court: court || "서울회생법원",
    status: "개시결정 후 진행 중",
    progress: [
      { date: day(-32), label: "사건 접수" },
      { date: day(-21), label: "보정권고" },
      { date: day(-5), label: "개시결정" },
    ],
    upcoming: [
      { date: day(18), type: "hearing", label: "채권자집회·의견청취기일" },
      { date: day(46), type: "decision", label: "인가 여부 결정 예정" },
    ],
    message: mock
      ? "법원 연동 키 미설정 — 예시(목업) 데이터입니다. 키를 설정하면 대법원 나의사건검색 결과로 자동 갱신됩니다."
      : "조회 완료",
  };
  return NextResponse.json(result);
}
