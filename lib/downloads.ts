// 데스크톱 설치파일 다운로드 주소
// 실제 설치파일(.exe/.dmg)을 빌드·호스팅(예: GitHub Releases)한 뒤
// Vercel 환경변수에 주소를 넣으면 버튼이 자동 활성화됩니다. 미설정 시 '준비 중'.
export const DOWNLOADS = {
  version: process.env.NEXT_PUBLIC_APP_VERSION || "",
  windows: process.env.NEXT_PUBLIC_DOWNLOAD_WIN || "",
  mac: process.env.NEXT_PUBLIC_DOWNLOAD_MAC || "", // Apple Silicon 또는 universal
  macIntel: process.env.NEXT_PUBLIC_DOWNLOAD_MAC_INTEL || "",
};

export const hasAnyDownload = () => !!(DOWNLOADS.windows || DOWNLOADS.mac || DOWNLOADS.macIntel);
