import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';

export function AiPrivacyCard() {
  return (
    <Card className="flex flex-col gap-3 p-[22px]">
      <h2 className="text-[17px] font-semibold">What the AI model sees</h2>
      <div className="flex flex-wrap items-baseline gap-2.5">
        <Badge variant="ok" className="min-w-[170px] justify-center">
          Sent (anonymous facts)
        </Badge>
        <span className="flex-[1_1_320px] text-sm leading-normal text-gray-700">
          For each top alert: rank, the fixed action code (for example REQUEST_FEEDBACK), who the message is for, the
          stage threshold, days in stage, days overdue, days since contact, and the recruiter as R1, R2… Plus board counts.
        </span>
      </div>
      <div className="flex flex-wrap items-baseline gap-2.5">
        <Badge variant="error" className="min-w-[170px] justify-center">
          Never sent
        </Badge>
        <span className="flex-[1_1_320px] text-sm leading-normal text-gray-700">
          Names, candidate IDs, roles, recruiter names, stage names, the file, or any other free text. Drafts use
          placeholders like {'{{first_name}}'} that the backend fills in afterwards.
        </span>
      </div>
    </Card>
  );
}
