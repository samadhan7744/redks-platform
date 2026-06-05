import { EmptyState } from '@/components/state-view';

export type Column<T> = {
  key: string;
  header: string;
  render: (row: T) => React.ReactNode;
};

export function DataTable<T>({ columns, rows }: { columns: Column<T>[]; rows: T[] }) {
  if (!rows.length) return <EmptyState />;

  return (
    <div className="overflow-hidden rounded-xl border bg-white shadow-sm shadow-slate-200/50">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr>
              {columns.map((column) => (
                <th key={column.key} className="px-4 py-3.5 font-bold">
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map((row, index) => (
              <tr key={index} className="transition-colors hover:bg-red-50/30">
                {columns.map((column) => (
                  <td key={column.key} className="px-4 py-3.5 align-top">
                    {column.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
