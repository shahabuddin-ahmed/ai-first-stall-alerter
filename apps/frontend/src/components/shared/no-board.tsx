import Link from 'next/link';
import { buttonVariants } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export function NoBoard() {
  return (
    <Card className="flex flex-col items-center gap-3 p-10 text-center">
      <h1 className="text-lg font-semibold">No board is open</h1>
      <p className="text-sm text-muted-foreground">Import a hiring-board CSV, or open one of your recent imports.</p>
      <Link href="/imports" className={buttonVariants()}>
        Go to Imports
      </Link>
    </Card>
  );
}
