import { Button } from '@/components/ui/button';

interface PagerProps {
  page: number;
  pageSize: number;
  total: number;
  onChange: (page: number) => void;
}

export function Pager({ page, pageSize, total, onChange }: PagerProps) {
  if (total <= pageSize) {
    return null;
  }

  const first = (page - 1) * pageSize + 1;
  const last = Math.min(page * pageSize, total);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-1.5">
      <span className="text-[13px] text-gray-600">
        Showing {first}–{last} of {total.toLocaleString('en-US')}
      </span>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" disabled={page === 1} onClick={() => onChange(page - 1)}>
          Previous
        </Button>
        <Button variant="outline" size="sm" disabled={last === total} onClick={() => onChange(page + 1)}>
          Next
        </Button>
      </div>
    </div>
  );
}
