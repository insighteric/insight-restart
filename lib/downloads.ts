// 데스크톱 설치파일 다운로드 주소
// 실제 설치파일(.exe/.dmg)을 빌드·호스팅(예: GitHub Releases)한 뒤
// Vercel 환경변수에 주소를 넣으면 버튼이 자동 활성화됩니다. 미설정 시 '준비 중'.
const REL = "https://github.com/insighteric/insight-restart/releases/download/v1.0.0";
export const DOWNLOADS = {
  version: process.env.NEXT_PUBLIC_APP_VERSION || "1.0.0",
  windows: process.env.NEXT_PUBLIC_DOWNLOAD_WIN || `${REL}/Insight-Restart-Setup-1.0.0.exe`,
  mac: process.env.NEXT_PUBLIC_DOWNLOAD_MAC || `${REL}/Insight-Restart-1.0.0-arm64.dmg`, // Apple Silicon
  macIntel: process.env.NEXT_PUBLIC_DOWNLOAD_MAC_INTEL || "", // Intel Mac 빌드는 추후 추가
};

export const hasAnyDownload = () => !!(DOWNLOADS.windows || DOWNLOADS.mac || DOWNLOADS.macIntel);

// GitHub Actions가 빌드해 게시하는 최신 릴리스(설치파일) 페이지
export const RELEASES_URL = "https://github.com/insighteric/insight-restart/releases/latest";
