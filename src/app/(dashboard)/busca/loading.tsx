export default function Loading() {
  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      {/* Title */}
      <div className="animate-pulse mb-6">
        <div className="h-7 w-40 rounded-lg bg-[#0A0F1E]" />
      </div>

      {/* Search bar */}
      <div className="animate-pulse mb-6" style={{ animationDelay: '75ms' }}>
        <div className="h-12 w-full rounded-lg bg-[#0A0F1E]" />
      </div>

      {/* Result cards */}
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="animate-pulse rounded-xl border border-[#131B35] bg-[#0A0F1E] p-4"
            style={{ animationDelay: `${(i + 2) * 75}ms` }}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 space-y-2">
                <div className="h-4 w-3/4 rounded bg-[#131B35]" />
                <div className="h-3 w-full rounded bg-[#131B35]" />
                <div className="h-3 w-2/3 rounded bg-[#131B35]" />
                <div className="flex items-center gap-2 mt-2">
                  {Array.from({ length: 3 }).map((_, j) => (
                    <div key={j} className="h-5 w-14 rounded-full bg-[#131B35]" />
                  ))}
                  <div className="ml-auto h-3 w-8 rounded bg-[#131B35]" />
                </div>
              </div>
              <div className="h-9 w-9 rounded-lg bg-[#131B35] shrink-0" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
