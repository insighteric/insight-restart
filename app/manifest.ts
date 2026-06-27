import type { MetadataRoute } from "next";

// PWA 매니페스트 — 브라우저에서 '앱 설치'로 데스크톱 앱처럼 사용 가능
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Insight Restart — 개인회생·파산 AI 실무",
    short_name: "Insight Restart",
    description: "개인회생·파산 업무 전 과정을 AI로 처리하는 실무자용 플랫폼",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#0f1115",
    theme_color: "#0f1115",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
