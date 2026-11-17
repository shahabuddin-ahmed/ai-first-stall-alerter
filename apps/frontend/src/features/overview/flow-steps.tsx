import { Card } from '@/components/ui/card';

const steps = [
  { title: 'Upload CSV', text: 'One hiring-board file, up to 5 MB and 10,000 rows. The same file twice is detected.' },
  { title: 'Validate', text: 'A broken file is rejected. Bad rows are listed with how to fix them; good rows continue.' },
  { title: 'Rank', text: 'Each stage has its own threshold. Most overdue first.' },
  { title: 'Message', text: 'A template for every alert; an AI draft for every alert when AI is on.' },
  { title: 'Export', text: 'Download the queue as CSV, in the same order.' }
];

export function FlowSteps() {
  return (
    <section aria-labelledby="flow-heading" className="flex flex-col gap-3">
      <h2 id="flow-heading" className="text-lg font-semibold">
        The flow in 5 steps
      </h2>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(190px,1fr))] gap-3">
        {steps.map((step, index) => (
          <Card key={step.title} className="flex flex-col gap-2 p-[18px]">
            <span className="flex size-7 items-center justify-center rounded-full bg-accent text-[13px] font-bold text-accent-foreground">
              {index + 1}
            </span>
            <span className="text-[15px] font-semibold">{step.title}</span>
            <span className="text-sm leading-normal text-gray-600">{step.text}</span>
          </Card>
        ))}
      </div>
    </section>
  );
}
