import type { Metadata } from "next";
import "./globals.css";
import { StoreProvider } from "@/lib/store";
import { AuthProvider } from "@/lib/auth";

const SITE = "https://insight-restart.vercel.app";
const TITLE = "Insight Restart — 개인회생·파산 AI 실무 플랫폼";
const DESC =
  "상담부터 신청·보정·변제·면책까지. 개인회생·파산 업무 전 과정을 AI로 빠르고 정확하게 처리하는 실무자용 플랫폼.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: TITLE,
  description: DESC,
  openGraph: {
    title: TITLE,
    description: DESC,
    url: SITE,
    siteName: "Insight Restart",
    locale: "ko_KR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESC,
  },
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
