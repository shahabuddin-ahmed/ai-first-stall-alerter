'use client';

import Link from 'next/link';
import type { Route } from 'next';
import { usePathname } from 'next/navigation';
import { useAppSelector } from '@/hooks/use-app-redux';
import { boardHref, isBoardPage } from '@/lib/board-link';
import { cn } from '@/lib/utils';

interface NavItem {
  href: Route;
  label: string;
}

interface NavSection {
  label: string;
  items: NavItem[];
}

const sections: NavSection[] = [
  {
    label: 'Workspace',
    items: [
      { href: '/follow-ups', label: 'Follow-ups' },
      { href: '/imports', label: 'Imports' },
      { href: '/export', label: 'Export' }
    ]
  },
  {
    label: 'Configure',
    items: [
      { href: '/stages', label: 'Hiring stages' },
      { href: '/settings', label: 'Settings' }
    ]
  }
];

export function Sidebar() {
  const pathname = usePathname();
  const board = useAppSelector((state) => state.board.current);

  return (
    <aside className="flex flex-col gap-0.5 border-b bg-card px-3 py-4 lg:fixed lg:inset-y-0 lg:left-0 lg:w-60 lg:border-r lg:border-b-0">
      <Link href="/" className="flex items-center gap-2.5 px-2.5 pb-4">
        <span aria-hidden="true" className="flex size-8 items-center justify-center rounded-[9px] bg-primary text-[15px] font-bold text-primary-foreground">
          S
        </span>
        <span className="flex flex-col">
          <span className="text-[15px] font-bold text-foreground">StallAlert</span>
          <span className="text-xs text-muted-foreground">Hiring follow-ups</span>
        </span>
      </Link>

      <nav aria-label="Main" className="flex flex-wrap gap-0.5 lg:flex-col">
        {sections.map((section) => (
          <div key={section.label} className="contents">
            <span className="hidden px-3 pt-3.5 pb-1.5 text-[11px] font-semibold tracking-[0.08em] text-muted-foreground uppercase lg:block">
              {section.label}
            </span>
            {section.items.map((item) => (
              <Link
                key={item.href}
                href={isBoardPage(item.href) ? boardHref(item.href, board) : item.href}
                className={cn(
                  'rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-muted hover:text-foreground',
                  pathname === item.href && 'bg-accent font-semibold text-accent-foreground hover:bg-accent'
                )}
              >
                {item.label}
              </Link>
            ))}
          </div>
        ))}
      </nav>
    </aside>
  );
}
