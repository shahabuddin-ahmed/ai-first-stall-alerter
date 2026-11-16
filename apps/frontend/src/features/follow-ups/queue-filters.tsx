'use client';

import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export interface Filters {
  stage: string;
  recruiter: string;
  search: string;
}

interface QueueFiltersProps {
  filters: Filters;
  stages: string[];
  recruiters: string[];
  onChange: (filters: Filters) => void;
}

const SELECT_CLASS = 'h-10 rounded-[10px] border border-input bg-card px-2.5 text-sm';

export function QueueFilters({ filters, stages, recruiters, onChange }: QueueFiltersProps) {
  const [search, setSearch] = useState(filters.search);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onChange({ ...filters, search: search.trim() });
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-2.5 px-1.5">
      <div className="flex flex-[1_1_220px] gap-2">
        <Input
          type="search"
          aria-label="Search by name or ID"
          placeholder="Search by name or ID"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <Button type="submit" variant="outline" size="sm" className="h-10">
          Search
        </Button>
      </div>
      <select
        aria-label="Stage"
        className={SELECT_CLASS}
        value={filters.stage}
        onChange={(event) => onChange({ ...filters, stage: event.target.value })}
      >
        <option value="">All stages</option>
        {stages.map((stage) => (
          <option key={stage}>{stage}</option>
        ))}
      </select>
      <select
        aria-label="Recruiter"
        className={SELECT_CLASS}
        value={filters.recruiter}
        onChange={(event) => onChange({ ...filters, recruiter: event.target.value })}
      >
        <option value="">All recruiters</option>
        {recruiters.map((recruiter) => (
          <option key={recruiter}>{recruiter}</option>
        ))}
      </select>
    </form>
  );
}
