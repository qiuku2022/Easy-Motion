import { useRef, useState, type ChangeEvent, type ComponentProps } from "react";
import { Input } from "@/components/ui/input";
import { useScrubNumberInput } from "@/hooks/useScrubNumberInput";
import { cn } from "@/lib/utils";

const NUMERIC_INPUT_PATTERN = /^-?\d*\.?\d*$/;

function filterNumericInput(raw: string): string | null {
  if (raw === "" || raw === "-" || raw === "." || raw === "-.") return raw;
  return NUMERIC_INPUT_PATTERN.test(raw) ? raw : null;
}

interface ScrubNumberInputProps
  extends Omit<ComponentProps<typeof Input>, "type" | "value" | "onChange" | "inputMode"> {
  value: string;
  onChange: (value: string) => void;
  onScrub?: (value: string) => void;
  onCommit?: () => void;
}

export function ScrubNumberInput({
  value,
  onChange,
  onScrub,
  onCommit,
  min: _min,
  max: _max,
  step: _step,
  disabled,
  className,
  onBlur,
  ...props
}: ScrubNumberInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const scrubbingRef = useRef(false);
  const [scrubbing, setScrubbing] = useState(false);
  const { onPointerDown } = useScrubNumberInput({
    value,
    onChange,
    onScrub,
    onCommit,
    min: _min !== undefined ? Number(_min) : undefined,
    max: _max !== undefined ? Number(_max) : undefined,
    step: _step !== undefined ? Number(_step) : 1,
    disabled,
    inputRef,
    onScrubbingChange: (next) => {
      scrubbingRef.current = next;
      setScrubbing(next);
    },
  });

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const next = filterNumericInput(event.target.value);
    if (next !== null) onChange(next);
  };

  return (
    <Input
      {...props}
      ref={inputRef}
      type="text"
      inputMode="decimal"
      autoComplete="off"
      value={value}
      disabled={disabled}
      title="左右拖动调整；Shift 微调，Alt 加速"
      className={cn(
        "font-mono cursor-ew-resize focus:cursor-text",
        scrubbing && "select-none",
        className,
      )}
      onChange={handleChange}
      onPointerDown={onPointerDown}
      onBlur={(e) => {
        if (scrubbingRef.current) return;
        onBlur?.(e);
      }}
    />
  );
}
