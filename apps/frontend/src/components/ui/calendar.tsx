'use client';

import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp } from 'lucide-react';
import { DayPicker, type ChevronProps, type DayPickerProps } from 'react-day-picker';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const CHEVRONS = { left: ChevronLeft, right: ChevronRight, up: ChevronUp, down: ChevronDown };

function Chevron({ orientation = 'right', className }: ChevronProps) {
  const Icon = CHEVRONS[orientation];
  return <Icon aria-hidden="true" className={cn('size-4', className)} />;
}

const NAV_BUTTON = cn(buttonVariants({ variant: 'ghost', size: 'icon' }), 'size-8 rounded-lg p-0');

export function Calendar({ className, classNames, showOutsideDays = true, ...props }: DayPickerProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn('p-3', className)}
      classNames={{
        months: 'relative flex flex-col gap-4',
        month: 'flex flex-col gap-3',
        nav: 'absolute inset-x-0 top-0 flex items-center justify-between',
        button_previous: NAV_BUTTON,
        button_next: NAV_BUTTON,
        month_caption: 'flex h-8 items-center justify-center',
        caption_label: 'text-sm font-semibold',
        month_grid: 'border-collapse',
        weekdays: 'flex',
        weekday: 'w-9 pb-1 text-xs font-medium text-muted-foreground',
        week: 'mt-1 flex',
        day: 'size-9 p-0 text-center text-sm',
        day_button:
          'size-9 rounded-lg font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
        selected:
          '[&>button]:bg-primary [&>button]:text-primary-foreground [&>button]:shadow-sm [&>button]:hover:bg-primary-hover [&>button]:hover:text-primary-foreground',
        today: 'font-bold [&:not([data-selected=true])>button]:text-primary',
        outside: 'text-muted-foreground/50',
        disabled: 'text-muted-foreground/40 [&>button]:pointer-events-none',
        hidden: 'invisible',
        ...classNames
      }}
      components={{ Chevron }}
      {...props}
    />
  );
}
