import type { QueueItem } from '@/types';

const PLACEHOLDER = /\{\{[a-z_]+\}\}/g;

// Same rule as the backend: one pass, each value put in as plain text, so a name or role never fills another blank
export function fillPlaceholders(text: string, item: QueueItem): string {
  const values: Record<string, string> = {
    '{{first_name}}': item.firstName,
    '{{name}}': item.name,
    '{{role}}': item.role,
    '{{recruiter}}': item.recruiter
  };
  return text.replace(PLACEHOLDER, (placeholder) => values[placeholder] ?? placeholder);
}
