'use client';

import { Check, ChevronDown, Search } from 'lucide-react';
import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { cn } from '@/lib/utils';
import type { AiModel } from '@/types';

const TOKENS_PER_K = 1000;
const TOKENS_PER_M = 1_000_000;

function priceText(model: AiModel): string {
  if (model.inputPrice === null || model.outputPrice === null) {
    return 'Price varies';
  }
  if (model.inputPrice === 0 && model.outputPrice === 0) {
    return 'Free';
  }
  const usd = (value: number) =>
    `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}`;
  return `In ${usd(model.inputPrice)} · Out ${usd(model.outputPrice)} per 1M tokens`;
}

function contextText(contextLength: number | null): string {
  if (contextLength === null) {
    return '';
  }
  if (contextLength >= TOKENS_PER_M) {
    return ` · ${Number((contextLength / TOKENS_PER_M).toFixed(1))}M context`;
  }
  return ` · ${Math.round(contextLength / TOKENS_PER_K)}K context`;
}

interface ModelPickerProps {
  id: string;
  models: AiModel[];
  value: string;
  disabled: boolean;
  onSelect: (modelId: string) => void;
}

export function ModelPicker({ id, models, value, disabled, onSelect }: ModelPickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listId = useId();

  const current = models.find((model) => model.modelId === value);
  const others = models.filter((model) => model.modelId !== value).sort((a, b) => a.name.localeCompare(b.name));
  const ordered = current ? [current, ...others] : others;
  const words = query.trim().toLowerCase();
  const shown = ordered.filter(
    (model) => model.name.toLowerCase().includes(words) || model.modelId.toLowerCase().includes(words)
  );
  const optionId = (index: number) => `${listId}-${index}`;

  useEffect(() => {
    if (!open) {
      return;
    }
    const closeOutside = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', closeOutside);
    return () => document.removeEventListener('mousedown', closeOutside);
  }, [open]);

  const openPicker = () => {
    setQuery('');
    setActive(0);
    setOpen(!open);
  };

  const close = () => {
    setOpen(false);
    triggerRef.current?.focus();
  };

  const choose = (model: AiModel) => {
    close();
    if (model.modelId !== value) {
      onSelect(model.modelId);
    }
  };

  const moveTo = (index: number) => {
    setActive(index);
    document.getElementById(optionId(index))?.scrollIntoView({ block: 'nearest' });
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      moveTo(Math.min(active + 1, shown.length - 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      moveTo(Math.max(active - 1, 0));
    } else if (event.key === 'Enter' && shown[active]) {
      event.preventDefault();
      choose(shown[active]);
    } else if (event.key === 'Escape') {
      close();
    }
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={triggerRef}
        id={id}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={disabled}
        onClick={openPicker}
        className="flex w-full items-center justify-between gap-2 rounded-[10px] border border-input bg-card px-3 py-2 text-left disabled:opacity-60"
      >
        <span className="flex min-w-0 flex-col">
          <span className="truncate text-sm font-semibold">{current?.name ?? value}</span>
          <span className="truncate text-xs text-muted-foreground">{current ? priceText(current) : value}</span>
        </span>
        <ChevronDown className="size-4 shrink-0 text-muted-foreground" aria-hidden />
      </button>

      {open && (
        <div className="absolute z-20 mt-1 flex w-full flex-col rounded-[10px] border bg-card shadow-lg">
          <label className="flex items-center gap-2 border-b px-3">
            <Search className="size-4 shrink-0 text-muted-foreground" aria-hidden />
            <input
              autoFocus
              role="combobox"
              aria-label="Search models"
              aria-controls={listId}
              aria-expanded
              aria-activedescendant={shown[active] ? optionId(active) : undefined}
              value={query}
              placeholder="Search by name or ID…"
              onChange={(event) => {
                setQuery(event.target.value);
                setActive(0);
              }}
              onKeyDown={onKeyDown}
              className="h-10 w-full bg-transparent text-sm outline-none"
            />
          </label>

          <ul id={listId} role="listbox" aria-label="AI models" className="max-h-80 overflow-y-auto py-1">
            {shown.map((model, index) => (
              <li
                key={model.modelId}
                id={optionId(index)}
                role="option"
                aria-selected={model.modelId === value}
                onMouseEnter={() => setActive(index)}
                onClick={() => choose(model)}
                className={cn('flex cursor-pointer gap-2 px-3 py-2', index === active && 'bg-indigo-50')}
              >
                <Check
                  className={cn('mt-0.5 size-4 shrink-0 text-indigo-700', model.modelId !== value && 'invisible')}
                  aria-hidden
                />
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span className="flex items-center gap-2 text-sm font-semibold">
                    <span className="truncate">{model.name}</span>
                    {model.modelId === value && (
                      <span className="shrink-0 text-xs font-semibold text-indigo-700">Current</span>
                    )}
                  </span>
                  <span className="truncate text-xs text-muted-foreground">
                    {model.modelId}
                    {contextText(model.contextLength)}
                  </span>
                  <span className="text-xs text-gray-700">{priceText(model)}</span>
                </span>
              </li>
            ))}
            {shown.length === 0 && (
              <li className="px-3 py-3 text-sm text-muted-foreground">
                No model matches &ldquo;{query.trim()}&rdquo;.
              </li>
            )}
          </ul>

          <span className="border-t px-3 py-1.5 text-xs text-muted-foreground">
            Showing {shown.length} of {models.length} models
          </span>
        </div>
      )}
    </div>
  );
}
