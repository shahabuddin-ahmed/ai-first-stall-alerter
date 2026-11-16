import { Card } from '@/components/ui/card';

const rules = [
  { label: 'Stalled', text: 'Days since the stage started, or since the last real activity, ≥ that stage’s threshold.' },
  { label: 'Ranking', text: 'Most overdue first → later pipeline stage first → candidate ID.' },
  {
    label: 'Your pipeline',
    text: 'Stage names, thresholds, order and aliases are yours to set in Hiring stages. Nothing is hard-coded.'
  }
];

export function KeyRules() {
  return (
    <section aria-label="Key rules" className="grid grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-3">
      {rules.map((rule) => (
        <Card key={rule.label} className="flex flex-col gap-2 p-[18px]">
          <span className="text-xs font-semibold tracking-[0.06em] text-muted-foreground uppercase">{rule.label}</span>
          <span className="text-[15px] leading-normal">{rule.text}</span>
        </Card>
      ))}
    </section>
  );
}
