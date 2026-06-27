import type { Metadata } from "next";
import "./globals.css";
import { StoreProvider } from "@/lib/store";
import { AuthProvider } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Insight Restart — 개인회생·파산 AI 실무 플랫폼",
  description:
    "상담부터 신청서·보정·변제·면책까지. 개인회생·파산 업무 전 과정을 AI로 빠르고 정확하게 처리하는 실무자용 구독 서비스.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko" className="h-full">
      <body className="min-h-full antialiased">
        <AuthProvider>
          <StoreProvider>{children}</StoreProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
