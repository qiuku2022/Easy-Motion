const { app, BrowserWindow } = require("electron");
const path = require("path");
const fs = require("fs");

app.whenReady().then(async () => {
  const win = new BrowserWindow({
    width: 1200,
    height: 640,
    show: false,
    frame: false,
    webPreferences: {
      offscreen: true
    }
  });

  const htmlPath = path.join(__dirname, "preview_vector_icons.html");
  await win.loadFile(htmlPath);
  await new Promise((r) => setTimeout(r, 400));

  const image = await win.webContents.capturePage({ x: 0, y: 0, width: 1200, height: 640 });
  const outPath = "C:/Users/qiuku/.gemini/antigravity/brain/aaabf02a-df37-4f79-82e6-36a663552d7d/vector_icons_preview.png";
  fs.writeFileSync(outPath, image.toPNG());
  console.log("SUCCESS: Captured preview to", outPath);
  app.quit();
});
