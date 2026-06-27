// Insight Restart 데스크톱 앱 (Electron)
// 배포된 웹앱을 네이티브 창에서 띄운다 → 항상 최신 버전, 유지보수 간단.
const { app, BrowserWindow, shell, Menu } = require("electron");

const APP_URL = process.env.APP_URL || "https://insight-restart.vercel.app";

function createWindow() {
  const win = new BrowserWindow({
    width: 1320,
    height: 860,
    minWidth: 980,
    minHeight: 640,
    backgroundColor: "#0f1115",
    title: "Insight Restart",
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  win.loadURL(APP_URL);

  // 외부(다른 도메인) 링크는 기본 브라우저로 열기
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith(APP_URL)) return { action: "allow" };
    shell.openExternal(url);
    return { action: "deny" };
  });

  // 앱 도메인 밖으로의 메인 네비게이션은 외부 브라우저로
  win.webContents.on("will-navigate", (e, url) => {
    if (!url.startsWith(APP_URL)) {
      e.preventDefault();
      shell.openExternal(url);
    }
  });

  return win;
}

app.whenReady().then(() => {
  // 메뉴 최소화(편집 단축키는 유지)
  Menu.setApplicationMenu(
    Menu.buildFromTemplate([
      { label: "Insight Restart", submenu: [{ role: "reload" }, { role: "togglefullscreen" }, { type: "separator" }, { role: "quit" }] },
      { label: "편집", submenu: [{ role: "undo" }, { role: "redo" }, { type: "separator" }, { role: "cut" }, { role: "copy" }, { role: "paste" }, { role: "selectAll" }] },
    ]),
  );

  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
