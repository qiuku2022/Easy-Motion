import { useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  DUPLICATE_ACTION_LABELS,
  useAssetStore,
} from "@/stores/assetStore";
import type { DuplicateAction, DuplicateResolution } from "@/types/asset";

export function DuplicateImportDialog() {
  const pendingDuplicates = useAssetStore((s) => s.pendingDuplicates);
  const clearPendingDuplicates = useAssetStore((s) => s.clearPendingDuplicates);
  const resolveDuplicateImport = useAssetStore((s) => s.resolveDuplicateImport);
  const isImporting = useAssetStore((s) => s.isImporting);

  const open = pendingDuplicates.length > 0;
  const [choices, setChoices] = useState<Record<string, DuplicateAction>>({});

  const defaultAction: DuplicateAction = "rename";

  const resolutions = useMemo(() => {
    const map: Record<string, DuplicateResolution> = {};
    for (const dup of pendingDuplicates) {
      const action = choices[dup.sourcePath] ?? defaultAction;
      map[dup.sourcePath] = {
        action,
        existingId: dup.existingId,
      };
    }
    return map;
  }, [choices, pendingDuplicates]);

  const setChoice = (sourcePath: string, action: DuplicateAction) => {
    setChoices((prev) => ({ ...prev, [sourcePath]: action }));
  };

  const onConfirm = async () => {
    await resolveDuplicateImport(resolutions);
    setChoices({});
  };

  const onCancel = () => {
    clearPendingDuplicates();
    setChoices({});
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onCancel();
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>发现重复素材</DialogTitle>
          <DialogDescription>
            以下文件与库中已有素材同名或内容相同，请选择处理方式。
          </DialogDescription>
        </DialogHeader>

        <ul className="max-h-56 space-y-3 overflow-y-auto pr-1">
          {pendingDuplicates.map((dup) => {
            const selected = choices[dup.sourcePath] ?? defaultAction;
            return (
              <li
                key={dup.sourcePath}
                className="rounded-md border border-border bg-card/50 p-2.5 text-xs"
              >
                <p className="truncate font-medium text-foreground">
                  {dup.originalName}
                </p>
                <p className="mt-0.5 text-muted-foreground">
                  {dup.reason === "hash"
                    ? `与「${dup.existingName}」内容相同`
                    : `与「${dup.existingName}」同名`}
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {(["skip", "rename", "overwrite"] as DuplicateAction[]).map(
                    (action) => (
                      <Button
                        key={action}
                        type="button"
                        size="sm"
                        variant={selected === action ? "default" : "outline"}
                        className="h-7 text-[11px]"
                        onClick={() => setChoice(dup.sourcePath, action)}
                      >
                        {DUPLICATE_ACTION_LABELS[action]}
                      </Button>
                    ),
                  )}
                </div>
              </li>
            );
          })}
        </ul>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onCancel}>
            取消
          </Button>
          <Button
            type="button"
            disabled={isImporting}
            onClick={() => void onConfirm()}
          >
            继续导入
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
