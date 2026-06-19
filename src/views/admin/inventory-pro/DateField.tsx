"use client";

import * as React from "react";
import { formatDateSafe } from "@/utils/formatDate";
import { CalendarIcon } from "lucide-react";
import { format, parse, isValid } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Props {
  value: string; // yyyy-MM-dd
  onChange: (v: string) => void;
  placeholder?: string;
}

/** Combined manual-entry + calendar picker. User can type dd/MM/yyyy or pick from calendar. */
export function DateField({ value, onChange, placeholder = "dd/mm/yyyy" }: Props) {
  const [open, setOpen] = React.useState(false);
  const [text, setText] = React.useState(value ? formatDateSafe(new Date(value), "dd/MM/yyyy") : "");

  React.useEffect(() => {
    setText(value ? formatDateSafe(new Date(value), "dd/MM/yyyy") : "");
  }, [value]);

  const date = value ? new Date(value) : undefined;

  function handleTextBlur() {
    if (!text) { onChange(""); return; }
    const parsed = parse(text, "dd/MM/yyyy", new Date());
    if (isValid(parsed)) onChange(format(parsed, "yyyy-MM-dd"));
    else setText(value ? formatDateSafe(new Date(value), "dd/MM/yyyy") : "");
  }

  return (
    <div className="flex gap-1">
      <Input
        value={text}
        placeholder={placeholder}
        onChange={(e) => setText(e.target.value)}
        onBlur={handleTextBlur}
        className="flex-1"
      />
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button type="button" variant="outline" size="icon" className={cn(!date && "text-muted-foreground")}>
            <CalendarIcon className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0 z-50 bg-popover" align="end">
          <Calendar
            mode="single"
            selected={date}
            onSelect={(d) => {
              if (d) { onChange(format(d, "yyyy-MM-dd")); setOpen(false); }
            }}
            initialFocus
            className={cn("p-3 pointer-events-auto")}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
