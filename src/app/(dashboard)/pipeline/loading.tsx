export default function Loading() {
  const columnsConfig = [
    { cards: 3 },
    { cards: 2 },
    { cards: 3 },
    { cards: 2 },
    { cards: 2 },
  ];

  return (
    <div className="p-4 sm:p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <div className="animate-pulse flex items-center justify-between">
          <div>
            <div className="h-7 w-40 rounded-lg bg-[#0A0F1E]" />
            <div className="mt-2 h-4 w-56 rounded bg-[#0A0F1E]" />
          </div>
          <div className="h-9 w-28 rounded-lg bg-[#131B35]" />
        </div>

        {/* Kanban columns */}
        <div className="flex gap-4 overflow-hidden">
          {columnsConfig.map((col, colIdx) => (
            <div
              key={colIdx}
              className="animate-pulse min-w-[220px] flex-1 rounded-xl border border-[#131B35] bg-[#0A0F1E] p-3"
              style={{ animationDelay: `${colIdx * 75}ms` }}
            >
              {/* Column header */}
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-[#131B35]" />
                  <div className="h-4 w-20 rounded bg-[#131B35]" />
                </div>
                <div className="h-5 w-6 rounded bg-[#131B35]" />
              </div>

              {/* Cards */}
              <div className="space-y-2">
                {Array.from({ length: col.cards }).map((_, cardIdx) => (
                  <div
                    key={cardIdx}
                    className="rounded-lg bg-[#131B35] p-3 space-y-2"
                  >
                    <div className="flex items-center gap-2">
                      <div className="h-7 w-7 rounded-full bg-[#0A0F1E]" />
                      <div className="space-y-1 flex-1">
                        <div className="h-3 w-3/4 rounded bg-[#0A0F1E]" />
                        <div className="h-2 w-1/2 rounded bg-[#0A0F1E]" />
                      </div>
                    </div>
                    <div className="flex items-center justify-between pt-1">
                      <div className="h-4 w-16 rounded-full bg-[#0A0F1E]" />
                      <div className="h-3 w-12 rounded bg-[#0A0F1E]" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
