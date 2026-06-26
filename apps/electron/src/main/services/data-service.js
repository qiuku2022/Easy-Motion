const fs = require("node:fs");
const path = require("node:path");
const { copyFile, ensureDir } = require("./file-service");

function parseCsv(text) {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length === 0) {
    return { headers: [], rows: [] };
  }

  const headers = splitCsvLine(lines[0]);
  const rows = lines.slice(1).map((line) => {
    const cells = splitCsvLine(line);
    const row = {};
    headers.forEach((header, index) => {
      row[header] = cells[index] ?? "";
    });
    return row;
  });

  return { headers, rows };
}

function splitCsvLine(line) {
  const cells = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (ch === "," && !inQuotes) {
      cells.push(current.trim());
      current = "";
      continue;
    }
    current += ch;
  }

  cells.push(current.trim());
  return cells;
}

function parseDataFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const raw = fs.readFileSync(filePath, "utf8");

  if (ext === ".json") {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      const headers = parsed.length > 0 ? Object.keys(parsed[0]) : [];
      return { headers, rows: parsed };
    }
    if (Array.isArray(parsed.rows)) {
      const headers =
        parsed.headers ??
        (parsed.rows[0] ? Object.keys(parsed.rows[0]) : []);
      return { headers, rows: parsed.rows };
    }
    throw new Error("JSON 数据需为数组或 { headers, rows }");
  }

  if (ext === ".csv") {
    return parseCsv(raw);
  }

  throw new Error("仅支持 CSV 或 JSON 数据文件");
}

async function importDataFileToProject(projectRoot, sourcePath) {
  const parsed = parseDataFile(sourcePath);
  const id = path.basename(sourcePath, path.extname(sourcePath));
  const ext = path.extname(sourcePath);
  const storedName = `${id}-${Date.now()}${ext}`;
  const relativePath = path.posix.join("data", storedName);
  const destPath = path.join(projectRoot, "data", storedName);

  ensureDir(path.dirname(destPath));
  await copyFile(sourcePath, destPath);

  return {
    relativePath,
    absolutePath: destPath,
    ...parsed,
    previewRows: parsed.rows.slice(0, 8),
  };
}

function mapRowsToChartData(rows, xField, yField) {
  return rows
    .map((row) => ({
      label: String(row[xField] ?? ""),
      value: Number(row[yField]),
    }))
    .filter((item) => item.label && Number.isFinite(item.value));
}

module.exports = {
  parseDataFile,
  importDataFileToProject,
  mapRowsToChartData,
};
