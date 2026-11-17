'use client';

import { useState } from 'react';
import { format, isAfter, parseISO, subDays } from 'date-fns';
import { CalendarDays } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

const ISO_DATE = 'yyyy-MM-dd';
const SHOWN_DATE = 'd MMM yyyy';

const QUICK_PICKS = [
  { label: 'Today', daysAgo: 0 },
  { label: '7 days ago', daysAgo: 7 },
  { label: '30 days ago', daysAgo: 30 }
];

interface DatePickerProps {
  id?: string;
  value: string;
  max?: string;
  onChange: (date: string) => void;
  className?: string;
}

// value and max are ISO dates (yyyy-MM-dd) in local time
export function DatePicker({ id, value, max, onChange, className }: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const selected = value ? parseISO(value) : undefined;
  const maxDate = max ? parseISO(max) : undefined;

  const pick = (date: Date | undefined) => {
    if (date) {
      onChange(format(date, ISO_DATE));
      setOpen(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          id={id}
          type="button"
          className={cn(
            'flex h-10 w-full items-center gap-2 rounded-[10px] border border-input bg-card px-3 text-left text-sm transition-colors hover:bg-secondary focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none data-[state=open]:ring-2 data-[state=open]:ring-ring',
            !selected && 'text-muted-foreground',
            className
          )}
        >
          <CalendarDays aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
          {selected ? format(selected, SHOWN_DATE) : 'Pick a date'}
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-0">
        <Calendar
          mode="single"
          selected={selected}
          onSelect={pick}
          defaultMonth={selected}
          disabled={maxDate ? { after: maxDate } : undefined}
          weekStartsOn={1}
          autoFocus
        />
        <div className="flex gap-1 border-t p-2">
          {QUICK_PICKS.map((quick) => {
            const date = subDays(new Date(), quick.daysAgo);
            return (
              <Button
                key={quick.label}
                variant="ghost"
                size="sm"
                className="h-8 flex-1 px-2 text-xs whitespace-nowrap"
                disabled={maxDate ? isAfter(date, maxDate) : false}
                onClick={() => pick(date)}
              >
                {quick.label}
              </Button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
