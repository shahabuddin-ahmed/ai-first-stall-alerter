import { Card } from '@/components/ui/card';
import { FILE_ERRORS } from '@/features/imports/file-errors';

export function RejectionCodes() {
  return (
    <Card className="flex flex-col gap-3 p-5">
      <h2 className="text-[17px] font-semibold">Every reason a whole file is rejected</h2>
      <p className="text-sm text-gray-600">
        A bad <em>row</em> never rejects the file; it shows up under Row errors instead. These problems stop the whole
        import:
      </p>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead className="border-b text-xs text-muted-foreground uppercase">
            <tr>
              <th scope="col" className="py-2 pr-4 font-semibold">Code</th>
              <th scope="col" className="py-2 pr-4 font-semibold">When</th>
              <th scope="col" className="py-2 font-semibold">How to fix</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(FILE_ERRORS).map(([code, info]) => (
              <tr key={code} className="border-b last:border-b-0">
                <td className="py-2.5 pr-4 font-mono text-[13px] font-semibold">{code}</td>
                <td className="py-2.5 pr-4">{info.when}</td>
                <td className="py-2.5 text-gray-700">{info.fix}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
