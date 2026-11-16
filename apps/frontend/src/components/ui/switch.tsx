import type { ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

type SwitchProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onChange'> & {
  checked: boolean;
  onChange: (checked: boolean) => void;
};

export function Switch({ checked, onChange, className, ...props }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex h-7 w-12 flex-none items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
        checked ? 'bg-primary' : 'bg-gray-300',
        className
      )}
      {...props}
    >
      <span
        aria-hidden="true"
        className={cn('size-5 rounded-full bg-white shadow transition-transform', checked ? 'translate-x-6' : 'translate-x-1')}
      />
    </button>
  );
}
