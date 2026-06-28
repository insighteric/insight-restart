import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Insight Restart — 개인회생·파산 AI 실무 플랫폼";

const FONTS = {
  pretendardBold: "https://cdn.jsdelivr.net/npm/pretendard@1.3.9/dist/web/static/woff/Pretendard-Bold.woff",
  pretendardReg: "https://cdn.jsdelivr.net/npm/pretendard@1.3.9/dist/web/static/woff/Pretendard-Regular.woff",
  manropeBold: "https://cdn.jsdelivr.net/npm/@fontsource/manrope@5/files/manrope-latin-700-normal.woff",
};

export default async function Image() {
  const [pBold, pReg, mBold] = await Promise.all([
    fetch(FONTS.pretendardBold).then((r) => r.arrayBuffer()),
    fetch(FONTS.pretendardReg).then((r) => r.arrayBuffer()),
    fetch(FONTS.manropeBold).then((r) => r.arrayBuffer()),
  ]);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          background: "linear-gradient(135deg,#0c0e12,#16191f)",
          position: "relative",
          padding: "0 84px",
        }}
      >
        <div style={{ position: "absolute", top: 0, left: 0, width: "100%", height: 8, background: "#c2a45c", display: "flex" }} />
        {/* 로고 타일 */}
        <div
          style={{
            width: 280,
            height: 280,
            borderRadius: 44,
            background: "#000",
            border: "3px solid #c2a45c",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginRight: 64,
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="https://insight-restart.vercel.app/logo.png" width={234} height={234} alt="logo" />
        </div>
        {/* 텍스트 */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontFamily: "Manrope", fontWeight: 700, fontSize: 74, color: "#f5f6f8", letterSpacing: -1 }}>
            Insight Restart
          </div>
          <div style={{ fontFamily: "Pretendard", fontWeight: 700, fontSize: 38, color: "#c8a85f", marginTop: 10 }}>
            개인회생·파산 AI 실무 플랫폼
          </div>
          <div style={{ fontFamily: "Pretendard", fontWeight: 400, fontSize: 28, color: "#aeb3bc", marginTop: 16 }}>
            상담·신청·보정·변제·면책까지, AI로 한 번에
          </div>
          <div style={{ fontFamily: "Manrope", fontWeight: 700, fontSize: 26, color: "#c2a45c", marginTop: 26 }}>
            insight-restart.vercel.app
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Pretendard", data: pBold, weight: 700, style: "normal" },
        { name: "Pretendard", data: pReg, weight: 400, style: "normal" },
        { name: "Manrope", data: mBold, weight: 700, style: "normal" },
      ],
    },
  );
}
