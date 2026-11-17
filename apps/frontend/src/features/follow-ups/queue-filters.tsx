'use client';

import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

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

// Radix Select cannot use an empty value, so "all" has its own key
const ALL = '__all__';

const fromSelect = (value: string) => (value === ALL ? '' : value);

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
      <Select
        value={filters.stage || ALL}
        onValueChange={(value) => onChange({ ...filters, stage: fromSelect(value) })}
      >
        <SelectTrigger aria-label="Stage" className="w-44">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All stages</SelectItem>
          {stages.map((stage) => (
            <SelectItem key={stage} value={stage}>
              {stage}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        value={filters.recruiter || ALL}
        onValueChange={(value) => onChange({ ...filters, recruiter: fromSelect(value) })}
      >
        <SelectTrigger aria-label="Recruiter" className="w-44">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All recruiters</SelectItem>
          {recruiters.map((recruiter) => (
            <SelectItem key={recruiter} value={recruiter}>
              {recruiter}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </form>
  );
}
