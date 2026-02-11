export default function Loading() {
  return (
    <div className="min-h-screen bg-[#020617] p-4 sm:p-6">
      <div className="mx-auto max-w-4xl space-y-6">
        {/* Header */}
        <div className="animate-pulse">
          <div className="mb-2 h-8 w-40 rounded-lg bg-[#0A0F1E]" />
          <div className="h-4 w-72 rounded bg-[#0A0F1E]" />
        </div>

        {/* Today's challenge label */}
        <div className="animate-pulse" style={{ animationDelay: '75ms' }}>
          <div className="mb-2 h-5 w-36 rounded bg-[#0A0F1E]" />
        </div>

        {/* Challenge card */}
        <div className="animate-pulse rounded-xl border border-[#131B35] bg-[#0A0F1E] p-5"
             style={{ animationDelay: '150ms' }}>
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 rounded-full bg-[#131B35]" />
            <div className="flex-1 space-y-3">
              <div className="h-5 w-48 rounded bg-[#131B35]" />
              <div className="h-3 w-full rounded bg-[#131B35]" />
              {/* Progress bar */}
              <div className="space-y-1">
                <div className="flex justify-between">
                  <div className="h-3 w-12 rounded bg-[#131B35]" />
                  <div className="h-3 w-16 rounded bg-[#131B35]" />
                </div>
                <div className="h-2 w-full rounded-full bg-[#131B35]" />
              </div>
            </div>
          </div>
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="animate-pulse rounded-xl border border-[#131B35] bg-[#0A0F1E] p-4 text-center"
              style={{ animationDelay: `${(i + 3) * 75}ms` }}
            >
              <div className="mx-auto mb-2 h-10 w-10 rounded-lg bg-[#131B35]" />
              <div className="mx-auto mb-1 h-5 w-10 rounded bg-[#131B35]" />
              <div className="mx-auto h-3 w-24 rounded bg-[#131B35]" />
            </div>
          ))}
        </div>

        {/* Motivational section */}
        <div className="animate-pulse rounded-xl border border-[#131B35] bg-[#0A0F1E] p-6"
             style={{ animationDelay: '525ms' }}>
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start sm:gap-8">
            <div className="h-20 w-20 rounded-full bg-[#131B35]" />
            <div className="flex-1 space-y-3 w-full">
              <div className="h-5 w-48 rounded bg-[#131B35]" />
              <div className="h-3 w-full rounded bg-[#131B35]" />
              <div className="h-3 w-3/4 rounded bg-[#131B35]" />
              <div className="h-1.5 w-full rounded-full bg-[#131B35]" />
            </div>
          </div>
        </div>

        {/* How it works */}
        <div className="animate-pulse rounded-xl border border-[#131B35] bg-[#0A0F1E] p-5"
             style={{ animationDelay: '600ms' }}>
          <div className="mb-3 h-4 w-28 rounded bg-[#131B35]" />
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="mt-0.5 h-5 w-5 rounded-full bg-[#131B35]" />
                <div className="h-3 w-full rounded bg-[#131B35]" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
