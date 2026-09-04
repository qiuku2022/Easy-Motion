const { app, BrowserWindow } = require("electron");
const path = require("path");
const fs = require("fs");

const htmlPath = process.argv[2];
const outPath = process.argv[3];
const width = parseInt(process.argv[4] || "1024", 10);
const height = parseInt(process.argv[5] || "1024", 10);

if (!htmlPath || !outPath) {
  console.error("Usage: electron render_svg.js <htmlPath> <outPath> [width] [height]");
  process.exit(1);
}

app.whenReady().then(async () => {
  const win = new BrowserWindow({
    width,
    height,
    show: false,
    frame: false,
    transparent: true,
    webPreferences: {
      offscreen: true
    }
  });

  const absoluteHtml = path.resolve(htmlPath);
  await win.loadFile(absoluteHtml);
  // Wait a moment for fonts/svg to settle
  await new Promise((r) => setTimeout(r, 200));

  const image = await win.webContents.capturePage({ x: 0, y: 0, width, height });
  fs.writeFileSync(path.resolve(outPath), image.toPNG());
  console.log("Captured to:", outPath);
  app.quit();
});
