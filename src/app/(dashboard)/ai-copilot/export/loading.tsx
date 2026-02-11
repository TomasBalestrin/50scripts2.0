export default function Loading() {
  return (
    <div className="min-h-screen bg-[#020617] p-4 md:p-6">
      <div className="mx-auto max-w-2xl">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between animate-pulse">
          <div>
            <div className="mb-2 h-7 w-44 rounded-lg bg-[#0A0F1E]" />
            <div className="h-4 w-52 rounded bg-[#0A0F1E]" />
          </div>
          <div className="h-6 w-16 rounded-full bg-[#131B35]" />
        </div>

        <div className="space-y-6">
          {/* Date range card */}
          <div className="animate-pulse rounded-xl border border-[#131B35] bg-[#0A0F1E] p-5"
               style={{ animationDelay: '75ms' }}>
            <div className="mb-4 h-4 w-20 rounded bg-[#131B35]" />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <div className="h-3 w-20 rounded bg-[#131B35]" />
                <div className="h-10 w-full rounded-lg bg-[#131B35]" />
              </div>
              <div className="space-y-2">
                <div className="h-3 w-20 rounded bg-[#131B35]" />
                <div className="h-10 w-full rounded-lg bg-[#131B35]" />
              </div>
            </div>
          </div>

          {/* Format card */}
          <div className="animate-pulse rounded-xl border border-[#131B35] bg-[#0A0F1E] p-5"
               style={{ animationDelay: '150ms' }}>
            <div className="mb-4 h-4 w-20 rounded bg-[#131B35]" />
            <div className="flex gap-3">
              <div className="flex-1 h-12 rounded-lg bg-[#131B35]" />
              <div className="flex-1 h-12 rounded-lg bg-[#131B35]" />
            </div>
          </div>

          {/* Data types card */}
          <div className="animate-pulse rounded-xl border border-[#131B35] bg-[#0A0F1E] p-5"
               style={{ animationDelay: '225ms' }}>
            <div className="mb-4 h-4 w-36 rounded bg-[#131B35]" />
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 rounded-lg border border-[#131B35] bg-[#131B35] px-4 py-3">
                  <div className="h-5 w-5 rounded border border-[#0A0F1E] bg-[#0A0F1E]" />
                  <div className="flex-1 space-y-1">
                    <div className="h-4 w-28 rounded bg-[#0A0F1E]" />
                    <div className="h-3 w-48 rounded bg-[#0A0F1E]" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Export button */}
          <div className="animate-pulse h-12 w-full rounded-lg bg-[#131B35]"
               style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    </div>
  );
}
