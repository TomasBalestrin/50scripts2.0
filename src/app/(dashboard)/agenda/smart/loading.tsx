export default function Loading() {
  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 animate-pulse">
        <div>
          <div className="h-7 w-52 rounded-lg bg-[#0A0F1E]" />
          <div className="mt-2 h-4 w-64 rounded bg-[#0A0F1E]" />
        </div>
        <div className="h-6 w-16 rounded-full bg-[#131B35]" />
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="animate-pulse rounded-xl border border-[#131B35] bg-[#0A0F1E] p-4 text-center"
            style={{ animationDelay: `${i * 75}ms` }}
          >
            <div className="mx-auto mb-2 h-7 w-16 rounded bg-[#131B35]" />
            <div className="mx-auto h-3 w-20 rounded bg-[#131B35]" />
          </div>
        ))}
      </div>

      {/* Best hours card */}
      <div className="animate-pulse rounded-xl border border-[#131B35] bg-[#0A0F1E] p-5 mb-6"
           style={{ animationDelay: '300ms' }}>
        <div className="mb-3 h-4 w-48 rounded bg-[#131B35]" />
        <div className="flex gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex-1 rounded-lg bg-[#131B35] p-3 text-center">
              <div className="mx-auto mb-1 h-5 w-12 rounded bg-[#0A0F1E]" />
              <div className="mx-auto h-3 w-20 rounded bg-[#0A0F1E]" />
            </div>
          ))}
        </div>
      </div>

      {/* Lead cards */}
      <div className="mb-3 animate-pulse">
        <div className="h-5 w-36 rounded bg-[#0A0F1E]" />
      </div>
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="animate-pulse rounded-xl border border-[#131B35] bg-[#0A0F1E] p-4"
            style={{ animationDelay: `${(i + 5) * 75}ms` }}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-[#131B35]" />
                <div className="space-y-1.5">
                  <div className="h-4 w-32 rounded bg-[#131B35]" />
                  <div className="flex gap-2">
                    <div className="h-4 w-16 rounded-full bg-[#131B35]" />
                    <div className="h-4 w-24 rounded bg-[#131B35]" />
                  </div>
                </div>
              </div>
              <div className="h-4 w-20 rounded bg-[#131B35]" />
            </div>
            {/* Progress bar */}
            <div className="mb-3 space-y-1">
              <div className="h-3 w-40 rounded bg-[#131B35]" />
              <div className="h-1.5 w-full rounded-full bg-[#131B35]" />
            </div>
            {/* Script suggestion */}
            <div className="rounded-lg bg-[#131B35] p-3 space-y-2">
              <div className="h-3 w-20 rounded bg-[#0A0F1E]" />
              <div className="h-4 w-3/4 rounded bg-[#0A0F1E]" />
              <div className="h-3 w-full rounded bg-[#0A0F1E]" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
