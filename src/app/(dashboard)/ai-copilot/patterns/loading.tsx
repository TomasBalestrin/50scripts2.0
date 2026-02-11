export default function Loading() {
  return (
    <div className="min-h-screen bg-[#020617] p-4 md:p-6">
      <div className="mx-auto max-w-5xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between animate-pulse">
          <div>
            <div className="mb-2 h-7 w-56 rounded-lg bg-[#0A0F1E]" />
            <div className="h-4 w-48 rounded bg-[#0A0F1E]" />
          </div>
          <div className="h-6 w-16 rounded-full bg-[#131B35]" />
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="animate-pulse rounded-xl border border-[#131B35] bg-[#0A0F1E] p-5"
              style={{ animationDelay: `${i * 75}ms` }}
            >
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-[#131B35]" />
                <div className="space-y-2">
                  <div className="h-6 w-16 rounded bg-[#131B35]" />
                  <div className="h-3 w-20 rounded bg-[#131B35]" />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Chart */}
        <div className="animate-pulse rounded-xl border border-[#131B35] bg-[#0A0F1E] p-5"
             style={{ animationDelay: '300ms' }}>
          <div className="mb-4 h-4 w-52 rounded bg-[#131B35]" />
          <div className="h-64 w-full rounded bg-[#131B35]/50" />
        </div>

        {/* Top scripts table */}
        <div className="animate-pulse rounded-xl border border-[#131B35] bg-[#0A0F1E] p-5"
             style={{ animationDelay: '375ms' }}>
          <div className="mb-4 h-4 w-44 rounded bg-[#131B35]" />
          <div className="space-y-3">
            {/* Table header */}
            <div className="flex items-center gap-4 pb-3 border-b border-[#131B35]">
              <div className="h-3 w-1/3 rounded bg-[#131B35]" />
              <div className="h-3 w-1/4 rounded bg-[#131B35] ml-auto" />
              <div className="h-3 w-1/6 rounded bg-[#131B35]" />
            </div>
            {/* Table rows */}
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 py-2">
                <div className="h-4 w-1/3 rounded bg-[#131B35]" />
                <div className="h-4 w-20 rounded bg-[#131B35] ml-auto" />
                <div className="h-4 w-16 rounded bg-[#131B35]" />
              </div>
            ))}
          </div>
        </div>

        {/* Insights */}
        <div className="animate-pulse rounded-xl border border-[#131B35] bg-[#0A0F1E] p-5"
             style={{ animationDelay: '450ms' }}>
          <div className="mb-4 h-4 w-32 rounded bg-[#131B35]" />
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-start gap-3 rounded-lg bg-[#131B35]/40 px-4 py-3">
                <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[#131B35]" />
                <div className="flex-1 space-y-1">
                  <div className="h-3 w-full rounded bg-[#131B35]" />
                  <div className="h-3 w-2/3 rounded bg-[#131B35]" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
