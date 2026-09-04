const { app, BrowserWindow } = require("electron");
const path = require("path");
const fs = require("fs");

const htmlFile = process.argv[2];
const outFile = process.argv[3];
const width = parseInt(process.argv[4] || "1280", 10);
const height = parseInt(process.argv[5] || "640", 10);

app.whenReady().then(async () => {
  const win = new BrowserWindow({
    width,
    height,
    show: false,
    frame: false,
    webPreferences: { offscreen: true }
  });

  const absoluteHtml = path.resolve(htmlFile);
  await win.loadFile(absoluteHtml);
  await new Promise((r) => setTimeout(r, 400));

  const image = await win.webContents.capturePage({ x: 0, y: 0, width, height });
  fs.writeFileSync(path.resolve(outFile), image.toPNG());
  console.log("Captured to:", outFile);
  app.quit();
});
