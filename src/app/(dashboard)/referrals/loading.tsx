export default function Loading() {
  return (
    <div className="p-4 sm:p-6">
      <div className="mx-auto max-w-4xl space-y-6">
        {/* Header */}
        <div className="animate-pulse">
          <div className="h-7 w-40 rounded-lg bg-[#0A0F1E]" />
          <div className="mt-2 h-4 w-72 rounded bg-[#0A0F1E]" />
        </div>

        {/* Referral link box */}
        <div
          className="animate-pulse rounded-xl border border-[#131B35] bg-[#0A0F1E] p-5"
          style={{ animationDelay: '75ms' }}
        >
          <div className="mb-3 h-5 w-36 rounded bg-[#131B35]" />
          <div className="flex items-center gap-3">
            <div className="h-10 flex-1 rounded-lg bg-[#131B35]" />
            <div className="h-10 w-24 rounded-lg bg-[#131B35]" />
          </div>
          <div className="mt-3 flex items-center gap-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-9 w-9 rounded-lg bg-[#131B35]" />
            ))}
          </div>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="animate-pulse rounded-xl border border-[#131B35] bg-[#0A0F1E] p-5"
              style={{ animationDelay: `${(i + 2) * 75}ms` }}
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="h-10 w-10 rounded-lg bg-[#131B35]" />
                <div className="h-3 w-24 rounded bg-[#131B35]" />
              </div>
              <div className="h-8 w-16 rounded bg-[#131B35]" />
              <div className="mt-2 h-3 w-32 rounded bg-[#131B35]" />
            </div>
          ))}
        </div>

        {/* Referral list */}
        <div
          className="animate-pulse rounded-xl border border-[#131B35] bg-[#0A0F1E] p-5"
          style={{ animationDelay: '375ms' }}
        >
          <div className="mb-4 h-5 w-40 rounded bg-[#131B35]" />
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center justify-between rounded-lg bg-[#131B35] p-3"
              >
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-[#0A0F1E]" />
                  <div className="space-y-1">
                    <div className="h-3 w-28 rounded bg-[#0A0F1E]" />
                    <div className="h-2 w-36 rounded bg-[#0A0F1E]" />
                  </div>
                </div>
                <div className="h-5 w-16 rounded-full bg-[#0A0F1E]" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
