import * as React from "react";
import { Input } from "@/components/ui/input";

type Props = Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "type"> & {
  value: number | string;
  onChange: (e: { target: { value: string } }) => void;
};

/**
 * NumberInput — strips leading zeros and shows empty when value is 0.
 * Drop-in replacement for `<Input type="number" value={x} onChange={...} />`
 */
export const NumberInput = React.forwardRef<HTMLInputElement, Props>(({ value, onChange, onFocus, ...rest }, ref) => {
  const display = value === 0 || value === "0" || value === "" || value == null ? "" : String(value);
  return (
    <Input
      ref={ref}
      type="number"
      inputMode="decimal"
      value={display}
      onFocus={(e) => { e.currentTarget.select(); onFocus?.(e); }}
      onChange={(e) => {
        let v = e.target.value;
        // strip leading zeros (but preserve "0." and single "0")
        if (v.length > 1 && v.startsWith("0") && !v.startsWith("0.")) {
          v = v.replace(/^0+/, "") || "0";
        }
        onChange({ target: { value: v } });
      }}
      {...rest}
    />
  );
});
NumberInput.displayName = "NumberInput";
