import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 개발 중 화면에 뜨는 Next.js 개발자 도구(영문 패널)를 숨김.
  // 실제 사이트와 무관하며 개발 화면만 깔끔해집니다.
  devIndicators: false,
};

export default nextConfig;
