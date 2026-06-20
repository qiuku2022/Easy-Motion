import {
  forwardRef,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import {
  clamp,
  hexToHsv,
  hsvToHex,
  normalizeHex,
  swatchStyle,
} from "@/lib/colorUtils";
import { cn } from "@/lib/utils";

const QUICK_COLORS = [
  "#ffffff",
  "#111827",
  "#3b82f6",
  "#4361ee",
  "#7209b7",
  "#f72585",
  "#22c55e",
  "#eab308",
];

const PANEL_WIDTH = 248;
const PANEL_HEIGHT = 320;

interface ColorFieldProps {
  value: string;
  onChange: (hex: string) => void;
  /** 用户完成选色后提交（关闭面板、失焦、回车等） */
  onCommit?: (hex: string) => void;
  disabled?: boolean;
  className?: string;
  id?: string;
  "aria-label"?: string;
}

function SaturationValuePanel({
  hue,
  saturation,
  brightness,
  disabled,
  onChange,
}: {
  hue: number;
  saturation: number;
  brightness: number;
  disabled?: boolean;
  onChange: (saturation: number, brightness: number) => void;
}) {
  const panelRef = useRef<HTMLDivElement>(null);

  const updateFromClient = useCallback(
    (clientX: number, clientY: number) => {
      const rect = panelRef.current?.getBoundingClientRect();
      if (!rect) return;
      const s = clamp((clientX - rect.left) / rect.width, 0, 1);
      const v = clamp(1 - (clientY - rect.top) / rect.height, 0, 1);
      onChange(s, v);
    },
    [onChange],
  );

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (disabled) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    updateFromClient(event.clientX, event.clientY);
  };

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (disabled || !event.currentTarget.hasPointerCapture(event.pointerId)) {
      return;
    }
    updateFromClient(event.clientX, event.clientY);
  };

  return (
    <div
      ref={panelRef}
      className={cn(
        "relative h-[132px] w-full overflow-hidden rounded-[var(--radius-control)] ring-1 ring-border",
        disabled ? "cursor-not-allowed opacity-60" : "cursor-crosshair",
      )}
      style={{ backgroundColor: `hsl(${hue} 100% 50%)` }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
    >
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-white to-transparent" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black to-transparent" />
      <div
        className="pointer-events-none absolute size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,0.35)]"
        style={{
          left: `${saturation * 100}%`,
          top: `${(1 - brightness) * 100}%`,
        }}
      />
    </div>
  );
}

function computePanelPosition(anchor: DOMRect) {
  let left = anchor.right - PANEL_WIDTH;
  let top = anchor.bottom + 8;

  if (left < 8) left = 8;
  if (left + PANEL_WIDTH > window.innerWidth - 8) {
    left = window.innerWidth - PANEL_WIDTH - 8;
  }
  if (top + PANEL_HEIGHT > window.innerHeight - 8) {
    top = anchor.top - PANEL_HEIGHT - 8;
  }
  if (top < 8) top = 8;

  return { top, left };
}

export const ColorField = forwardRef<HTMLDivElement, ColorFieldProps>(
  function ColorField(
    {
      value,
      onChange,
      onCommit,
      disabled,
      className,
      id,
      "aria-label": ariaLabel = "选择颜色",
    },
    ref,
  ) {
    const fallbackId = useId();
    const inputId = id ?? fallbackId;
    const anchorRef = useRef<HTMLDivElement>(null);
    const panelRef = useRef<HTMLDivElement>(null);
    const openedAtRef = useRef(0);
    const [open, setOpen] = useState(false);
    const [panelPos, setPanelPos] = useState({ top: 0, left: 0 });
    const [hexInput, setHexInput] = useState(normalizeHex(value));
    const [hsv, setHsv] = useState(() => hexToHsv(value));

    useEffect(() => {
      if (open) return;
      const next = normalizeHex(value);
      setHexInput(next);
      setHsv(hexToHsv(next));
    }, [value, open]);

    const updatePanelPosition = useCallback(() => {
      const anchor = anchorRef.current?.getBoundingClientRect();
      if (!anchor) return;
      setPanelPos(computePanelPosition(anchor));
    }, []);

    const openPicker = useCallback(() => {
      if (disabled) return;
      openedAtRef.current = Date.now();
      setOpen(true);
    }, [disabled]);

    const closePicker = useCallback(() => {
      if (Date.now() - openedAtRef.current < 250) return;
      setOpen(false);
    }, []);

    useLayoutEffect(() => {
      if (!open) return;
      updatePanelPosition();
    }, [open, updatePanelPosition]);

    useEffect(() => {
      if (!open) return;
      const onLayoutChange = () => updatePanelPosition();
      window.addEventListener("resize", onLayoutChange);
      window.addEventListener("scroll", onLayoutChange, true);
      return () => {
        window.removeEventListener("resize", onLayoutChange);
        window.removeEventListener("scroll", onLayoutChange, true);
      };
    }, [open, updatePanelPosition]);

    useEffect(() => {
      if (!open) return;
      const onPointerDown = (event: PointerEvent) => {
        const target = event.target as Node;
        if (anchorRef.current?.contains(target)) return;
        if (panelRef.current?.contains(target)) return;
        closePicker();
      };
      document.addEventListener("pointerdown", onPointerDown);
      return () => document.removeEventListener("pointerdown", onPointerDown);
    }, [open, closePicker]);

    const applyHex = useCallback(
      (raw: string, options?: { commit?: boolean }) => {
        const hex = normalizeHex(raw, normalizeHex(value));
        setHexInput(hex);
        setHsv(hexToHsv(hex));
        onChange(hex);
        if (options?.commit) {
          onCommit?.(hex);
        }
      },
      [onChange, onCommit, value],
    );

    const previewHex = useCallback(
      (raw: string) => {
        const hex = normalizeHex(raw, normalizeHex(value));
        setHexInput(hex);
        setHsv(hexToHsv(hex));
        onChange(hex);
        onCommit?.(hex);
      },
      [onChange, onCommit, value],
    );

    const onHueChange = (values: number[]) => {
      const next = { ...hsv, h: values[0] ?? hsv.h };
      previewHex(hsvToHex(next));
    };

    const onSaturationBrightnessChange = (s: number, v: number) => {
      previewHex(hsvToHex({ ...hsv, s, v }));
    };

    const onHexInputChange = (raw: string) => {
      setHexInput(raw);
      if (/^#[0-9a-fA-F]{6}$/.test(raw.trim())) {
        previewHex(raw);
      }
    };

    const onHexBlur = (event?: React.FocusEvent) => {
      const next = event?.relatedTarget as Node | null;
      if (next && panelRef.current?.contains(next)) return;
      if (next && anchorRef.current?.contains(next)) return;
      applyHex(hexInput, { commit: true });
    };

    const pickerPanel = open ? (
      <>
        <div
          className="fixed inset-0 z-[9998] bg-black/20"
          aria-hidden
          onPointerDown={() => closePicker()}
        />
        <div
          ref={panelRef}
          role="dialog"
          aria-label={ariaLabel}
          className="fixed z-[9999] flex w-[248px] flex-col gap-3 rounded-lg border border-border bg-popover p-3 text-popover-foreground shadow-xl ring-1 ring-foreground/10"
          style={{ top: panelPos.top, left: panelPos.left }}
          onPointerDown={(event) => event.stopPropagation()}
        >
          <SaturationValuePanel
            hue={hsv.h}
            saturation={hsv.s}
            brightness={hsv.v}
            disabled={disabled}
            onChange={onSaturationBrightnessChange}
          />

          <div className="space-y-2">
            <div
              className="relative h-3 w-full rounded-full"
              style={{
                background:
                  "linear-gradient(to right, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00)",
              }}
            >
              <Slider
                min={0}
                max={360}
                step={1}
                value={[hsv.h]}
                disabled={disabled}
                className="absolute inset-0 [&_[data-slot=slider-track]]:bg-transparent [&_[data-slot=slider-range]]:bg-transparent"
                onValueChange={onHueChange}
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span
              className="size-8 shrink-0 rounded-[var(--radius-control)] ring-1 ring-border"
              style={swatchStyle(hexInput)}
            />
            <Input
              value={hexInput}
              disabled={disabled}
              className="h-8 flex-1 font-mono text-xs uppercase"
              spellCheck={false}
              onChange={(e) => onHexInputChange(e.target.value)}
              onBlur={(e) => onHexBlur(e)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  applyHex(hexInput, { commit: true });
                }
                if (e.key === "Escape") {
                  e.preventDefault();
                  closePicker();
                }
              }}
            />
          </div>

          <div className="grid grid-cols-8 gap-1.5">
            {QUICK_COLORS.map((color) => (
              <button
                key={color}
                type="button"
                disabled={disabled}
                aria-label={`使用 ${color}`}
                className={cn(
                  "aspect-square rounded-[var(--radius-control)] ring-1 ring-inset ring-foreground/10 transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  normalizeHex(hexInput) === color &&
                    "ring-2 ring-foreground/70",
                )}
                style={{ backgroundColor: color }}
                onClick={() => {
                  applyHex(color, { commit: true });
                }}
              />
            ))}
          </div>
        </div>
      </>
    ) : null;

    return (
      <div
        ref={(node) => {
          anchorRef.current = node;
          if (typeof ref === "function") ref(node);
          else if (ref) ref.current = node;
        }}
        className={cn("flex items-center gap-1.5", className)}
      >
        <Button
          type="button"
          variant="outline"
          size="icon"
          disabled={disabled}
          className="h-8 w-8 shrink-0 p-0"
          aria-label={ariaLabel}
          aria-haspopup="dialog"
          aria-expanded={open}
          onMouseDown={(event) => event.preventDefault()}
          onClick={openPicker}
        >
          <span
            className="block size-5 rounded-[var(--radius-control)] ring-1 ring-inset ring-foreground/10"
            style={swatchStyle(hexInput)}
          />
        </Button>

        <Input
          id={inputId}
          type="text"
          value={hexInput}
          disabled={disabled}
          placeholder="#RRGGBB"
          className="h-8 flex-1 font-mono text-xs uppercase"
          spellCheck={false}
          onFocus={openPicker}
          onClick={openPicker}
          onChange={(e) => onHexInputChange(e.target.value)}
          onBlur={(e) => onHexBlur(e)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              applyHex(hexInput, { commit: true });
            }
            if (e.key === "Escape") {
              e.preventDefault();
              closePicker();
            }
          }}
        />

        {typeof document !== "undefined" && pickerPanel
          ? createPortal(pickerPanel, document.body)
          : null}
      </div>
    );
  },
);
