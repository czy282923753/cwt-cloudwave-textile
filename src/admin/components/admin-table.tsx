export function AdminTable({
  headers,
  rows,
}: Readonly<{
  headers: readonly string[];
  rows: readonly (readonly React.ReactNode[])[];
}>) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-white/10" tabIndex={0}>
      <table className="w-full min-w-2xl text-left text-sm">
        <thead className="bg-slate-900 text-slate-300">
          <tr>
            {headers.map((header) => (
              <th className="px-4 py-3 font-medium" key={header} scope="col">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-white/10">
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {row.map((cell, cellIndex) => (
                <td className="px-4 py-3 text-slate-200" key={cellIndex}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function AdminPageHeader({
  title,
  description,
  action,
}: Readonly<{
  title: string;
  description: string;
  action?: React.ReactNode;
}>) {
  return (
    <div className="mb-8 flex min-w-0 flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <h1 className="break-words text-3xl font-semibold">{title}</h1>
        <p className="mt-2 max-w-3xl break-words text-slate-300">{description}</p>
      </div>
      {action}
    </div>
  );
}
