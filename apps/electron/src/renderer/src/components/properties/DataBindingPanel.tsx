import { useCallback, useState } from "react";
import { FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ClipPatch } from "@/lib/timeline/mutations";
import { getEasyMotion } from "@/types/easyMotion";
import type { Clip } from "@/types/timeline";

interface ParsedData {
  relativePath: string;
  headers: string[];
  rows: Record<string, string>[];
  previewRows: Record<string, string>[];
}

interface DataBindingPanelProps {
  clip: Clip;
  disabled?: boolean;
  onPatch: (patch: ClipPatch) => void;
}

export function DataBindingPanel({
  clip,
  disabled,
  onPatch,
}: DataBindingPanelProps) {
  const [parsed, setParsed] = useState<ParsedData | null>(null);
  const [xField, setXField] = useState("");
  const [yField, setYField] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const applyMapping = useCallback(async () => {
    const api = getEasyMotion();
    if (!api?.data?.mapChart || !parsed) return;
    setLoading(true);
    setError(null);
    const res = await api.data.mapChart({
      rows: parsed.rows,
      xField,
      yField,
    });
    setLoading(false);
    if (!res.success || !res.data) {
      setError(res.error?.message ?? "映射失败");
      return;
    }

    const existingProps =
      clip.source?.props && typeof clip.source.props === "object"
        ? (clip.source.props as Record<string, unknown>)
        : {};

    const isChartClip = clip.type === "chart";

    if (isChartClip) {
      onPatch({
        source: {
          kind: "data",
          chartType: clip.source?.chartType ?? "line",
          data: res.data.data,
          xField,
          yField,
          dataFile: parsed.relativePath,
          title: clip.source?.title ?? clip.name,
        },
      });
      return;
    }

    onPatch({
      source: {
        props: {
          ...existingProps,
          data: res.data.data,
          xField,
          yField,
          dataFile: parsed.relativePath,
        },
      },
    });
  }, [
    clip.name,
    clip.source?.chartType,
    clip.source?.props,
    clip.source?.title,
    clip.type,
    onPatch,
    parsed,
    xField,
    yField,
  ]);

  const pickFile = async () => {
    const api = getEasyMotion();
    if (!api?.data?.pickAndParse) return;
    setLoading(true);
    setError(null);
    const res = await api.data.pickAndParse();
    setLoading(false);
    if (!res.success) {
      setError(res.error?.message ?? "读取失败");
      return;
    }
    if (!res.data) return;
    setParsed(res.data as ParsedData);
    setXField(res.data.headers[0] ?? "");
    setYField(res.data.headers[1] ?? res.data.headers[0] ?? "");
  };

  const headers = parsed?.headers ?? [];

  return (
    <section className="space-y-2 rounded-md border border-border bg-card/40 p-2.5">
      <div className="flex items-center gap-2">
        <FileSpreadsheet className="h-3.5 w-3.5 text-em-teal" />
        <h3 className="text-xs font-medium text-foreground">数据绑定</h3>
      </div>

      <Button
        type="button"
        size="sm"
        variant="outline"
        className="h-8 text-xs"
        disabled={disabled || loading}
        onClick={() => void pickFile()}
      >
        选择 CSV / JSON…
      </Button>

      {parsed && (
        <>
          <p className="text-[10px] text-muted-foreground">
            已导入 {parsed.relativePath} · {parsed.rows.length} 行
          </p>
          <div className="grid grid-cols-2 gap-2">
            <FieldSelect
              label="X 轴字段"
              value={xField}
              headers={headers}
              disabled={disabled}
              onChange={setXField}
            />
            <FieldSelect
              label="Y 轴字段"
              value={yField}
              headers={headers}
              disabled={disabled}
              onChange={setYField}
            />
          </div>
          <Button
            type="button"
            size="sm"
            className="h-8 text-xs"
            disabled={disabled || loading || !xField || !yField}
            onClick={() => void applyMapping()}
          >
            应用到图表
          </Button>
          <DataPreviewTable rows={parsed.previewRows} headers={headers} />
        </>
      )}

      {error && <p className="text-[10px] text-destructive">{error}</p>}
    </section>
  );
}

function FieldSelect({
  label,
  value,
  headers,
  disabled,
  onChange,
}: {
  label: string;
  value: string;
  headers: string[];
  disabled?: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="mb-1 block text-[10px] text-muted-foreground">{label}</label>
      <Select value={value} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger className="h-8 text-xs">
          <SelectValue placeholder="字段" />
        </SelectTrigger>
        <SelectContent>
          {headers.map((header) => (
            <SelectItem key={header} value={header} className="text-xs">
              {header}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function DataPreviewTable({
  rows,
  headers,
}: {
  rows: Record<string, string>[];
  headers: string[];
}) {
  if (!rows.length) return null;
  const previewHeaders = headers.slice(0, 4);
  return (
    <div className="overflow-x-auto rounded border border-border/70">
      <table className="w-full text-[10px]">
        <thead>
          <tr className="bg-muted/40 text-left text-muted-foreground">
            {previewHeaders.map((header) => (
              <th key={header} className="px-2 py-1 font-medium">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index} className="border-t border-border/50">
              {previewHeaders.map((header) => (
                <td key={header} className="px-2 py-1 text-foreground">
                  {String(row[header] ?? "")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
