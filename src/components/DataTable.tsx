interface DataTableProps {
  columns: string[]
  rows: any[]
  maxHeight?: string
  highlightDiff?: 'user' | 'reference'
}

export default function DataTable({ columns, rows, maxHeight = '300px', highlightDiff }: DataTableProps) {
  if (!rows || rows.length === 0) {
    return (
      <div className="text-center py-8 text-text-secondary text-sm">
        暂无数据
      </div>
    )
  }

  const rowBg = (index: number, diff?: 'user' | 'reference') => {
    if (diff === 'user') return 'bg-error-pink/10 border-l-2 border-error-pink'
    if (diff === 'reference') return 'bg-success-emerald/10 border-l-2 border-success-emerald'
    return index % 2 === 0 ? 'bg-bg-primary/50' : 'bg-bg-secondary/50'
  }

  return (
    <div className="w-full">
      <div className="mb-2 text-xs text-text-secondary">
        {rows.length} 行
      </div>
      <div
        className="overflow-auto border border-border-dark rounded-lg"
        style={{ maxHeight }}
      >
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10">
            <tr className="bg-bg-tertiary">
              {columns.map((col) => (
                <th
                  key={col}
                  className="px-3 py-2 text-left text-xs font-medium text-accent-cyan uppercase tracking-wider border-b border-border-dark whitespace-nowrap"
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr
                key={i}
                className={`${rowBg(i, highlightDiff)} hover:bg-accent-cyan/5 transition-colors`}
              >
                {columns.map((col) => (
                  <td
                    key={col}
                    className="px-3 py-2 text-text-primary whitespace-nowrap font-mono text-xs border-b border-border-dark/50"
                  >
                    {row[col] !== null && row[col] !== undefined ? String(row[col]) : (
                      <span className="text-text-secondary italic">NULL</span>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
