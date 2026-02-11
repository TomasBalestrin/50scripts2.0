export default function Loading() {
  return (
    <div className="min-h-screen bg-[#020617] p-4 sm:p-6">
      <div className="mx-auto max-w-4xl space-y-6">
        {/* Header */}
        <div className="animate-pulse">
          <div className="mb-2 h-8 w-48 rounded-lg bg-[#0A0F1E]" />
          <div className="h-4 w-56 rounded bg-[#0A0F1E]" />
        </div>

        {/* Filters bar */}
        <div className="animate-pulse rounded-xl border border-[#131B35] bg-[#0A0F1E] p-4"
             style={{ animationDelay: '75ms' }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 rounded bg-[#131B35]" />
              <div className="h-4 w-16 rounded bg-[#131B35]" />
            </div>
            <div className="h-4 w-4 rounded bg-[#131B35]" />
          </div>
        </div>

        {/* Timeline groups */}
        {Array.from({ length: 3 }).map((_, groupIdx) => (
          <div key={groupIdx}>
            {/* Date header */}
            <div className="mb-3 flex items-center gap-3 animate-pulse"
                 style={{ animationDelay: `${(groupIdx + 2) * 75}ms` }}>
              <div className="h-4 w-24 rounded bg-[#0A0F1E]" />
              <div className="h-px flex-1 bg-[#131B35]" />
              <div className="h-3 w-12 rounded bg-[#0A0F1E]" />
            </div>

            {/* Usage cards */}
            <div className="space-y-3">
              {Array.from({ length: groupIdx === 0 ? 3 : 2 }).map((_, i) => (
                <div
                  key={i}
                  className="animate-pulse rounded-xl border border-[#131B35] bg-[#0A0F1E] p-4"
                  style={{ animationDelay: `${(groupIdx * 3 + i + 3) * 75}ms` }}
                >
                  <div className="flex items-start gap-3">
                    <div className="h-9 w-9 rounded-lg bg-[#131B35]" />
                    <div className="flex-1 space-y-2">
                      <div className="flex items-start justify-between">
                        <div className="h-4 w-3/4 rounded bg-[#131B35]" />
                        <div className="h-3 w-12 rounded bg-[#131B35]" />
                      </div>
                      <div className="h-4 w-20 rounded-full bg-[#131B35]" />
                      <div className="flex items-center gap-3">
                        <div className="flex gap-0.5">
                          {Array.from({ length: 5 }).map((_, s) => (
                            <div key={s} className="h-3.5 w-3.5 rounded bg-[#131B35]" />
                          ))}
                        </div>
                        <div className="h-3 w-28 rounded bg-[#131B35]" />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* Pagination */}
        <div className="animate-pulse flex items-center justify-between rounded-xl border border-[#131B35] bg-[#0A0F1E] px-4 py-3"
             style={{ animationDelay: '750ms' }}>
          <div className="h-3 w-40 rounded bg-[#131B35]" />
          <div className="flex gap-2">
            <div className="h-8 w-8 rounded-lg bg-[#131B35]" />
            <div className="h-8 w-8 rounded-lg bg-[#131B35]" />
          </div>
        </div>
      </div>
    </div>
  );
}
