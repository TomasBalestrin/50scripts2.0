export default function Loading() {
  return (
    <div className="min-h-screen bg-[#020617] p-4 sm:p-6">
      <div className="mx-auto max-w-4xl space-y-6">
        {/* Header */}
        <div className="animate-pulse">
          <div className="mb-2 h-8 w-48 rounded-lg bg-[#0A0F1E]" />
          <div className="h-4 w-64 rounded bg-[#0A0F1E]" />
        </div>

        {/* Level + XP + Streak card */}
        <div className="animate-pulse rounded-xl border border-[#131B35] bg-[#0A0F1E] p-5 sm:p-6"
             style={{ animationDelay: '75ms' }}>
          <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
            {/* Level badge */}
            <div className="h-20 w-20 rounded-full bg-[#131B35]" />
            {/* XP bar + stats */}
            <div className="flex-1 w-full space-y-4">
              <div className="h-3 w-full rounded-full bg-[#131B35]" />
              <div className="flex items-center justify-between rounded-lg bg-[#131B35]/50 px-4 py-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="text-center space-y-1">
                    <div className="mx-auto h-5 w-10 rounded bg-[#131B35]" />
                    <div className="mx-auto h-2 w-14 rounded bg-[#131B35]" />
                  </div>
                ))}
              </div>
            </div>
            {/* Streak counter */}
            <div className="h-20 w-20 rounded-full bg-[#131B35]" />
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="animate-pulse flex items-center gap-3 rounded-xl border border-[#131B35] bg-[#0A0F1E] p-4"
              style={{ animationDelay: `${(i + 2) * 75}ms` }}
            >
              <div className="h-10 w-10 rounded-lg bg-[#131B35]" />
              <div className="space-y-1">
                <div className="h-5 w-12 rounded bg-[#131B35]" />
                <div className="h-3 w-24 rounded bg-[#131B35]" />
              </div>
            </div>
          ))}
        </div>

        {/* Badge grid */}
        <div>
          <div className="mb-3 flex items-center justify-between animate-pulse">
            <div className="h-5 w-32 rounded bg-[#0A0F1E]" />
            <div className="h-3 w-28 rounded bg-[#0A0F1E]" />
          </div>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
            {Array.from({ length: 9 }).map((_, i) => (
              <div
                key={i}
                className="animate-pulse rounded-xl border border-[#131B35] bg-[#0A0F1E] p-4 text-center"
                style={{ animationDelay: `${(i + 5) * 75}ms` }}
              >
                <div className="mx-auto mb-2 h-12 w-12 rounded-full bg-[#131B35]" />
                <div className="mx-auto mb-1 h-3 w-16 rounded bg-[#131B35]" />
                <div className="mx-auto h-2 w-20 rounded bg-[#131B35]" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
