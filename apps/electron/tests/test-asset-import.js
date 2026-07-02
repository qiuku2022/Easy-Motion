const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const assetService = require("../src/main/services/asset-service");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function main() {
  const projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), "em-asset-import-"));
  const remotionDir = path.join(
    projectRoot,
    "subprojects",
    "default",
    "remotion",
  );
  fs.mkdirSync(path.join(remotionDir, "public"), { recursive: true });
  fs.mkdirSync(path.join(projectRoot, "assets", "image"), { recursive: true });

  const sourceFile = path.join(os.tmpdir(), `em-test-${Date.now()}.png`);
  const pngHeader = Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
  ]);
  fs.writeFileSync(sourceFile, pngHeader);

  const asset = await assetService.importAssetSource(
    projectRoot,
    {
      source: sourceFile,
      type: "image",
      name: "测试图",
    },
    { subprojectPath: "subprojects/default", fps: 30 },
  );

  assert(asset.id, "asset should have id");
  assert(asset.type === "image", "asset type image");
  assert(asset.name === "测试图", "asset name updated");
  assert(asset.contentHash, "asset should have content hash");
  assert(typeof asset.sizeBytes === "number", "asset should have size");
  assert(fs.existsSync(path.join(projectRoot, asset.path)), "asset file copied");

  const duplicateScan = await assetService.scanImportDuplicates(projectRoot, [
    sourceFile,
  ]);
  assert(duplicateScan.length === 1, "duplicate scan should find existing file");
  assert(duplicateScan[0].reason === "hash", "duplicate by hash");

  const blocked = await assetService.importAssetFiles(projectRoot, [sourceFile], {
    subprojectPath: "subprojects/default",
    fps: 30,
  });
  assert(blocked.needsDuplicateResolution, "import should ask for duplicate resolution");

  const skipped = await assetService.importAssetFiles(
    projectRoot,
    [sourceFile],
    {
      subprojectPath: "subprojects/default",
      fps: 30,
      duplicateResolutions: {
        [sourceFile]: { action: "skip", existingId: asset.id },
      },
    },
  );
  assert(skipped.skipped?.length === 1, "skip duplicate should not import again");
  assert(skipped.imported.length === 0, "no new import on skip");

  const updated = await assetService.updateAssetMeta(projectRoot, asset.id, {
    isFavorite: true,
  });
  assert(updated.isFavorite === true, "favorite flag updated");

  const used = await assetService.recordAssetUsage(projectRoot, asset.id);
  assert(used.usageCount === 1, "usage count incremented");
  assert(used.lastUsedAt, "last used timestamp set");

  console.log("asset import tests passed");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
