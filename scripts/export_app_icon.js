const { app, BrowserWindow } = require("electron");
const path = require("path");
const fs = require("fs");

const svgPath = path.resolve(__dirname, "../apps/electron/resources/icons/app-icon.svg");
const buildDir = path.resolve(__dirname, "../apps/electron/build");
const publicDir = path.resolve(__dirname, "../apps/electron/src/renderer/public");

app.whenReady().then(async () => {
  const win = new BrowserWindow({
    width: 1024,
    height: 1024,
    show: false,
    frame: false,
    transparent: true,
    webPreferences: { offscreen: true }
  });

  const svgContent = fs.readFileSync(svgPath, "utf8");
  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <style>
          * { margin: 0; padding: 0; }
          body {
            background: transparent;
            width: 1024px;
            height: 1024px;
            overflow: hidden;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          svg { width: 1024px; height: 1024px; }
        </style>
      </head>
      <body>
        ${svgContent}
      </body>
    </html>
  `;

  await win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`);
  await new Promise((r) => setTimeout(r, 400));

  const image = await win.webContents.capturePage({ x: 0, y: 0, width: 1024, height: 1024 });
  const pngBuffer = image.toPNG();

  fs.mkdirSync(buildDir, { recursive: true });
  fs.mkdirSync(publicDir, { recursive: true });

  const buildPng = path.join(buildDir, "icon.png");
  const publicPng = path.join(publicDir, "app-icon.png");

  fs.writeFileSync(buildPng, pngBuffer);
  fs.writeFileSync(publicPng, pngBuffer);
  console.log("Successfully exported 1024x1024 PNG to:", buildPng, "and", publicPng);

  app.quit();
});
